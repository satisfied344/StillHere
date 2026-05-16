-- ═══════════════════════════════════════════════════════════════════
-- Explicit Data API grants
-- Required from May 30 for new projects / Oct 30 for all projects
-- Run in: Supabase → SQL Editor
-- ═══════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────
-- profiles
-- anon  : read only (public profiles in feed)
-- authenticated : read + upsert own profile
-- ─────────────────────────────────────────
GRANT SELECT
  ON public.profiles
  TO anon;

GRANT SELECT, INSERT, UPDATE
  ON public.profiles
  TO authenticated;

-- ─────────────────────────────────────────
-- posts
-- anon  : read (public feed)
-- authenticated : full CRUD on own posts
-- ─────────────────────────────────────────
GRANT SELECT
  ON public.posts
  TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.posts
  TO authenticated;

-- ─────────────────────────────────────────
-- comments
-- anon  : read
-- authenticated : full CRUD
-- ─────────────────────────────────────────
GRANT SELECT
  ON public.comments
  TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.comments
  TO authenticated;

-- NOTE: post-media is a Storage BUCKET, not a table → no GRANT needed

-- ─────────────────────────────────────────
-- moderation_log
-- Only the Edge Function (service_role) writes here.
-- Authenticated users can read their OWN rows (RLS handles filtering).
-- anon gets nothing.
-- ─────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.moderation_log
  TO service_role;

GRANT SELECT
  ON public.moderation_log
  TO authenticated;

-- ─────────────────────────────────────────
-- user_bans
-- service_role : full access (Edge Function bans/unbans)
-- authenticated : SELECT own row (RLS policy already exists)
-- ─────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.user_bans
  TO service_role;

GRANT SELECT
  ON public.user_bans
  TO authenticated;
