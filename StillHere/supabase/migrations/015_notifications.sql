-- =============================================================
-- 015_notifications.sql
--
-- Notification + realtime loop. Two pieces:
--   1. notifications table (one row per delivered notification).
--   2. Trigger on comments INSERT that creates a row for the post
--      author and / or the parent-comment author.
--
-- The frontend (JS/notifications.js) subscribes to the Supabase
-- Realtime channel for INSERTs on notifications WHERE user_id = me,
-- shows a small corner toast, and bumps an unread-count badge.
--
-- Idempotent / safe to re-run.
-- =============================================================

-- ────────────────────────────────────────────────────────────────
-- 1. Table
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
  id                bigserial PRIMARY KEY,
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_id          uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  type              text NOT NULL,                -- 'comment_on_post' | 'reply_to_comment'
  target_post_id    uuid REFERENCES public.posts(id)    ON DELETE CASCADE,
  target_comment_id uuid REFERENCES public.comments(id) ON DELETE CASCADE,
  preview           text,                          -- short snippet of the content
  created_at        timestamptz NOT NULL DEFAULT now(),
  read_at           timestamptz
);

CREATE INDEX IF NOT EXISTS notifications_user_recent
  ON public.notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_user_unread
  ON public.notifications (user_id, created_at DESC)
  WHERE read_at IS NULL;

-- ────────────────────────────────────────────────────────────────
-- 2. RLS — owner can read / update only their own notifications
-- ────────────────────────────────────────────────────────────────
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notifications_select_own ON public.notifications;
DROP POLICY IF EXISTS notifications_update_own ON public.notifications;
DROP POLICY IF EXISTS notifications_delete_own ON public.notifications;

CREATE POLICY notifications_select_own
  ON public.notifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY notifications_update_own
  ON public.notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY notifications_delete_own
  ON public.notifications FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Inserts only happen via SECURITY DEFINER trigger below — no INSERT
-- policy is needed for the authenticated role. Good: this means
-- clients literally cannot forge a notification to another user.

-- ────────────────────────────────────────────────────────────────
-- 3. Trigger on comments INSERT
--    • Top-level comment on a post → notify post author.
--    • Reply (parent_id IS NOT NULL) → notify parent-comment author.
--      Always skip self-notifications (commenting on your own post).
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.notify_on_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_post_author uuid;
  v_parent_author uuid;
  v_preview text;
BEGIN
  v_preview := left(coalesce(NEW.content, ''), 140);

  -- 1) Notify post author (skip when same person).
  SELECT user_id INTO v_post_author FROM public.posts WHERE id = NEW.post_id;
  IF v_post_author IS NOT NULL AND v_post_author <> NEW.user_id THEN
    INSERT INTO public.notifications
      (user_id, actor_id, type, target_post_id, target_comment_id, preview)
    VALUES
      (v_post_author, NEW.user_id, 'comment_on_post', NEW.post_id, NEW.id, v_preview);
  END IF;

  -- 2) If this is a reply, notify the parent-comment author too
  --    (unless that's the same person as the post author we already
  --    notified, or the same as the replier).
  IF NEW.parent_id IS NOT NULL THEN
    SELECT user_id INTO v_parent_author FROM public.comments WHERE id = NEW.parent_id;
    IF v_parent_author IS NOT NULL
       AND v_parent_author <> NEW.user_id
       AND v_parent_author <> coalesce(v_post_author, '00000000-0000-0000-0000-000000000000'::uuid)
    THEN
      INSERT INTO public.notifications
        (user_id, actor_id, type, target_post_id, target_comment_id, preview)
      VALUES
        (v_parent_author, NEW.user_id, 'reply_to_comment', NEW.post_id, NEW.id, v_preview);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_on_comment() FROM PUBLIC;

DROP TRIGGER IF EXISTS on_comment_notify ON public.comments;
CREATE TRIGGER on_comment_notify
  AFTER INSERT ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_comment();

-- ────────────────────────────────────────────────────────────────
-- 4. Realtime: add tables to the publication so JS can subscribe.
--    `notifications` is the main one (per-user toast trigger).
--    `posts` lets the feed prepend new stories live.
-- ────────────────────────────────────────────────────────────────
DO $$
BEGIN
  -- notifications
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications';
  END IF;

  -- posts
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'posts'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.posts';
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- ignore — publication may not exist on a fresh install or have
  -- a different name; user can add tables in the Dashboard.
  NULL;
END $$;

-- ────────────────────────────────────────────────────────────────
-- 5. Tiny helper: mark-all-read (called from the dropdown).
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.mark_notifications_read()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_count int;
BEGIN
  IF auth.uid() IS NULL THEN RETURN 0; END IF;
  UPDATE public.notifications
     SET read_at = now()
   WHERE user_id = auth.uid() AND read_at IS NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_notifications_read() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_notifications_read() TO authenticated;
