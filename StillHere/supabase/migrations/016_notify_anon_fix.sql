-- =============================================================
-- 016_notify_anon_fix.sql
--
-- 015 created notify_on_comment() with `v_post_author <> NEW.user_id`.
-- When the commenter is anonymous, NEW.user_id is NULL, and any
-- comparison with NULL in SQL is NULL — which `IF` treats as FALSE.
-- Result: anon comments produced no notification at all.
--
-- Switch to `IS DISTINCT FROM` so NULL ≠ <real-uuid> evaluates true,
-- and the post author does get pinged.
-- =============================================================

CREATE OR REPLACE FUNCTION public.notify_on_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_post_author   uuid;
  v_parent_author uuid;
  v_preview       text;
BEGIN
  v_preview := left(coalesce(NEW.content, ''), 140);

  -- 1) Notify the post author (NULL-safe: an anonymous commenter
  --    still triggers the post-author notification).
  SELECT user_id INTO v_post_author FROM public.posts WHERE id = NEW.post_id;
  IF v_post_author IS NOT NULL
     AND v_post_author IS DISTINCT FROM NEW.user_id THEN
    INSERT INTO public.notifications
      (user_id, actor_id, type, target_post_id, target_comment_id, preview)
    VALUES
      (v_post_author, NEW.user_id, 'comment_on_post', NEW.post_id, NEW.id, v_preview);
  END IF;

  -- 2) If this is a reply, notify the parent-comment author too
  --    (unless that's the same person as the post author, or the
  --    same as the replier — again, NULL-safe).
  IF NEW.parent_id IS NOT NULL THEN
    SELECT user_id INTO v_parent_author FROM public.comments WHERE id = NEW.parent_id;
    IF v_parent_author IS NOT NULL
       AND v_parent_author IS DISTINCT FROM NEW.user_id
       AND v_parent_author IS DISTINCT FROM v_post_author
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
