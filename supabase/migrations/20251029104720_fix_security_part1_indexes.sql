/*
  # Fix Security Issues - Part 1: Missing Foreign Key Indexes

  Adds indexes for foreign keys to improve query performance
*/

-- Add missing foreign key indexes
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
