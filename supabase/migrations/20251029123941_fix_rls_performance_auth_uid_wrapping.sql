/*
  # Fix RLS Performance Issues - Auth Function Wrapping

  This migration optimizes all RLS policies by wrapping auth.uid() calls with SELECT statements
  to prevent re-evaluation for each row, significantly improving query performance at scale.

  ## Tables Updated
  - agent_memories (4 policies)
  - insight_reports (2 policies)
  - saint_activities (1 policy)
  - provider_accounts (4 policies)
  - webhook_events (1 policy)
  - dashboard_widgets (4 policies)
  - dashboard_auto_rotation (4 policies)
  - dashboard_data_cache (4 policies)
  - dashboard_sharing (3 policies)
  - custom_health_dashboards (4 policies)
  - user_daily_progress (1 policy)
  - archetypal_conversations (3 policies)
  - ai_personality_evolution (2 policies)
  - saints_subscriptions (3 policies)
  - analytics_cache (4 policies)
  - analytics_rotation_state (4 policies)
  - analytics_user_preferences (4 policies)
  - unified_activities (1 policy)
  - activity_rotation_config (2 policies)
  - activity_category_stats (2 policies)
  - user_profiles (3 policies)
  - user_messages (3 policies)
  - user_activity_log (2 policies)

  ## Changes
  All policies replace `auth.uid()` with `(select auth.uid())` for performance optimization.
*/

-- agent_memories policies
DROP POLICY IF EXISTS "Users can view own agent memories" ON public.agent_memories;
DROP POLICY IF EXISTS "Users can insert own agent memories" ON public.agent_memories;
DROP POLICY IF EXISTS "Users can update own agent memories" ON public.agent_memories;
DROP POLICY IF EXISTS "Users can delete own agent memories" ON public.agent_memories;

CREATE POLICY "Users can view own agent memories"
  ON public.agent_memories FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own agent memories"
  ON public.agent_memories FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own agent memories"
  ON public.agent_memories FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own agent memories"
  ON public.agent_memories FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- insight_reports policies
DROP POLICY IF EXISTS "insight_select_own" ON public.insight_reports;
DROP POLICY IF EXISTS "insight_insert_own" ON public.insight_reports;

CREATE POLICY "insight_select_own"
  ON public.insight_reports FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "insight_insert_own"
  ON public.insight_reports FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

-- saint_activities policies
DROP POLICY IF EXISTS "Authenticated users can create own activities" ON public.saint_activities;

CREATE POLICY "Authenticated users can create own activities"
  ON public.saint_activities FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

-- provider_accounts policies
DROP POLICY IF EXISTS "provider_accounts_select_own" ON public.provider_accounts;
DROP POLICY IF EXISTS "provider_accounts_insert_own" ON public.provider_accounts;
DROP POLICY IF EXISTS "provider_accounts_update_own" ON public.provider_accounts;
DROP POLICY IF EXISTS "provider_accounts_delete_own" ON public.provider_accounts;

CREATE POLICY "provider_accounts_select_own"
  ON public.provider_accounts FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "provider_accounts_insert_own"
  ON public.provider_accounts FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "provider_accounts_update_own"
  ON public.provider_accounts FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "provider_accounts_delete_own"
  ON public.provider_accounts FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- webhook_events policies
DROP POLICY IF EXISTS "webhook_events_select_own" ON public.webhook_events;

CREATE POLICY "webhook_events_select_own"
  ON public.webhook_events FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

-- dashboard_widgets policies
DROP POLICY IF EXISTS "Users can view widgets of accessible dashboards" ON public.dashboard_widgets;
DROP POLICY IF EXISTS "Users can insert widgets to own dashboards" ON public.dashboard_widgets;
DROP POLICY IF EXISTS "Users can update widgets of own dashboards" ON public.dashboard_widgets;
DROP POLICY IF EXISTS "Users can delete widgets of own dashboards" ON public.dashboard_widgets;

CREATE POLICY "Users can view widgets of accessible dashboards"
  ON public.dashboard_widgets FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM custom_health_dashboards
      WHERE custom_health_dashboards.id = dashboard_widgets.dashboard_id
      AND custom_health_dashboards.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can insert widgets to own dashboards"
  ON public.dashboard_widgets FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM custom_health_dashboards
      WHERE custom_health_dashboards.id = dashboard_widgets.dashboard_id
      AND custom_health_dashboards.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can update widgets of own dashboards"
  ON public.dashboard_widgets FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM custom_health_dashboards
      WHERE custom_health_dashboards.id = dashboard_widgets.dashboard_id
      AND custom_health_dashboards.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM custom_health_dashboards
      WHERE custom_health_dashboards.id = dashboard_widgets.dashboard_id
      AND custom_health_dashboards.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can delete widgets of own dashboards"
  ON public.dashboard_widgets FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM custom_health_dashboards
      WHERE custom_health_dashboards.id = dashboard_widgets.dashboard_id
      AND custom_health_dashboards.user_id = (select auth.uid())
    )
  );

-- dashboard_auto_rotation policies
DROP POLICY IF EXISTS "Users can view own rotation config" ON public.dashboard_auto_rotation;
DROP POLICY IF EXISTS "Users can insert own rotation config" ON public.dashboard_auto_rotation;
DROP POLICY IF EXISTS "Users can update own rotation config" ON public.dashboard_auto_rotation;
DROP POLICY IF EXISTS "Users can delete own rotation config" ON public.dashboard_auto_rotation;

CREATE POLICY "Users can view own rotation config"
  ON public.dashboard_auto_rotation FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own rotation config"
  ON public.dashboard_auto_rotation FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own rotation config"
  ON public.dashboard_auto_rotation FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own rotation config"
  ON public.dashboard_auto_rotation FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- dashboard_data_cache policies
DROP POLICY IF EXISTS "Users can view cache for accessible dashboards" ON public.dashboard_data_cache;
DROP POLICY IF EXISTS "Users can insert cache for own dashboards" ON public.dashboard_data_cache;
DROP POLICY IF EXISTS "Users can update cache for own dashboards" ON public.dashboard_data_cache;
DROP POLICY IF EXISTS "Users can delete cache for own dashboards" ON public.dashboard_data_cache;

CREATE POLICY "Users can view cache for accessible dashboards"
  ON public.dashboard_data_cache FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM custom_health_dashboards
      WHERE custom_health_dashboards.id = dashboard_data_cache.dashboard_id
      AND custom_health_dashboards.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can insert cache for own dashboards"
  ON public.dashboard_data_cache FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM custom_health_dashboards
      WHERE custom_health_dashboards.id = dashboard_data_cache.dashboard_id
      AND custom_health_dashboards.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can update cache for own dashboards"
  ON public.dashboard_data_cache FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM custom_health_dashboards
      WHERE custom_health_dashboards.id = dashboard_data_cache.dashboard_id
      AND custom_health_dashboards.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM custom_health_dashboards
      WHERE custom_health_dashboards.id = dashboard_data_cache.dashboard_id
      AND custom_health_dashboards.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can delete cache for own dashboards"
  ON public.dashboard_data_cache FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM custom_health_dashboards
      WHERE custom_health_dashboards.id = dashboard_data_cache.dashboard_id
      AND custom_health_dashboards.user_id = (select auth.uid())
    )
  );

-- dashboard_sharing policies
DROP POLICY IF EXISTS "Users can view sharing of own dashboards" ON public.dashboard_sharing;
DROP POLICY IF EXISTS "Users can create sharing for own dashboards" ON public.dashboard_sharing;
DROP POLICY IF EXISTS "Users can delete sharing of own dashboards" ON public.dashboard_sharing;

CREATE POLICY "Users can view sharing of own dashboards"
  ON public.dashboard_sharing FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM custom_health_dashboards
      WHERE custom_health_dashboards.id = dashboard_sharing.dashboard_id
      AND custom_health_dashboards.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can create sharing for own dashboards"
  ON public.dashboard_sharing FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM custom_health_dashboards
      WHERE custom_health_dashboards.id = dashboard_sharing.dashboard_id
      AND custom_health_dashboards.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can delete sharing of own dashboards"
  ON public.dashboard_sharing FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM custom_health_dashboards
      WHERE custom_health_dashboards.id = dashboard_sharing.dashboard_id
      AND custom_health_dashboards.user_id = (select auth.uid())
    )
  );

-- custom_health_dashboards policies
DROP POLICY IF EXISTS "Users can view own dashboards" ON public.custom_health_dashboards;
DROP POLICY IF EXISTS "Users can insert own dashboards" ON public.custom_health_dashboards;
DROP POLICY IF EXISTS "Users can update own dashboards" ON public.custom_health_dashboards;
DROP POLICY IF EXISTS "Users can delete own dashboards" ON public.custom_health_dashboards;

CREATE POLICY "Users can view own dashboards"
  ON public.custom_health_dashboards FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own dashboards"
  ON public.custom_health_dashboards FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own dashboards"
  ON public.custom_health_dashboards FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own dashboards"
  ON public.custom_health_dashboards FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- user_daily_progress policies
DROP POLICY IF EXISTS "Authenticated users can insert own progress" ON public.user_daily_progress;

CREATE POLICY "Authenticated users can insert own progress"
  ON public.user_daily_progress FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

-- archetypal_conversations policies
DROP POLICY IF EXISTS "Users can view own AI conversations" ON public.archetypal_conversations;
DROP POLICY IF EXISTS "Users can create own AI conversations" ON public.archetypal_conversations;
DROP POLICY IF EXISTS "Users can delete own AI conversations" ON public.archetypal_conversations;

CREATE POLICY "Users can view own AI conversations"
  ON public.archetypal_conversations FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can create own AI conversations"
  ON public.archetypal_conversations FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own AI conversations"
  ON public.archetypal_conversations FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- ai_personality_evolution policies
DROP POLICY IF EXISTS "Users can view their AI personality evolution" ON public.ai_personality_evolution;
DROP POLICY IF EXISTS "System can create personality snapshots" ON public.ai_personality_evolution;

CREATE POLICY "Users can view their AI personality evolution"
  ON public.ai_personality_evolution FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM archetypal_ais
      WHERE archetypal_ais.id = ai_personality_evolution.archetypal_ai_id
      AND archetypal_ais.user_id = (select auth.uid())
    )
  );

CREATE POLICY "System can create personality snapshots"
  ON public.ai_personality_evolution FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM archetypal_ais
      WHERE archetypal_ais.id = ai_personality_evolution.archetypal_ai_id
      AND archetypal_ais.user_id = (select auth.uid())
    )
  );

-- saints_subscriptions policies
DROP POLICY IF EXISTS "Users can view own saint subscriptions" ON public.saints_subscriptions;
DROP POLICY IF EXISTS "Users can update own saint subscriptions" ON public.saints_subscriptions;
DROP POLICY IF EXISTS "Users can delete own saint subscriptions" ON public.saints_subscriptions;

CREATE POLICY "Users can view own saint subscriptions"
  ON public.saints_subscriptions FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can update own saint subscriptions"
  ON public.saints_subscriptions FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own saint subscriptions"
  ON public.saints_subscriptions FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- analytics_cache policies
DROP POLICY IF EXISTS "Users can view own analytics cache" ON public.analytics_cache;
DROP POLICY IF EXISTS "Users can insert own analytics cache" ON public.analytics_cache;
DROP POLICY IF EXISTS "Users can update own analytics cache" ON public.analytics_cache;
DROP POLICY IF EXISTS "Users can delete own analytics cache" ON public.analytics_cache;

CREATE POLICY "Users can view own analytics cache"
  ON public.analytics_cache FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own analytics cache"
  ON public.analytics_cache FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own analytics cache"
  ON public.analytics_cache FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own analytics cache"
  ON public.analytics_cache FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- analytics_rotation_state policies
DROP POLICY IF EXISTS "Users can view own rotation state" ON public.analytics_rotation_state;
DROP POLICY IF EXISTS "Users can insert own rotation state" ON public.analytics_rotation_state;
DROP POLICY IF EXISTS "Users can update own rotation state" ON public.analytics_rotation_state;
DROP POLICY IF EXISTS "Users can delete own rotation state" ON public.analytics_rotation_state;

CREATE POLICY "Users can view own rotation state"
  ON public.analytics_rotation_state FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own rotation state"
  ON public.analytics_rotation_state FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own rotation state"
  ON public.analytics_rotation_state FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own rotation state"
  ON public.analytics_rotation_state FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- analytics_user_preferences policies
DROP POLICY IF EXISTS "Users can view own preferences" ON public.analytics_user_preferences;
DROP POLICY IF EXISTS "Users can insert own preferences" ON public.analytics_user_preferences;
DROP POLICY IF EXISTS "Users can update own preferences" ON public.analytics_user_preferences;
DROP POLICY IF EXISTS "Users can delete own preferences" ON public.analytics_user_preferences;

CREATE POLICY "Users can view own preferences"
  ON public.analytics_user_preferences FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own preferences"
  ON public.analytics_user_preferences FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own preferences"
  ON public.analytics_user_preferences FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own preferences"
  ON public.analytics_user_preferences FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- unified_activities policies
DROP POLICY IF EXISTS "Users can view own activities" ON public.unified_activities;

CREATE POLICY "Users can view own activities"
  ON public.unified_activities FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

-- activity_rotation_config policies
DROP POLICY IF EXISTS "Users can view own rotation config" ON public.activity_rotation_config;
DROP POLICY IF EXISTS "Users can update own rotation config" ON public.activity_rotation_config;

CREATE POLICY "Users can view own rotation config"
  ON public.activity_rotation_config FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can update own rotation config"
  ON public.activity_rotation_config FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- activity_category_stats policies
DROP POLICY IF EXISTS "Users can view own category stats" ON public.activity_category_stats;
DROP POLICY IF EXISTS "Users can update own category stats" ON public.activity_category_stats;

CREATE POLICY "Users can view own category stats"
  ON public.activity_category_stats FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can update own category stats"
  ON public.activity_category_stats FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- user_profiles policies
DROP POLICY IF EXISTS "Users can view public profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;

CREATE POLICY "Users can view public profiles"
  ON public.user_profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own profile"
  ON public.user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = (select auth.uid()));

CREATE POLICY "Users can update own profile"
  ON public.user_profiles FOR UPDATE
  TO authenticated
  USING (id = (select auth.uid()))
  WITH CHECK (id = (select auth.uid()));

-- user_messages policies
DROP POLICY IF EXISTS "Users can view own messages" ON public.user_messages;
DROP POLICY IF EXISTS "Users can send messages" ON public.user_messages;
DROP POLICY IF EXISTS "Users can update received messages" ON public.user_messages;

CREATE POLICY "Users can view own messages"
  ON public.user_messages FOR SELECT
  TO authenticated
  USING (sender_id = (select auth.uid()) OR recipient_id = (select auth.uid()));

CREATE POLICY "Users can send messages"
  ON public.user_messages FOR INSERT
  TO authenticated
  WITH CHECK (sender_id = (select auth.uid()));

CREATE POLICY "Users can update received messages"
  ON public.user_messages FOR UPDATE
  TO authenticated
  USING (recipient_id = (select auth.uid()))
  WITH CHECK (recipient_id = (select auth.uid()));

-- user_activity_log policies
DROP POLICY IF EXISTS "Users can view own activity" ON public.user_activity_log;
DROP POLICY IF EXISTS "System can insert activity" ON public.user_activity_log;

CREATE POLICY "Users can view own activity"
  ON public.user_activity_log FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "System can insert activity"
  ON public.user_activity_log FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));
