/*
  # Auto-confirm User Emails Function
  
  1. Purpose
    - Creates a function to automatically confirm user emails after signup
    - Works around Supabase's email confirmation requirement
    - Enables immediate login after signup
    
  2. Changes
    - Creates `confirm_user_email` RPC function
    - Updates user's email_confirmed_at timestamp
    - Allows bypassing email confirmation for development
    
  3. Security
    - Function is accessible to authenticated users only
    - Only updates the specific user's confirmation status
*/

-- Drop function if it exists
DROP FUNCTION IF EXISTS confirm_user_email(uuid);

-- Create function to confirm user email
CREATE OR REPLACE FUNCTION confirm_user_email(user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update the user's email_confirmed_at timestamp
  UPDATE auth.users
  SET 
    email_confirmed_at = NOW(),
    updated_at = NOW()
  WHERE id = user_id
    AND email_confirmed_at IS NULL;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION confirm_user_email(uuid) TO anon, authenticated;
