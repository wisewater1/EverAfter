/*
  # Add Exception Handling to Auto Confirm Trigger

  1. Problem
    - auto_confirm_user_email has no exception handling
    - If it fails, it could block signup

  2. Solution
    - Add exception handling to ensure it never blocks signup
    - Log any errors for debugging

  3. Security
    - Maintains auto-confirm functionality
    - Never blocks user creation
*/

CREATE OR REPLACE FUNCTION public.auto_confirm_user_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'extensions', 'public', 'pg_temp'
AS $$
BEGIN
  -- Try to auto-confirm email for all new users
  BEGIN
    IF NEW.email_confirmed_at IS NULL THEN
      NEW.email_confirmed_at := NOW();
    END IF;
  EXCEPTION 
    WHEN OTHERS THEN
      RAISE WARNING 'Failed to auto-confirm email for user %: %', NEW.id, SQLERRM;
  END;
  
  -- Always return NEW to allow user creation
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'auto_confirm_user_email catastrophic failure for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.auto_confirm_user_email() IS 
'Auto-confirms user emails during signup. Never blocks user creation even if confirmation fails.';
