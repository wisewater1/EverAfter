/*
  # Fix Security Definer Views and Function Search Paths

  Addresses security concerns with SECURITY DEFINER views and functions
  that have mutable search paths.

  ## Changes
  1. Recreate views with SECURITY INVOKER
  2. Set explicit search_path on functions
*/

-- Drop and recreate views with SECURITY INVOKER
DROP VIEW IF EXISTS public.v_activity_rotation_display;
DROP VIEW IF EXISTS public.v_today_activities;

CREATE VIEW public.v_activity_rotation_display
WITH (security_invoker = true)
AS
SELECT 
  ua.id,
  ua.user_id,
  ua.category,
  ua.action,
  ua.description,
  ua.impact,
  ua.status,
  ua.metadata,
  ua.created_at,
  arc.enabled,
  arc.rotation_interval_seconds,
  arc.last_rotated_at
FROM unified_activities ua
LEFT JOIN activity_rotation_config arc ON arc.user_id = ua.user_id;

CREATE VIEW public.v_today_activities
WITH (security_invoker = true)
AS
SELECT 
  id,
  user_id,
  source_type,
  source_id,
  category,
  action,
  description,
  impact,
  status,
  metadata,
  created_at
FROM unified_activities
WHERE DATE(created_at) = CURRENT_DATE;

-- Fix function search paths
ALTER FUNCTION public.calculate_ai_readiness_score(integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_latest_metric(uuid, text, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_metric_series(uuid, text, timestamp with time zone, timestamp with time zone, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.initialize_analytics_preferences() SET search_path = public, pg_temp;
ALTER FUNCTION public.get_user_analytics_summary(uuid, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.search_agent_memories(vector, uuid, double precision, integer, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.update_agent_memory_access(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_latest_insight_report(uuid, uuid, text) SET search_path = public, pg_temp;
