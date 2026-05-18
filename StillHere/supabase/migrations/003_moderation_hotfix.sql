-- ═══════════════════════════════════════════════════════════════════
-- StillHere — moderation hotfix
-- 003_moderation_hotfix.sql
--
-- Fixes three real issues caught during testing:
--   1. moderation_log was missing target_type / target_id columns
--      (admin_decide INSERT was failing with "column does not exist")
--   2. submit_report skipped ai_reviewing when a high-weight (e.g.
--      admin = 5) report instantly pushed state to 'shadow' —
--      so the AI never ran. Now ANY escalation past 'active' returns
--      should_review=true and the JS kicks strict-review.
--   3. admin_queue only showed escalated content. Now it ALSO shows
--      'active' content as long as it has at least one report, so
--      the "All" tab on /admin.html surfaces every single report.
--
-- Run AFTER 002_moderation_system.sql in Supabase → SQL Editor.
-- Safe to run repeatedly (idempotent).
-- ═══════════════════════════════════════════════════════════════════


-- ── 1) Ensure moderation_log has the right shape ────────────────
-- If the table was missing these columns from a prior migration,
-- add them now. (No-op if already present.)
alter table if exists public.moderation_log
  add column if not exists target_type text,
  add column if not exists target_id   uuid,
  add column if not exists action      text,
  add column if not exists decided_by  uuid,
  add column if not exists note        text,
  add column if not exists created_at  timestamptz default now();


-- ── 2) Replace submit_report so the AI is ALWAYS triggered when
--       moderation_state escalates, not just on the 'ai_reviewing'
--       intermediate step.
-- ────────────────────────────────────────────────────────────────
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
  v_should_review  boolean := false;
begin
  if p_target_type not in ('post','comment') then
    raise exception 'invalid target_type';
  end if;

  -- Compute weight from reporter properties
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

  begin
    insert into public.reports (target_type, target_id, reporter_id, reporter_fp, reason, weight)
    values (p_target_type, p_target_id, v_uid, p_fingerprint, p_reason, v_weight);
  exception when unique_violation then
    return jsonb_build_object('ok', false, 'error', 'already_reported');
  end;

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

  -- Escalation ladder
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

  -- The AI should run any time we crossed weight ≥ 2 — even if state
  -- skipped 'ai_reviewing' and went straight to 'shadow' or 'hidden'.
  v_should_review := (v_total_weight >= 2)
                    and v_new_state not in ('removed','pending_manual');

  return jsonb_build_object(
    'ok',             true,
    'weight_added',   v_weight,
    'total_weight',   v_total_weight,
    'total_count',    v_total_count,
    'new_state',      v_new_state,
    'should_review',  v_should_review
  );
end $$;

grant execute on function public.submit_report(text, uuid, text, text)
  to authenticated, anon;


-- ── 3) Widen admin_queue so ANY post/comment with ≥ 1 report is
--       visible, even if state is still 'active' (low weight).
-- ────────────────────────────────────────────────────────────────
drop view if exists public.admin_queue cascade;

create view public.admin_queue as
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
    c.moderation_note
  from public.comments c
  where c.moderation_state <> 'active'
     or c.report_count > 0;

grant select on public.admin_queue to authenticated;

-- Recreate the gated RPC wrapper (drop view + cascade above
-- removes its dependency on the function).
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


-- ════════════════════════════════════════════════════════════════
-- DONE.
-- After re-running: report a post → it should appear in /admin.html
-- "All" tab even at weight 0.5. The "AI reviewing" tab will populate
-- when weight crosses 2 OR when the JS kicks strict-review.
-- ════════════════════════════════════════════════════════════════
