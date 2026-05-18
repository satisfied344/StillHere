-- ═══════════════════════════════════════════════════════════════════
-- 008_user_blocks.sql
--
-- Admin can temporarily block authors from posting / commenting.
-- Supports three identifier kinds, any combination:
--   • user_id   — for authenticated authors
--   • anon_fp   — localStorage fingerprint (for anonymous authors)
--   • anon_ip   — request IP (extracted server-side from x-forwarded-for)
--
-- Honest limits for anonymous blocking: a determined user can clear
-- localStorage / use incognito / switch network. fp+ip catches casual
-- abuse but is not a wall. Admins should escalate to require sign-in
-- for repeat offenders.
-- ═══════════════════════════════════════════════════════════════════

-- 1. Add author-tracking columns to posts and comments so we can block
--    anonymous authors. Authenticated posts also get fp/ip stored so
--    that a banned user can't simply log out and continue anonymously
--    from the same device / network.
alter table public.posts    add column if not exists anon_fp text;
alter table public.posts    add column if not exists anon_ip inet;
alter table public.comments add column if not exists anon_fp text;
alter table public.comments add column if not exists anon_ip inet;

create index if not exists posts_anon_fp_idx    on public.posts    (anon_fp)    where anon_fp is not null;
create index if not exists posts_anon_ip_idx    on public.posts    (anon_ip)    where anon_ip is not null;
create index if not exists comments_anon_fp_idx on public.comments (anon_fp)    where anon_fp is not null;
create index if not exists comments_anon_ip_idx on public.comments (anon_ip)    where anon_ip is not null;


-- 2. The blocks table.
create table if not exists public.user_blocks (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete cascade,
  anon_fp      text,
  anon_ip      inet,
  reason       text,
  blocked_by   uuid references auth.users(id),
  blocked_at   timestamptz not null default now(),
  blocked_until timestamptz not null,
  -- At least one identifier must be present
  check (user_id is not null or anon_fp is not null or anon_ip is not null)
);

-- Plain b-tree on blocked_until — can't use `where blocked_until > now()`
-- as a partial-index predicate because now() is STABLE, not IMMUTABLE
-- (Postgres error 42P17). The query planner can still use this for
-- range scans of active blocks.
create index if not exists user_blocks_active_idx
  on public.user_blocks (blocked_until);
create index if not exists user_blocks_user_idx on public.user_blocks (user_id)  where user_id is not null;
create index if not exists user_blocks_fp_idx   on public.user_blocks (anon_fp)  where anon_fp is not null;
create index if not exists user_blocks_ip_idx   on public.user_blocks (anon_ip)  where anon_ip is not null;

alter table public.user_blocks enable row level security;

-- Only admins may see / modify the table directly. The RPCs below are
-- the legitimate entry points for everyone else.
drop policy if exists "user_blocks_admin_all" on public.user_blocks;
create policy "user_blocks_admin_all" on public.user_blocks
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());


-- 3. Helper: is_blocked() — checks all three identifiers against active blocks.
create or replace function public.is_blocked(
  p_user_id uuid,
  p_fp      text,
  p_ip      inet
) returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_blocks b
     where b.blocked_until > now()
       and (
            (p_user_id is not null and b.user_id = p_user_id)
         or (p_fp      is not null and b.anon_fp = p_fp)
         or (p_ip      is not null and b.anon_ip = p_ip)
       )
  );
$$;

grant execute on function public.is_blocked(uuid, text, inet) to authenticated, anon;


-- 4. Trigger: extract client IP from request headers, stamp it onto
--    posts/comments at insert time, and reject the insert if the
--    author is currently blocked.
create or replace function public._enforce_author_block()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_headers jsonb;
  v_xff     text;
  v_ip      inet;
begin
  -- Pull the first IP out of x-forwarded-for. PostgREST exposes the
  -- raw request headers as a JSON string in this GUC.
  begin
    v_headers := current_setting('request.headers', true)::jsonb;
  exception when others then
    v_headers := null;
  end;
  if v_headers is not null then
    v_xff := v_headers ->> 'x-forwarded-for';
    if v_xff is not null and length(v_xff) > 0 then
      -- "ip1, ip2, ip3" → take ip1
      v_xff := trim(split_part(v_xff, ',', 1));
      begin
        v_ip := v_xff::inet;
      exception when others then
        v_ip := null;
      end;
    end if;
  end if;

  -- Stamp the IP onto the new row (only if caller didn't already provide one)
  if NEW.anon_ip is null then NEW.anon_ip := v_ip; end if;

  -- Block check — admins are exempt so they can pin announcements etc.
  if not public.is_admin() and public.is_blocked(NEW.user_id, NEW.anon_fp, NEW.anon_ip) then
    raise exception 'author is blocked' using errcode = '42501';
  end if;

  return NEW;
end;
$$;

drop trigger if exists trg_enforce_block on public.posts;
create trigger trg_enforce_block
  before insert on public.posts
  for each row execute function public._enforce_author_block();

drop trigger if exists trg_enforce_block on public.comments;
create trigger trg_enforce_block
  before insert on public.comments
  for each row execute function public._enforce_author_block();


-- 5. Admin RPC: block the author of a given post/comment for N seconds.
--    Captures all three identifiers we know about that author.
create or replace function public.admin_block_author(
  p_target_type text,         -- 'post' | 'comment'
  p_target_id   uuid,
  p_seconds     integer,      -- duration; clamped to [60, 60*60*24*30]
  p_reason      text default null
) returns public.user_blocks
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin   uuid := auth.uid();
  v_user    uuid;
  v_fp      text;
  v_ip      inet;
  v_until   timestamptz;
  v_row     public.user_blocks;
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if p_seconds is null or p_seconds < 60 then
    raise exception 'duration too short (min 60s)';
  end if;
  if p_seconds > 60*60*24*30 then
    p_seconds := 60*60*24*30; -- cap at 30 days
  end if;

  if p_target_type = 'post' then
    select user_id, anon_fp, anon_ip
      into v_user, v_fp, v_ip
      from public.posts where id = p_target_id;
  elsif p_target_type = 'comment' then
    select user_id, anon_fp, anon_ip
      into v_user, v_fp, v_ip
      from public.comments where id = p_target_id;
  else
    raise exception 'invalid target_type';
  end if;

  if v_user is null and v_fp is null and v_ip is null then
    raise exception 'no identifiers available for this author (legacy anonymous content)';
  end if;

  v_until := now() + (p_seconds || ' seconds')::interval;

  insert into public.user_blocks (user_id, anon_fp, anon_ip, reason, blocked_by, blocked_until)
  values (v_user, v_fp, v_ip, p_reason, v_admin, v_until)
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.admin_block_author(text, uuid, integer, text) from public, anon, authenticated;
grant execute on function public.admin_block_author(text, uuid, integer, text) to authenticated;


-- 6. Admin RPC: unblock by id (manual override).
create or replace function public.admin_unblock(p_block_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  delete from public.user_blocks where id = p_block_id;
end;
$$;

grant execute on function public.admin_unblock(uuid) to authenticated;


-- 7. Admin RPC: list currently-active blocks (for the admin UI).
create or replace function public.admin_list_blocks()
returns table (
  id            uuid,
  user_id       uuid,
  anon_fp       text,
  anon_ip       inet,
  reason        text,
  blocked_by    uuid,
  blocked_at    timestamptz,
  blocked_until timestamptz
)
language sql
security definer
set search_path = public
as $$
  select id, user_id, anon_fp, anon_ip, reason, blocked_by, blocked_at, blocked_until
    from public.user_blocks
   where blocked_until > now() and public.is_admin()
   order by blocked_at desc;
$$;

grant execute on function public.admin_list_blocks() to authenticated;


-- ════════════════════════════════════════════════════════════════
-- Verify after running:
--   select * from public.user_blocks;
--   select public.is_blocked(null, 'anon_xxx', '1.2.3.4'::inet);
-- Try inserting a post with a blocked fp — should raise '42501 author is blocked'.
-- ════════════════════════════════════════════════════════════════
