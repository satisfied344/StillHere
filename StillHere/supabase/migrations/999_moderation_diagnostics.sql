-- ═══════════════════════════════════════════════════════════════════
-- Diagnostics — run these in Supabase → SQL Editor to verify that
-- 002_moderation_system.sql actually applied successfully.
--
-- Each block should print what it finds; if a block returns nothing
-- (where it shouldn't), that piece of the migration didn't take.
-- ═══════════════════════════════════════════════════════════════════


-- 1. Tables exist?
select tablename from pg_tables
 where schemaname='public' and tablename in
   ('reports','admin_roles','moderation_log','posts','comments');


-- 2. moderation_state columns exist?
select table_name, column_name, data_type
  from information_schema.columns
 where table_schema='public'
   and table_name in ('posts','comments')
   and column_name in ('moderation_state','report_count','report_weight');


-- 3. Functions exist?
select proname, prosecdef as security_definer
  from pg_proc
 where pronamespace = 'public'::regnamespace
   and proname in ('submit_report','admin_decide','is_admin','admin_queue_list');


-- 4. Grants are set?
select routine_name, grantee, privilege_type
  from information_schema.routine_privileges
 where routine_schema='public'
   and routine_name in ('submit_report','admin_decide','is_admin','admin_queue_list')
 order by routine_name, grantee;


-- 5. RLS enabled on the protected tables?
select relname, relrowsecurity as rls_on
  from pg_class
 where relnamespace = 'public'::regnamespace
   and relname in ('posts','comments','reports','admin_roles','moderation_log');


-- 6. Any reports actually in the table?
select count(*)        as total_reports,
       count(distinct (target_type, target_id)) as targets_with_reports,
       count(distinct reporter_id) as distinct_reporters
  from public.reports;


-- 7. What state are the reported posts in?
select id, title, moderation_state, report_count, report_weight, created_at
  from public.posts
 where report_count > 0 or moderation_state <> 'active'
 order by report_weight desc, created_at desc
 limit 20;


-- 8. Who's currently an admin?
select ar.user_id, ar.role, p.username, ar.granted_at
  from public.admin_roles ar
  left join public.profiles p on p.id = ar.user_id
 order by ar.granted_at desc;


-- 9. Manual test of the RPC (replace the post-id below with a real one,
--    log out & rerun as different users to verify):
-- select public.submit_report('post', '<some-post-uuid>'::uuid, 'test', 'test-fp');


-- 10. Latest entries in the audit log
select target_type, target_id, action, decided_by, note, created_at
  from public.moderation_log
 order by created_at desc
 limit 20;
