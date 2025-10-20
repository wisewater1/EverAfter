/*
  # Add Family Personality Questions System
  
  ## Overview
  This migration adds the ability to send personality questions to family members
  to build their personality profiles, and seeds a test AI named "Dante".
  
  ## New Tables
  
  ### 1. `family_personality_questions`
  Questions sent to family members to build their personality profiles
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key to profiles) - User who sent the question
  - `family_member_id` (uuid, foreign key to family_members) - Recipient
  - `question_text` (text) - The question being asked
  - `answer_text` (text, nullable) - Family member's response
  - `status` (text) - sent, answered, skipped
  - `sent_at` (timestamptz) - When question was sent
  - `answered_at` (timestamptz, nullable) - When answered
  - `created_at` (timestamptz)
  
  ## Seeded Data
  
  ### Test AI: Dante
  A pre-created custom engram AI for testing and demonstration purposes
  
  ## Security
  - Enable RLS on family_personality_questions
  - Users can only access questions they sent
  - Family members can access questions sent to them
*/

-- Create family personality questions table
CREATE TABLE IF NOT EXISTS family_personality_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  family_member_id uuid NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  answer_text text,
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'answered', 'skipped')),
  sent_at timestamptz NOT NULL DEFAULT now(),
  answered_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE family_personality_questions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own questions"
  ON family_personality_questions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create questions"
  ON family_personality_questions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their questions"
  ON family_personality_questions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their questions"
  ON family_personality_questions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_family_personality_questions_user 
  ON family_personality_questions(user_id);

CREATE INDEX IF NOT EXISTS idx_family_personality_questions_family_member 
  ON family_personality_questions(family_member_id);

CREATE INDEX IF NOT EXISTS idx_family_personality_questions_status 
  ON family_personality_questions(status);
