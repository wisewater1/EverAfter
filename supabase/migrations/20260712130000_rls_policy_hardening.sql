/*
  # RLS Policy Hardening (2026-07-12 exhaustive audit)

  Findings from a full replay of all 127 migrations (final-state
  reconstruction of every table's RLS + policies). All 211 live tables have
  RLS enabled; this migration fixes the 9 policies whose predicates did not
  match their stated intent. Catalog/lookup read-for-all policies
  (device_registry, subscription_tiers, marketplace listings, etc.) and
  service_role FOR ALL policies were reviewed and are correct by design.

  Fixes, in severity order:

  1. saints_subscriptions — "System can create saint subscriptions" allowed
     INSERT TO public WITH CHECK (true): any anon-key client could insert a
     subscription row and grant themselves premium tiers (paywall bypass).
     No client-side code inserts this table; Stripe webhooks use the
     service role, which bypasses RLS. The policy is pure attack surface.

  2. guardian_intercessions — "Service role can manage all intercessions"
     had USING (true) with NO "TO" clause, which Postgres applies to
     public: every authenticated user could read/modify/delete every
     user's intercessions. Recreated TO service_role.

  3. profiles — "System can insert profiles" (INSERT, no TO clause,
     CHECK (true)): anon-key clients could insert arbitrary profile rows.
     The signup trigger (handle_new_user, SECURITY DEFINER) bypasses RLS
     and never needed it. Replaced with self-insert only.

  4. external_responses — legacy "Anonymous can insert with valid token"
     was actually WITH CHECK (true) despite the name (no token check).
     A later, correctly-scoped invitation-validated policy exists
     ("Anonymous users can insert with valid token"); since permissive
     policies are OR'd, the legacy one nullified the validation. Dropped.

  5. unified_activities / activity_category_stats /
     activity_rotation_config — "System can insert ..." INSERT TO public
     WITH CHECK (true): anon could write activity data for any user.
     These are written by aggregation jobs (service role). Recreated
     TO service_role.

  6. admin_notifications — INSERT TO authenticated WITH CHECK (true) let
     any user write arbitrary admin notifications. Notifications are
     produced by backend/edge functions (service role). Recreated
     TO service_role.

  7. dataset_requests — "Partners can view own dataset requests" said
     "own" but USING (true) exposed every partner's requests to all
     authenticated users. Scoped to user_id.

  8. institutional_partners — "Verified partners can view own profile"
     same defect. Scoped to user_id.

  9. user_profiles — "Users can view public profiles" USING (true)
     ignored the profile_visibility column ('public'|'connections'|
     'private'): private profiles (name, phone, location, ...) were
     readable by every authenticated user. Scoped to public-or-own.
     NOTE: 'connections' visibility currently behaves like 'private'
     until a connections-join policy is added — strictly safer than
     exposing it to everyone.

  Deny-all (RLS enabled, zero policies) tables reviewed and left as-is on
  purpose: glucose_job_audit, platform_admins (service/definer access
  only — platform_admins is read via the is_platform_admin() SECURITY
  DEFINER function).
*/

-- 1. saints_subscriptions: remove the public-insert paywall bypass.
DROP POLICY IF EXISTS "System can create saint subscriptions" ON public.saints_subscriptions;

-- 2. guardian_intercessions: policy applied to public due to missing TO.
DROP POLICY IF EXISTS "Service role can manage all intercessions" ON public.guardian_intercessions;
CREATE POLICY "Service role can manage all intercessions"
  ON public.guardian_intercessions
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- 3. profiles: replace open insert with self-insert (signup trigger is
--    SECURITY DEFINER and unaffected).
DROP POLICY IF EXISTS "System can insert profiles" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = (select auth.uid()));

-- 4. external_responses: drop the token-less legacy insert policy; the
--    invitation-validated policy from 20251025060239 remains in force.
DROP POLICY IF EXISTS "Anonymous can insert with valid token" ON public.external_responses;

-- 5. Aggregation tables: system writes are service-role writes.
DROP POLICY IF EXISTS "System can insert activities" ON public.unified_activities;
CREATE POLICY "Service role can insert activities"
  ON public.unified_activities
  FOR INSERT TO service_role
  WITH CHECK (true);

DROP POLICY IF EXISTS "System can insert category stats" ON public.activity_category_stats;
CREATE POLICY "Service role can insert category stats"
  ON public.activity_category_stats
  FOR INSERT TO service_role
  WITH CHECK (true);

DROP POLICY IF EXISTS "System can insert rotation config" ON public.activity_rotation_config;
CREATE POLICY "Service role can insert rotation config"
  ON public.activity_rotation_config
  FOR INSERT TO service_role
  WITH CHECK (true);

-- 6. admin_notifications: only backend services file admin notifications.
DROP POLICY IF EXISTS "System can insert notifications" ON public.admin_notifications;
CREATE POLICY "Service role can insert notifications"
  ON public.admin_notifications
  FOR INSERT TO service_role
  WITH CHECK (true);

-- 7. dataset_requests: "own" means own.
DROP POLICY IF EXISTS "Partners can view own dataset requests" ON public.dataset_requests;
CREATE POLICY "Partners can view own dataset requests"
  ON public.dataset_requests
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

-- 8. institutional_partners: same.
DROP POLICY IF EXISTS "Verified partners can view own profile" ON public.institutional_partners;
CREATE POLICY "Verified partners can view own profile"
  ON public.institutional_partners
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

-- 9. user_profiles: honor profile_visibility.
DROP POLICY IF EXISTS "Users can view public profiles" ON public.user_profiles;
CREATE POLICY "Users can view public profiles"
  ON public.user_profiles
  FOR SELECT TO authenticated
  USING (profile_visibility = 'public' OR user_id = (select auth.uid()));
