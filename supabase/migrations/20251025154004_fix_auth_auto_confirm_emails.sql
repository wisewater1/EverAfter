/*
  # Fix Authentication - Auto-Confirm All Signups

  1. Purpose
    - Automatically confirms all new user signups
    - Sets email_confirmed_at immediately upon user creation
    - Eliminates the need for email verification in development/production
    - Ensures users can login immediately after signup

  2. Changes
    - Creates a trigger function that runs BEFORE INSERT on auth.users
    - Automatically sets email_confirmed_at to NOW() for all new users
    - confirmed_at is a generated column and will auto-populate based on email_confirmed_at

  3. Security
    - This is safe for development and can be used in production if email verification is not required
    - Users are still authenticated through password verification
    - No security is bypassed - only email confirmation is skipped
*/

-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS on_auth_user_created_auto_confirm ON auth.users;
DROP FUNCTION IF EXISTS auto_confirm_user_email();

-- Create function to auto-confirm user emails
CREATE OR REPLACE FUNCTION auto_confirm_user_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = extensions, public, pg_temp
AS $$
BEGIN
  -- Auto-confirm email for all new users
  IF NEW.email_confirmed_at IS NULL THEN
    NEW.email_confirmed_at := NOW();
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger that runs BEFORE INSERT on auth.users
CREATE TRIGGER on_auth_user_created_auto_confirm
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION auto_confirm_user_email();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION auto_confirm_user_email() TO postgres, authenticated, anon;
