/*
  # EverAfter Database Schema

  ## Overview
  Complete database schema for the EverAfter digital legacy platform. This migration creates
  all necessary tables for user profiles, daily questions, memories, family management, and
  the Saints AI system.

  ## New Tables

  ### 1. `profiles`
  User profile information extending Supabase auth.users
  - `id` (uuid, primary key) - Links to auth.users
  - `email` (text) - User email
  - `display_name` (text) - User's display name
  - `time_zone` (text) - User's timezone
  - `notification_preferences` (jsonb) - Notification settings
  - `language` (text) - Preferred language
  - `date_format` (text) - Preferred date format
  - `created_at` (timestamptz) - Account creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 2. `questions`
  Daily question bank with categorization and personality aspects
  - `id` (uuid, primary key)
  - `question_text` (text) - The question content
  - `category` (text) - Question category (values, humor, daily, etc.)
  - `time_of_day` (text) - When to ask (morning, afternoon, evening, night)
  - `personality_aspect` (text) - What personality trait this explores
  - `difficulty` (text) - Question depth (light, medium, deep)
  - `created_at` (timestamptz)

  ### 3. `memories`
  User responses to daily questions - the core of the legacy
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key to profiles)
  - `question_id` (uuid, foreign key to questions)
  - `question_text` (text) - Snapshot of question at time of response
  - `response_text` (text) - User's response
  - `category` (text) - Category snapshot
  - `time_of_day` (text) - Time period when answered
  - `mood` (text, optional) - User's mood when answering
  - `is_draft` (boolean) - Whether this is a draft or final
  - `created_at` (timestamptz) - When memory was created
  - `updated_at` (timestamptz) - Last edit timestamp

  ### 4. `family_members`
  Family members who can access the user's legacy
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key to profiles) - Legacy owner
  - `member_user_id` (uuid, foreign key to profiles, nullable) - If member has account
  - `name` (text) - Member's name
  - `email` (text) - Member's email
  - `relationship` (text) - Relationship to user
  - `status` (text) - Active, Pending, Inactive
  - `access_level` (text) - View, Interact, Modify
  - `invited_at` (timestamptz)
  - `accepted_at` (timestamptz, nullable)

  ### 5. `saint_activities`
  Activities performed by Saints AI system
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key to profiles)
  - `saint_id` (text) - Which saint performed the action
  - `action` (text) - Action name
  - `description` (text) - Detailed description
  - `status` (text) - completed, in_progress, scheduled
  - `impact` (text) - high, medium, low
  - `category` (text) - communication, support, protection, memory, family, charity
  - `details` (jsonb, nullable) - Additional details
  - `created_at` (timestamptz)

  ## Security
  
  Row Level Security (RLS) is enabled on all tables with policies ensuring:
  - Users can only access their own data
  - Family members can only view memories they're authorized to see
  - All operations require authentication
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  display_name text NOT NULL,
  time_zone text DEFAULT 'America/New_York',
  notification_preferences jsonb DEFAULT '{"dailyReminders": true, "familyActivity": true, "weeklySummary": true}'::jsonb,
  language text DEFAULT 'English',
  date_format text DEFAULT 'MM/DD/YYYY',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Create questions table
CREATE TABLE IF NOT EXISTS questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_text text NOT NULL,
  category text NOT NULL CHECK (category IN ('values', 'humor', 'daily', 'stories', 'childhood', 'family', 'wisdom', 'relationships', 'dreams', 'challenges')),
  time_of_day text NOT NULL CHECK (time_of_day IN ('morning', 'afternoon', 'evening', 'night')),
  personality_aspect text NOT NULL CHECK (personality_aspect IN ('core_values', 'emotional_patterns', 'social_behavior', 'decision_making', 'creativity', 'resilience', 'communication_style', 'life_philosophy')),
  difficulty text NOT NULL CHECK (difficulty IN ('light', 'medium', 'deep')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Questions are readable by authenticated users"
  ON questions FOR SELECT
  TO authenticated
  USING (true);

-- Create memories table
CREATE TABLE IF NOT EXISTS memories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  question_id uuid REFERENCES questions(id) ON DELETE SET NULL,
  question_text text NOT NULL,
  response_text text NOT NULL,
  category text NOT NULL,
  time_of_day text NOT NULL,
  mood text,
  is_draft boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own memories"
  ON memories FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own memories"
  ON memories FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own memories"
  ON memories FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own memories"
  ON memories FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create family_members table
CREATE TABLE IF NOT EXISTS family_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  member_user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  name text NOT NULL,
  email text NOT NULL,
  relationship text NOT NULL,
  status text DEFAULT 'Pending' CHECK (status IN ('Active', 'Pending', 'Inactive')),
  access_level text DEFAULT 'View' CHECK (access_level IN ('View', 'Interact', 'Modify')),
  invited_at timestamptz DEFAULT now(),
  accepted_at timestamptz
);

ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own family members"
  ON family_members FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own family members"
  ON family_members FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own family members"
  ON family_members FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own family members"
  ON family_members FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Family members can view memories they have access to
CREATE POLICY "Family members can view authorized memories"
  ON memories FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM family_members
      WHERE family_members.user_id = memories.user_id
      AND family_members.member_user_id = auth.uid()
      AND family_members.status = 'Active'
      AND memories.is_draft = false
    )
  );

-- Create saint_activities table
CREATE TABLE IF NOT EXISTS saint_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  saint_id text NOT NULL,
  action text NOT NULL,
  description text NOT NULL,
  status text DEFAULT 'completed' CHECK (status IN ('completed', 'in_progress', 'scheduled')),
  impact text DEFAULT 'medium' CHECK (impact IN ('high', 'medium', 'low')),
  category text NOT NULL CHECK (category IN ('communication', 'support', 'protection', 'memory', 'family', 'charity')),
  details jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE saint_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own saint activities"
  ON saint_activities FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own saint activities"
  ON saint_activities FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_memories_user_id ON memories(user_id);
CREATE INDEX IF NOT EXISTS idx_memories_created_at ON memories(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_memories_category ON memories(category);
CREATE INDEX IF NOT EXISTS idx_family_members_user_id ON family_members(user_id);
CREATE INDEX IF NOT EXISTS idx_family_members_member_user_id ON family_members(member_user_id);
CREATE INDEX IF NOT EXISTS idx_saint_activities_user_id ON saint_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_saint_activities_created_at ON saint_activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_questions_time_of_day ON questions(time_of_day);
CREATE INDEX IF NOT EXISTS idx_questions_category ON questions(category);

-- Insert sample questions from the existing question bank
INSERT INTO questions (question_text, category, time_of_day, personality_aspect, difficulty) VALUES
  ('What''s the first thing that brings you joy when you wake up?', 'daily', 'morning', 'emotional_patterns', 'light'),
  ('How do you like to start your perfect morning?', 'daily', 'morning', 'life_philosophy', 'light'),
  ('What motivates you to get out of bed each day?', 'values', 'morning', 'core_values', 'medium'),
  ('Describe your ideal breakfast and who you''d share it with.', 'relationships', 'morning', 'social_behavior', 'light'),
  ('What''s a decision you made today that reflects who you are?', 'values', 'afternoon', 'decision_making', 'medium'),
  ('How do you handle unexpected challenges during your day?', 'challenges', 'afternoon', 'resilience', 'medium'),
  ('What''s something creative you''ve done or thought about recently?', 'dreams', 'afternoon', 'creativity', 'light'),
  ('How do you prefer to communicate when something matters to you?', 'relationships', 'afternoon', 'communication_style', 'medium'),
  ('What''s a story from your past that shaped who you became?', 'stories', 'evening', 'core_values', 'deep'),
  ('What wisdom would you want to pass down to future generations?', 'wisdom', 'evening', 'life_philosophy', 'deep'),
  ('Describe a moment when you felt most authentically yourself.', 'values', 'evening', 'core_values', 'deep'),
  ('What''s a relationship that has profoundly influenced your life?', 'relationships', 'evening', 'social_behavior', 'deep'),
  ('What brings you peace at the end of the day?', 'daily', 'night', 'emotional_patterns', 'light'),
  ('What''s a simple pleasure that always makes you smile?', 'humor', 'night', 'emotional_patterns', 'light'),
  ('How do you like to unwind and reflect on your day?', 'daily', 'night', 'life_philosophy', 'light'),
  ('What''s a dream or hope you carry with you?', 'dreams', 'night', 'core_values', 'medium')
ON CONFLICT DO NOTHING;
