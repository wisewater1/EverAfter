/*
  # Add Missing Foreign Key Indexes

  Adds indexes on foreign key columns to improve query performance
*/

CREATE INDEX IF NOT EXISTS idx_conversation_context_embeddings_message_id 
  ON conversation_context_embeddings(message_id);

CREATE INDEX IF NOT EXISTS idx_daily_question_responses_question_id 
  ON daily_question_responses(question_id);

CREATE INDEX IF NOT EXISTS idx_engram_daily_responses_question_id 
  ON engram_daily_responses(question_id);

CREATE INDEX IF NOT EXISTS idx_external_responses_question_id 
  ON external_responses(question_id);

CREATE INDEX IF NOT EXISTS idx_family_member_invitations_engram_id 
  ON family_member_invitations(engram_id);

CREATE INDEX IF NOT EXISTS idx_health_metrics_connection_id 
  ON health_metrics(connection_id);

CREATE INDEX IF NOT EXISTS idx_memories_question_id 
  ON memories(question_id);

CREATE INDEX IF NOT EXISTS idx_personality_dimensions_parent_dimension_id 
  ON personality_dimensions(parent_dimension_id);

CREATE INDEX IF NOT EXISTS idx_question_categories_dimension_id 
  ON question_categories(dimension_id);

CREATE INDEX IF NOT EXISTS idx_question_categories_parent_category_id 
  ON question_categories(parent_category_id);