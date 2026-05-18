-- ═══════════════════════════════════════════════════════════════════
-- 004_modlog_legacy_columns.sql
--
-- The moderation_log table predates this moderation system and has
-- extra columns with NOT NULL constraints (e.g. "content_type") that
-- our current code doesn't fill. Result: every admin_decide INSERT
-- crashes with "null value in column ... violates not-null constraint".
--
-- This migration:
--   • drops NOT NULL from every legacy column we don't own
--   • leaves our own columns (target_type, target_id, action, etc.)
--     intact
--   • is fully idempotent (safe to re-run)
--
-- Run AFTER 003 in Supabase → SQL Editor.
-- ═══════════════════════════════════════════════════════════════════

do $$
declare
  rec record;
  ours text[] := array[
    -- columns we created in 002/003 and intend to write
    'id', 'created_at',
    'target_type', 'target_id', 'action', 'decided_by', 'note'
  ];
begin
  for rec in
    select column_name
      from information_schema.columns
     where table_schema = 'public'
       and table_name   = 'moderation_log'
       and is_nullable  = 'NO'
       and not (column_name = any (ours))
  loop
    raise notice 'Dropping NOT NULL on legacy column moderation_log.%', rec.column_name;
    execute format(
      'alter table public.moderation_log alter column %I drop not null',
      rec.column_name
    );
  end loop;
end $$;

-- For completeness, also make sure the columns WE need exist:
alter table if exists public.moderation_log
  add column if not exists target_type text,
  add column if not exists target_id   uuid,
  add column if not exists action      text,
  add column if not exists decided_by  uuid,
  add column if not exists note        text;


-- ── Diagnostic: what does moderation_log look like now? ─────────
-- Run this after the block above and you should see every column
-- with is_nullable='YES' EXCEPT 'id'.
select column_name, data_type, is_nullable
  from information_schema.columns
 where table_schema='public' and table_name='moderation_log'
 order by ordinal_position;
