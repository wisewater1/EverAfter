/*
  # Fix Security Issues - Indexes and Extensions

  This migration addresses security and performance issues:

  1. **Missing Index**
     - Add index for `personality_media.family_member_id` foreign key

  2. **Unused Indexes**
     - Remove 39 unused indexes that are not being utilized
     - Reduces database bloat and improves write performance

  3. **Extension Schema**
     - Move `vector` extension from public schema to `extensions` schema
     - Follows PostgreSQL best practices for extension management

  ## Important Notes
  - Removing unused indexes improves write performance
  - The vector extension move requires careful handling to avoid breaking existing functionality
  - All queries using vector types will continue to work via search_path
*/

-- =====================================================
-- 1. Add Missing Index for Foreign Key
-- =====================================================

-- Add index for personality_media foreign key
CREATE INDEX IF NOT EXISTS idx_personality_media_family_member_id
  ON public.personality_media(family_member_id);

-- =====================================================
-- 2. Remove Unused Indexes
-- =====================================================

-- Drop unused indexes to improve write performance and reduce storage
DROP INDEX IF EXISTS public.idx_admin_notifications_user_id;
DROP INDEX IF EXISTS public.idx_agent_task_logs_task_id;
DROP INDEX IF EXISTS public.idx_ai_messages_conversation_id;
DROP INDEX IF EXISTS public.idx_analytics_cache_source_id;
DROP INDEX IF EXISTS public.idx_analytics_cache_user_id;
DROP INDEX IF EXISTS public.idx_archetypal_conversations_user_id;
DROP INDEX IF EXISTS public.idx_conversation_context_embeddings_conversation_id;
DROP INDEX IF EXISTS public.idx_conversation_context_embeddings_message_id;
DROP INDEX IF EXISTS public.idx_daily_question_embeddings_response_id;
DROP INDEX IF EXISTS public.idx_daily_question_pool_dimension_id;
DROP INDEX IF EXISTS public.idx_daily_question_responses_category_id;
DROP INDEX IF EXISTS public.idx_daily_question_responses_dimension_id;
DROP INDEX IF EXISTS public.idx_daily_question_responses_question_id;
DROP INDEX IF EXISTS public.idx_dashboard_data_cache_widget_id;
DROP INDEX IF EXISTS public.idx_dashboard_sharing_created_by;
DROP INDEX IF EXISTS public.idx_dashboard_sharing_shared_with_user_id;
DROP INDEX IF EXISTS public.idx_dashboard_widgets_dashboard_id;
DROP INDEX IF EXISTS public.idx_engram_ai_tasks_engram_id;
DROP INDEX IF EXISTS public.idx_engram_daily_responses_engram_id;
DROP INDEX IF EXISTS public.idx_engram_daily_responses_question_id;
DROP INDEX IF EXISTS public.idx_engram_personality_filters_engram_id;
DROP INDEX IF EXISTS public.idx_external_responses_engram_id;
DROP INDEX IF EXISTS public.idx_external_responses_invitation_id;
DROP INDEX IF EXISTS public.idx_external_responses_question_id;
DROP INDEX IF EXISTS public.idx_family_member_embeddings_family_member_id;
DROP INDEX IF EXISTS public.idx_family_member_invitations_engram_id;
DROP INDEX IF EXISTS public.idx_family_personality_questions_family_member_id;
DROP INDEX IF EXISTS public.idx_health_metrics_connection_id;
DROP INDEX IF EXISTS public.idx_medication_logs_prescription_id;
DROP INDEX IF EXISTS public.idx_memories_question_id;
DROP INDEX IF EXISTS public.idx_personality_dimensions_parent_dimension_id;
DROP INDEX IF EXISTS public.idx_personality_traits_dimension_id;
DROP INDEX IF EXISTS public.idx_question_categories_dimension_id;
DROP INDEX IF EXISTS public.idx_question_categories_parent_category_id;
DROP INDEX IF EXISTS public.idx_user_activity_log_user_id;
DROP INDEX IF EXISTS public.idx_user_messages_parent_message_id;
DROP INDEX IF EXISTS public.idx_user_messages_recipient_id;
DROP INDEX IF EXISTS public.idx_user_messages_sender_id;
DROP INDEX IF EXISTS public.idx_webhook_events_user_id;

-- =====================================================
-- 3. Move Vector Extension to Extensions Schema
-- =====================================================

-- Create extensions schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS extensions;

-- Move vector extension from public to extensions schema
-- Note: This is a metadata operation and won't break existing vector columns
DO $$
BEGIN
  -- Check if vector extension exists in public schema
  IF EXISTS (
    SELECT 1 FROM pg_extension
    WHERE extname = 'vector'
    AND extnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ) THEN
    -- Move the extension to extensions schema
    ALTER EXTENSION vector SET SCHEMA extensions;
  END IF;
END $$;

-- Ensure extensions schema is in search_path for all users
-- This allows vector types to be used without schema qualification
ALTER DATABASE postgres SET search_path TO public, extensions;

-- Grant usage on extensions schema
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;

-- =====================================================
-- 4. Verify and Optimize
-- =====================================================

-- Add comment documenting the changes
COMMENT ON SCHEMA extensions IS 'Schema for PostgreSQL extensions. Keeps public schema clean and follows best practices.';

-- Analyze tables to update statistics after index changes
ANALYZE public.personality_media;
