-- ═══════════════════════════════════════════════════════════════════
-- 010_site_pings_distinct.sql
--
-- "online right now" was counting raw pings, so a single browser tab
-- open for 5 minutes (10 pings @ 30s interval) inflated the number to
-- ~10 "people". Fix: each browser session sends a stable random id
-- with every ping, and `site_stats()` counts DISTINCT session_ids in
-- the last 5 minutes. Privacy-equivalent — still no IP, no fingerprint,
-- no user_id; just an ephemeral per-tab random number.
-- ═══════════════════════════════════════════════════════════════════

-- Add the session column (nullable for backward compatibility with
-- rows already in the table from migration 009).
alter table public.site_pings
  add column if not exists session_id text;

create index if not exists site_pings_session_idx
  on public.site_pings (session_id, pinged_at desc)
  where session_id is not null;


-- Updated ping RPC — accepts an optional session_id from the client.
create or replace function public.site_ping(p_session text default null)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.site_pings (session_id) values (p_session);
$$;

revoke all on function public.site_ping(text) from public;
grant execute on function public.site_ping(text) to anon, authenticated;

-- Drop the old zero-arg signature if it exists (will be replaced by
-- the new variadic-default version above; clients calling with no arg
-- still work because the param has a default).
drop function if exists public.site_ping();


-- Updated stats RPC — uses DISTINCT session_id for "online":
--   online = unique tabs that pinged in the last 5 minutes
--   total  = unique tabs ever seen (since session_id was added) +
--            raw-row count for the legacy rows where session_id is null
create or replace function public.site_stats()
returns table (
  online bigint,
  today  bigint,
  total  bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    (select count(distinct coalesce(session_id, id::text))
       from public.site_pings
      where pinged_at > now() - interval '5 minutes'),
    (select count(distinct coalesce(session_id, id::text))
       from public.site_pings
      where pinged_at >= current_date),
    (select count(distinct coalesce(session_id, id::text))
       from public.site_pings);
$$;

revoke all on function public.site_stats() from public;
grant execute on function public.site_stats() to anon, authenticated;

-- ════════════════════════════════════════════════════════════════
-- Verify:
--   select public.site_ping('test-session-1');
--   select public.site_ping('test-session-1'); -- same id; should NOT
--                                              -- inflate "online"
--   select * from public.site_stats();         -- online = 1
-- ════════════════════════════════════════════════════════════════
