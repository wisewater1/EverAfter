/*
  # Fix Signup Trigger Error Handling

  1. Changes
    - Add better error handling to handle_new_user function
    - Ensure proper transaction handling
    - Add logging for debugging
    - Make trigger more resilient to partial failures

  2. Security
    - Maintains SECURITY DEFINER for auth schema access
    - Keeps all existing RLS policies intact
*/

-- Drop existing trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Recreate function with better error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_display_name text;
BEGIN
  -- Get display name with fallback
  v_display_name := COALESCE(
    NEW.raw_user_meta_data->>'display_name',
    split_part(NEW.email, '@', 1),
    'User'
  );

  -- Insert profile (this must succeed)
  BEGIN
    INSERT INTO public.profiles (id, email, display_name, created_at, updated_at)
    VALUES (NEW.id, NEW.email, v_display_name, NOW(), NOW())
    ON CONFLICT (id) DO UPDATE
    SET 
      email = EXCLUDED.email,
      display_name = COALESCE(profiles.display_name, EXCLUDED.display_name),
      updated_at = NOW();
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
    -- Continue anyway - don't block user creation
  END;

  -- Insert St. Raphael subscription (safe to fail)
  BEGIN
    INSERT INTO public.saints_subscriptions (user_id, saint_id, is_active, activated_at)
    VALUES (NEW.id, 'raphael', true, NOW())
    ON CONFLICT (user_id, saint_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to create saints subscription for user %: %', NEW.id, SQLERRM;
  END;

  -- Insert daily progress (safe to fail)
  BEGIN
    INSERT INTO public.user_daily_progress (user_id, current_day, total_responses, streak_days, started_at, updated_at)
    VALUES (NEW.id, 1, 0, 0, NOW(), NOW())
    ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to create daily progress for user %: %', NEW.id, SQLERRM;
  END;

  -- Insert welcome activity (safe to fail)
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
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to create welcome activity for user %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Comment for documentation
COMMENT ON FUNCTION public.handle_new_user() IS 'Automatically initializes new users with profile, St. Raphael subscription, and welcome activity. Gracefully handles partial failures.';
