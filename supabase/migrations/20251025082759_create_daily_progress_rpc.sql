/*
  # Daily Progress RPC Function (Production)

  Creates the get_or_create_user_progress() function that returns a UUID
  for today's progress record. Called by Edge Functions to track daily activity.

  ## Security
  - SECURITY DEFINER to allow insert while maintaining RLS
  - Grants to authenticated role only
  - Uses (select auth.uid()) pattern
  - Set search_path to prevent function hijacking
*/

-- Ensure user_daily_progress table has proper RLS
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'user_daily_progress'
  ) THEN
    CREATE TABLE user_daily_progress (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      day date NOT NULL DEFAULT current_date,
      created_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE(user_id, day)
    );
    
    CREATE INDEX idx_user_daily_progress_user_day ON user_daily_progress(user_id, day);
    
    ALTER TABLE user_daily_progress ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Users can view own progress" ON user_daily_progress
      FOR SELECT TO authenticated
      USING (user_id = (select auth.uid()));
    
    CREATE POLICY "Users can insert own progress" ON user_daily_progress
      FOR INSERT TO authenticated
      WITH CHECK (user_id = (select auth.uid()));
  END IF;
END $$;

-- Create or replace the RPC function
CREATE OR REPLACE FUNCTION get_or_create_user_progress()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE 
  _id uuid;
  _user_id uuid;
BEGIN
  -- Get the authenticated user ID
  _user_id := auth.uid();
  
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Try to find existing progress for today
  SELECT id INTO _id
  FROM user_daily_progress
  WHERE user_id = _user_id
    AND day = current_date;

  -- If not found, create new progress record
  IF _id IS NULL THEN
    INSERT INTO user_daily_progress(user_id, day)
    VALUES (_user_id, current_date)
    RETURNING id INTO _id;
  END IF;

  RETURN _id;
END;
$$;

-- Grant execution to authenticated users only
REVOKE ALL ON FUNCTION get_or_create_user_progress() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_or_create_user_progress() TO authenticated;

COMMENT ON FUNCTION get_or_create_user_progress() IS 
  'Returns UUID of daily progress record for current user and today. Creates if not exists.';