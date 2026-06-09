/*
  # Remove Unused Indexes - Part 2

  Continues removing unused indexes to improve write performance and reduce storage costs.

  ## Indexes Removed (Part 2 - 40 indexes)
  - agent_tasks: saint_id, status, created_at indexes
  - agent_task_logs: task_id index
  - personality_traits: dimension, confidence, ai indexes
  - archetypal_conversations: user_id, created_at indexes
  - analytics_rotation_state: active, next_rotation indexes
  - daily_question_pool: dimension, day_range indexes
  - trait_task_associations: trait, task_type, relevance indexes
  - family_personality_questions: family_member, status indexes
  - engrams: type, ai_activated indexes
  - engram_daily_responses: engram_id, created_at, question_id indexes
  - engram_personality_filters: engram_id, dimension indexes
  - family_member_invitations: status, token, engram_id indexes
  - engram_progress: engram_id index
  - subscriptions: stripe_customer_id index
  - external_responses: invitation_id, engram_id, status, question_id indexes
  - analytics_user_preferences: user_id index
  - health_metrics: recorded_at, connection_id indexes
  - prescriptions: is_active index
  - medication_logs: prescription_id, taken_at indexes
  - health_goals: target_date index
  - health_reminders: is_active index
*/

-- agent_tasks indexes
DROP INDEX IF EXISTS idx_agent_tasks_saint_id;
DROP INDEX IF EXISTS idx_agent_tasks_status;
DROP INDEX IF EXISTS idx_agent_tasks_created_at;

-- agent_task_logs indexes
DROP INDEX IF EXISTS idx_agent_task_logs_task_id;

-- personality_traits indexes
DROP INDEX IF EXISTS idx_personality_traits_dimension;
DROP INDEX IF EXISTS idx_personality_traits_confidence;
DROP INDEX IF EXISTS idx_personality_traits_ai;

-- archetypal_conversations indexes
DROP INDEX IF EXISTS idx_archetypal_conversations_user_id;
DROP INDEX IF EXISTS idx_archetypal_conversations_created_at;

-- analytics_rotation_state indexes
DROP INDEX IF EXISTS analytics_rotation_state_active_idx;
DROP INDEX IF EXISTS analytics_rotation_state_next_rotation_idx;

-- daily_question_pool indexes
DROP INDEX IF EXISTS idx_daily_question_pool_dimension;
DROP INDEX IF EXISTS idx_daily_question_pool_day_range;

-- trait_task_associations indexes
DROP INDEX IF EXISTS idx_trait_task_associations_trait;
DROP INDEX IF EXISTS idx_trait_task_associations_task_type;
DROP INDEX IF EXISTS idx_trait_task_associations_relevance;

-- family_personality_questions indexes
DROP INDEX IF EXISTS idx_family_personality_questions_family_member;
DROP INDEX IF EXISTS idx_family_personality_questions_status;

-- engrams indexes
DROP INDEX IF EXISTS idx_engrams_type;
DROP INDEX IF EXISTS idx_engrams_ai_activated;

-- engram_daily_responses indexes
DROP INDEX IF EXISTS idx_engram_responses_engram_id;
DROP INDEX IF EXISTS idx_engram_responses_created_at;
DROP INDEX IF EXISTS idx_engram_daily_responses_question_id;

-- engram_personality_filters indexes
DROP INDEX IF EXISTS idx_engram_filters_engram_id;
DROP INDEX IF EXISTS idx_engram_filters_dimension;

-- family_member_invitations indexes
DROP INDEX IF EXISTS idx_invitations_status;
DROP INDEX IF EXISTS idx_invitations_token;
DROP INDEX IF EXISTS idx_family_member_invitations_engram_id;

-- engram_progress indexes
DROP INDEX IF EXISTS idx_engram_progress_engram_id;

-- subscriptions indexes
DROP INDEX IF EXISTS idx_subscriptions_stripe_customer_id;

-- external_responses indexes
DROP INDEX IF EXISTS idx_external_responses_invitation_id;
DROP INDEX IF EXISTS idx_external_responses_engram_id;
DROP INDEX IF EXISTS idx_external_responses_status;
DROP INDEX IF EXISTS idx_external_responses_question_id;

-- analytics_user_preferences indexes
DROP INDEX IF EXISTS analytics_user_preferences_user_id_idx;

-- health_metrics indexes
DROP INDEX IF EXISTS idx_health_metrics_recorded_at;
DROP INDEX IF EXISTS idx_health_metrics_connection_id;

-- prescriptions indexes
DROP INDEX IF EXISTS idx_prescriptions_is_active;

-- medication_logs indexes
DROP INDEX IF EXISTS idx_medication_logs_prescription_id;
DROP INDEX IF EXISTS idx_medication_logs_taken_at;

-- health_goals indexes
DROP INDEX IF EXISTS idx_health_goals_target_date;

-- health_reminders indexes
DROP INDEX IF EXISTS idx_health_reminders_is_active;
