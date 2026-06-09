/*
  # Fix Security Issues - Part 4: Fix Multiple Permissive Policies

  Remove duplicate system policies that create conflicts.
*/

-- Remove duplicate system policy for analytics_rotation_state
DROP POLICY IF EXISTS "System can initialize rotation state" ON public.analytics_rotation_state;

-- Remove duplicate system policy for analytics_user_preferences
DROP POLICY IF EXISTS "System can initialize user preferences" ON public.analytics_user_preferences;

-- Remove duplicate system policy for saint_activities
DROP POLICY IF EXISTS "System can create saint activities" ON public.saint_activities;

-- Remove duplicate system policy for user_daily_progress
DROP POLICY IF EXISTS "System can initialize user progress" ON public.user_daily_progress;
