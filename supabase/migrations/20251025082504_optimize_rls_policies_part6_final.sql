/*
  # Optimize RLS Policies - Part 6: Engrams and Subscriptions (Final)

  Optimizes RLS policies for engram and subscription tables
*/

-- ENGRAMS TABLE
DROP POLICY IF EXISTS "Users can view own engrams" ON engrams;
DROP POLICY IF EXISTS "Users can create own engrams" ON engrams;
DROP POLICY IF EXISTS "Users can update own engrams" ON engrams;
DROP POLICY IF EXISTS "Users can delete own engrams" ON engrams;

CREATE POLICY "Users can view own engrams" ON engrams
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can create own engrams" ON engrams
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own engrams" ON engrams
  FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own engrams" ON engrams
  FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));

-- ENGRAM_DAILY_RESPONSES TABLE
DROP POLICY IF EXISTS "Users can view own engram responses" ON engram_daily_responses;
DROP POLICY IF EXISTS "Users can create engram responses" ON engram_daily_responses;

CREATE POLICY "Users can view own engram responses" ON engram_daily_responses
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM engrams
      WHERE engrams.id = engram_daily_responses.engram_id
      AND engrams.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can create engram responses" ON engram_daily_responses
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM engrams
      WHERE engrams.id = engram_daily_responses.engram_id
      AND engrams.user_id = (select auth.uid())
    )
  );

-- ENGRAM_PERSONALITY_FILTERS TABLE
DROP POLICY IF EXISTS "Users can view own engram filters" ON engram_personality_filters;

CREATE POLICY "Users can view own engram filters" ON engram_personality_filters
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM engrams
      WHERE engrams.id = engram_personality_filters.engram_id
      AND engrams.user_id = (select auth.uid())
    )
  );

-- ENGRAM_PROGRESS TABLE
DROP POLICY IF EXISTS "Users can view own engram progress" ON engram_progress;

CREATE POLICY "Users can view own engram progress" ON engram_progress
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM engrams
      WHERE engrams.id = engram_progress.engram_id
      AND engrams.user_id = (select auth.uid())
    )
  );

-- SUBSCRIPTIONS TABLE
DROP POLICY IF EXISTS "Users can view own subscription" ON subscriptions;

CREATE POLICY "Users can view own subscription" ON subscriptions
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

-- SAINTS_SUBSCRIPTIONS TABLE
DROP POLICY IF EXISTS "Users can view own saint subscriptions" ON saints_subscriptions;
DROP POLICY IF EXISTS "Users can manage own saint subscriptions" ON saints_subscriptions;

CREATE POLICY "Users can manage own saint subscriptions" ON saints_subscriptions
  FOR ALL TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- FAMILY_MEMBER_INVITATIONS TABLE  
DROP POLICY IF EXISTS "Users can view own invitations" ON family_member_invitations;
DROP POLICY IF EXISTS "Users can create invitations" ON family_member_invitations;
DROP POLICY IF EXISTS "Users can update own invitations" ON family_member_invitations;

CREATE POLICY "Users can view own invitations" ON family_member_invitations
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can create invitations" ON family_member_invitations
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own invitations" ON family_member_invitations
  FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- EXTERNAL_RESPONSES TABLE
DROP POLICY IF EXISTS "Users can view responses to their invitations" ON external_responses;

CREATE POLICY "Users can view responses to their invitations" ON external_responses
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM family_member_invitations
      WHERE family_member_invitations.id = external_responses.invitation_id
      AND family_member_invitations.user_id = (select auth.uid())
    )
  );

-- STRIPE_CUSTOMERS TABLE (has user_id)
DROP POLICY IF EXISTS "Users can view their own customer data" ON stripe_customers;

CREATE POLICY "Users can view their own customer data" ON stripe_customers
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

-- STRIPE_SUBSCRIPTIONS TABLE (uses customer_id, link through stripe_customers)
DROP POLICY IF EXISTS "Users can view their own subscription data" ON stripe_subscriptions;

CREATE POLICY "Users can view their own subscription data" ON stripe_subscriptions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM stripe_customers
      WHERE stripe_customers.customer_id = stripe_subscriptions.customer_id
      AND stripe_customers.user_id = (select auth.uid())
    )
  );

-- STRIPE_ORDERS TABLE (uses customer_id, link through stripe_customers)
DROP POLICY IF EXISTS "Users can view their own order data" ON stripe_orders;

CREATE POLICY "Users can view their own order data" ON stripe_orders
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM stripe_customers
      WHERE stripe_customers.customer_id = stripe_orders.customer_id
      AND stripe_customers.user_id = (select auth.uid())
    )
  );