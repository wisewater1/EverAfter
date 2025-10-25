/*
  # Admin Password Reset Function
  
  1. Purpose
    - Creates a function to reset user passwords directly (for admin/development use)
    - Allows bypassing the email-based password reset flow
    
  2. Changes
    - Creates `admin_reset_user_password` RPC function
    - Updates user's password hash directly
    
  3. Security
    - This is a development/admin function
    - Should be secured in production environments
*/

-- Drop function if it exists
DROP FUNCTION IF EXISTS admin_reset_user_password(text, text);

-- Create function to reset user password
CREATE OR REPLACE FUNCTION admin_reset_user_password(user_email text, new_password text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id uuid;
  password_hash text;
BEGIN
  -- Find the user
  SELECT id INTO user_id
  FROM auth.users
  WHERE email = user_email;
  
  IF user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'User not found');
  END IF;
  
  -- Hash the password using crypt (bcrypt)
  password_hash := crypt(new_password, gen_salt('bf'));
  
  -- Update the user's password
  UPDATE auth.users
  SET 
    encrypted_password = password_hash,
    updated_at = NOW()
  WHERE id = user_id;
  
  RETURN jsonb_build_object('success', true, 'message', 'Password updated successfully');
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION admin_reset_user_password(text, text) TO anon, authenticated;
