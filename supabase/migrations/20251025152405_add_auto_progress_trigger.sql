/*
  # Auto-Update User Daily Progress

  ## Purpose
  Creates a trigger that automatically updates user_daily_progress 
  when a daily_question_response is inserted.

  ## Changes
  - Creates function to update/create progress
  - Adds trigger on daily_question_responses INSERT
  - Updates AI memory count automatically
  - Maintains streak calculations

  ## Security
  - Function runs with SECURITY DEFINER
  - Only updates data for the response's user
*/

-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS trigger_update_user_progress_on_response ON daily_question_responses;
DROP FUNCTION IF EXISTS update_user_progress_on_response();

-- Create function to update user progress
CREATE OR REPLACE FUNCTION update_user_progress_on_response()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_progress record;
  new_streak integer;
BEGIN
  -- Get or create progress record
  SELECT * INTO current_progress
  FROM user_daily_progress
  WHERE user_id = NEW.user_id;

  IF NOT FOUND THEN
    -- Create new progress record
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
  ELSE
    -- Calculate new streak
    IF current_progress.last_response_date IS NULL THEN
      new_streak := 1;
    ELSIF current_progress.last_response_date = CURRENT_DATE THEN
      -- Same day, keep streak
      new_streak := current_progress.streak_days;
    ELSIF current_progress.last_response_date = CURRENT_DATE - INTERVAL '1 day' THEN
      -- Consecutive day, increment streak
      new_streak := current_progress.streak_days + 1;
    ELSE
      -- Streak broken, reset
      new_streak := 1;
    END IF;

    -- Update progress
    UPDATE user_daily_progress
    SET total_responses = total_responses + 1,
        current_day = CASE
          WHEN current_day < 365 AND last_response_date < CURRENT_DATE THEN current_day + 1
          ELSE current_day
        END,
        streak_days = new_streak,
        last_response_date = CURRENT_DATE,
        updated_at = NOW()
    WHERE user_id = NEW.user_id;
  END IF;

  -- Update AI memory count if ai_id is provided
  IF NEW.ai_id IS NOT NULL THEN
    UPDATE archetypal_ais
    SET total_memories = total_memories + 1,
        updated_at = NOW()
    WHERE id = NEW.ai_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER trigger_update_user_progress_on_response
  AFTER INSERT ON daily_question_responses
  FOR EACH ROW
  EXECUTE FUNCTION update_user_progress_on_response();

-- Add comment
COMMENT ON FUNCTION update_user_progress_on_response() IS 'Automatically updates user progress and AI memory count when a question response is submitted';
