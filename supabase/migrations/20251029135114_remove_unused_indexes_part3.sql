/*
  # Remove Unused Indexes - Part 3

  Final batch of unused index removal.

  ## Indexes Removed (Part 3 - remaining indexes)
  - personality_dimensions: parent_dimension_id index
  - question_categories: dimension_id, parent_category_id indexes
  - engram_ai_tasks: engram_id, created_at indexes
  - custom_health_dashboards: template_id, favorite indexes
  - dashboard_widgets: dashboard_id, type indexes
  - dashboard_templates: category, featured indexes
  - unified_activities: category index
  - user_activity_log: user, type indexes
  - user_profiles: display_name, location indexes
  - user_connections: status index
  - user_messages: sender, recipient, read, parent_message_id indexes
  - admin_notifications: type, read, user_id indexes
*/

-- personality_dimensions indexes
DROP INDEX IF EXISTS idx_personality_dimensions_parent_dimension_id;

-- question_categories indexes
DROP INDEX IF EXISTS idx_question_categories_dimension_id;
DROP INDEX IF EXISTS idx_question_categories_parent_category_id;

-- engram_ai_tasks indexes
DROP INDEX IF EXISTS idx_engram_ai_tasks_engram_id;
DROP INDEX IF EXISTS idx_engram_ai_tasks_created_at;

-- custom_health_dashboards indexes
DROP INDEX IF EXISTS idx_custom_health_dashboards_template_id;
DROP INDEX IF EXISTS idx_custom_health_dashboards_favorite;

-- dashboard_widgets indexes
DROP INDEX IF EXISTS idx_dashboard_widgets_dashboard_id;
DROP INDEX IF EXISTS idx_dashboard_widgets_type;

-- dashboard_templates indexes
DROP INDEX IF EXISTS idx_dashboard_templates_category;
DROP INDEX IF EXISTS idx_dashboard_templates_featured;

-- unified_activities indexes
DROP INDEX IF EXISTS idx_unified_activities_category;

-- user_activity_log indexes
DROP INDEX IF EXISTS idx_user_activity_log_user;
DROP INDEX IF EXISTS idx_user_activity_log_type;

-- user_profiles indexes
DROP INDEX IF EXISTS idx_user_profiles_display_name;
DROP INDEX IF EXISTS idx_user_profiles_location;

-- user_connections indexes
DROP INDEX IF EXISTS idx_user_connections_status;

-- user_messages indexes
DROP INDEX IF EXISTS idx_user_messages_sender;
DROP INDEX IF EXISTS idx_user_messages_recipient;
DROP INDEX IF EXISTS idx_user_messages_read;
DROP INDEX IF EXISTS idx_user_messages_parent_message_id;

-- admin_notifications indexes
DROP INDEX IF EXISTS idx_admin_notifications_type;
DROP INDEX IF EXISTS idx_admin_notifications_read;
DROP INDEX IF EXISTS idx_admin_notifications_user_id;
