-- =============================================================
-- 017_notify_strip_html.sql
--
-- Comments are stored as Quill rich HTML ("<p>...</p>", "<em>...</em>"),
-- so when the notification trigger stuffs `content` into `preview`,
-- the dropdown was showing raw markup like "<p>Папа мама</p>".
--
-- Strip tags + decode the most common entities BEFORE storing.
-- Client-side notifications.js does the same as a defensive second
-- pass so legacy rows (already saved with tags) also render clean.
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
  -- Strip HTML tags and collapse whitespace so previews read as plain text.
  v_preview := regexp_replace(coalesce(NEW.content, ''), '<[^>]*>', '', 'g');
  v_preview := regexp_replace(v_preview, '\s+', ' ', 'g');
  -- Decode the entities Quill / browsers most commonly emit.
  v_preview := replace(v_preview, '&nbsp;', ' ');
  v_preview := replace(v_preview, '&amp;',  '&');
  v_preview := replace(v_preview, '&lt;',   '<');
  v_preview := replace(v_preview, '&gt;',   '>');
  v_preview := replace(v_preview, '&quot;', '"');
  v_preview := replace(v_preview, '&#39;',  '''');
  v_preview := trim(v_preview);
  v_preview := left(v_preview, 140);

  -- 1) Notify the post author (NULL-safe).
  SELECT user_id INTO v_post_author FROM public.posts WHERE id = NEW.post_id;
  IF v_post_author IS NOT NULL
     AND v_post_author IS DISTINCT FROM NEW.user_id THEN
    INSERT INTO public.notifications
      (user_id, actor_id, type, target_post_id, target_comment_id, preview)
    VALUES
      (v_post_author, NEW.user_id, 'comment_on_post', NEW.post_id, NEW.id, v_preview);
  END IF;

  -- 2) Reply → also notify parent-comment author.
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
