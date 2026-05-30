-- =============================================================
-- 011_profiles_hardening.sql
--
-- Three changes that together prevent the "username got
-- silently overwritten with user_xxxxx" bug:
--
--   1. UNIQUE constraint on profiles.username so duplicates
--      fail at the DB level, not just in JS.
--   2. RLS policies: anyone (anon + authenticated) can SELECT
--      profiles, removing the source of "select returned null
--      because RLS hid it" that triggered the bad upsert.
--      A user can still only UPDATE their own profile.
--   3. Trigger on auth.users INSERT that auto-creates a row in
--      public.profiles from signup metadata. This makes the
--      JS-side auto-create path in session.js obsolete (kept
--      there as a defensive fallback, harmless).
--
-- Idempotent: every CREATE uses IF NOT EXISTS / DROP IF EXISTS.
-- Safe to re-run.
-- =============================================================


-- ────────────────────────────────────────────────────────────────
-- 1. UNIQUE constraint on profiles.username (case-insensitive)
-- ────────────────────────────────────────────────────────────────
-- We use a unique INDEX on lower(username) instead of a plain
-- UNIQUE constraint so "Start" and "start" are treated as the
-- same handle — matching auth.js which lowercases before
-- toFakeEmail(). Without case-insensitivity, "Start" could
-- register a second account that login by "start" can't reach.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname  = 'profiles_username_lower_uniq'
  ) THEN
    -- Quick scan for existing duplicates so the CREATE UNIQUE
    -- INDEX doesn't fail. If duplicates exist, raise a notice
    -- with their ids so they can be cleaned up manually first.
    IF EXISTS (
      SELECT lower(username)
      FROM   public.profiles
      WHERE  username IS NOT NULL
      GROUP  BY lower(username)
      HAVING count(*) > 1
    ) THEN
      RAISE EXCEPTION
        'Duplicate usernames exist in profiles.username (case-insensitive). '
        'Resolve them first: SELECT id, username FROM profiles WHERE lower(username) IN '
        '(SELECT lower(username) FROM profiles GROUP BY lower(username) HAVING count(*)>1);';
    END IF;

    CREATE UNIQUE INDEX profiles_username_lower_uniq
      ON public.profiles (lower(username))
      WHERE username IS NOT NULL;
  END IF;
END $$;


-- ────────────────────────────────────────────────────────────────
-- 2. RLS policies — public read, owner-only write
-- ────────────────────────────────────────────────────────────────
-- profiles.username / display_name / avatar_url are public-by-design
-- (they show up on every post card). Hiding them via RLS caused
-- session.js to receive null and incorrectly assume the profile
-- didn't exist, then upsert a synthetic fallback over it.
-- Make read explicitly public for both anon and authenticated.
-- WRITE policies are tightened to "own row only".

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_public_read       ON public.profiles;
DROP POLICY IF EXISTS profiles_insert_own        ON public.profiles;
DROP POLICY IF EXISTS profiles_update_own        ON public.profiles;
DROP POLICY IF EXISTS profiles_delete_own        ON public.profiles;

CREATE POLICY profiles_public_read
  ON public.profiles
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY profiles_insert_own
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY profiles_update_own
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING      (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY profiles_delete_own
  ON public.profiles
  FOR DELETE
  TO authenticated
  USING (auth.uid() = id);


-- ────────────────────────────────────────────────────────────────
-- 3. Trigger: auto-create profile on signup
-- ────────────────────────────────────────────────────────────────
-- Reads username + display_name from raw_user_meta_data (set by
-- auth.js during signUp). Uses ON CONFLICT DO NOTHING so re-runs
-- of the trigger never overwrite an existing profile.
--
-- SECURITY DEFINER so the function runs with table-owner rights
-- and bypasses RLS on insert (auth.uid() isn't reliable inside
-- the trigger context for this kind of bootstrap).
-- Locked search_path to defend against schema-search hijack.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_username     text;
  v_display_name text;
BEGIN
  v_username := NULLIF(NEW.raw_user_meta_data ->> 'username',     '');
  v_display_name := NULLIF(NEW.raw_user_meta_data ->> 'display_name', '');

  -- If username is missing (legacy / OAuth signup), derive a
  -- stable fallback from the user id. This only fires when the
  -- frontend didn't supply a real username.
  IF v_username IS NULL THEN
    v_username := 'user_' || substring(NEW.id::text from 1 for 8);
  END IF;

  INSERT INTO public.profiles (id, username, display_name, avatar_url)
  VALUES (NEW.id, v_username, v_display_name, NULL)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();


-- ────────────────────────────────────────────────────────────────
-- Done. After running this migration:
--   * Duplicate usernames are impossible.
--   * Any logged-in (or anon) client can read username /
--     display_name / avatar_url — no more spurious null reads.
--   * New signups get their profile row automatically.
-- ────────────────────────────────────────────────────────────────
