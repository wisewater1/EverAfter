/*
  # Seed Initial Unified Activities

  1. Purpose
    - Populate unified activities from existing saint_activities
    - Initialize activity categories for all users
    - Set up rotation configs for existing users

  2. Changes
    - Migrate existing saint_activities to unified_activities
    - Initialize category stats with current counts
    - Create rotation configs

  3. Security
    - Uses existing RLS policies
    - System-level insert permissions
*/

-- Migrate existing saint activities to unified activities
INSERT INTO public.unified_activities (
  user_id, source_type, source_id, category, action, description, 
  impact, status, metadata, created_at
)
SELECT 
  sa.user_id,
  'saint'::text,
  sa.id,
  sa.category,
  sa.action,
  sa.description,
  sa.impact,
  sa.status,
  jsonb_build_object('saint_id', sa.saint_id),
  sa.created_at
FROM public.saint_activities sa
WHERE NOT EXISTS (
  SELECT 1 FROM public.unified_activities ua
  WHERE ua.source_type = 'saint' AND ua.source_id = sa.id
)
ON CONFLICT DO NOTHING;

-- Initialize activity categories for existing users based on their activities
WITH user_activities AS (
  SELECT 
    user_id,
    category,
    COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) as today_count,
    COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - interval '7 days') as week_count,
    MAX(created_at) as last_activity_at
  FROM public.unified_activities
  GROUP BY user_id, category
)
INSERT INTO public.activity_category_stats (
  user_id, category, display_name, icon_name, color,
  today_count, week_count, last_activity_at, sort_order
)
SELECT 
  ua.user_id,
  ua.category,
  INITCAP(ua.category),
  CASE ua.category
    WHEN 'protection' THEN 'Shield'
    WHEN 'support' THEN 'Heart'
    WHEN 'memory' THEN 'Brain'
    WHEN 'communication' THEN 'MessageCircle'
    WHEN 'health' THEN 'Activity'
    WHEN 'medication' THEN 'Pill'
    WHEN 'appointment' THEN 'Calendar'
    WHEN 'task' THEN 'CheckSquare'
    WHEN 'insight' THEN 'Lightbulb'
    WHEN 'connection' THEN 'Link'
    WHEN 'family' THEN 'Users'
    WHEN 'learning' THEN 'BookOpen'
    WHEN 'charity' THEN 'Heart'
    ELSE 'Star'
  END,
  CASE ua.category
    WHEN 'protection' THEN 'blue'
    WHEN 'support' THEN 'rose'
    WHEN 'memory' THEN 'emerald'
    WHEN 'communication' THEN 'purple'
    WHEN 'health' THEN 'cyan'
    WHEN 'medication' THEN 'orange'
    WHEN 'appointment' THEN 'indigo'
    WHEN 'task' THEN 'teal'
    WHEN 'insight' THEN 'amber'
    WHEN 'connection' THEN 'sky'
    WHEN 'family' THEN 'pink'
    WHEN 'learning' THEN 'violet'
    WHEN 'charity' THEN 'rose'
    ELSE 'slate'
  END,
  ua.today_count,
  ua.week_count,
  ua.last_activity_at,
  ROW_NUMBER() OVER (PARTITION BY ua.user_id ORDER BY ua.today_count DESC)
FROM user_activities ua
ON CONFLICT (user_id, category) DO UPDATE SET
  today_count = EXCLUDED.today_count,
  week_count = EXCLUDED.week_count,
  last_activity_at = EXCLUDED.last_activity_at,
  updated_at = now();

-- Ensure rotation config exists for all users with activities
INSERT INTO public.activity_rotation_config (user_id, rotation_interval_seconds, enabled)
SELECT DISTINCT user_id, 10, true
FROM public.unified_activities
ON CONFLICT (user_id) DO NOTHING;

-- Create a few demo activities for users who don't have any yet
DO $$
DECLARE
  v_user RECORD;
BEGIN
  FOR v_user IN (
    SELECT DISTINCT p.id as user_id
    FROM public.profiles p
    WHERE NOT EXISTS (
      SELECT 1 FROM public.unified_activities ua WHERE ua.user_id = p.id
    )
    LIMIT 10
  )
  LOOP
    -- Insert welcome activity
    PERFORM public.log_unified_activity(
      v_user.user_id,
      'saint',
      'support',
      'Welcome to EverAfter AI',
      'Your AI agents are ready to assist you. Start exploring the dashboard to see all features.',
      NULL,
      'high',
      'completed',
      jsonb_build_object('source', 'system_init')
    );

    -- Insert health tracking activity
    PERFORM public.log_unified_activity(
      v_user.user_id,
      'health',
      'health',
      'Health Dashboard Activated',
      'Your health monitoring system is ready to track wellness data.',
      NULL,
      'medium',
      'completed',
      jsonb_build_object('source', 'system_init')
    );

    -- Insert memory activity
    PERFORM public.log_unified_activity(
      v_user.user_id,
      'engram',
      'memory',
      'Memory System Initialized',
      'Your digital memory system is active and ready to capture important moments.',
      NULL,
      'medium',
      'completed',
      jsonb_build_object('source', 'system_init')
    );
  END LOOP;
END $$;

COMMENT ON TABLE public.unified_activities IS 'Unified activity log - updated with seeded data from existing activities';
