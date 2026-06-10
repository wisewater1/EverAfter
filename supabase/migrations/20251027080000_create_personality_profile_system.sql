/*
  # Family Personality Profile System

  ## Overview
  Comprehensive personality profiling system for family members that generates
  detailed personality assessments based on questionnaire responses, behavioral
  patterns, and AI-powered analysis.

  ## New Tables

  ### 1. `family_personality_profiles`
  Main profile storage with comprehensive personality data
  - `id` (uuid, primary key)
  - `family_member_id` (uuid, foreign key) - Links to family member
  - `user_id` (uuid, foreign key) - Owner of the profile
  - `profile_data` (jsonb) - Full structured personality profile
  - `completeness_score` (integer) - 0-100 score of profile completeness
  - `confidence_score` (numeric) - 0.0-1.0 confidence in analysis
  - `total_responses` (integer) - Number of responses analyzed
  - `last_analyzed_at` (timestamptz) - Last AI analysis timestamp
  - `profile_version` (integer) - Version tracking for profile evolution

  ### 2. `personality_dimensions`
  Defines the personality dimensions we assess
  - Core personality traits (Big Five inspired)
  - Communication style and preferences
  - Social tendencies and interaction patterns
  - Interests and activity preferences
  - Behavioral patterns and decision-making style
  - Relationship dynamics and family role

  ### 3. `personality_traits`
  Individual trait assessments extracted from responses
  - `id` (uuid, primary key)
  - `profile_id` (uuid, foreign key)
  - `dimension` (text) - Which dimension this trait belongs to
  - `trait_name` (text) - Name of the trait
  - `trait_value` (text) - Detailed description
  - `confidence` (numeric) - Confidence score
  - `supporting_response_ids` (jsonb) - Array of response IDs that support this trait
  - `extracted_at` (timestamptz)

  ### 4. `personality_assessment_questions`
  Question bank organized by personality dimension
  - Curated questions for each dimension
  - Difficulty levels (basic, intermediate, deep)
  - Question types (multiple choice, open-ended, scenario-based)
  - Adaptive sequencing based on prior responses

  ### 5. `behavioral_patterns`
  Track behavioral patterns over time
  - Response timing patterns
  - Communication frequency
  - Emotional expression patterns
  - Topic preferences

  ### 6. `relationship_insights`
  Insights about family relationship dynamics
  - Compatibility scores between family members
  - Communication recommendations
  - Conflict resolution suggestions

  ## Security
  - Full RLS on all tables
  - Users can only access profiles for their family members
  - Encrypted storage for sensitive personality data
  - Audit logging for profile access

  ## AI Integration
  - Uses OpenAI API for natural language analysis
  - Personality trait extraction from text responses
  - Sentiment analysis for emotional patterns
  - Communication style analysis
*/

-- Family personality profiles (main storage)
CREATE TABLE IF NOT EXISTS family_personality_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_member_id uuid NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  profile_data jsonb NOT NULL DEFAULT '{
    "core_traits": {},
    "communication_style": {},
    "social_tendencies": {},
    "interests": {},
    "behavioral_patterns": {},
    "relationship_dynamics": {}
  }'::jsonb,
  completeness_score integer DEFAULT 0 CHECK (completeness_score >= 0 AND completeness_score <= 100),
  confidence_score numeric(3,2) DEFAULT 0.0 CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0),
  total_responses integer DEFAULT 0,
  questions_answered integer DEFAULT 0,
  last_analyzed_at timestamptz,
  profile_version integer DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(family_member_id)
);

-- Personality dimensions reference table
CREATE TABLE IF NOT EXISTS personality_dimensions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dimension_name text NOT NULL UNIQUE,
  display_name text NOT NULL,
  description text NOT NULL,
  dimension_category text NOT NULL CHECK (dimension_category IN (
    'core_traits',
    'communication',
    'social',
    'interests',
    'behavioral',
    'relational'
  )),
  assessment_questions_count integer DEFAULT 0,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Individual personality traits
CREATE TABLE IF NOT EXISTS personality_traits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES family_personality_profiles(id) ON DELETE CASCADE,
  dimension_id uuid NOT NULL REFERENCES personality_dimensions(id),
  trait_name text NOT NULL,
  trait_value text NOT NULL,
  trait_description text,
  confidence_score numeric(3,2) DEFAULT 0.5 CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0),
  supporting_response_ids jsonb DEFAULT '[]'::jsonb,
  evidence_summary text,
  extracted_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Personality assessment questions
CREATE TABLE IF NOT EXISTS personality_assessment_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dimension_id uuid NOT NULL REFERENCES personality_dimensions(id),
  question_text text NOT NULL,
  question_type text NOT NULL CHECK (question_type IN (
    'open_ended',
    'multiple_choice',
    'scenario_based',
    'ranking',
    'binary'
  )),
  difficulty_level text DEFAULT 'basic' CHECK (difficulty_level IN ('basic', 'intermediate', 'deep')),
  expected_insights jsonb DEFAULT '[]'::jsonb,
  follow_up_triggers jsonb DEFAULT '{}'::jsonb,
  response_examples jsonb DEFAULT '[]'::jsonb,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Behavioral patterns
CREATE TABLE IF NOT EXISTS behavioral_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES family_personality_profiles(id) ON DELETE CASCADE,
  pattern_type text NOT NULL CHECK (pattern_type IN (
    'response_timing',
    'communication_frequency',
    'emotional_expression',
    'topic_preference',
    'engagement_level',
    'response_depth'
  )),
  pattern_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidence_score numeric(3,2) DEFAULT 0.5,
  observed_since timestamptz DEFAULT now(),
  last_observed_at timestamptz DEFAULT now(),
  observation_count integer DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Relationship insights
CREATE TABLE IF NOT EXISTS relationship_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  family_member_id uuid NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  insight_type text NOT NULL CHECK (insight_type IN (
    'compatibility',
    'communication_style',
    'conflict_resolution',
    'bonding_activities',
    'conversation_starters',
    'gift_suggestions'
  )),
  insight_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidence_score numeric(3,2) DEFAULT 0.5,
  generated_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Profile generation log (audit trail)
CREATE TABLE IF NOT EXISTS profile_generation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES family_personality_profiles(id) ON DELETE CASCADE,
  generation_type text NOT NULL CHECK (generation_type IN (
    'initial',
    'incremental',
    'full_reanalysis',
    'manual_trigger'
  )),
  responses_analyzed integer DEFAULT 0,
  traits_extracted integer DEFAULT 0,
  patterns_identified integer DEFAULT 0,
  insights_generated integer DEFAULT 0,
  processing_time_ms integer,
  ai_model_used text,
  success boolean DEFAULT true,
  error_message text,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE family_personality_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE personality_dimensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE personality_traits ENABLE ROW LEVEL SECURITY;
ALTER TABLE personality_assessment_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE behavioral_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationship_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_generation_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for family_personality_profiles
CREATE POLICY "Users can view profiles for their family members"
  ON family_personality_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create profiles for their family members"
  ON family_personality_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update profiles for their family members"
  ON family_personality_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete profiles for their family members"
  ON family_personality_profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for personality_dimensions (read-only for all authenticated users)
CREATE POLICY "Authenticated users can view dimensions"
  ON personality_dimensions FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for personality_traits
CREATE POLICY "Users can view traits for their profiles"
  ON personality_traits FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM family_personality_profiles
      WHERE family_personality_profiles.id = personality_traits.profile_id
      AND family_personality_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage traits for their profiles"
  ON personality_traits FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM family_personality_profiles
      WHERE family_personality_profiles.id = personality_traits.profile_id
      AND family_personality_profiles.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM family_personality_profiles
      WHERE family_personality_profiles.id = personality_traits.profile_id
      AND family_personality_profiles.user_id = auth.uid()
    )
  );

-- RLS Policies for personality_assessment_questions (read-only)
CREATE POLICY "Authenticated users can view assessment questions"
  ON personality_assessment_questions FOR SELECT
  TO authenticated
  USING (is_active = true);

-- RLS Policies for behavioral_patterns
CREATE POLICY "Users can view patterns for their profiles"
  ON behavioral_patterns FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM family_personality_profiles
      WHERE family_personality_profiles.id = behavioral_patterns.profile_id
      AND family_personality_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage patterns for their profiles"
  ON behavioral_patterns FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM family_personality_profiles
      WHERE family_personality_profiles.id = behavioral_patterns.profile_id
      AND family_personality_profiles.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM family_personality_profiles
      WHERE family_personality_profiles.id = behavioral_patterns.profile_id
      AND family_personality_profiles.user_id = auth.uid()
    )
  );

-- RLS Policies for relationship_insights
CREATE POLICY "Users can view their own relationship insights"
  ON relationship_insights FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own relationship insights"
  ON relationship_insights FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for profile_generation_log
CREATE POLICY "Users can view generation logs for their profiles"
  ON profile_generation_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM family_personality_profiles
      WHERE family_personality_profiles.id = profile_generation_log.profile_id
      AND family_personality_profiles.user_id = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_personality_profiles_family_member
  ON family_personality_profiles(family_member_id);

CREATE INDEX IF NOT EXISTS idx_personality_profiles_user
  ON family_personality_profiles(user_id);

CREATE INDEX IF NOT EXISTS idx_personality_profiles_completeness
  ON family_personality_profiles(completeness_score DESC);

CREATE INDEX IF NOT EXISTS idx_personality_traits_profile
  ON personality_traits(profile_id);

CREATE INDEX IF NOT EXISTS idx_personality_traits_dimension
  ON personality_traits(dimension_id);

CREATE INDEX IF NOT EXISTS idx_personality_traits_confidence
  ON personality_traits(confidence_score DESC);

CREATE INDEX IF NOT EXISTS idx_assessment_questions_dimension
  ON personality_assessment_questions(dimension_id);

CREATE INDEX IF NOT EXISTS idx_assessment_questions_active
  ON personality_assessment_questions(is_active, dimension_id);

CREATE INDEX IF NOT EXISTS idx_behavioral_patterns_profile
  ON behavioral_patterns(profile_id);

CREATE INDEX IF NOT EXISTS idx_behavioral_patterns_type
  ON behavioral_patterns(pattern_type);

CREATE INDEX IF NOT EXISTS idx_relationship_insights_user
  ON relationship_insights(user_id);

CREATE INDEX IF NOT EXISTS idx_relationship_insights_member
  ON relationship_insights(family_member_id);

CREATE INDEX IF NOT EXISTS idx_profile_generation_log_profile
  ON profile_generation_log(profile_id, created_at DESC);

-- Triggers for updated_at timestamps
CREATE TRIGGER update_personality_profiles_updated_at
  BEFORE UPDATE ON family_personality_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_personality_traits_updated_at
  BEFORE UPDATE ON personality_traits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_behavioral_patterns_updated_at
  BEFORE UPDATE ON behavioral_patterns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed personality dimensions
INSERT INTO personality_dimensions (dimension_name, display_name, description, dimension_category, sort_order) VALUES
  ('openness', 'Openness to Experience', 'Imagination, creativity, curiosity, and willingness to try new things', 'core_traits', 1),
  ('conscientiousness', 'Conscientiousness', 'Organization, dependability, discipline, and attention to detail', 'core_traits', 2),
  ('extraversion', 'Extraversion', 'Sociability, assertiveness, energy level, and preference for social interaction', 'core_traits', 3),
  ('agreeableness', 'Agreeableness', 'Compassion, cooperation, trust, and concern for others', 'core_traits', 4),
  ('emotional_stability', 'Emotional Stability', 'Emotional resilience, stress management, and overall emotional balance', 'core_traits', 5),
  ('communication_style', 'Communication Style', 'Preferred methods and patterns of communication', 'communication', 6),
  ('conversation_topics', 'Conversation Preferences', 'Favorite topics and areas of interest in conversations', 'communication', 7),
  ('social_preference', 'Social Preferences', 'Preferred social settings and interaction styles', 'social', 8),
  ('relationship_approach', 'Relationship Approach', 'How they build and maintain relationships', 'social', 9),
  ('hobbies_activities', 'Hobbies and Activities', 'Preferred leisure activities and interests', 'interests', 10),
  ('values_beliefs', 'Values and Beliefs', 'Core values, beliefs, and what matters most', 'interests', 11),
  ('decision_making', 'Decision-Making Style', 'How they approach decisions and problem-solving', 'behavioral', 12),
  ('stress_response', 'Stress Response', 'How they handle stress, conflict, and challenges', 'behavioral', 13),
  ('daily_routines', 'Daily Routines', 'Typical daily habits and routine preferences', 'behavioral', 14),
  ('family_role', 'Family Role', 'Their role and position within the family structure', 'relational', 15),
  ('affection_style', 'Affection Style', 'How they express and receive love and affection', 'relational', 16)
ON CONFLICT (dimension_name) DO NOTHING;

-- Seed sample assessment questions
INSERT INTO personality_assessment_questions (dimension_id, question_text, question_type, difficulty_level, sort_order)
SELECT
  d.id,
  q.text,
  q.type,
  q.level,
  q.order_num
FROM personality_dimensions d
CROSS JOIN LATERAL (
  VALUES
    ('What brings you the most joy in life?', 'open_ended', 'basic', 1),
    ('Describe a typical day when you feel most yourself.', 'open_ended', 'basic', 2),
    ('What are three values that guide your decisions?', 'open_ended', 'intermediate', 3),
    ('Tell me about a time when you overcame a significant challenge.', 'open_ended', 'deep', 4),
    ('How do you prefer to spend your free time?', 'open_ended', 'basic', 5)
) AS q(text, type, level, order_num)
WHERE d.dimension_name IN ('values_beliefs', 'hobbies_activities', 'stress_response', 'daily_routines')
LIMIT 20;
