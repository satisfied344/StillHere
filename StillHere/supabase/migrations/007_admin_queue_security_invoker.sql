-- ═══════════════════════════════════════════════════════════════════
-- 007_admin_queue_security_invoker.sql
--
-- Supabase Advisor flagged `public.admin_queue` as a SECURITY DEFINER
-- view. Postgres views default to definer-rights, which means they
-- run with the view OWNER's permissions rather than the calling user's.
-- This is a security smell — it can silently bypass RLS.
--
-- Fix: recreate the view WITH (security_invoker = true) so it runs
-- with the caller's permissions and respects RLS. The actual admin
-- gating still happens in the SECURITY DEFINER function wrapper
-- `admin_queue_list()` (intentional, calls is_admin()).
--
-- Requires Postgres 15+ (Supabase runs 15.x).
-- ═══════════════════════════════════════════════════════════════════

-- Drop and recreate so we can attach the option from the start
drop view if exists public.admin_queue cascade;

create view public.admin_queue
  with (security_invoker = true)
as
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
    p.moderation_note,
    p.moderated_at,
    p.moderated_by
  from public.posts p
  where p.moderation_state <> 'active'
     or p.report_count > 0
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
    c.moderation_note,
    c.moderated_at,
    c.moderated_by
  from public.comments c
  where c.moderation_state <> 'active'
     or c.report_count > 0;

-- Revoke broad access — only the security-definer wrapper exposes data.
revoke all on public.admin_queue from public, anon, authenticated;

-- The function wrapper is the only legitimate entry point and it
-- does its own is_admin() check inside.
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

-- service_role needs read access for the function to actually return rows
grant select on public.admin_queue to service_role;

grant execute on function public.admin_queue_list() to authenticated;


-- ════════════════════════════════════════════════════════════════
-- Verify after running:
--   select pg_get_viewdef('public.admin_queue', true);          -- shows definition
--   select c.reloptions
--     from pg_class c
--     join pg_namespace n on c.relnamespace = n.oid
--    where c.relname = 'admin_queue' and n.nspname = 'public';
--   -- reloptions should contain {security_invoker=true}
--
-- Then re-run Supabase Advisor — the CRITICAL finding should be gone.
-- ════════════════════════════════════════════════════════════════
