/*
  # Fix Daily Question Responses Table

  ## Changes
  - Add missing `ai_id` column to link responses to archetypal AIs
  - Add `question_category` column for categorization
  - Add `attachment_file_ids` column for file attachments
  - Create necessary indexes for performance
  - Update RLS policies if needed

  ## Security
  - Maintains existing RLS policies
  - Ensures user ownership on all operations
*/

-- Add missing columns to daily_question_responses
DO $$ 
BEGIN
  -- Add ai_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'daily_question_responses' AND column_name = 'ai_id'
  ) THEN
    ALTER TABLE daily_question_responses 
    ADD COLUMN ai_id uuid REFERENCES archetypal_ais(id) ON DELETE CASCADE;
  END IF;

  -- Add question_category column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'daily_question_responses' AND column_name = 'question_category'
  ) THEN
    ALTER TABLE daily_question_responses 
    ADD COLUMN question_category text;
  END IF;

  -- Add attachment_file_ids column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'daily_question_responses' AND column_name = 'attachment_file_ids'
  ) THEN
    ALTER TABLE daily_question_responses 
    ADD COLUMN attachment_file_ids uuid[];
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_daily_question_responses_ai_id 
  ON daily_question_responses(ai_id);

CREATE INDEX IF NOT EXISTS idx_daily_question_responses_category 
  ON daily_question_responses(question_category);

CREATE INDEX IF NOT EXISTS idx_daily_question_responses_user_created 
  ON daily_question_responses(user_id, created_at DESC);

-- Add comments for documentation
COMMENT ON COLUMN daily_question_responses.ai_id IS 'Links response to specific archetypal AI being trained';
COMMENT ON COLUMN daily_question_responses.question_category IS 'Category of question: values, memories, habits, preferences, etc.';
COMMENT ON COLUMN daily_question_responses.attachment_file_ids IS 'Array of file IDs attached to this response';
