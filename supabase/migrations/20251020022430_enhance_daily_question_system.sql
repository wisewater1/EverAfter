/*
  # Enhanced Daily Question System
  
  ## Overview
  This migration enhances the daily question system with proper response tracking,
  user progress monitoring, and vector embedding integration for AI learning.
  
  ## New Tables
  
  ### 1. `daily_question_responses`
  Tracks user responses to daily questions with full context
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key to profiles)
  - `question_id` (uuid, foreign key to questions)
  - `question_text` (text) - Snapshot of question
  - `response_text` (text) - User's response
  - `day_number` (integer) - Which day of 365
  - `mood` (text) - User's mood when responding
  - `embedding_generated` (boolean) - Whether vector embedding was created
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  
  ### 2. `user_daily_progress`
  Tracks user's daily question progress over 365 days
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key to profiles)
  - `current_day` (integer) - Current day (1-365)
  - `total_responses` (integer) - Total questions answered
  - `streak_days` (integer) - Consecutive days answered
  - `last_response_date` (date) - Date of last response
  - `started_at` (timestamptz) - When user started the journey
  - `updated_at` (timestamptz)
  
  ### 3. `daily_question_embeddings`
  Vector embeddings for daily question responses
  - `id` (uuid, primary key)
  - `response_id` (uuid, foreign key to daily_question_responses)
  - `user_id` (uuid, foreign key to profiles)
  - `content` (text) - Response content
  - `embedding` (vector(1536)) - Vector embedding
  - `metadata` (jsonb) - Day number, mood, category, etc.
  - `created_at` (timestamptz)
  
  ## Functions
  
  ### `get_daily_question()`
  Returns the appropriate daily question for a user based on their progress
  
  ### `submit_daily_response()`
  Handles response submission and progress tracking
  
  ## Security
  All tables have RLS enabled with proper user access control.
*/

-- Create daily_question_responses table
CREATE TABLE IF NOT EXISTS daily_question_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  question_id uuid REFERENCES questions(id) ON DELETE SET NULL,
  question_text text NOT NULL,
  response_text text NOT NULL,
  day_number integer NOT NULL CHECK (day_number >= 1 AND day_number <= 365),
  mood text,
  embedding_generated boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE daily_question_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own daily responses"
  ON daily_question_responses FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own daily responses"
  ON daily_question_responses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily responses"
  ON daily_question_responses FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own daily responses"
  ON daily_question_responses FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Family members can view daily responses
CREATE POLICY "Family members can view daily responses"
  ON daily_question_responses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM family_members fm
      WHERE fm.user_id = daily_question_responses.user_id
      AND fm.member_user_id = auth.uid()
      AND fm.status = 'Active'
      AND fm.access_level IN ('View', 'Interact', 'Modify')
    )
  );

-- Create user_daily_progress table
CREATE TABLE IF NOT EXISTS user_daily_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  current_day integer DEFAULT 1 CHECK (current_day >= 1 AND current_day <= 365),
  total_responses integer DEFAULT 0,
  streak_days integer DEFAULT 0,
  last_response_date date,
  started_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_daily_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own progress"
  ON user_daily_progress FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own progress"
  ON user_daily_progress FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can insert progress"
  ON user_daily_progress FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create daily_question_embeddings table
CREATE TABLE IF NOT EXISTS daily_question_embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id uuid NOT NULL REFERENCES daily_question_responses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  embedding vector(1536),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE daily_question_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own daily question embeddings"
  ON daily_question_embeddings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily question embeddings"
  ON daily_question_embeddings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_daily_question_responses_user_id 
  ON daily_question_responses(user_id);

CREATE INDEX IF NOT EXISTS idx_daily_question_responses_day_number 
  ON daily_question_responses(day_number);

CREATE INDEX IF NOT EXISTS idx_daily_question_responses_created_at 
  ON daily_question_responses(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_daily_progress_user_id 
  ON user_daily_progress(user_id);

CREATE INDEX IF NOT EXISTS idx_daily_question_embeddings_response_id 
  ON daily_question_embeddings(response_id);

CREATE INDEX IF NOT EXISTS idx_daily_question_embeddings_user_id 
  ON daily_question_embeddings(user_id);

CREATE INDEX IF NOT EXISTS idx_daily_question_embeddings_embedding 
  ON daily_question_embeddings USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Function to get or create user's daily progress
CREATE OR REPLACE FUNCTION get_or_create_user_progress(target_user_id uuid)
RETURNS user_daily_progress
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_progress user_daily_progress;
BEGIN
  SELECT * INTO user_progress
  FROM user_daily_progress
  WHERE user_id = target_user_id;
  
  IF NOT FOUND THEN
    INSERT INTO user_daily_progress (user_id, current_day, total_responses, streak_days)
    VALUES (target_user_id, 1, 0, 0)
    RETURNING * INTO user_progress;
  END IF;
  
  RETURN user_progress;
END;
$$;

-- Function to get daily question for user
CREATE OR REPLACE FUNCTION get_daily_question_for_user(target_user_id uuid)
RETURNS TABLE (
  question_id uuid,
  question_text text,
  category text,
  day_number integer,
  already_answered boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_progress user_daily_progress;
  selected_question questions%ROWTYPE;
  has_response boolean;
BEGIN
  user_progress := get_or_create_user_progress(target_user_id);
  
  SELECT EXISTS(
    SELECT 1 FROM daily_question_responses
    WHERE user_id = target_user_id
    AND day_number = user_progress.current_day
    AND DATE(created_at) = CURRENT_DATE
  ) INTO has_response;
  
  SELECT * INTO selected_question
  FROM questions
  WHERE questions.time_of_day = 
    CASE 
      WHEN EXTRACT(HOUR FROM CURRENT_TIME) < 12 THEN 'morning'
      WHEN EXTRACT(HOUR FROM CURRENT_TIME) < 17 THEN 'afternoon'
      WHEN EXTRACT(HOUR FROM CURRENT_TIME) < 21 THEN 'evening'
      ELSE 'night'
    END
  ORDER BY RANDOM()
  LIMIT 1;
  
  IF selected_question.id IS NULL THEN
    SELECT * INTO selected_question
    FROM questions
    ORDER BY RANDOM()
    LIMIT 1;
  END IF;
  
  RETURN QUERY
  SELECT 
    selected_question.id,
    selected_question.question_text,
    selected_question.category,
    user_progress.current_day,
    has_response;
END;
$$;

-- Function to update streak
CREATE OR REPLACE FUNCTION update_user_streak(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  last_date date;
  current_streak integer;
BEGIN
  SELECT last_response_date, streak_days INTO last_date, current_streak
  FROM user_daily_progress
  WHERE user_id = target_user_id;
  
  IF last_date IS NULL THEN
    UPDATE user_daily_progress
    SET streak_days = 1,
        last_response_date = CURRENT_DATE
    WHERE user_id = target_user_id;
  ELSIF last_date = CURRENT_DATE THEN
    RETURN;
  ELSIF last_date = CURRENT_DATE - INTERVAL '1 day' THEN
    UPDATE user_daily_progress
    SET streak_days = current_streak + 1,
        last_response_date = CURRENT_DATE
    WHERE user_id = target_user_id;
  ELSE
    UPDATE user_daily_progress
    SET streak_days = 1,
        last_response_date = CURRENT_DATE
    WHERE user_id = target_user_id;
  END IF;
END;
$$;

-- Trigger to auto-update progress on response
CREATE OR REPLACE FUNCTION update_progress_on_response()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE user_daily_progress
  SET total_responses = total_responses + 1,
      current_day = CASE 
        WHEN current_day < 365 THEN current_day + 1 
        ELSE 365 
      END,
      updated_at = now()
  WHERE user_id = NEW.user_id;
  
  PERFORM update_user_streak(NEW.user_id);
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_progress_on_response
  AFTER INSERT ON daily_question_responses
  FOR EACH ROW
  EXECUTE FUNCTION update_progress_on_response();
