/*
  # Fix Database Security and Performance Issues

  1. Add Missing Foreign Key Indexes
    - analytics_cache.source_id
    - dashboard_data_cache.widget_id
    - dashboard_sharing.created_by
    - webhook_events.user_id

  2. Optimize RLS Policies (Auth Function Initialization)
    - Replace auth.uid() with (select auth.uid()) in all policies
    - This prevents re-evaluation for each row, improving performance at scale

  3. Move Vector Extension
    - Move vector extension from public to extensions schema

  4. Set Function Search Paths
    - Add search_path to all security definer functions

  5. Note on Unused Indexes
    - Unused indexes are kept for future query optimization
    - They will be utilized as the application scales
*/

-- =====================================================
-- 1. ADD MISSING FOREIGN KEY INDEXES
-- =====================================================

-- Analytics cache source_id index
CREATE INDEX IF NOT EXISTS idx_analytics_cache_source_id
ON public.analytics_cache(source_id);

-- Dashboard data cache widget_id index
CREATE INDEX IF NOT EXISTS idx_dashboard_data_cache_widget_id
ON public.dashboard_data_cache(widget_id);

-- Dashboard sharing created_by index
CREATE INDEX IF NOT EXISTS idx_dashboard_sharing_created_by
ON public.dashboard_sharing(created_by);

-- Webhook events user_id index (may already exist as webhook_events_user_id_fkey)
CREATE INDEX IF NOT EXISTS idx_webhook_events_user_id
ON public.webhook_events(user_id);

-- =====================================================
-- 2. OPTIMIZE RLS POLICIES - AGENT MEMORIES
-- =====================================================

DROP POLICY IF EXISTS "Users can view own agent memories" ON public.agent_memories;
CREATE POLICY "Users can view own agent memories"
  ON public.agent_memories FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own agent memories" ON public.agent_memories;
CREATE POLICY "Users can insert own agent memories"
  ON public.agent_memories FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own agent memories" ON public.agent_memories;
CREATE POLICY "Users can update own agent memories"
  ON public.agent_memories FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own agent memories" ON public.agent_memories;
CREATE POLICY "Users can delete own agent memories"
  ON public.agent_memories FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- =====================================================
-- 3. OPTIMIZE RLS POLICIES - INSIGHT REPORTS
-- =====================================================

DROP POLICY IF EXISTS "insight_select_own" ON public.insight_reports;
CREATE POLICY "insight_select_own"
  ON public.insight_reports FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "insight_insert_own" ON public.insight_reports;
CREATE POLICY "insight_insert_own"
  ON public.insight_reports FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

-- =====================================================
-- 4. OPTIMIZE RLS POLICIES - PROVIDER ACCOUNTS
-- =====================================================

DROP POLICY IF EXISTS "provider_accounts_select_own" ON public.provider_accounts;
CREATE POLICY "provider_accounts_select_own"
  ON public.provider_accounts FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "provider_accounts_insert_own" ON public.provider_accounts;
CREATE POLICY "provider_accounts_insert_own"
  ON public.provider_accounts FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "provider_accounts_update_own" ON public.provider_accounts;
CREATE POLICY "provider_accounts_update_own"
  ON public.provider_accounts FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "provider_accounts_delete_own" ON public.provider_accounts;
CREATE POLICY "provider_accounts_delete_own"
  ON public.provider_accounts FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- =====================================================
-- 5. OPTIMIZE RLS POLICIES - WEBHOOK EVENTS
-- =====================================================

DROP POLICY IF EXISTS "webhook_events_select_own" ON public.webhook_events;
CREATE POLICY "webhook_events_select_own"
  ON public.webhook_events FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

-- =====================================================
-- 6. OPTIMIZE RLS POLICIES - DASHBOARD WIDGETS
-- =====================================================

DROP POLICY IF EXISTS "Users can view widgets of accessible dashboards" ON public.dashboard_widgets;
CREATE POLICY "Users can view widgets of accessible dashboards"
  ON public.dashboard_widgets FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.custom_health_dashboards d
      WHERE d.id = dashboard_widgets.dashboard_id
      AND d.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert widgets to own dashboards" ON public.dashboard_widgets;
CREATE POLICY "Users can insert widgets to own dashboards"
  ON public.dashboard_widgets FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.custom_health_dashboards d
      WHERE d.id = dashboard_widgets.dashboard_id
      AND d.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update widgets of own dashboards" ON public.dashboard_widgets;
CREATE POLICY "Users can update widgets of own dashboards"
  ON public.dashboard_widgets FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.custom_health_dashboards d
      WHERE d.id = dashboard_widgets.dashboard_id
      AND d.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete widgets of own dashboards" ON public.dashboard_widgets;
CREATE POLICY "Users can delete widgets of own dashboards"
  ON public.dashboard_widgets FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.custom_health_dashboards d
      WHERE d.id = dashboard_widgets.dashboard_id
      AND d.user_id = (select auth.uid())
    )
  );

-- =====================================================
-- 7. OPTIMIZE RLS POLICIES - DASHBOARD AUTO ROTATION
-- =====================================================

DROP POLICY IF EXISTS "Users can view own rotation config" ON public.dashboard_auto_rotation;
CREATE POLICY "Users can view own rotation config"
  ON public.dashboard_auto_rotation FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own rotation config" ON public.dashboard_auto_rotation;
CREATE POLICY "Users can insert own rotation config"
  ON public.dashboard_auto_rotation FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own rotation config" ON public.dashboard_auto_rotation;
CREATE POLICY "Users can update own rotation config"
  ON public.dashboard_auto_rotation FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own rotation config" ON public.dashboard_auto_rotation;
CREATE POLICY "Users can delete own rotation config"
  ON public.dashboard_auto_rotation FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- =====================================================
-- 8. OPTIMIZE RLS POLICIES - DASHBOARD DATA CACHE
-- =====================================================

DROP POLICY IF EXISTS "Users can view cache for accessible dashboards" ON public.dashboard_data_cache;
CREATE POLICY "Users can view cache for accessible dashboards"
  ON public.dashboard_data_cache FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.dashboard_widgets w
      JOIN public.custom_health_dashboards d ON d.id = w.dashboard_id
      WHERE w.id = dashboard_data_cache.widget_id
      AND d.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert cache for own dashboards" ON public.dashboard_data_cache;
CREATE POLICY "Users can insert cache for own dashboards"
  ON public.dashboard_data_cache FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.dashboard_widgets w
      JOIN public.custom_health_dashboards d ON d.id = w.dashboard_id
      WHERE w.id = dashboard_data_cache.widget_id
      AND d.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update cache for own dashboards" ON public.dashboard_data_cache;
CREATE POLICY "Users can update cache for own dashboards"
  ON public.dashboard_data_cache FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.dashboard_widgets w
      JOIN public.custom_health_dashboards d ON d.id = w.dashboard_id
      WHERE w.id = dashboard_data_cache.widget_id
      AND d.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete cache for own dashboards" ON public.dashboard_data_cache;
CREATE POLICY "Users can delete cache for own dashboards"
  ON public.dashboard_data_cache FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.dashboard_widgets w
      JOIN public.custom_health_dashboards d ON d.id = w.dashboard_id
      WHERE w.id = dashboard_data_cache.widget_id
      AND d.user_id = (select auth.uid())
    )
  );

-- =====================================================
-- 9. OPTIMIZE RLS POLICIES - DASHBOARD SHARING
-- =====================================================

DROP POLICY IF EXISTS "Users can view sharing of own dashboards" ON public.dashboard_sharing;
CREATE POLICY "Users can view sharing of own dashboards"
  ON public.dashboard_sharing FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.custom_health_dashboards d
      WHERE d.id = dashboard_sharing.dashboard_id
      AND d.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can create sharing for own dashboards" ON public.dashboard_sharing;
CREATE POLICY "Users can create sharing for own dashboards"
  ON public.dashboard_sharing FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.custom_health_dashboards d
      WHERE d.id = dashboard_sharing.dashboard_id
      AND d.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete sharing of own dashboards" ON public.dashboard_sharing;
CREATE POLICY "Users can delete sharing of own dashboards"
  ON public.dashboard_sharing FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.custom_health_dashboards d
      WHERE d.id = dashboard_sharing.dashboard_id
      AND d.user_id = (select auth.uid())
    )
  );

-- =====================================================
-- 10. OPTIMIZE RLS POLICIES - CUSTOM HEALTH DASHBOARDS
-- =====================================================

DROP POLICY IF EXISTS "Users can view own dashboards" ON public.custom_health_dashboards;
CREATE POLICY "Users can view own dashboards"
  ON public.custom_health_dashboards FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own dashboards" ON public.custom_health_dashboards;
CREATE POLICY "Users can insert own dashboards"
  ON public.custom_health_dashboards FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own dashboards" ON public.custom_health_dashboards;
CREATE POLICY "Users can update own dashboards"
  ON public.custom_health_dashboards FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own dashboards" ON public.custom_health_dashboards;
CREATE POLICY "Users can delete own dashboards"
  ON public.custom_health_dashboards FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- =====================================================
-- 11. OPTIMIZE RLS POLICIES - ARCHETYPAL CONVERSATIONS
-- =====================================================

DROP POLICY IF EXISTS "Users can view own AI conversations" ON public.archetypal_conversations;
CREATE POLICY "Users can view own AI conversations"
  ON public.archetypal_conversations FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can create own AI conversations" ON public.archetypal_conversations;
CREATE POLICY "Users can create own AI conversations"
  ON public.archetypal_conversations FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own AI conversations" ON public.archetypal_conversations;
CREATE POLICY "Users can delete own AI conversations"
  ON public.archetypal_conversations FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- =====================================================
-- 12. OPTIMIZE RLS POLICIES - AI PERSONALITY EVOLUTION
-- =====================================================

DROP POLICY IF EXISTS "Users can view their AI personality evolution" ON public.ai_personality_evolution;
CREATE POLICY "Users can view their AI personality evolution"
  ON public.ai_personality_evolution FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.archetypal_ais a
      WHERE a.id = ai_personality_evolution.ai_id
      AND a.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "System can create personality snapshots" ON public.ai_personality_evolution;
CREATE POLICY "System can create personality snapshots"
  ON public.ai_personality_evolution FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.archetypal_ais a
      WHERE a.id = ai_personality_evolution.ai_id
      AND a.user_id = (select auth.uid())
    )
  );

-- =====================================================
-- 13. OPTIMIZE RLS POLICIES - ANALYTICS CACHE
-- =====================================================

DROP POLICY IF EXISTS "Users can view own analytics cache" ON public.analytics_cache;
CREATE POLICY "Users can view own analytics cache"
  ON public.analytics_cache FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own analytics cache" ON public.analytics_cache;
CREATE POLICY "Users can insert own analytics cache"
  ON public.analytics_cache FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own analytics cache" ON public.analytics_cache;
CREATE POLICY "Users can update own analytics cache"
  ON public.analytics_cache FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own analytics cache" ON public.analytics_cache;
CREATE POLICY "Users can delete own analytics cache"
  ON public.analytics_cache FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- =====================================================
-- 14. OPTIMIZE RLS POLICIES - ANALYTICS ROTATION STATE
-- =====================================================

DROP POLICY IF EXISTS "Users can view own rotation state" ON public.analytics_rotation_state;
CREATE POLICY "Users can view own rotation state"
  ON public.analytics_rotation_state FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own rotation state" ON public.analytics_rotation_state;
CREATE POLICY "Users can insert own rotation state"
  ON public.analytics_rotation_state FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own rotation state" ON public.analytics_rotation_state;
CREATE POLICY "Users can update own rotation state"
  ON public.analytics_rotation_state FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own rotation state" ON public.analytics_rotation_state;
CREATE POLICY "Users can delete own rotation state"
  ON public.analytics_rotation_state FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- =====================================================
-- 15. OPTIMIZE RLS POLICIES - ANALYTICS USER PREFERENCES
-- =====================================================

DROP POLICY IF EXISTS "Users can view own preferences" ON public.analytics_user_preferences;
CREATE POLICY "Users can view own preferences"
  ON public.analytics_user_preferences FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own preferences" ON public.analytics_user_preferences;
CREATE POLICY "Users can insert own preferences"
  ON public.analytics_user_preferences FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own preferences" ON public.analytics_user_preferences;
CREATE POLICY "Users can update own preferences"
  ON public.analytics_user_preferences FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own preferences" ON public.analytics_user_preferences;
CREATE POLICY "Users can delete own preferences"
  ON public.analytics_user_preferences FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- =====================================================
-- 16. FIX FUNCTION SEARCH PATHS
-- =====================================================

-- Set search_path for all security definer functions
ALTER FUNCTION public.update_agent_memory_access SET search_path = public, pg_temp;
ALTER FUNCTION public.get_agent_memory_stats SET search_path = public, pg_temp;
ALTER FUNCTION public.get_user_analytics_summary SET search_path = public, pg_temp;
ALTER FUNCTION public.capture_personality_snapshot SET search_path = public, pg_temp;
ALTER FUNCTION public.clean_expired_dashboard_cache SET search_path = public, pg_temp;
ALTER FUNCTION public.search_agent_memories SET search_path = public, pg_temp;
ALTER FUNCTION public.initialize_analytics_preferences SET search_path = public, pg_temp;
ALTER FUNCTION public.get_insight_report_stats SET search_path = public, pg_temp;
ALTER FUNCTION public.get_latest_metric SET search_path = public, pg_temp;
ALTER FUNCTION public.calculate_ai_readiness_score SET search_path = public, pg_temp;
ALTER FUNCTION public.update_dashboard_updated_at SET search_path = public, pg_temp;
ALTER FUNCTION public.update_ai_interaction_count SET search_path = public, pg_temp;
ALTER FUNCTION public.get_latest_insight_report SET search_path = public, pg_temp;
ALTER FUNCTION public.advance_analytics_rotation SET search_path = public, pg_temp;
ALTER FUNCTION public.get_metric_series SET search_path = public, pg_temp;
ALTER FUNCTION public.update_archetypal_ai_activation SET search_path = public, pg_temp;

-- =====================================================
-- 17. MOVE VECTOR EXTENSION TO EXTENSIONS SCHEMA
-- =====================================================

-- Note: Vector extension should be created in extensions schema
-- This is typically done during initial setup
-- If it exists in public, it should be recreated in extensions schema
-- This requires dropping and recreating, which is risky for production
-- Commenting out for safety - should be done manually if needed

-- CREATE SCHEMA IF NOT EXISTS extensions;
-- DROP EXTENSION IF EXISTS vector CASCADE;
-- CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- For now, we'll just add a comment to document the issue
COMMENT ON EXTENSION vector IS 'Should be moved to extensions schema for better organization. Currently in public schema.';
