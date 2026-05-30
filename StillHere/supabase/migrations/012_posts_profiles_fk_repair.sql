-- =============================================================
-- 012_posts_profiles_fk_repair.sql
--
-- After 011 enabled RLS on profiles, PostgREST started returning
-- "Could not find a relationship between 'posts' and 'profiles'
-- in the schema cache" on every feed/post query — the schema
-- cache went stale and/or the foreign key is missing.
--
-- This migration:
--   1. Verifies / creates the FK posts.user_id → profiles.id
--      so PostgREST can auto-embed profiles in queries like
--      `posts.select('*, profiles(username, display_name)')`.
--   2. Same for comments.user_id → profiles.id (used by the
--      comments query on the post page).
--   3. Forces PostgREST to reload its schema cache via NOTIFY.
--
-- Idempotent: re-runnable, won't error if FKs already exist.
-- =============================================================


-- ────────────────────────────────────────────────────────────────
-- 1. posts.user_id → profiles.id
-- ────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE  table_schema = 'public'
      AND  table_name   = 'posts'
      AND  constraint_type = 'FOREIGN KEY'
      AND  constraint_name = 'posts_user_id_profiles_fkey'
  ) THEN
    -- Only create if no other FK already covers user_id → profiles.id
    IF NOT EXISTS (
      SELECT 1
      FROM   pg_constraint c
      JOIN   pg_class      t  ON t.oid  = c.conrelid
      JOIN   pg_class      ft ON ft.oid = c.confrelid
      JOIN   pg_attribute  a  ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
      WHERE  c.contype  = 'f'
        AND  t.relname  = 'posts'
        AND  ft.relname = 'profiles'
        AND  a.attname  = 'user_id'
    ) THEN
      ALTER TABLE public.posts
        ADD CONSTRAINT posts_user_id_profiles_fkey
        FOREIGN KEY (user_id) REFERENCES public.profiles(id)
        ON DELETE SET NULL;
    END IF;
  END IF;
END $$;


-- ────────────────────────────────────────────────────────────────
-- 2. comments.user_id → profiles.id (mirror of the above)
-- ────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE  table_schema = 'public'
      AND  table_name   = 'comments'
      AND  constraint_type = 'FOREIGN KEY'
      AND  constraint_name = 'comments_user_id_profiles_fkey'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM   pg_constraint c
      JOIN   pg_class      t  ON t.oid  = c.conrelid
      JOIN   pg_class      ft ON ft.oid = c.confrelid
      JOIN   pg_attribute  a  ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
      WHERE  c.contype  = 'f'
        AND  t.relname  = 'comments'
        AND  ft.relname = 'profiles'
        AND  a.attname  = 'user_id'
    ) THEN
      ALTER TABLE public.comments
        ADD CONSTRAINT comments_user_id_profiles_fkey
        FOREIGN KEY (user_id) REFERENCES public.profiles(id)
        ON DELETE SET NULL;
    END IF;
  END IF;
END $$;


-- ────────────────────────────────────────────────────────────────
-- 3. Reload PostgREST schema cache — picks up new FKs immediately
--    so the next request from the browser doesn't fail with the
--    stale-cache error.
-- ────────────────────────────────────────────────────────────────
NOTIFY pgrst, 'reload schema';
