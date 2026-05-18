-- ═══════════════════════════════════════════════════════════════════
-- 005_hard_delete_on_remove.sql
--
-- Change admin_decide so that "remove" performs a HARD DELETE
-- of the underlying post/comment row, instead of just flipping
-- moderation_state to 'removed'.
--
--   keep    → state = 'active', aggregates reset
--   shadow  → state = 'shadow'   (soft moderation — visible to author)
--   remove  → row deleted entirely + audit log entry kept
--
-- The audit log preserves the history of what was removed,
-- so admins can always see WHAT was deleted, WHO did it, and WHY.
--
-- Run in Supabase → SQL Editor. Safe to re-run (CREATE OR REPLACE).
-- ═══════════════════════════════════════════════════════════════════

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
  v_uid     uuid := auth.uid();
  v_table   text;
  v_state   text;
  v_snapshot jsonb;
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

  if p_decision = 'remove' then
    -- Snapshot the row so the audit log preserves what was deleted
    execute format('select to_jsonb(t) from public.%I t where id = $1', v_table)
       into v_snapshot
      using p_target_id;

    -- Also cascade-delete the reports for this target so the queue
    -- doesn't keep a phantom row
    delete from public.reports
     where target_type = p_target_type and target_id = p_target_id;

    -- Hard delete the actual content
    execute format('delete from public.%I where id = $1', v_table)
      using p_target_id;

    insert into public.moderation_log
      (target_type, target_id, action, decided_by, note)
    values
      (p_target_type, p_target_id, 'remove_hard_delete', v_uid,
       coalesce(p_note, '') ||
       (case when v_snapshot is not null
             then ' | snapshot: ' || left(v_snapshot::text, 1500)
             else '' end));

    return jsonb_build_object('ok', true, 'deleted', true);
  end if;

  -- 'keep' or 'shadow' — soft updates as before
  v_state := case p_decision
    when 'keep'   then 'active'
    when 'shadow' then 'shadow'
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
    case when p_decision = 'keep' then ', report_count = 0, report_weight = 0' else '' end
  )
  using v_state, p_note, v_uid, p_target_id;

  insert into public.moderation_log (target_type, target_id, action, decided_by, note)
  values (p_target_type, p_target_id, p_decision, v_uid, p_note);

  return jsonb_build_object('ok', true, 'new_state', v_state);
end $$;

grant execute on function public.admin_decide(text, uuid, text, text)
  to authenticated;


-- ════════════════════════════════════════════════════════════════
-- Also do the same for the strict-review AI: when verdict = "violation"
-- the post should be REALLY gone, not just soft-removed.
-- We'll change the edge function in a follow-up commit; for now keep
-- the soft-remove (so admins can review what the AI deleted via
-- moderation_log snapshots). Toggle via the boolean below.
-- ════════════════════════════════════════════════════════════════
