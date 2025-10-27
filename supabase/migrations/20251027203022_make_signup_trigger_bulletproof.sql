/*
  # Make Signup Trigger Completely Bulletproof

  1. Problem
    - Users still getting "Database error saving new user"
    - Need to ensure trigger NEVER throws an exception that blocks signup

  2. Solution
    - Wrap entire function in top-level exception handler
    - Use RETURN NEW in all code paths
    - Remove any operations that could possibly fail
    - Add extensive logging for debugging

  3. Result
    - Signup will ALWAYS succeed even if profile creation fails
    - Warnings logged for debugging but never block user creation
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  v_display_name text;
  v_insert_result text;
BEGIN
  -- Log the trigger execution
  RAISE NOTICE 'handle_new_user triggered for user ID: %, Email: %', NEW.id, NEW.email;
  
  -- Extract display name safely
  BEGIN
    v_display_name := COALESCE(
      NEW.raw_user_meta_data->>'display_name',
      split_part(NEW.email, '@', 1),
      'User'
    );
    RAISE NOTICE 'Display name determined: %', v_display_name;
  EXCEPTION 
    WHEN OTHERS THEN
      v_display_name := 'User';
      RAISE WARNING 'Display name extraction failed: %', SQLERRM;
  END;

  -- Try to insert profile
  BEGIN
    INSERT INTO public.profiles (id, email, display_name, created_at, updated_at)
    VALUES (NEW.id, NEW.email, v_display_name, NOW(), NOW())
    ON CONFLICT (id) DO UPDATE
    SET 
      email = EXCLUDED.email,
      updated_at = NOW();
    
    RAISE NOTICE 'Profile created/updated successfully for user %', NEW.id;
    v_insert_result := 'success';
  EXCEPTION 
    WHEN OTHERS THEN
      RAISE WARNING 'Profile insert failed for user %: % (SQLSTATE: %)', NEW.id, SQLERRM, SQLSTATE;
      v_insert_result := 'failed';
  END;

  -- Only try other inserts if profile succeeded
  IF v_insert_result = 'success' THEN
    -- Try St. Raphael subscription
    BEGIN
      INSERT INTO public.saints_subscriptions (user_id, saint_id, is_active, activated_at)
      VALUES (NEW.id, 'raphael', true, NOW())
      ON CONFLICT (user_id, saint_id) DO NOTHING;
      RAISE NOTICE 'Saints subscription created for user %', NEW.id;
    EXCEPTION 
      WHEN OTHERS THEN
        RAISE WARNING 'Saints subscription failed for user %: %', NEW.id, SQLERRM;
    END;

    -- Try daily progress
    BEGIN
      INSERT INTO public.user_daily_progress (user_id, current_day, total_responses, streak_days, started_at, updated_at)
      VALUES (NEW.id, 1, 0, 0, NOW(), NOW())
      ON CONFLICT (user_id) DO NOTHING;
      RAISE NOTICE 'Daily progress created for user %', NEW.id;
    EXCEPTION 
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
      RAISE NOTICE 'Welcome activity created for user %', NEW.id;
    EXCEPTION 
      WHEN OTHERS THEN
        RAISE WARNING 'Welcome activity failed for user %: %', NEW.id, SQLERRM;
    END;
  END IF;

  -- ALWAYS return NEW - this is critical
  RETURN NEW;

EXCEPTION
  WHEN OTHERS THEN
    -- Absolute last resort - log and return NEW anyway
    RAISE WARNING 'handle_new_user catastrophic failure for user %: % (SQLSTATE: %)', NEW.id, SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$$;

-- Ensure trigger exists and is enabled
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Verify trigger is enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_auth_user_created' 
    AND tgrelid = 'auth.users'::regclass
    AND tgenabled = 'O'
  ) THEN
    RAISE EXCEPTION 'Trigger on_auth_user_created is not enabled!';
  END IF;
  RAISE NOTICE 'Trigger on_auth_user_created is confirmed enabled';
END;
$$;

COMMENT ON FUNCTION public.handle_new_user() IS 
'Initializes new users. Designed to NEVER block signup. All exceptions are caught and logged. Always returns NEW.';
