/*
  # Remove Unused Indexes - Part 1

  This migration removes unused indexes that waste storage space and slow down write operations.
  Indexes are only kept if they provide actual query performance benefits.

  ## Indexes Removed (Part 1 - 40 indexes)
  - agent_memories: type, created_at, importance, embedding indexes
  - insight_reports: user_id, created_at indexes
  - daily_question_responses: category, user_id, day_number, question_id, dimension, category indexes
  - memories: created_at, category, question_id indexes
  - saint_activities: created_at index
  - questions: time_of_day index
  - provider_accounts: provider index
  - webhook_events: provider, dedup_key, processed, received_at, user_id indexes
  - dashboard_data_cache: expires, dashboard_widget, widget_id indexes
  - ai_messages: conversation_id, created_at indexes
  - dashboard_sharing: dashboard_id, shared_with, created_by indexes
  - engram_memory_embeddings: embedding index
  - family_member_embeddings: member_id, embedding indexes
  - conversation_context_embeddings: conversation_id, embedding, message_id indexes
  - analytics_cache: user_id, source_provider, metric_category, time_period, expires, source_id indexes
  - archetypal_ais: active, readiness indexes
  - daily_question_embeddings: response_id, embedding indexes
*/

-- agent_memories indexes
DROP INDEX IF EXISTS idx_agent_memories_type;
DROP INDEX IF EXISTS idx_agent_memories_created_at;
DROP INDEX IF EXISTS idx_agent_memories_importance;
DROP INDEX IF EXISTS idx_agent_memories_embedding;

-- insight_reports indexes
DROP INDEX IF EXISTS idx_insight_reports_user_id;
DROP INDEX IF EXISTS idx_insight_reports_created_at;

-- daily_question_responses indexes
DROP INDEX IF EXISTS idx_daily_question_responses_category;
DROP INDEX IF EXISTS idx_daily_question_responses_user_id;
DROP INDEX IF EXISTS idx_daily_question_responses_day_number;
DROP INDEX IF EXISTS idx_daily_question_responses_question_id;
DROP INDEX IF EXISTS idx_daily_responses_dimension;
DROP INDEX IF EXISTS idx_daily_responses_category;

-- memories indexes
DROP INDEX IF EXISTS idx_memories_created_at;
DROP INDEX IF EXISTS idx_memories_category;
DROP INDEX IF EXISTS idx_memories_question_id;

-- saint_activities indexes
DROP INDEX IF EXISTS idx_saint_activities_created_at;

-- questions indexes
DROP INDEX IF EXISTS idx_questions_time_of_day;

-- provider_accounts indexes
DROP INDEX IF EXISTS provider_accounts_provider_idx;

-- webhook_events indexes
DROP INDEX IF EXISTS webhook_events_provider_idx;
DROP INDEX IF EXISTS webhook_events_dedup_key_idx;
DROP INDEX IF EXISTS webhook_events_processed_idx;
DROP INDEX IF EXISTS webhook_events_received_at_idx;
DROP INDEX IF EXISTS idx_webhook_events_user_id;

-- dashboard_data_cache indexes
DROP INDEX IF EXISTS idx_dashboard_data_cache_expires;
DROP INDEX IF EXISTS idx_dashboard_data_cache_dashboard_widget;
DROP INDEX IF EXISTS idx_dashboard_data_cache_widget_id;

-- ai_messages indexes
DROP INDEX IF EXISTS idx_ai_messages_conversation_id;
DROP INDEX IF EXISTS idx_ai_messages_created_at;

-- dashboard_sharing indexes
DROP INDEX IF EXISTS idx_dashboard_sharing_dashboard_id;
DROP INDEX IF EXISTS idx_dashboard_sharing_shared_with;
DROP INDEX IF EXISTS idx_dashboard_sharing_created_by;

-- engram_memory_embeddings indexes
DROP INDEX IF EXISTS idx_engram_memory_embeddings_embedding;

-- family_member_embeddings indexes
DROP INDEX IF EXISTS idx_family_member_embeddings_member_id;
DROP INDEX IF EXISTS idx_family_member_embeddings_embedding;

-- conversation_context_embeddings indexes
DROP INDEX IF EXISTS idx_conversation_context_embeddings_conversation_id;
DROP INDEX IF EXISTS idx_conversation_context_embeddings_embedding;
DROP INDEX IF EXISTS idx_conversation_context_embeddings_message_id;

-- analytics_cache indexes
DROP INDEX IF EXISTS analytics_cache_user_id_idx;
DROP INDEX IF EXISTS analytics_cache_source_provider_idx;
DROP INDEX IF EXISTS analytics_cache_metric_category_idx;
DROP INDEX IF EXISTS analytics_cache_time_period_idx;
DROP INDEX IF EXISTS analytics_cache_expires_idx;
DROP INDEX IF EXISTS idx_analytics_cache_source_id;

-- archetypal_ais indexes
DROP INDEX IF EXISTS idx_archetypal_ais_active;
DROP INDEX IF EXISTS idx_archetypal_ais_readiness;

-- daily_question_embeddings indexes
DROP INDEX IF EXISTS idx_daily_question_embeddings_response_id;
DROP INDEX IF EXISTS idx_daily_question_embeddings_embedding;
