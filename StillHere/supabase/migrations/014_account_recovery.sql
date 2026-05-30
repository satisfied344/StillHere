-- =============================================================
-- 014_account_recovery.sql
--
-- StillHere uses fake emails (username@stillhere.users), so the
-- normal "reset password by email" flow can't work — and that's by
-- design (no real email = true anonymity). The cost was: forget your
-- password and your account (and everything you wrote) is gone forever.
--
-- This adds an anonymous, email-free recovery path: a single high-
-- entropy "recovery key" the user saves at signup (like a wallet seed
-- phrase). It's stored ONLY as a SHA-256 hash. To reset a password the
-- user supplies their username + recovery key; an edge function
-- (recover-password) verifies the hash with the service role and sets
-- a new password via the Admin API. No email, no PII.
--
--   account_recovery(user_id pk, key_hash, created_at, updated_at)
--
-- RLS: a logged-in user may create/replace/read the existence of their
-- OWN row (so they can set or rotate a key in settings). Verification
-- at reset time happens server-side with the service role, because the
-- user is NOT logged in then.
-- =============================================================

CREATE TABLE IF NOT EXISTS public.account_recovery (
  user_id    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  key_hash   text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.account_recovery ENABLE ROW LEVEL SECURITY;

-- Owner can manage their own recovery key while logged in.
DROP POLICY IF EXISTS account_recovery_select_own ON public.account_recovery;
DROP POLICY IF EXISTS account_recovery_insert_own ON public.account_recovery;
DROP POLICY IF EXISTS account_recovery_update_own ON public.account_recovery;

CREATE POLICY account_recovery_select_own
  ON public.account_recovery FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY account_recovery_insert_own
  ON public.account_recovery FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY account_recovery_update_own
  ON public.account_recovery FOR UPDATE TO authenticated
  USING      (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Note: there is intentionally NO select policy for anon — the reset
-- edge function reads this table with the service role only.
