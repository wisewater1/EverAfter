/*
  # Fix Duplicate Progress Triggers

  ## Problem
  Multiple migrations created conflicting triggers on daily_question_responses table:
  1. Original trigger from 20251020022430_enhance_daily_question_system.sql
  2. Updated trigger from 20251025152405_add_auto_progress_trigger.sql
  
  These duplicate triggers cause INSERT failures when submitting daily question responses.

  ## Changes
  1. Drop ALL existing progress-related triggers and functions
  2. Create a single, consolidated trigger function with proper error handling
  3. Add logging for debugging failed inserts
  4. Ensure SECURITY DEFINER permissions are correct
  5. Handle edge cases (missing AI, missing progress, etc.)

  ## Security
  - Function runs with SECURITY DEFINER to update progress tables
  - Maintains RLS policies on all tables
  - Only operates on the response's user_id
*/

-- Drop all existing progress update triggers and functions
DROP TRIGGER IF EXISTS trigger_update_progress_on_response ON daily_question_responses;
DROP TRIGGER IF EXISTS trigger_update_user_progress_on_response ON daily_question_responses;
DROP FUNCTION IF EXISTS update_progress_on_response() CASCADE;
DROP FUNCTION IF EXISTS update_user_progress_on_response() CASCADE;
DROP FUNCTION IF EXISTS update_user_streak(uuid) CASCADE;

-- Create consolidated progress update function with error handling
CREATE OR REPLACE FUNCTION handle_daily_response_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_progress record;
  new_streak integer;
  response_count integer;
BEGIN
  -- Log the operation (helps with debugging)
  RAISE LOG 'Processing daily response insert for user_id: %, ai_id: %', NEW.user_id, NEW.ai_id;

  BEGIN
    -- Get existing progress record
    SELECT * INTO current_progress
    FROM user_daily_progress
    WHERE user_id = NEW.user_id;

    IF NOT FOUND THEN
      -- Create new progress record for first-time user
      INSERT INTO user_daily_progress (
        user_id,
        current_day,
        total_responses,
        streak_days,
        last_response_date,
        started_at,
        updated_at
      ) VALUES (
        NEW.user_id,
        1,
        1,
        1,
        CURRENT_DATE,
        NOW(),
        NOW()
      );
      
      RAISE LOG 'Created new progress record for user_id: %', NEW.user_id;
    ELSE
      -- Calculate streak for existing user
      IF current_progress.last_response_date IS NULL THEN
        new_streak := 1;
      ELSIF current_progress.last_response_date = CURRENT_DATE THEN
        -- Same day response, don't increment day counter
        new_streak := current_progress.streak_days;
      ELSIF current_progress.last_response_date = CURRENT_DATE - INTERVAL '1 day' THEN
        -- Consecutive day, increment streak
        new_streak := current_progress.streak_days + 1;
      ELSE
        -- Streak broken, reset to 1
        new_streak := 1;
      END IF;

      -- Count responses for today to avoid double-incrementing
      SELECT COUNT(*) INTO response_count
      FROM daily_question_responses
      WHERE user_id = NEW.user_id
      AND DATE(created_at) = CURRENT_DATE;

      -- Update progress (only increment day if this is first response today)
      UPDATE user_daily_progress
      SET total_responses = total_responses + 1,
          current_day = CASE
            WHEN response_count = 1 AND current_day < 365 AND 
                 (last_response_date IS NULL OR last_response_date < CURRENT_DATE) 
            THEN current_day + 1
            ELSE current_day
          END,
          streak_days = new_streak,
          last_response_date = CURRENT_DATE,
          updated_at = NOW()
      WHERE user_id = NEW.user_id;

      RAISE LOG 'Updated progress for user_id: %, new_day: %, streak: %', 
                NEW.user_id, current_progress.current_day, new_streak;
    END IF;

    -- Update AI memory count if ai_id is provided
    IF NEW.ai_id IS NOT NULL THEN
      -- Check if AI exists first
      IF EXISTS (SELECT 1 FROM archetypal_ais WHERE id = NEW.ai_id AND user_id = NEW.user_id) THEN
        UPDATE archetypal_ais
        SET total_memories = total_memories + 1,
            updated_at = NOW()
        WHERE id = NEW.ai_id;
        
        RAISE LOG 'Updated AI memory count for ai_id: %', NEW.ai_id;
      ELSE
        RAISE WARNING 'AI with id % not found or does not belong to user %', NEW.ai_id, NEW.user_id;
      END IF;
    END IF;

  EXCEPTION
    WHEN OTHERS THEN
      -- Log error but don't fail the insert
      RAISE WARNING 'Error updating progress for user %: % - %', NEW.user_id, SQLERRM, SQLSTATE;
      -- Still return NEW to allow the response insert to succeed
  END;

  RETURN NEW;
END;
$$;

-- Create the trigger
CREATE TRIGGER trigger_handle_daily_response_insert
  AFTER INSERT ON daily_question_responses
  FOR EACH ROW
  EXECUTE FUNCTION handle_daily_response_insert();

-- Add helpful comments
COMMENT ON FUNCTION handle_daily_response_insert() IS 
  'Consolidated trigger function that updates user progress and AI memory count when a daily question response is submitted. Includes error handling to prevent insert failures.';

COMMENT ON TRIGGER trigger_handle_daily_response_insert ON daily_question_responses IS
  'Automatically maintains user_daily_progress and archetypal_ais.total_memories after response submission';

-- Verify the trigger exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trigger_handle_daily_response_insert'
  ) THEN
    RAISE NOTICE 'Trigger successfully created: trigger_handle_daily_response_insert';
  ELSE
    RAISE EXCEPTION 'Failed to create trigger: trigger_handle_daily_response_insert';
  END IF;
END $$;