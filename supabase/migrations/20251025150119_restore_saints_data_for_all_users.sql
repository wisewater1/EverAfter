/*
  # Restore Saints Data for All Users
  
  ## Overview
  This migration ensures all users have their Saints AI properly initialized:
  - Checks for missing saints_subscriptions records
  - Creates St. Raphael subscription for all users
  - Adds welcome activities for users without any
  - Initializes user_daily_progress if missing
  
  ## Changes
  
  1. Data Restoration
     - Inserts St. Raphael subscription for all profiles without one
     - Creates welcome activity from St. Raphael for new subscriptions
     - Ensures user_daily_progress exists for all users
  
  2. Safety
     - Uses ON CONFLICT to prevent duplicates
     - Only affects users missing required data
     - Idempotent - safe to run multiple times
*/

-- Ensure all users have St. Raphael subscription
INSERT INTO saints_subscriptions (user_id, saint_id, is_active, activated_at)
SELECT 
  p.id,
  'raphael',
  true,
  now()
FROM profiles p
WHERE NOT EXISTS (
  SELECT 1 
  FROM saints_subscriptions ss 
  WHERE ss.user_id = p.id 
  AND ss.saint_id = 'raphael'
)
ON CONFLICT (user_id, saint_id) DO NOTHING;

-- Create welcome activities for users who don't have any
INSERT INTO saint_activities (user_id, saint_id, action, description, category, impact, status, created_at)
SELECT 
  p.id,
  'raphael',
  'Welcome to EverAfter AI',
  'St. Raphael is now active and ready to assist you with health management, appointments, prescriptions, and wellness tracking. I work autonomously in the background to support your wellbeing.',
  'support',
  'high',
  'completed',
  now()
FROM profiles p
WHERE NOT EXISTS (
  SELECT 1 
  FROM saint_activities sa 
  WHERE sa.user_id = p.id 
  AND sa.saint_id = 'raphael'
);

-- Add initial health monitoring activity for active users
INSERT INTO saint_activities (user_id, saint_id, action, description, category, impact, status, created_at)
SELECT 
  ss.user_id,
  'raphael',
  'Health Monitoring Started',
  'I have begun monitoring your health data and will proactively help manage appointments, medications, and wellness goals.',
  'support',
  'medium',
  'completed',
  now() - interval '1 hour'
FROM saints_subscriptions ss
WHERE ss.saint_id = 'raphael' 
AND ss.is_active = true
AND NOT EXISTS (
  SELECT 1 
  FROM saint_activities sa 
  WHERE sa.user_id = ss.user_id 
  AND sa.action = 'Health Monitoring Started'
);

-- Ensure user_daily_progress exists for all users
INSERT INTO user_daily_progress (user_id, current_day, total_responses, streak_days, started_at, updated_at)
SELECT 
  p.id,
  1,
  0,
  0,
  now(),
  now()
FROM profiles p
WHERE NOT EXISTS (
  SELECT 1 
  FROM user_daily_progress udp 
  WHERE udp.user_id = p.id
)
ON CONFLICT (user_id) DO NOTHING;

-- Log restoration completion
DO $$
DECLARE
  restored_count integer;
BEGIN
  SELECT COUNT(*) INTO restored_count
  FROM saints_subscriptions
  WHERE saint_id = 'raphael';
  
  RAISE NOTICE 'Saints restoration complete. Total St. Raphael subscriptions: %', restored_count;
END $$;