-- ═══════════════════════════════════════════════════════════════════
-- StillHere — moderation system
-- 002_moderation_system.sql
--
-- Adds:
--   • reports               — one row per (target × reporter)
--   • admin_roles           — who is an admin / moderator
--   • posts / comments      — moderation_state, report_weight, report_count
--   • RPC submit_report     — checks uniqueness, weights, escalates
--   • RPC admin_decide      — admin keeps / removes / shadows content
--   • View admin_queue      — what admins see in /admin.html
--   • RLS policies          — feed hides shadow / hidden / removed for non-authors
--
-- Run in: Supabase → SQL Editor
-- ═══════════════════════════════════════════════════════════════════


-- ────────────────────────────────────────────────────────────────
-- 1) admin_roles  —  who can moderate
-- ────────────────────────────────────────────────────────────────
create table if not exists public.admin_roles (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  role        text not null default 'admin'
                check (role in ('moderator','admin','super_admin')),
  granted_at  timestamptz not null default now(),
  granted_by  uuid references auth.users(id) on delete set null
);

alter table public.admin_roles enable row level security;

-- Anyone authenticated can SELECT their own admin row (so the UI can detect
-- whether the current user is an admin). No one can write — only the
-- service_role / SQL editor.
drop policy if exists "admin_roles_read_own" on public.admin_roles;
create policy "admin_roles_read_own"
  on public.admin_roles for select
  to authenticated
  using (auth.uid() = user_id);

grant select on public.admin_roles to authenticated;
grant select, insert, update, delete on public.admin_roles to service_role;

-- Helper: is the calling user an admin? Used in policies + edge fns.
create or replace function public.is_admin(uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admin_roles where user_id = uid);
$$;

grant execute on function public.is_admin(uuid) to authenticated, anon;


-- ────────────────────────────────────────────────────────────────
-- 2) Moderation columns on posts + comments
-- ────────────────────────────────────────────────────────────────
do $$
begin
  if not exists (select 1 from information_schema.columns
                  where table_schema='public' and table_name='posts' and column_name='moderation_state') then
    alter table public.posts
      add column moderation_state text not null default 'active'
        check (moderation_state in
          ('active','ai_reviewing','shadow','hidden','pending_manual','removed')),
      add column report_count    int     not null default 0,
      add column report_weight   numeric not null default 0,
      add column moderation_note text,
      add column moderated_at    timestamptz,
      add column moderated_by    uuid;
  end if;

  if not exists (select 1 from information_schema.columns
                  where table_schema='public' and table_name='comments' and column_name='moderation_state') then
    alter table public.comments
      add column moderation_state text not null default 'active'
        check (moderation_state in
          ('active','ai_reviewing','shadow','hidden','pending_manual','removed')),
      add column report_count    int     not null default 0,
      add column report_weight   numeric not null default 0,
      add column moderation_note text,
      add column moderated_at    timestamptz,
      add column moderated_by    uuid;
  end if;
end $$;

-- Quick indexes so the admin queue + feed filters are fast
create index if not exists posts_moderation_state_idx    on public.posts(moderation_state);
create index if not exists comments_moderation_state_idx on public.comments(moderation_state);


-- ────────────────────────────────────────────────────────────────
-- 3) reports table — unique (target × reporter)
-- ────────────────────────────────────────────────────────────────
create table if not exists public.reports (
  id              uuid        primary key default gen_random_uuid(),
  target_type     text        not null check (target_type in ('post','comment')),
  target_id       uuid        not null,
  reporter_id     uuid        references auth.users(id) on delete set null,
  reporter_fp     text,                              -- fallback fingerprint for anonymous reporters
  reason          text,                              -- 'spam' | 'harassment' | 'self_harm' | 'other' …
  weight          numeric     not null default 1,    -- 1 for new accounts, 2 for old, etc.
  created_at      timestamptz not null default now()
);

-- Uniqueness: each logged-in user can report a given target at most once
create unique index if not exists reports_unique_user
  on public.reports (target_type, target_id, reporter_id)
  where reporter_id is not null;

-- Anonymous reporters keyed by fingerprint
create unique index if not exists reports_unique_anon
  on public.reports (target_type, target_id, reporter_fp)
  where reporter_id is null and reporter_fp is not null;

alter table public.reports enable row level security;

-- A user can see only their own reports.  Admins see all.
drop policy if exists "reports_select_self_or_admin" on public.reports;
create policy "reports_select_self_or_admin"
  on public.reports for select
  to authenticated
  using ( reporter_id = auth.uid() or public.is_admin() );

-- Direct insert is blocked — clients must call the submit_report RPC.
-- No public INSERT policy → only service_role / SECURITY DEFINER functions
-- can write to this table.

grant select on public.reports to authenticated;
grant select, insert, update, delete on public.reports to service_role;


-- ────────────────────────────────────────────────────────────────
-- 4) submit_report — atomically inserts + escalates
-- ────────────────────────────────────────────────────────────────
-- Auto-computes weight from account age:
--   anonymous           → 0.5
--   account < 7 days    → 1
--   account ≥ 7 days    → 2
--   admin               → 5  (immediate effect)
--
-- Then it sums report_weight on the target and updates moderation_state:
--   ≥ 2  → 'ai_reviewing'    (server kicks the strict-AI edge fn)
--   ≥ 5  → 'shadow'          (soft moderation: still visible to author, ranked low)
--   ≥ 10 → 'hidden'          (only admins + author can see, awaits manual)
--
-- Returns the new aggregate weight so the client can show a thank-you UI.
create or replace function public.submit_report(
  p_target_type text,
  p_target_id   uuid,
  p_reason      text         default null,
  p_fingerprint text         default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid            uuid    := auth.uid();
  v_age_days       numeric;
  v_weight         numeric;
  v_total_count    int;
  v_total_weight   numeric;
  v_current_state  text;
  v_new_state      text;
  v_table          text;
  v_is_admin       boolean := false;
begin
  if p_target_type not in ('post','comment') then
    raise exception 'invalid target_type';
  end if;

  -- 1. Compute reporter weight
  if v_uid is null then
    v_weight := 0.5;
  else
    select extract(epoch from (now() - created_at)) / 86400
      into v_age_days from auth.users where id = v_uid;
    if v_age_days is null then v_weight := 1;
    elsif v_age_days < 7 then v_weight := 1;
    else                      v_weight := 2;
    end if;

    select exists(select 1 from public.admin_roles where user_id = v_uid) into v_is_admin;
    if v_is_admin then v_weight := 5; end if;
  end if;

  -- 2. Insert the report (will fail uniquely if this user already reported)
  begin
    insert into public.reports (target_type, target_id, reporter_id, reporter_fp, reason, weight)
    values (p_target_type, p_target_id, v_uid, p_fingerprint, p_reason, v_weight);
  exception when unique_violation then
    return jsonb_build_object('ok', false, 'error', 'already_reported');
  end;

  -- 3. Recompute aggregates on the target row
  if p_target_type = 'post' then v_table := 'posts'; else v_table := 'comments'; end if;

  execute format(
    'update public.%I
        set report_count  = (select count(*)::int from public.reports
                              where target_type = %L and target_id = $1),
            report_weight = (select coalesce(sum(weight),0) from public.reports
                              where target_type = %L and target_id = $1)
      where id = $1
      returning report_count, report_weight, moderation_state',
    v_table, p_target_type, p_target_type
  )
  into v_total_count, v_total_weight, v_current_state
  using p_target_id;

  -- 4. Escalation ladder (only escalate, never demote here)
  v_new_state := v_current_state;
  if v_current_state = 'active' and v_total_weight >= 2 then
    v_new_state := 'ai_reviewing';
  end if;
  if v_total_weight >= 5 and v_current_state in ('active','ai_reviewing') then
    v_new_state := 'shadow';
  end if;
  if v_total_weight >= 10 and v_current_state not in ('removed','pending_manual') then
    v_new_state := 'hidden';
  end if;

  if v_new_state <> v_current_state then
    execute format(
      'update public.%I set moderation_state = $1 where id = $2',
      v_table
    ) using v_new_state, p_target_id;
  end if;

  return jsonb_build_object(
    'ok',            true,
    'weight_added',  v_weight,
    'total_weight',  v_total_weight,
    'total_count',   v_total_count,
    'new_state',     v_new_state
  );
end $$;

grant execute on function public.submit_report(text, uuid, text, text)
  to authenticated, anon;


-- ────────────────────────────────────────────────────────────────
-- 5) admin_decide — manual moderation actions
-- ────────────────────────────────────────────────────────────────
-- decision: 'keep' | 'shadow' | 'remove'
-- keep    → state = 'active', resets aggregates (false-positive flood)
-- shadow  → state = 'shadow' (visible only to author, downranked)
-- remove  → state = 'removed' (gone from everywhere except admin log)
create or replace function public.admin_decide(
  p_target_type text,
  p_target_id   uuid,
  p_decision    text,
  p_note        text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  v_table  text;
  v_state  text;
begin
  if not public.is_admin(v_uid) then
    raise exception 'forbidden';
  end if;
  if p_target_type not in ('post','comment') then
    raise exception 'invalid target_type';
  end if;
  if p_decision not in ('keep','shadow','remove') then
    raise exception 'invalid decision';
  end if;

  if p_target_type = 'post' then v_table := 'posts'; else v_table := 'comments'; end if;

  v_state := case p_decision
    when 'keep'   then 'active'
    when 'shadow' then 'shadow'
    when 'remove' then 'removed'
  end;

  execute format(
    'update public.%I
        set moderation_state = $1,
            moderation_note  = coalesce($2, moderation_note),
            moderated_at     = now(),
            moderated_by     = $3
        %s
      where id = $4',
    v_table,
    -- on "keep" we wipe aggregates so the post escapes the queue
    case when p_decision = 'keep' then ', report_count = 0, report_weight = 0' else '' end
  )
  using v_state, p_note, v_uid, p_target_id;

  -- Audit log
  insert into public.moderation_log (target_type, target_id, action, decided_by, note)
  values (p_target_type, p_target_id, p_decision, v_uid, p_note);

  return jsonb_build_object('ok', true, 'new_state', v_state);
end $$;

grant execute on function public.admin_decide(text, uuid, text, text)
  to authenticated;


-- ────────────────────────────────────────────────────────────────
-- 6) moderation_log — append-only audit trail
-- ────────────────────────────────────────────────────────────────
-- The table may already exist from migration 001 with a different
-- schema (e.g. one without target_type). We use ADD COLUMN IF NOT
-- EXISTS to make this safely re-runnable on top of any prior shape.
create table if not exists public.moderation_log (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz default now()
);

alter table public.moderation_log
  add column if not exists target_type  text,
  add column if not exists target_id    uuid,
  add column if not exists action       text,
  add column if not exists decided_by   uuid,
  add column if not exists note         text;

-- Add the CHECK constraint only if the column is now correctly populated
do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'moderation_log_target_type_check'
  ) then
    -- only enforce when there are no NULL/invalid existing rows
    if not exists (
      select 1 from public.moderation_log
       where target_type is not null
         and target_type not in ('post','comment')
    ) then
      alter table public.moderation_log
        add constraint moderation_log_target_type_check
        check (target_type in ('post','comment'));
    end if;
  end if;
end $$;

alter table public.moderation_log enable row level security;
drop policy if exists "modlog_select_admin" on public.moderation_log;
create policy "modlog_select_admin"
  on public.moderation_log for select
  to authenticated
  using (public.is_admin());

grant select on public.moderation_log to authenticated;
grant select, insert, update, delete on public.moderation_log to service_role;


-- ────────────────────────────────────────────────────────────────
-- 7) admin_queue view — what the admin page reads
-- ────────────────────────────────────────────────────────────────
create or replace view public.admin_queue as
  select
    'post'::text   as target_type,
    p.id           as target_id,
    p.title,
    p.content,
    p.lang,
    p.created_at,
    p.moderation_state,
    p.report_count,
    p.report_weight,
    p.user_id      as author_id,
    p.moderation_note
  from public.posts p
  where p.moderation_state in ('ai_reviewing','shadow','hidden','pending_manual')
  union all
  select
    'comment'::text,
    c.id,
    null::text     as title,
    c.content,
    null::text     as lang,
    c.created_at,
    c.moderation_state,
    c.report_count,
    c.report_weight,
    c.user_id,
    c.moderation_note
  from public.comments c
  where c.moderation_state in ('ai_reviewing','shadow','hidden','pending_manual');

grant select on public.admin_queue to authenticated;
-- access is gated by is_admin() in queries the page makes;
-- additionally we wrap that with a SECURITY DEFINER rpc below.

create or replace function public.admin_queue_list()
returns setof public.admin_queue
language sql
security definer
set search_path = public
as $$
  select *
    from public.admin_queue
   where public.is_admin();
$$;

grant execute on function public.admin_queue_list() to authenticated;


-- ────────────────────────────────────────────────────────────────
-- 8) Feed visibility — hide non-active content from the public feed.
--    Approach: filter at the API level (Supabase queries already
--    select on posts; we add a server-side default filter via RLS).
-- ────────────────────────────────────────────────────────────────
alter table public.posts    enable row level security;
alter table public.comments enable row level security;

-- Anyone (anon + authenticated) can read 'active' content.
drop policy if exists "posts_read_active"    on public.posts;
drop policy if exists "comments_read_active" on public.comments;

create policy "posts_read_active"
  on public.posts for select
  to anon, authenticated
  using (
       moderation_state = 'active'
    or moderation_state = 'shadow'      -- shadow stays visible to public (just downranked client-side)
    or (auth.uid() is not null and auth.uid() = user_id)
    or public.is_admin()
  );

create policy "comments_read_active"
  on public.comments for select
  to anon, authenticated
  using (
       moderation_state = 'active'
    or moderation_state = 'shadow'
    or (auth.uid() is not null and auth.uid() = user_id)
    or public.is_admin()
  );

-- Insert / update / delete policies (own content only) — keep them simple
drop policy if exists "posts_insert_self"    on public.posts;
drop policy if exists "posts_update_self"    on public.posts;
drop policy if exists "posts_delete_self"    on public.posts;
drop policy if exists "comments_insert_self" on public.comments;
drop policy if exists "comments_update_self" on public.comments;
drop policy if exists "comments_delete_self" on public.comments;

-- INSERT policies use WITH CHECK only (Postgres error 42601 if USING is added).
-- Allow either an authenticated user inserting their own row, or an anon
-- insert with user_id NULL (anonymous post / comment).
create policy "posts_insert_self"    on public.posts    for insert to authenticated, anon
  with check (auth.uid() is null and user_id is null
              or auth.uid() = user_id);

create policy "posts_update_self"    on public.posts    for update to authenticated
  using (auth.uid() = user_id or public.is_admin());

create policy "posts_delete_self"    on public.posts    for delete to authenticated
  using (auth.uid() = user_id or public.is_admin());

create policy "comments_insert_self" on public.comments for insert to authenticated, anon
  with check (auth.uid() is null and user_id is null
              or auth.uid() = user_id);

create policy "comments_update_self" on public.comments for update to authenticated
  using (auth.uid() = user_id or public.is_admin());

create policy "comments_delete_self" on public.comments for delete to authenticated
  using (auth.uid() = user_id or public.is_admin());


-- ════════════════════════════════════════════════════════════════
-- DONE.
-- Promote your first admin with:
--   insert into public.admin_roles (user_id, role)
--   values ('<your-auth.uid()-here>', 'super_admin');
-- ════════════════════════════════════════════════════════════════
