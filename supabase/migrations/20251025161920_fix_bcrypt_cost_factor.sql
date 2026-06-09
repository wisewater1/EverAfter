/*
  # Fix Bcrypt Cost Factor for Manual User Creation

  1. Problem
    - The create_user_manually function was using bcrypt cost factor 6 (default)
    - Supabase Auth expects cost factor 10 for password verification
    - This caused "Database error querying schema" when manually created users tried to login

  2. Solution
    - Update the gen_salt call to explicitly use cost factor 10: gen_salt('bf', 10)
    - This matches Supabase's internal password hashing

  3. Security
    - Higher cost factor (10 vs 6) provides better security
    - Matches Supabase's standard for all users
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
  
  -- Use crypt from pgcrypto with cost factor 10 to match Supabase's standard
  encrypted_pw := extensions.crypt(user_password, extensions.gen_salt('bf', 10));
  
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
  
  -- Create identity record with provider_id
  INSERT INTO auth.identities (
    id,
    user_id,
    provider_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    new_user_id,
    new_user_id::text,
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
