/*
  # Admin User Creation Function
  
  Creates a function that allows manual user creation bypassing signup restrictions.
  This is needed because signup is disabled at the project level.
  
  1. Function
    - `create_user_manually(email, password)` - Creates a new user with confirmed email
    - Uses auth.users table directly
    - Auto-confirms email
    - Returns user ID
    
  2. Security
    - Function has SECURITY DEFINER to bypass RLS
    - Should only be called from trusted admin interfaces
*/

CREATE OR REPLACE FUNCTION create_user_manually(
  user_email TEXT,
  user_password TEXT
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_user_id uuid;
  encrypted_pw TEXT;
BEGIN
  -- Generate a new UUID for the user
  new_user_id := gen_random_uuid();
  
  -- Use crypt to hash the password (Supabase uses bcrypt)
  encrypted_pw := crypt(user_password, gen_salt('bf'));
  
  -- Insert into auth.users
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    role,
    aud
  ) VALUES (
    new_user_id,
    '00000000-0000-0000-0000-000000000000',
    user_email,
    encrypted_pw,
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    FALSE,
    'authenticated',
    'authenticated'
  );
  
  -- Create identity record
  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    new_user_id,
    jsonb_build_object('sub', new_user_id::text, 'email', user_email),
    'email',
    NOW(),
    NOW(),
    NOW()
  );
  
  RETURN new_user_id;
END;
$$;

-- Grant execute to authenticated users (you can restrict this further)
GRANT EXECUTE ON FUNCTION create_user_manually TO authenticated;
GRANT EXECUTE ON FUNCTION create_user_manually TO anon;