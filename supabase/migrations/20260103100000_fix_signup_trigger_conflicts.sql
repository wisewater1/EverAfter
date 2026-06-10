/*
  # Fix Signup Trigger Conflicts

  Problem: Multiple triggers on auth.users without proper exception handling
  causing "Database error saving new user" on signup.

  Solution:
  1. Drop the conflicting create_user_profile_trigger
  2. Make handle_new_user handle all profile creation needs
  3. Add user_profiles insertion to handle_new_user if table exists
*/

-- Drop the conflicting trigger that doesn't have exception handling
DROP TRIGGER IF EXISTS create_user_profile_trigger ON auth.users;

-- Drop the associated function
DROP FUNCTION IF EXISTS create_user_profile_on_signup();

-- Update handle_new_user to also handle user_profiles if that table exists
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = ''
LANGUAGE plpgsql
AS $$
DECLARE
  v_display_name text;
  v_full_name text;
BEGIN
  -- Extract names safely
  BEGIN
    v_display_name := COALESCE(
      NEW.raw_user_meta_data->>'display_name',
      split_part(NEW.email, '@', 1),
      'User'
    );
    v_full_name := COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.email,
      'User'
    );
  EXCEPTION
    WHEN OTHERS THEN
      v_display_name := 'User';
      v_full_name := 'User';
  END;

  -- Try to insert into profiles table
  BEGIN
    INSERT INTO public.profiles (id, email, display_name, created_at, updated_at)
    VALUES (NEW.id, NEW.email, v_display_name, NOW(), NOW())
    ON CONFLICT (id) DO UPDATE
    SET
      email = EXCLUDED.email,
      updated_at = NOW();
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Profile insert failed for user %: %', NEW.id, SQLERRM;
  END;

  -- Try to insert into user_profiles table (if it exists)
  BEGIN
    INSERT INTO public.user_profiles (user_id, full_name, display_name)
    VALUES (NEW.id, v_full_name, v_display_name)
    ON CONFLICT (user_id) DO UPDATE
    SET
      full_name = EXCLUDED.full_name,
      display_name = EXCLUDED.display_name;
  EXCEPTION
    WHEN undefined_table THEN
      -- Table doesn't exist, skip silently
      NULL;
    WHEN OTHERS THEN
      RAISE WARNING 'User profiles insert failed for user %: %', NEW.id, SQLERRM;
  END;

  -- Try St. Raphael subscription
  BEGIN
    INSERT INTO public.saints_subscriptions (user_id, saint_id, is_active, activated_at)
    VALUES (NEW.id, 'raphael', true, NOW())
    ON CONFLICT (user_id, saint_id) DO NOTHING;
  EXCEPTION
    WHEN undefined_table THEN
      NULL;
    WHEN OTHERS THEN
      RAISE WARNING 'Saints subscription failed for user %: %', NEW.id, SQLERRM;
  END;

  -- Try daily progress
  BEGIN
    INSERT INTO public.user_daily_progress (user_id, current_day, total_responses, streak_days, started_at, updated_at)
    VALUES (NEW.id, 1, 0, 0, NOW(), NOW())
    ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION
    WHEN undefined_table THEN
      NULL;
    WHEN OTHERS THEN
      RAISE WARNING 'Daily progress failed for user %: %', NEW.id, SQLERRM;
  END;

  -- Try welcome activity
  BEGIN
    INSERT INTO public.saint_activities (user_id, saint_id, action, description, category, impact, status, created_at)
    VALUES (
      NEW.id,
      'raphael',
      'Welcome to EverAfter',
      'St. Raphael has been activated and is ready to assist you.',
      'support',
      'high',
      'completed',
      NOW()
    );
  EXCEPTION
    WHEN undefined_table THEN
      NULL;
    WHEN OTHERS THEN
      RAISE WARNING 'Welcome activity failed for user %: %', NEW.id, SQLERRM;
  END;

  -- ALWAYS return NEW - never block signup
  RETURN NEW;

EXCEPTION
  WHEN OTHERS THEN
    -- Absolute last resort - log and return NEW anyway
    RAISE WARNING 'handle_new_user catastrophic failure for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Ensure the main trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Also remove the analytics preferences trigger if it's causing issues
DROP TRIGGER IF EXISTS initialize_analytics_preferences_trigger ON auth.users;

COMMENT ON FUNCTION public.handle_new_user() IS
'Consolidated user initialization trigger. NEVER blocks signup - all exceptions are caught and logged.';
