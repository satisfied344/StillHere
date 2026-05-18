-- ═══════════════════════════════════════════════════════════════════
-- 006_admin_queue_show_decisions.sql
--
-- 1. Expose `moderated_by` in the admin_queue view so the client can
--    distinguish "decision pending" from "decided by an admin already".
-- 2. Make strict-review's "violation" verdict do a HARD DELETE too,
--    so AI-removed posts are truly gone (matching the admin
--    "remove" button — see migration 005).
--    The strict-review edge function will use this RPC.
--
-- Run after migrations 001-005. Idempotent.
-- ═══════════════════════════════════════════════════════════════════

-- ── 1) Re-create admin_queue with moderated_by ──────────────────
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

grant select on public.admin_queue to authenticated;

-- Recreate the gated RPC wrapper (dropped by the cascade above)
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


-- ── 2) Helper RPC: AI hard-delete on violation ──────────────────
-- Strict-review calls this when verdict = 'violation'. Same shape
-- as admin_decide('remove', …) but caller is the service_role
-- (not a user), so we don't require is_admin().
create or replace function public.ai_hard_delete(
  p_target_type text,
  p_target_id   uuid,
  p_note        text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_table    text;
  v_snapshot jsonb;
begin
  if p_target_type not in ('post','comment') then
    raise exception 'invalid target_type';
  end if;
  if p_target_type = 'post' then v_table := 'posts'; else v_table := 'comments'; end if;

  -- Snapshot for audit log
  execute format('select to_jsonb(t) from public.%I t where id = $1', v_table)
     into v_snapshot
    using p_target_id;

  if v_snapshot is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  -- Cascade-clean reports
  delete from public.reports
   where target_type = p_target_type and target_id = p_target_id;

  -- Hard delete
  execute format('delete from public.%I where id = $1', v_table)
    using p_target_id;

  insert into public.moderation_log
    (target_type, target_id, action, decided_by, note)
  values
    (p_target_type, p_target_id, 'ai_hard_delete', null,
     coalesce(p_note, '') ||
     ' | snapshot: ' || left(v_snapshot::text, 1500));

  return jsonb_build_object('ok', true, 'deleted', true);
end $$;

-- Only the service_role can call this (called from the edge function)
revoke all on function public.ai_hard_delete(text, uuid, text) from public, authenticated, anon;
grant execute on function public.ai_hard_delete(text, uuid, text) to service_role;
