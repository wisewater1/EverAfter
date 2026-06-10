/*
  # Fix Admin User Creation Function
  
  Updates the function to properly use pgcrypto extension for password hashing.
*/

DROP FUNCTION IF EXISTS create_user_manually(TEXT, TEXT);

CREATE OR REPLACE FUNCTION create_user_manually(
  user_email TEXT,
  user_password TEXT
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = extensions, public, pg_temp
AS $$
DECLARE
  new_user_id uuid;
  encrypted_pw TEXT;
BEGIN
  -- Generate a new UUID for the user
  new_user_id := gen_random_uuid();
  
  -- Use crypt from pgcrypto to hash the password
  encrypted_pw := extensions.crypt(user_password, extensions.gen_salt('bf'));
  
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

GRANT EXECUTE ON FUNCTION create_user_manually TO authenticated;
GRANT EXECUTE ON FUNCTION create_user_manually TO anon;