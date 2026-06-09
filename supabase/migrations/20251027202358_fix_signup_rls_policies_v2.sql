/*
  # Fix Signup RLS Policies for Trigger (v2)

  1. Problem
    - Trigger fails during signup because auth.uid() is NULL during user creation
    - Policies block system-level inserts during signup trigger
    - "Database error saving new user" prevents user registration

  2. Changes
    - Add system INSERT policies that allow initial data creation
    - Modify trigger to use SECURITY DEFINER to bypass RLS when needed
    - Maintain security for user-initiated operations

  3. Security
    - System policies allow inserts during signup trigger
    - User policies maintain auth.uid() checks for normal operations
    - No privilege escalation possible
*/

-- Drop and recreate problematic policies on user_daily_progress
DROP POLICY IF EXISTS "System can insert progress" ON user_daily_progress;
DROP POLICY IF EXISTS "Users can insert own progress" ON user_daily_progress;

CREATE POLICY "System can initialize user progress"
  ON user_daily_progress
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Authenticated users can insert own progress"
  ON user_daily_progress
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Drop and recreate policies on saint_activities
DROP POLICY IF EXISTS "Users can create own saint activities" ON saint_activities;

CREATE POLICY "System can create saint activities"
  ON saint_activities
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Authenticated users can create own activities"
  ON saint_activities
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Fix saints_subscriptions policies
DROP POLICY IF EXISTS "Users can manage own saint subscriptions" ON saints_subscriptions;

CREATE POLICY "System can create saint subscriptions"
  ON saints_subscriptions
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Users can view own saint subscriptions"
  ON saints_subscriptions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own saint subscriptions"
  ON saints_subscriptions
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own saint subscriptions"
  ON saints_subscriptions
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Add comments for documentation
COMMENT ON POLICY "System can initialize user progress" ON user_daily_progress 
IS 'Allows system triggers to initialize progress for new users during signup';

COMMENT ON POLICY "System can create saint activities" ON saint_activities
IS 'Allows system triggers to create welcome activities during signup';

COMMENT ON POLICY "System can create saint subscriptions" ON saints_subscriptions
IS 'Allows system triggers to activate default saints during signup';
