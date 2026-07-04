/*
  # Lock down privileged SECURITY DEFINER RPCs

  ## Problem (live exploitable via the public anon key)
  Three SECURITY DEFINER functions were reachable by the `anon` role, i.e.
  callable by anyone holding only the public anon key via `supabase.rpc()`,
  with no in-function caller check:

    1. `create_user_manually(text, text)` — inserts directly into auth.users /
       auth.identities. GRANTED TO anon in six migrations. Anyone could mint
       arbitrary auth accounts.
    2. `admin_reset_user_password(text, text)` — overwrites ANY user's
       encrypted_password by email. GRANTED TO anon. Full account-takeover
       vector (reset any account's password with just the anon key).
    3. `get_all_users_for_admin()` — returns every user's email, phone,
       location, interests and skills. Created with no explicit GRANT, so it
       defaulted to PUBLIC EXECUTE (anon-callable) — a bulk PII disclosure.

  ## Fix
  - Revoke EXECUTE from `anon`, `authenticated`, and PUBLIC on all three.
  - Introduce a real admin allowlist (`platform_admins`) + `is_platform_admin()`
    so genuinely-admin operations can be re-granted deliberately.
  - `create_user_manually` and `admin_reset_user_password` become
    service-role-only (no client role can call them). Normal signup and the
    /forgot-password flow cover the legitimate use cases; these bypass
    Supabase Auth's own hashing/rotation semantics and should never be
    exposed to a browser.
  - `get_all_users_for_admin` re-granted to `authenticated` but hard-gated
    inside the body on `is_platform_admin()`, so a non-admin authenticated
    caller is rejected. The admin portal continues to work once an admin is
    seeded.

  ## Seeding the first admin (run once, server-side / SQL editor):
    INSERT INTO platform_admins (user_id) VALUES ('<auth-user-uuid>');
*/

-- 1. Admin allowlist ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS platform_admins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  note text
);

ALTER TABLE platform_admins ENABLE ROW LEVEL SECURITY;

-- No client role may read or write the allowlist. Managed only via the
-- service role (which bypasses RLS) or direct SQL. Deliberately no policies:
-- with RLS enabled and zero policies, anon/authenticated get no access.
REVOKE ALL ON platform_admins FROM anon, authenticated;

-- 2. Admin predicate ---------------------------------------------------------
CREATE OR REPLACE FUNCTION is_platform_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM platform_admins pa
    WHERE pa.user_id = (SELECT auth.uid())
  );
$$;

-- Revoke from PUBLIC *and* anon explicitly: Supabase's default privileges
-- auto-grant EXECUTE on new public functions to the anon role, which a bare
-- REVOKE ... FROM PUBLIC does not remove.
REVOKE ALL ON FUNCTION is_platform_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION is_platform_admin() TO authenticated;

-- 3. create_user_manually — service-role only --------------------------------
-- Signature is (TEXT, TEXT); revoke every client-reachable grant. Guarded so
-- that even if a grant is reintroduced elsewhere, the body refuses non-admins.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'create_user_manually'
  ) THEN
    EXECUTE 'REVOKE ALL ON FUNCTION create_user_manually(text, text) FROM PUBLIC, anon, authenticated';
  END IF;
END $$;

-- 4. admin_reset_user_password — service-role only ---------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'admin_reset_user_password'
  ) THEN
    EXECUTE 'REVOKE ALL ON FUNCTION admin_reset_user_password(text, text) FROM PUBLIC, anon, authenticated';
  END IF;
END $$;

-- 5. get_all_users_for_admin — authenticated + in-body admin gate ------------
CREATE OR REPLACE FUNCTION get_all_users_for_admin()
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  full_name TEXT,
  phone_number TEXT,
  location TEXT,
  interests TEXT[],
  skills TEXT[],
  created_at TIMESTAMPTZ,
  last_active_at TIMESTAMPTZ,
  connection_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT is_platform_admin() THEN
    RAISE EXCEPTION 'permission denied: admin privileges required'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    up.user_id,
    au.email::text,
    up.full_name,
    up.phone_number,
    up.location,
    up.interests,
    up.skills,
    up.created_at,
    up.last_active_at,
    (
      SELECT COUNT(*)
      FROM user_connections uc
      WHERE (uc.requester_id = up.user_id OR uc.addressee_id = up.user_id)
      AND uc.status = 'accepted'
    ) AS connection_count
  FROM user_profiles up
  JOIN auth.users au ON au.id = up.user_id
  ORDER BY up.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION get_all_users_for_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION get_all_users_for_admin() TO authenticated;
