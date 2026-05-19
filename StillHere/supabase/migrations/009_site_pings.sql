-- ═══════════════════════════════════════════════════════════════════
-- 009_site_pings.sql
--
-- A radically minimal site-traffic counter. The table stores ONLY a
-- timestamp per visit — no IP, no user_id, no fingerprint, no path,
-- no user agent. You cannot reconstruct who did what from this data.
-- The whole point is to power the "X online right now / Y total"
-- widget on the statistics page without violating the privacy policy.
--
-- Two RPCs:
--   site_ping()  → INSERT a row. Called from the client on page load
--                  and every 30 seconds while the tab is open.
--   site_stats() → returns { online, today, total }.
--                  Both are public/anon-callable because the data is
--                  not sensitive — just integers.
--
-- Bloat management: a tiny "garbage collector" function trims rows
-- older than 365 days. Run it manually or via Supabase cron monthly.
-- ═══════════════════════════════════════════════════════════════════

create table if not exists public.site_pings (
  id        bigserial primary key,
  pinged_at timestamptz not null default now()
);

-- Index for the "recent" queries (online/today). Helps avoid full scans
-- once the table grows.
create index if not exists site_pings_pinged_at_idx
  on public.site_pings (pinged_at desc);


-- ── site_ping() — public, callable by anyone ─────────────────────
create or replace function public.site_ping()
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.site_pings default values;
$$;

revoke all on function public.site_ping() from public;
grant execute on function public.site_ping() to anon, authenticated;


-- ── site_stats() — public, returns aggregate numbers ─────────────
create or replace function public.site_stats()
returns table (
  online bigint,   -- pings in the last 5 minutes
  today  bigint,   -- pings since midnight (server tz)
  total  bigint    -- all-time pings
)
language sql
stable
security definer
set search_path = public
as $$
  select
    (select count(*) from public.site_pings where pinged_at > now() - interval '5 minutes'),
    (select count(*) from public.site_pings where pinged_at >= current_date),
    (select count(*) from public.site_pings);
$$;

revoke all on function public.site_stats() from public;
grant execute on function public.site_stats() to anon, authenticated;


-- ── Lock down direct table access ────────────────────────────────
-- Clients should ONLY go through the RPCs above.
alter table public.site_pings enable row level security;
revoke all on public.site_pings from anon, authenticated;
-- (no policies = no rows visible/insertable directly; only the
--  security-definer functions above can touch the table.)


-- ── Optional periodic cleanup ────────────────────────────────────
-- Trims rows older than 365 days. Safe to call any time. Run e.g.
-- via Dashboard → Database → Cron Jobs (monthly).
create or replace function public.site_pings_gc()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_removed int;
begin
  delete from public.site_pings where pinged_at < now() - interval '365 days';
  get diagnostics v_removed = row_count;
  return v_removed;
end;
$$;
revoke all on function public.site_pings_gc() from public, anon, authenticated;


-- ════════════════════════════════════════════════════════════════
-- Verify after running:
--   select * from public.site_stats();   -- should return one row of zeros
--   select public.site_ping();           -- inserts a test row
--   select * from public.site_stats();   -- total should be 1
-- ════════════════════════════════════════════════════════════════
