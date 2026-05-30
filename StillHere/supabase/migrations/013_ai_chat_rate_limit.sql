-- =============================================================
-- 013_ai_chat_rate_limit.sql   (v2 — anonymous-friendly)
--
-- The ai-chat edge function is OPEN to anonymous users by design
-- (anyone can talk to the companion without an account). The risk is
-- cost-abuse: someone scripting unlimited OpenRouter calls on your bill.
--
-- This throttles BOTH kinds of caller without requiring login:
--   • logged-in users  → limited per user id  (generous)
--   • anonymous users  → limited per hashed IP (stricter)
--
-- Design: a single ledger keyed by an opaque "subject" string the edge
-- function builds:  'u:<uuid>'  or  'ip:<sha256-of-ip>'. No raw IP is
-- ever stored (privacy), just its hash.
--
--   ai_chat_usage(id, subject text, created_at)
--   ai_rate_check(subject text, max_hour int, max_day int) → jsonb
--
-- Re-runnable: drops & recreates (the ledger holds no precious data).
-- =============================================================

-- ────────────────────────────────────────────────────────────────
-- 1. Usage ledger (subject-keyed)
-- ────────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS public.ai_chat_usage CASCADE;

CREATE TABLE public.ai_chat_usage (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  subject    text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ai_chat_usage_subject_time
  ON public.ai_chat_usage (subject, created_at DESC);

-- Only the service role (edge function) touches this. RLS on, no
-- client policy → anon/authenticated can't read or write directly.
ALTER TABLE public.ai_chat_usage ENABLE ROW LEVEL SECURITY;


-- ────────────────────────────────────────────────────────────────
-- 2. Atomic rate check + record
--    Returns jsonb { allowed, reason, used_hour, used_day,
--                    max_hour, max_day, retry_after_seconds }
-- ────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.ai_rate_check(uuid, int, int);
DROP FUNCTION IF EXISTS public.ai_rate_check(text, int, int);

CREATE FUNCTION public.ai_rate_check(
  p_subject  text,
  p_max_hour int DEFAULT 30,
  p_max_day  int DEFAULT 150
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_used_hour int;
  v_used_day  int;
  v_oldest_in_hour timestamptz;
  v_retry int := 0;
BEGIN
  IF p_subject IS NULL OR length(p_subject) = 0 THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'no_subject');
  END IF;

  SELECT count(*) INTO v_used_hour
  FROM   public.ai_chat_usage
  WHERE  subject = p_subject
    AND  created_at > now() - interval '1 hour';

  SELECT count(*) INTO v_used_day
  FROM   public.ai_chat_usage
  WHERE  subject = p_subject
    AND  created_at > now() - interval '1 day';

  IF v_used_hour >= p_max_hour THEN
    SELECT min(created_at) INTO v_oldest_in_hour
    FROM   public.ai_chat_usage
    WHERE  subject = p_subject
      AND  created_at > now() - interval '1 hour';
    v_retry := GREATEST(1, CEIL(EXTRACT(EPOCH FROM
                 (v_oldest_in_hour + interval '1 hour' - now())))::int);
    RETURN jsonb_build_object(
      'allowed', false, 'reason', 'hour_limit',
      'used_hour', v_used_hour, 'used_day', v_used_day,
      'max_hour', p_max_hour, 'max_day', p_max_day,
      'retry_after_seconds', v_retry
    );
  END IF;

  IF v_used_day >= p_max_day THEN
    RETURN jsonb_build_object(
      'allowed', false, 'reason', 'day_limit',
      'used_hour', v_used_hour, 'used_day', v_used_day,
      'max_hour', p_max_hour, 'max_day', p_max_day,
      'retry_after_seconds', 3600
    );
  END IF;

  INSERT INTO public.ai_chat_usage (subject) VALUES (p_subject);

  RETURN jsonb_build_object(
    'allowed', true, 'reason', 'ok',
    'used_hour', v_used_hour + 1, 'used_day', v_used_day + 1,
    'max_hour', p_max_hour, 'max_day', p_max_day,
    'retry_after_seconds', 0
  );
END;
$$;

REVOKE ALL ON FUNCTION public.ai_rate_check(text, int, int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ai_rate_check(text, int, int) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ai_rate_check(text, int, int) TO service_role;


-- ────────────────────────────────────────────────────────────────
-- 3. Cleanup helper — delete rows older than 2 days.
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.ai_usage_cleanup()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  DELETE FROM public.ai_chat_usage WHERE created_at < now() - interval '2 days';
$$;
REVOKE ALL ON FUNCTION public.ai_usage_cleanup() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ai_usage_cleanup() TO service_role;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'ai-usage-cleanup', '7 * * * *',
      $cron$ SELECT public.ai_usage_cleanup(); $cron$
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;
