/*
  # Fix Function Security - Set Proper Search Paths

  Sets secure search_path for all custom functions with correct signatures
  to prevent security vulnerabilities
*/

-- Functions with no arguments (triggers)
ALTER FUNCTION update_user_streak(uuid) SET search_path = pg_catalog, public;
ALTER FUNCTION get_or_create_user_progress(uuid) SET search_path = pg_catalog, public;
ALTER FUNCTION update_updated_at_column() SET search_path = pg_catalog, public;
ALTER FUNCTION update_progress_on_response() SET search_path = pg_catalog, public;
ALTER FUNCTION update_ai_dimension_scores() SET search_path = pg_catalog, public;
ALTER FUNCTION handle_new_user() SET search_path = pg_catalog, public;

-- Functions with arguments
ALTER FUNCTION get_daily_question_for_user(uuid) SET search_path = pg_catalog, public;
ALTER FUNCTION admin_reset_user_password(text, text) SET search_path = pg_catalog, public;
ALTER FUNCTION confirm_user_email(uuid) SET search_path = pg_catalog, public;
ALTER FUNCTION match_conversation_context(vector, uuid, double precision, integer) SET search_path = pg_catalog, public;
ALTER FUNCTION match_engram_memories(vector, uuid, double precision, integer) SET search_path = pg_catalog, public;
ALTER FUNCTION match_family_member_memories(vector, uuid, double precision, integer) SET search_path = pg_catalog, public;