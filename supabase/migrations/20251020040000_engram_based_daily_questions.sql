/*
  # Engram-Based Daily Question System

  ## Overview
  This migration creates a comprehensive system where daily questions are tied to specific
  engrams (family members or custom engrams). Responses build personality profiles that
  will eventually power autonomous AI agents.

  ## Key Concepts
  - **Engrams**: Digital representations of people (family members or custom personalities)
  - **Daily Questions**: Questions answered to build an engram's personality
  - **Personality Filters**: Categories and traits extracted from responses
  - **Autonomous AI**: Future capability powered by accumulated personality data

  ## New Tables

  ### 1. `engrams`
  Represents a person (family member or custom) whose personality is being built
  - `id` (uuid, primary key)
  - `user_id` (uuid) - Who owns/creates this engram
  - `engram_type` (text) - 'family_member' or 'custom'
  - `name` (text) - Name of the person
  - `email` (text, nullable) - Email if family member
  - `relationship` (text) - e.g., "Mother", "Father", "Friend", "Custom AI"
  - `avatar_url` (text, nullable)
  - `description` (text) - About this person/engram
  - `personality_summary` (jsonb) - Accumulated personality traits
  - `total_questions_answered` (integer)
  - `ai_readiness_score` (integer) - 0-100, how ready for autonomous AI
  - `is_ai_active` (boolean) - Whether autonomous AI is activated
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 2. `engram_daily_responses`
  Daily question responses specifically for building an engram's personality
  - `id` (uuid, primary key)
  - `engram_id` (uuid) - Which engram this builds
  - `user_id` (uuid) - Who answered the question
  - `question_id` (uuid, nullable) - Reference to question bank
  - `question_text` (text) - The question asked
  - `response_text` (text) - The answer
  - `question_category` (text) - e.g., "values", "memories", "habits", "preferences"
  - `day_number` (integer) - Progress day (1-365)
  - `mood` (text, nullable)
  - `personality_tags` (jsonb) - Extracted personality insights
  - `embedding_generated` (boolean)
  - `created_at` (timestamptz)

  ### 3. `engram_personality_filters`
  Categorized personality traits extracted from responses
  - `id` (uuid, primary key)
  - `engram_id` (uuid)
  - `filter_category` (text) - e.g., "values", "communication_style", "humor", "beliefs"
  - `filter_name` (text) - Specific trait name
  - `filter_value` (text) - The trait value/description
  - `confidence_score` (float) - 0.0-1.0, how confident we are
  - `source_response_ids` (uuid[]) - Which responses contributed to this
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 4. `engram_progress`
  Tracks daily question progress for each engram
  - `id` (uuid, primary key)
  - `engram_id` (uuid, unique)
  - `current_day` (integer) - 1-365
  - `total_responses` (integer)
  - `streak_days` (integer)
  - `last_response_date` (date)
  - `categories_covered` (jsonb) - Which personality categories have been explored
  - `started_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 5. `engram_ai_tasks`
  Tasks that can be assigned to the engram's AI once activated
  - `id` (uuid, primary key)
  - `engram_id` (uuid)
  - `task_name` (text)
  - `task_description` (text)
  - `task_type` (text) - e.g., "appointment", "reminder", "communication", "research"
  - `frequency` (text) - 'daily', 'weekly', 'monthly', 'on_demand'
  - `is_active` (boolean)
  - `last_executed` (timestamptz, nullable)
  - `execution_log` (jsonb) - History of task executions
  - `created_at` (timestamptz)

  ## Security
  - All tables have RLS enabled
  - Users can only access their own engrams
  - Family members can view engrams they're authorized to see
*/

-- Create engrams table
CREATE TABLE IF NOT EXISTS engrams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  engram_type text NOT NULL CHECK (engram_type IN ('family_member', 'custom')),
  name text NOT NULL,
  email text,
  relationship text NOT NULL,
  avatar_url text,
  description text DEFAULT '',
  personality_summary jsonb DEFAULT '{}'::jsonb,
  total_questions_answered integer DEFAULT 0,
  ai_readiness_score integer DEFAULT 0 CHECK (ai_readiness_score >= 0 AND ai_readiness_score <= 100),
  is_ai_active boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE engrams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own engrams"
  ON engrams FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own engrams"
  ON engrams FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own engrams"
  ON engrams FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own engrams"
  ON engrams FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create engram_daily_responses table
CREATE TABLE IF NOT EXISTS engram_daily_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engram_id uuid NOT NULL REFERENCES engrams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  question_id uuid,
  question_text text NOT NULL,
  response_text text NOT NULL,
  question_category text NOT NULL,
  day_number integer NOT NULL CHECK (day_number >= 1 AND day_number <= 365),
  mood text,
  personality_tags jsonb DEFAULT '[]'::jsonb,
  embedding_generated boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE engram_daily_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own engram responses"
  ON engram_daily_responses FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own engram responses"
  ON engram_daily_responses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own engram responses"
  ON engram_daily_responses FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own engram responses"
  ON engram_daily_responses FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create engram_personality_filters table
CREATE TABLE IF NOT EXISTS engram_personality_filters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engram_id uuid NOT NULL REFERENCES engrams(id) ON DELETE CASCADE,
  filter_category text NOT NULL,
  filter_name text NOT NULL,
  filter_value text NOT NULL,
  confidence_score float DEFAULT 0.5 CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0),
  source_response_ids uuid[] DEFAULT ARRAY[]::uuid[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE engram_personality_filters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own engram filters"
  ON engram_personality_filters FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM engrams
      WHERE engrams.id = engram_personality_filters.engram_id
      AND engrams.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own engram filters"
  ON engram_personality_filters FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM engrams
      WHERE engrams.id = engram_personality_filters.engram_id
      AND engrams.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM engrams
      WHERE engrams.id = engram_personality_filters.engram_id
      AND engrams.user_id = auth.uid()
    )
  );

-- Create engram_progress table
CREATE TABLE IF NOT EXISTS engram_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engram_id uuid UNIQUE NOT NULL REFERENCES engrams(id) ON DELETE CASCADE,
  current_day integer DEFAULT 1 CHECK (current_day >= 1 AND current_day <= 365),
  total_responses integer DEFAULT 0,
  streak_days integer DEFAULT 0,
  last_response_date date,
  categories_covered jsonb DEFAULT '{}'::jsonb,
  started_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE engram_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own engram progress"
  ON engram_progress FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM engrams
      WHERE engrams.id = engram_progress.engram_id
      AND engrams.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own engram progress"
  ON engram_progress FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM engrams
      WHERE engrams.id = engram_progress.engram_id
      AND engrams.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM engrams
      WHERE engrams.id = engram_progress.engram_id
      AND engrams.user_id = auth.uid()
    )
  );

-- Create engram_ai_tasks table
CREATE TABLE IF NOT EXISTS engram_ai_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engram_id uuid NOT NULL REFERENCES engrams(id) ON DELETE CASCADE,
  task_name text NOT NULL,
  task_description text NOT NULL,
  task_type text NOT NULL CHECK (task_type IN ('appointment', 'reminder', 'communication', 'research', 'custom')),
  frequency text DEFAULT 'on_demand' CHECK (frequency IN ('daily', 'weekly', 'monthly', 'on_demand')),
  is_active boolean DEFAULT true,
  last_executed timestamptz,
  execution_log jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE engram_ai_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own engram tasks"
  ON engram_ai_tasks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM engrams
      WHERE engrams.id = engram_ai_tasks.engram_id
      AND engrams.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own engram tasks"
  ON engram_ai_tasks FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM engrams
      WHERE engrams.id = engram_ai_tasks.engram_id
      AND engrams.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM engrams
      WHERE engrams.id = engram_ai_tasks.engram_id
      AND engrams.user_id = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_engrams_user_id ON engrams(user_id);
CREATE INDEX IF NOT EXISTS idx_engrams_type ON engrams(engram_type);
CREATE INDEX IF NOT EXISTS idx_engram_daily_responses_engram_id ON engram_daily_responses(engram_id);
CREATE INDEX IF NOT EXISTS idx_engram_daily_responses_user_id ON engram_daily_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_engram_daily_responses_day_number ON engram_daily_responses(day_number);
CREATE INDEX IF NOT EXISTS idx_engram_daily_responses_created_at ON engram_daily_responses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_engram_personality_filters_engram_id ON engram_personality_filters(engram_id);
CREATE INDEX IF NOT EXISTS idx_engram_personality_filters_category ON engram_personality_filters(filter_category);
CREATE INDEX IF NOT EXISTS idx_engram_progress_engram_id ON engram_progress(engram_id);
CREATE INDEX IF NOT EXISTS idx_engram_ai_tasks_engram_id ON engram_ai_tasks(engram_id);

-- Function to calculate AI readiness score
CREATE OR REPLACE FUNCTION calculate_engram_ai_readiness(target_engram_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_responses integer;
  categories_count integer;
  personality_filters_count integer;
  readiness_score integer;
BEGIN
  -- Get total responses
  SELECT COUNT(*) INTO total_responses
  FROM engram_daily_responses
  WHERE engram_id = target_engram_id;

  -- Get unique categories covered
  SELECT COUNT(DISTINCT question_category) INTO categories_count
  FROM engram_daily_responses
  WHERE engram_id = target_engram_id;

  -- Get personality filters count
  SELECT COUNT(*) INTO personality_filters_count
  FROM engram_personality_filters
  WHERE engram_id = target_engram_id
  AND confidence_score >= 0.6;

  -- Calculate readiness score (0-100)
  -- 50% from responses (need 50+ for full score)
  -- 30% from categories (need 10+ for full score)
  -- 20% from personality filters (need 20+ for full score)
  readiness_score := LEAST(100, (
    (LEAST(total_responses, 50) * 50 / 50) +
    (LEAST(categories_count, 10) * 30 / 10) +
    (LEAST(personality_filters_count, 20) * 20 / 20)
  ));

  -- Update the engram
  UPDATE engrams
  SET ai_readiness_score = readiness_score,
      total_questions_answered = total_responses,
      updated_at = now()
  WHERE id = target_engram_id;

  RETURN readiness_score;
END;
$$;

-- Function to update engram progress on response
CREATE OR REPLACE FUNCTION update_engram_progress_on_response()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  current_progress engram_progress%ROWTYPE;
  new_streak integer;
BEGIN
  -- Get or create progress
  SELECT * INTO current_progress
  FROM engram_progress
  WHERE engram_id = NEW.engram_id;

  IF NOT FOUND THEN
    INSERT INTO engram_progress (engram_id, current_day, total_responses, streak_days, last_response_date)
    VALUES (NEW.engram_id, 1, 1, 1, CURRENT_DATE);
  ELSE
    -- Calculate new streak
    IF current_progress.last_response_date IS NULL THEN
      new_streak := 1;
    ELSIF current_progress.last_response_date = CURRENT_DATE THEN
      new_streak := current_progress.streak_days;
    ELSIF current_progress.last_response_date = CURRENT_DATE - INTERVAL '1 day' THEN
      new_streak := current_progress.streak_days + 1;
    ELSE
      new_streak := 1;
    END IF;

    -- Update progress
    UPDATE engram_progress
    SET total_responses = total_responses + 1,
        current_day = CASE
          WHEN current_day < 365 AND last_response_date < CURRENT_DATE THEN current_day + 1
          ELSE current_day
        END,
        streak_days = new_streak,
        last_response_date = CURRENT_DATE,
        categories_covered = jsonb_set(
          COALESCE(categories_covered, '{}'::jsonb),
          ARRAY[NEW.question_category],
          'true'::jsonb
        ),
        updated_at = now()
    WHERE engram_id = NEW.engram_id;
  END IF;

  -- Update AI readiness score
  PERFORM calculate_engram_ai_readiness(NEW.engram_id);

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_engram_progress_on_response
  AFTER INSERT ON engram_daily_responses
  FOR EACH ROW
  EXECUTE FUNCTION update_engram_progress_on_response();

-- Function to get daily question for specific engram
CREATE OR REPLACE FUNCTION get_daily_question_for_engram(target_engram_id uuid)
RETURNS TABLE (
  question_text text,
  question_category text,
  day_number integer,
  already_answered_today boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  progress_record engram_progress%ROWTYPE;
  has_response boolean;
  question_categories text[] := ARRAY['values', 'memories', 'habits', 'preferences', 'beliefs', 'communication_style', 'humor', 'relationships', 'goals', 'experiences'];
  selected_category text;
BEGIN
  -- Get or create progress
  SELECT * INTO progress_record
  FROM engram_progress
  WHERE engram_id = target_engram_id;

  IF NOT FOUND THEN
    INSERT INTO engram_progress (engram_id)
    VALUES (target_engram_id)
    RETURNING * INTO progress_record;
  END IF;

  -- Check if already answered today
  SELECT EXISTS(
    SELECT 1 FROM engram_daily_responses
    WHERE engram_id = target_engram_id
    AND DATE(created_at) = CURRENT_DATE
  ) INTO has_response;

  -- Select a category (prioritize uncovered categories)
  SELECT category INTO selected_category
  FROM unnest(question_categories) AS category
  WHERE NOT (progress_record.categories_covered ? category)
  ORDER BY RANDOM()
  LIMIT 1;

  IF selected_category IS NULL THEN
    selected_category := question_categories[1 + floor(random() * array_length(question_categories, 1))];
  END IF;

  -- Return a question (for now, generate based on category and time)
  RETURN QUERY
  SELECT
    CASE
      WHEN selected_category = 'values' THEN 'What values or principles were most important to this person?'
      WHEN selected_category = 'memories' THEN 'Share a favorite memory or story about this person.'
      WHEN selected_category = 'habits' THEN 'What were their daily habits or routines?'
      WHEN selected_category = 'preferences' THEN 'What were their favorite things (foods, activities, places)?'
      WHEN selected_category = 'beliefs' THEN 'What did they believe in most strongly?'
      WHEN selected_category = 'communication_style' THEN 'How did they typically communicate or express themselves?'
      WHEN selected_category = 'humor' THEN 'What made them laugh? What was their sense of humor like?'
      WHEN selected_category = 'relationships' THEN 'How did they approach relationships with others?'
      WHEN selected_category = 'goals' THEN 'What were their dreams or goals in life?'
      ELSE 'What experiences shaped who they were?'
    END::text,
    selected_category::text,
    progress_record.current_day::integer,
    has_response::boolean;
END;
$$;
