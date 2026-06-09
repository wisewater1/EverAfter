/*
  # Fix Security and Performance Issues - Comprehensive

  ## Changes Made
  
  ### 1. Add Missing Foreign Key Indexes (39 indexes)
  All foreign keys now have covering indexes for optimal query performance

  ### 2. Optimize RLS Policies for personality_media
  Replace auth.uid() with (SELECT auth.uid()) to avoid re-evaluation per row

  ### 3. Remove Unused Indexes
  Drop unused indexes on personality_media table

  ### 4. Fix Function Search Path
  Set search_path to empty for update_personality_media_updated_at function
*/

-- ============================================================================
-- PART 1: Add Missing Foreign Key Indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_admin_notifications_user_id 
  ON public.admin_notifications(user_id);

CREATE INDEX IF NOT EXISTS idx_agent_task_logs_task_id 
  ON public.agent_task_logs(task_id);

CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation_id 
  ON public.ai_messages(conversation_id);

CREATE INDEX IF NOT EXISTS idx_analytics_cache_source_id 
  ON public.analytics_cache(source_id);

CREATE INDEX IF NOT EXISTS idx_analytics_cache_user_id 
  ON public.analytics_cache(user_id);

CREATE INDEX IF NOT EXISTS idx_archetypal_conversations_user_id 
  ON public.archetypal_conversations(user_id);

CREATE INDEX IF NOT EXISTS idx_conversation_context_embeddings_conversation_id 
  ON public.conversation_context_embeddings(conversation_id);

CREATE INDEX IF NOT EXISTS idx_conversation_context_embeddings_message_id 
  ON public.conversation_context_embeddings(message_id);

CREATE INDEX IF NOT EXISTS idx_daily_question_embeddings_response_id 
  ON public.daily_question_embeddings(response_id);

CREATE INDEX IF NOT EXISTS idx_daily_question_pool_dimension_id 
  ON public.daily_question_pool(dimension_id);

CREATE INDEX IF NOT EXISTS idx_daily_question_responses_category_id 
  ON public.daily_question_responses(category_id);

CREATE INDEX IF NOT EXISTS idx_daily_question_responses_dimension_id 
  ON public.daily_question_responses(dimension_id);

CREATE INDEX IF NOT EXISTS idx_daily_question_responses_question_id 
  ON public.daily_question_responses(question_id);

CREATE INDEX IF NOT EXISTS idx_dashboard_data_cache_widget_id 
  ON public.dashboard_data_cache(widget_id);

CREATE INDEX IF NOT EXISTS idx_dashboard_sharing_created_by 
  ON public.dashboard_sharing(created_by);

CREATE INDEX IF NOT EXISTS idx_dashboard_sharing_shared_with_user_id 
  ON public.dashboard_sharing(shared_with_user_id);

CREATE INDEX IF NOT EXISTS idx_dashboard_widgets_dashboard_id 
  ON public.dashboard_widgets(dashboard_id);

CREATE INDEX IF NOT EXISTS idx_engram_ai_tasks_engram_id 
  ON public.engram_ai_tasks(engram_id);

CREATE INDEX IF NOT EXISTS idx_engram_daily_responses_engram_id 
  ON public.engram_daily_responses(engram_id);

CREATE INDEX IF NOT EXISTS idx_engram_daily_responses_question_id 
  ON public.engram_daily_responses(question_id);

CREATE INDEX IF NOT EXISTS idx_engram_personality_filters_engram_id 
  ON public.engram_personality_filters(engram_id);

CREATE INDEX IF NOT EXISTS idx_external_responses_engram_id 
  ON public.external_responses(engram_id);

CREATE INDEX IF NOT EXISTS idx_external_responses_invitation_id 
  ON public.external_responses(invitation_id);

CREATE INDEX IF NOT EXISTS idx_external_responses_question_id 
  ON public.external_responses(question_id);

CREATE INDEX IF NOT EXISTS idx_family_member_embeddings_family_member_id 
  ON public.family_member_embeddings(family_member_id);

CREATE INDEX IF NOT EXISTS idx_family_member_invitations_engram_id 
  ON public.family_member_invitations(engram_id);

CREATE INDEX IF NOT EXISTS idx_family_personality_questions_family_member_id 
  ON public.family_personality_questions(family_member_id);

CREATE INDEX IF NOT EXISTS idx_health_metrics_connection_id 
  ON public.health_metrics(connection_id);

CREATE INDEX IF NOT EXISTS idx_medication_logs_prescription_id 
  ON public.medication_logs(prescription_id);

CREATE INDEX IF NOT EXISTS idx_memories_question_id 
  ON public.memories(question_id);

CREATE INDEX IF NOT EXISTS idx_personality_dimensions_parent_dimension_id 
  ON public.personality_dimensions(parent_dimension_id);

CREATE INDEX IF NOT EXISTS idx_personality_traits_dimension_id 
  ON public.personality_traits(dimension_id);

CREATE INDEX IF NOT EXISTS idx_question_categories_dimension_id 
  ON public.question_categories(dimension_id);

CREATE INDEX IF NOT EXISTS idx_question_categories_parent_category_id 
  ON public.question_categories(parent_category_id);

CREATE INDEX IF NOT EXISTS idx_user_activity_log_user_id 
  ON public.user_activity_log(user_id);

CREATE INDEX IF NOT EXISTS idx_user_messages_parent_message_id 
  ON public.user_messages(parent_message_id);

CREATE INDEX IF NOT EXISTS idx_user_messages_recipient_id 
  ON public.user_messages(recipient_id);

CREATE INDEX IF NOT EXISTS idx_user_messages_sender_id 
  ON public.user_messages(sender_id);

CREATE INDEX IF NOT EXISTS idx_webhook_events_user_id 
  ON public.webhook_events(user_id);

-- ============================================================================
-- PART 2: Optimize RLS Policies for personality_media
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own personality media" ON public.personality_media;
DROP POLICY IF EXISTS "Users can insert their own personality media" ON public.personality_media;
DROP POLICY IF EXISTS "Users can update their own personality media" ON public.personality_media;
DROP POLICY IF EXISTS "Users can delete their own personality media" ON public.personality_media;

-- Recreate with optimized auth.uid() pattern
CREATE POLICY "Users can view their own personality media"
  ON public.personality_media
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert their own personality media"
  ON public.personality_media
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update their own personality media"
  ON public.personality_media
  FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete their own personality media"
  ON public.personality_media
  FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- ============================================================================
-- PART 3: Remove Unused Indexes
-- ============================================================================

DROP INDEX IF EXISTS public.idx_personality_media_family_member;
DROP INDEX IF EXISTS public.idx_personality_media_type;
DROP INDEX IF EXISTS public.idx_personality_media_created;

-- ============================================================================
-- PART 4: Fix Function Search Path
-- ============================================================================

-- Drop function with CASCADE to remove dependent triggers
DROP FUNCTION IF EXISTS public.update_personality_media_updated_at() CASCADE;

-- Recreate the function with secure search_path
CREATE FUNCTION public.update_personality_media_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER set_personality_media_updated_at
  BEFORE UPDATE ON public.personality_media
  FOR EACH ROW
  EXECUTE FUNCTION public.update_personality_media_updated_at();