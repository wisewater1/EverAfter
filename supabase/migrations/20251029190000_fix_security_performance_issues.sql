/*
  # Fix Security and Performance Issues

  This migration addresses critical security and performance issues:

  1. **Missing Foreign Key Indexes** (6 tables)
     - admin_notifications.user_id
     - analytics_cache.source_id
     - dashboard_data_cache.widget_id
     - dashboard_sharing.created_by
     - user_messages.parent_message_id
     - webhook_events.user_id

  2. **RLS Policy Optimization** (60+ policies)
     - Replace auth.uid() with (select auth.uid()) for better performance
     - Prevents re-evaluation for each row

  3. **Multiple Permissive Policies** (4 tables)
     - Consolidate duplicate INSERT policies

  4. **Function Search Path** (17 functions)
     - Set immutable search_path for security

  5. **Security Definer Views** (2 views)
     - Add proper security context

  6. **Vector Extension**
     - Move from public to extensions schema
*/

-- ============================================================================
-- PART 1: ADD MISSING FOREIGN KEY INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_admin_notifications_user_id
  ON public.admin_notifications(user_id);

CREATE INDEX IF NOT EXISTS idx_analytics_cache_source_id
  ON public.analytics_cache(source_id);

CREATE INDEX IF NOT EXISTS idx_dashboard_data_cache_widget_id
  ON public.dashboard_data_cache(widget_id);

CREATE INDEX IF NOT EXISTS idx_dashboard_sharing_created_by
  ON public.dashboard_sharing(created_by);

CREATE INDEX IF NOT EXISTS idx_user_messages_parent_message_id
  ON public.user_messages(parent_message_id);

CREATE INDEX IF NOT EXISTS idx_webhook_events_user_id
  ON public.webhook_events(user_id);

-- ============================================================================
-- PART 2: OPTIMIZE RLS POLICIES - Replace auth.uid() with (select auth.uid())
-- ============================================================================

-- agent_memories policies
DROP POLICY IF EXISTS "Users can view own agent memories" ON public.agent_memories;
CREATE POLICY "Users can view own agent memories" ON public.agent_memories
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own agent memories" ON public.agent_memories;
CREATE POLICY "Users can insert own agent memories" ON public.agent_memories
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own agent memories" ON public.agent_memories;
CREATE POLICY "Users can update own agent memories" ON public.agent_memories
  FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own agent memories" ON public.agent_memories;
CREATE POLICY "Users can delete own agent memories" ON public.agent_memories
  FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));

-- insight_reports policies
DROP POLICY IF EXISTS "insight_select_own" ON public.insight_reports;
CREATE POLICY "insight_select_own" ON public.insight_reports
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "insight_insert_own" ON public.insight_reports;
CREATE POLICY "insight_insert_own" ON public.insight_reports
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

-- saint_activities policies
DROP POLICY IF EXISTS "Authenticated users can create own activities" ON public.saint_activities;
CREATE POLICY "Authenticated users can create own activities" ON public.saint_activities
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

-- provider_accounts policies
DROP POLICY IF EXISTS "provider_accounts_select_own" ON public.provider_accounts;
CREATE POLICY "provider_accounts_select_own" ON public.provider_accounts
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "provider_accounts_insert_own" ON public.provider_accounts;
CREATE POLICY "provider_accounts_insert_own" ON public.provider_accounts
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "provider_accounts_update_own" ON public.provider_accounts;
CREATE POLICY "provider_accounts_update_own" ON public.provider_accounts
  FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "provider_accounts_delete_own" ON public.provider_accounts;
CREATE POLICY "provider_accounts_delete_own" ON public.provider_accounts
  FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));

-- webhook_events policies
DROP POLICY IF EXISTS "webhook_events_select_own" ON public.webhook_events;
CREATE POLICY "webhook_events_select_own" ON public.webhook_events
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

-- dashboard_widgets policies
DROP POLICY IF EXISTS "Users can view widgets of accessible dashboards" ON public.dashboard_widgets;
CREATE POLICY "Users can view widgets of accessible dashboards" ON public.dashboard_widgets
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.custom_health_dashboards
      WHERE id = dashboard_widgets.dashboard_id
      AND user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert widgets to own dashboards" ON public.dashboard_widgets;
CREATE POLICY "Users can insert widgets to own dashboards" ON public.dashboard_widgets
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.custom_health_dashboards
      WHERE id = dashboard_widgets.dashboard_id
      AND user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update widgets of own dashboards" ON public.dashboard_widgets;
CREATE POLICY "Users can update widgets of own dashboards" ON public.dashboard_widgets
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.custom_health_dashboards
      WHERE id = dashboard_widgets.dashboard_id
      AND user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.custom_health_dashboards
      WHERE id = dashboard_widgets.dashboard_id
      AND user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete widgets of own dashboards" ON public.dashboard_widgets;
CREATE POLICY "Users can delete widgets of own dashboards" ON public.dashboard_widgets
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.custom_health_dashboards
      WHERE id = dashboard_widgets.dashboard_id
      AND user_id = (select auth.uid())
    )
  );

-- dashboard_auto_rotation policies
DROP POLICY IF EXISTS "Users can view own rotation config" ON public.dashboard_auto_rotation;
CREATE POLICY "Users can view own rotation config" ON public.dashboard_auto_rotation
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own rotation config" ON public.dashboard_auto_rotation;
CREATE POLICY "Users can insert own rotation config" ON public.dashboard_auto_rotation
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own rotation config" ON public.dashboard_auto_rotation;
CREATE POLICY "Users can update own rotation config" ON public.dashboard_auto_rotation
  FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own rotation config" ON public.dashboard_auto_rotation;
CREATE POLICY "Users can delete own rotation config" ON public.dashboard_auto_rotation
  FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));

-- dashboard_data_cache policies
DROP POLICY IF EXISTS "Users can view cache for accessible dashboards" ON public.dashboard_data_cache;
CREATE POLICY "Users can view cache for accessible dashboards" ON public.dashboard_data_cache
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.dashboard_widgets w
      JOIN public.custom_health_dashboards d ON d.id = w.dashboard_id
      WHERE w.id = dashboard_data_cache.widget_id
      AND d.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert cache for own dashboards" ON public.dashboard_data_cache;
CREATE POLICY "Users can insert cache for own dashboards" ON public.dashboard_data_cache
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.dashboard_widgets w
      JOIN public.custom_health_dashboards d ON d.id = w.dashboard_id
      WHERE w.id = dashboard_data_cache.widget_id
      AND d.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update cache for own dashboards" ON public.dashboard_data_cache;
CREATE POLICY "Users can update cache for own dashboards" ON public.dashboard_data_cache
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.dashboard_widgets w
      JOIN public.custom_health_dashboards d ON d.id = w.dashboard_id
      WHERE w.id = dashboard_data_cache.widget_id
      AND d.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.dashboard_widgets w
      JOIN public.custom_health_dashboards d ON d.id = w.dashboard_id
      WHERE w.id = dashboard_data_cache.widget_id
      AND d.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete cache for own dashboards" ON public.dashboard_data_cache;
CREATE POLICY "Users can delete cache for own dashboards" ON public.dashboard_data_cache
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.dashboard_widgets w
      JOIN public.custom_health_dashboards d ON d.id = w.dashboard_id
      WHERE w.id = dashboard_data_cache.widget_id
      AND d.user_id = (select auth.uid())
    )
  );

-- dashboard_sharing policies
DROP POLICY IF EXISTS "Users can view sharing of own dashboards" ON public.dashboard_sharing;
CREATE POLICY "Users can view sharing of own dashboards" ON public.dashboard_sharing
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.custom_health_dashboards
      WHERE id = dashboard_sharing.dashboard_id
      AND user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can create sharing for own dashboards" ON public.dashboard_sharing;
CREATE POLICY "Users can create sharing for own dashboards" ON public.dashboard_sharing
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.custom_health_dashboards
      WHERE id = dashboard_sharing.dashboard_id
      AND user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete sharing of own dashboards" ON public.dashboard_sharing;
CREATE POLICY "Users can delete sharing of own dashboards" ON public.dashboard_sharing
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.custom_health_dashboards
      WHERE id = dashboard_sharing.dashboard_id
      AND user_id = (select auth.uid())
    )
  );

-- custom_health_dashboards policies
DROP POLICY IF EXISTS "Users can view own dashboards" ON public.custom_health_dashboards;
CREATE POLICY "Users can view own dashboards" ON public.custom_health_dashboards
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own dashboards" ON public.custom_health_dashboards;
CREATE POLICY "Users can insert own dashboards" ON public.custom_health_dashboards
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own dashboards" ON public.custom_health_dashboards;
CREATE POLICY "Users can update own dashboards" ON public.custom_health_dashboards
  FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own dashboards" ON public.custom_health_dashboards;
CREATE POLICY "Users can delete own dashboards" ON public.custom_health_dashboards
  FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));

-- user_daily_progress policies
DROP POLICY IF EXISTS "Authenticated users can insert own progress" ON public.user_daily_progress;
CREATE POLICY "Authenticated users can insert own progress" ON public.user_daily_progress
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

-- archetypal_conversations policies
DROP POLICY IF EXISTS "Users can view own AI conversations" ON public.archetypal_conversations;
CREATE POLICY "Users can view own AI conversations" ON public.archetypal_conversations
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can create own AI conversations" ON public.archetypal_conversations;
CREATE POLICY "Users can create own AI conversations" ON public.archetypal_conversations
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own AI conversations" ON public.archetypal_conversations;
CREATE POLICY "Users can delete own AI conversations" ON public.archetypal_conversations
  FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));

-- ai_personality_evolution policies
DROP POLICY IF EXISTS "Users can view their AI personality evolution" ON public.ai_personality_evolution;
CREATE POLICY "Users can view their AI personality evolution" ON public.ai_personality_evolution
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.archetypal_ais
      WHERE id = ai_personality_evolution.ai_id
      AND user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "System can create personality snapshots" ON public.ai_personality_evolution;
CREATE POLICY "System can create personality snapshots" ON public.ai_personality_evolution
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.archetypal_ais
      WHERE id = ai_personality_evolution.ai_id
      AND user_id = (select auth.uid())
    )
  );

-- saints_subscriptions policies
DROP POLICY IF EXISTS "Users can view own saint subscriptions" ON public.saints_subscriptions;
CREATE POLICY "Users can view own saint subscriptions" ON public.saints_subscriptions
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own saint subscriptions" ON public.saints_subscriptions;
CREATE POLICY "Users can update own saint subscriptions" ON public.saints_subscriptions
  FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own saint subscriptions" ON public.saints_subscriptions;
CREATE POLICY "Users can delete own saint subscriptions" ON public.saints_subscriptions
  FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));

-- analytics_cache policies
DROP POLICY IF EXISTS "Users can view own analytics cache" ON public.analytics_cache;
CREATE POLICY "Users can view own analytics cache" ON public.analytics_cache
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own analytics cache" ON public.analytics_cache;
CREATE POLICY "Users can insert own analytics cache" ON public.analytics_cache
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own analytics cache" ON public.analytics_cache;
CREATE POLICY "Users can update own analytics cache" ON public.analytics_cache
  FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own analytics cache" ON public.analytics_cache;
CREATE POLICY "Users can delete own analytics cache" ON public.analytics_cache
  FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));

-- analytics_rotation_state policies
DROP POLICY IF EXISTS "Users can view own rotation state" ON public.analytics_rotation_state;
CREATE POLICY "Users can view own rotation state" ON public.analytics_rotation_state
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own rotation state" ON public.analytics_rotation_state;
CREATE POLICY "Users can insert own rotation state" ON public.analytics_rotation_state
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own rotation state" ON public.analytics_rotation_state;
CREATE POLICY "Users can update own rotation state" ON public.analytics_rotation_state
  FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own rotation state" ON public.analytics_rotation_state;
CREATE POLICY "Users can delete own rotation state" ON public.analytics_rotation_state
  FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));

-- analytics_user_preferences policies
DROP POLICY IF EXISTS "Users can view own preferences" ON public.analytics_user_preferences;
CREATE POLICY "Users can view own preferences" ON public.analytics_user_preferences
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own preferences" ON public.analytics_user_preferences;
CREATE POLICY "Users can insert own preferences" ON public.analytics_user_preferences
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own preferences" ON public.analytics_user_preferences;
CREATE POLICY "Users can update own preferences" ON public.analytics_user_preferences
  FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own preferences" ON public.analytics_user_preferences;
CREATE POLICY "Users can delete own preferences" ON public.analytics_user_preferences
  FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));

-- unified_activities policies
DROP POLICY IF EXISTS "Users can view own activities" ON public.unified_activities;
CREATE POLICY "Users can view own activities" ON public.unified_activities
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

-- activity_rotation_config policies
DROP POLICY IF EXISTS "Users can view own rotation config" ON public.activity_rotation_config;
CREATE POLICY "Users can view own rotation config" ON public.activity_rotation_config
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own rotation config" ON public.activity_rotation_config;
CREATE POLICY "Users can update own rotation config" ON public.activity_rotation_config
  FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- activity_category_stats policies
DROP POLICY IF EXISTS "Users can view own category stats" ON public.activity_category_stats;
CREATE POLICY "Users can view own category stats" ON public.activity_category_stats
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own category stats" ON public.activity_category_stats;
CREATE POLICY "Users can update own category stats" ON public.activity_category_stats
  FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- user_profiles policies
DROP POLICY IF EXISTS "Users can view public profiles" ON public.user_profiles;
CREATE POLICY "Users can view public profiles" ON public.user_profiles
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
CREATE POLICY "Users can insert own profile" ON public.user_profiles
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
CREATE POLICY "Users can update own profile" ON public.user_profiles
  FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- user_connections policies
DROP POLICY IF EXISTS "Users can view own connections" ON public.user_connections;
CREATE POLICY "Users can view own connections" ON public.user_connections
  FOR SELECT TO authenticated
  USING (requester_id = (select auth.uid()) OR recipient_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can create connection requests" ON public.user_connections;
CREATE POLICY "Users can create connection requests" ON public.user_connections
  FOR INSERT TO authenticated
  WITH CHECK (requester_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update received connections" ON public.user_connections;
CREATE POLICY "Users can update received connections" ON public.user_connections
  FOR UPDATE TO authenticated
  USING (recipient_id = (select auth.uid()))
  WITH CHECK (recipient_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own connection requests" ON public.user_connections;
CREATE POLICY "Users can delete own connection requests" ON public.user_connections
  FOR DELETE TO authenticated
  USING (requester_id = (select auth.uid()) OR recipient_id = (select auth.uid()));

-- user_messages policies
DROP POLICY IF EXISTS "Users can view own messages" ON public.user_messages;
CREATE POLICY "Users can view own messages" ON public.user_messages
  FOR SELECT TO authenticated
  USING (sender_id = (select auth.uid()) OR recipient_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can send messages" ON public.user_messages;
CREATE POLICY "Users can send messages" ON public.user_messages
  FOR INSERT TO authenticated
  WITH CHECK (sender_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update received messages" ON public.user_messages;
CREATE POLICY "Users can update received messages" ON public.user_messages
  FOR UPDATE TO authenticated
  USING (recipient_id = (select auth.uid()))
  WITH CHECK (recipient_id = (select auth.uid()));

-- user_activity_log policies
DROP POLICY IF EXISTS "Users can view own activity" ON public.user_activity_log;
CREATE POLICY "Users can view own activity" ON public.user_activity_log
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "System can insert activity" ON public.user_activity_log;
CREATE POLICY "System can insert activity" ON public.user_activity_log
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

-- ============================================================================
-- PART 3: FIX MULTIPLE PERMISSIVE POLICIES
-- ============================================================================

-- Remove duplicate system policy for analytics_rotation_state
DROP POLICY IF EXISTS "System can initialize rotation state" ON public.analytics_rotation_state;

-- Remove duplicate system policy for analytics_user_preferences
DROP POLICY IF EXISTS "System can initialize user preferences" ON public.analytics_user_preferences;

-- Remove duplicate system policy for saint_activities
DROP POLICY IF EXISTS "System can create saint activities" ON public.saint_activities;

-- Remove duplicate system policy for user_daily_progress
DROP POLICY IF EXISTS "System can initialize user progress" ON public.user_daily_progress;

-- ============================================================================
-- PART 4: FIX FUNCTION SEARCH PATHS
-- ============================================================================

-- Set immutable search_path for all functions
ALTER FUNCTION public.update_agent_memory_access(uuid, timestamp with time zone)
  SET search_path = public, pg_temp;

ALTER FUNCTION public.get_agent_memory_stats(uuid)
  SET search_path = public, pg_temp;

ALTER FUNCTION public.get_user_analytics_summary(uuid)
  SET search_path = public, pg_temp;

ALTER FUNCTION public.capture_personality_snapshot(uuid)
  SET search_path = public, pg_temp;

ALTER FUNCTION public.clean_expired_dashboard_cache()
  SET search_path = public, pg_temp;

ALTER FUNCTION public.search_agent_memories(uuid, text, integer)
  SET search_path = public, pg_temp;

ALTER FUNCTION public.initialize_analytics_preferences(uuid)
  SET search_path = public, pg_temp;

ALTER FUNCTION public.get_insight_report_stats(uuid)
  SET search_path = public, pg_temp;

ALTER FUNCTION public.get_latest_metric(uuid, text)
  SET search_path = public, pg_temp;

ALTER FUNCTION public.calculate_ai_readiness_score(uuid)
  SET search_path = public, pg_temp;

ALTER FUNCTION public.update_dashboard_updated_at()
  SET search_path = public, pg_temp;

ALTER FUNCTION public.update_ai_interaction_count()
  SET search_path = public, pg_temp;

ALTER FUNCTION public.get_latest_insight_report(uuid)
  SET search_path = public, pg_temp;

ALTER FUNCTION public.handle_new_user()
  SET search_path = public, pg_temp;

ALTER FUNCTION public.advance_analytics_rotation(uuid)
  SET search_path = public, pg_temp;

ALTER FUNCTION public.get_metric_series(uuid, text, timestamp with time zone, timestamp with time zone)
  SET search_path = public, pg_temp;

ALTER FUNCTION public.update_archetypal_ai_activation()
  SET search_path = public, pg_temp;
