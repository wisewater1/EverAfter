/*
  # Multi-Layer Personality System with Family Invitations

  1. Key Differentiations
    - Family Members: Answer questions themselves via invitation link
    - Custom Engrams: User answers questions about fictional/deceased person

  2. New Tables
    - `personality_dimensions` - Multi-layer personality categories
    - `personality_traits` - Extracted traits per dimension
    - `question_categories` - Hierarchical question organization
    - `daily_question_pool` - Enhanced question system with layers
    - `family_member_invitations` - Invitation system for family
    - `external_responses` - Responses from invited family members
    - `trait_task_associations` - Link personality traits to task execution

  3. Improvements
    - Multi-dimensional personality analysis
    - Hierarchical question categorization
    - Efficient trait-to-task mapping
    - Invitation workflow for family members
    - Separate response pathways for engram types
*/

-- Personality Dimensions (Multi-layer categories)
CREATE TABLE IF NOT EXISTS personality_dimensions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dimension_name text NOT NULL UNIQUE,
  display_name text NOT NULL,
  description text,
  parent_dimension_id uuid REFERENCES personality_dimensions(id) ON DELETE CASCADE,
  depth_level int NOT NULL DEFAULT 0,
  dimension_order int NOT NULL DEFAULT 0,
  affects_task_types text[] DEFAULT ARRAY[]::text[],
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Insert personality dimensions with hierarchy
INSERT INTO personality_dimensions (dimension_name, display_name, description, depth_level, dimension_order, affects_task_types) VALUES
-- Level 0: Core Dimensions
('core_values', 'Core Values', 'Fundamental beliefs and life philosophy', 0, 1, ARRAY['all']),
('emotional_patterns', 'Emotional Intelligence', 'Emotional responses and empathy levels', 0, 2, ARRAY['communication', 'health_reminder']),
('communication_style', 'Communication Style', 'How they express themselves', 0, 3, ARRAY['email_send', 'communication']),
('decision_making', 'Decision Making', 'How they make choices and prioritize', 0, 4, ARRAY['doctor_appointment', 'prescription_refill', 'all']),
('social_behavior', 'Social Behavior', 'Interaction patterns with others', 0, 5, ARRAY['communication']),

-- Level 1: Sub-dimensions
('moral_compass', 'Moral Compass', 'Ethical framework and principles', 1, 11, ARRAY['all']),
('life_priorities', 'Life Priorities', 'What matters most in life', 1, 12, ARRAY['all']),
('emotional_expression', 'Emotional Expression', 'How emotions are shown', 1, 21, ARRAY['communication']),
('empathy_level', 'Empathy & Compassion', 'Understanding others feelings', 1, 22, ARRAY['communication', 'health_reminder']),
('verbal_style', 'Verbal Communication', 'Speaking and writing patterns', 1, 31, ARRAY['email_send', 'communication']),
('humor_style', 'Humor & Wit', 'Type of humor and when used', 1, 32, ARRAY['communication']),
('risk_assessment', 'Risk Assessment', 'Approach to risks and unknowns', 1, 41, ARRAY['doctor_appointment', 'health_decisions']),
('problem_solving', 'Problem Solving', 'Approach to challenges', 1, 42, ARRAY['all']),
('relationship_approach', 'Relationship Style', 'How they build connections', 1, 51, ARRAY['communication']),
('conflict_resolution', 'Conflict Resolution', 'Handling disagreements', 1, 52, ARRAY['communication']);

-- Update parent relationships
UPDATE personality_dimensions SET parent_dimension_id = (SELECT id FROM personality_dimensions WHERE dimension_name = 'core_values') WHERE dimension_name IN ('moral_compass', 'life_priorities');
UPDATE personality_dimensions SET parent_dimension_id = (SELECT id FROM personality_dimensions WHERE dimension_name = 'emotional_patterns') WHERE dimension_name IN ('emotional_expression', 'empathy_level');
UPDATE personality_dimensions SET parent_dimension_id = (SELECT id FROM personality_dimensions WHERE dimension_name = 'communication_style') WHERE dimension_name IN ('verbal_style', 'humor_style');
UPDATE personality_dimensions SET parent_dimension_id = (SELECT id FROM personality_dimensions WHERE dimension_name = 'decision_making') WHERE dimension_name IN ('risk_assessment', 'problem_solving');
UPDATE personality_dimensions SET parent_dimension_id = (SELECT id FROM personality_dimensions WHERE dimension_name = 'social_behavior') WHERE dimension_name IN ('relationship_approach', 'conflict_resolution');

-- Personality Traits (Extracted from responses)
CREATE TABLE IF NOT EXISTS personality_traits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engram_id uuid NOT NULL REFERENCES engrams(id) ON DELETE CASCADE,
  dimension_id uuid NOT NULL REFERENCES personality_dimensions(id) ON DELETE CASCADE,
  trait_name text NOT NULL,
  trait_value text NOT NULL,
  confidence_score float DEFAULT 0.0 CHECK (confidence_score >= 0 AND confidence_score <= 1),
  supporting_responses uuid[] DEFAULT ARRAY[]::uuid[],
  extracted_at timestamptz DEFAULT now(),
  last_updated timestamptz DEFAULT now(),
  is_verified boolean DEFAULT false,
  UNIQUE(engram_id, dimension_id, trait_name)
);

CREATE INDEX idx_personality_traits_engram ON personality_traits(engram_id);
CREATE INDEX idx_personality_traits_dimension ON personality_traits(dimension_id);
CREATE INDEX idx_personality_traits_confidence ON personality_traits(confidence_score DESC);

-- Enhanced Question Categories
CREATE TABLE IF NOT EXISTS question_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_name text NOT NULL UNIQUE,
  display_name text NOT NULL,
  description text,
  dimension_id uuid REFERENCES personality_dimensions(id) ON DELETE SET NULL,
  parent_category_id uuid REFERENCES question_categories(id) ON DELETE CASCADE,
  question_count int DEFAULT 0,
  depth_level int DEFAULT 0,
  category_order int DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Insert hierarchical question categories
INSERT INTO question_categories (category_name, display_name, description, depth_level, category_order) VALUES
-- Core Categories
('values_beliefs', 'Values & Beliefs', 'Core values, beliefs, and life philosophy', 0, 1),
('memories_experiences', 'Memories & Experiences', 'Life experiences, key memories, stories', 0, 2),
('daily_life', 'Daily Life & Habits', 'Routines, preferences, daily patterns', 0, 3),
('relationships', 'Relationships & Social', 'Family, friends, social connections', 0, 4),
('communication', 'Communication & Expression', 'How they communicate and express themselves', 0, 5),
('health_wellness', 'Health & Wellness', 'Health history, wellness practices', 0, 6),
('interests_passions', 'Interests & Passions', 'Hobbies, interests, what they love', 0, 7),
('personality_traits_cat', 'Personality Traits', 'Character, temperament, quirks', 0, 8),

-- Sub-categories
('core_beliefs', 'Core Beliefs', 'Fundamental beliefs about life, religion, spirituality', 1, 11),
('ethics_morals', 'Ethics & Morals', 'Moral compass and ethical framework', 1, 12),
('childhood_memories', 'Childhood Memories', 'Early life experiences', 1, 21),
('life_milestones', 'Life Milestones', 'Significant life events', 1, 22),
('morning_routine', 'Morning Routines', 'How they start the day', 1, 31),
('evening_routine', 'Evening Routines', 'How they end the day', 1, 32),
('food_preferences', 'Food & Dining', 'Favorite foods, dietary preferences', 1, 33),
('family_bonds', 'Family Relationships', 'Connections with family members', 1, 41),
('friendships', 'Friendships', 'How they make and keep friends', 1, 42),
('communication_style_cat', 'Communication Style', 'Speaking patterns, writing style', 1, 51),
('humor_wit', 'Humor & Wit', 'Sense of humor, what makes them laugh', 1, 52),
('health_history', 'Health History', 'Medical history, health conditions', 1, 61),
('wellness_practices', 'Wellness Practices', 'Exercise, meditation, self-care', 1, 62);

-- Link categories to dimensions
UPDATE question_categories SET dimension_id = (SELECT id FROM personality_dimensions WHERE dimension_name = 'core_values') WHERE category_name IN ('values_beliefs', 'core_beliefs', 'ethics_morals');
UPDATE question_categories SET dimension_id = (SELECT id FROM personality_dimensions WHERE dimension_name = 'emotional_patterns') WHERE category_name IN ('personality_traits_cat');
UPDATE question_categories SET dimension_id = (SELECT id FROM personality_dimensions WHERE dimension_name = 'communication_style') WHERE category_name IN ('communication', 'communication_style_cat', 'humor_wit');
UPDATE question_categories SET dimension_id = (SELECT id FROM personality_dimensions WHERE dimension_name = 'social_behavior') WHERE category_name IN ('relationships', 'family_bonds', 'friendships');

-- Enhanced Daily Question Pool
CREATE TABLE IF NOT EXISTS daily_question_pool (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_text text NOT NULL,
  category_id uuid REFERENCES question_categories(id) ON DELETE SET NULL,
  dimension_id uuid REFERENCES personality_dimensions(id) ON DELETE SET NULL,
  difficulty_level int DEFAULT 1 CHECK (difficulty_level >= 1 AND difficulty_level <= 5),
  requires_deep_thought boolean DEFAULT false,
  follow_up_questions text[] DEFAULT ARRAY[]::text[],
  day_range_start int DEFAULT 1,
  day_range_end int DEFAULT 365,
  is_active boolean DEFAULT true,
  usage_count int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_daily_question_pool_category ON daily_question_pool(category_id);
CREATE INDEX idx_daily_question_pool_dimension ON daily_question_pool(dimension_id);
CREATE INDEX idx_daily_question_pool_day_range ON daily_question_pool(day_range_start, day_range_end);

-- Family Member Invitations
CREATE TABLE IF NOT EXISTS family_member_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engram_id uuid NOT NULL REFERENCES engrams(id) ON DELETE CASCADE,
  inviter_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invitee_email text NOT NULL,
  invitee_name text NOT NULL,
  invitation_token text NOT NULL UNIQUE,
  invitation_message text,

  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),

  access_level text DEFAULT 'respondent' CHECK (access_level IN ('respondent', 'viewer', 'editor')),

  questions_to_answer int DEFAULT 365,
  questions_answered int DEFAULT 0,

  sent_at timestamptz DEFAULT now(),
  accepted_at timestamptz,
  last_response_at timestamptz,
  expires_at timestamptz DEFAULT (now() + interval '30 days'),

  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_family_invitations_engram ON family_member_invitations(engram_id);
CREATE INDEX idx_family_invitations_token ON family_member_invitations(invitation_token);
CREATE INDEX idx_family_invitations_email ON family_member_invitations(invitee_email);
CREATE INDEX idx_family_invitations_status ON family_member_invitations(status);

-- External Responses (from invited family members)
CREATE TABLE IF NOT EXISTS external_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id uuid NOT NULL REFERENCES family_member_invitations(id) ON DELETE CASCADE,
  engram_id uuid NOT NULL REFERENCES engrams(id) ON DELETE CASCADE,

  question_text text NOT NULL,
  response_text text NOT NULL,
  question_category text,
  dimension_id uuid REFERENCES personality_dimensions(id) ON DELETE SET NULL,

  day_number int,
  response_length int,
  time_to_respond_minutes int,

  is_processed boolean DEFAULT false,
  processed_at timestamptz,

  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_external_responses_invitation ON external_responses(invitation_id);
CREATE INDEX idx_external_responses_engram ON external_responses(engram_id);
CREATE INDEX idx_external_responses_processed ON external_responses(is_processed);

-- Trait-Task Associations
CREATE TABLE IF NOT EXISTS trait_task_associations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trait_id uuid NOT NULL REFERENCES personality_traits(id) ON DELETE CASCADE,
  task_type text NOT NULL,
  relevance_score float DEFAULT 0.5 CHECK (relevance_score >= 0 AND relevance_score <= 1),
  affects_execution boolean DEFAULT true,
  execution_modifier jsonb DEFAULT '{}'::jsonb,

  created_at timestamptz DEFAULT now(),
  UNIQUE(trait_id, task_type)
);

CREATE INDEX idx_trait_task_associations_trait ON trait_task_associations(trait_id);
CREATE INDEX idx_trait_task_associations_task_type ON trait_task_associations(task_type);
CREATE INDEX idx_trait_task_associations_relevance ON trait_task_associations(relevance_score DESC);

-- Enhanced Engram Progress with Dimension Tracking
ALTER TABLE engram_progress ADD COLUMN IF NOT EXISTS dimension_scores jsonb DEFAULT '{}'::jsonb;
ALTER TABLE engram_progress ADD COLUMN IF NOT EXISTS completeness_by_category jsonb DEFAULT '{}'::jsonb;

-- Update existing engram_daily_responses to link with dimensions
ALTER TABLE engram_daily_responses ADD COLUMN IF NOT EXISTS dimension_id uuid REFERENCES personality_dimensions(id) ON DELETE SET NULL;
ALTER TABLE engram_daily_responses ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES question_categories(id) ON DELETE SET NULL;
ALTER TABLE engram_daily_responses ADD COLUMN IF NOT EXISTS is_external boolean DEFAULT false;
ALTER TABLE engram_daily_responses ADD COLUMN IF NOT EXISTS external_response_id uuid REFERENCES external_responses(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_engram_responses_dimension ON engram_daily_responses(dimension_id);
CREATE INDEX IF NOT EXISTS idx_engram_responses_category ON engram_daily_responses(category_id);

-- Enable Row Level Security
ALTER TABLE personality_dimensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE personality_traits ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_question_pool ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_member_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE trait_task_associations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for personality_dimensions (public read)
CREATE POLICY "Anyone can view active dimensions"
  ON personality_dimensions FOR SELECT
  TO authenticated
  USING (is_active = true);

-- RLS Policies for personality_traits
CREATE POLICY "Users can view traits for their engrams"
  ON personality_traits FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM engrams
      WHERE engrams.id = personality_traits.engram_id
      AND engrams.user_id = auth.uid()
    )
  );

-- RLS Policies for question_categories (public read)
CREATE POLICY "Anyone can view active categories"
  ON question_categories FOR SELECT
  TO authenticated
  USING (is_active = true);

-- RLS Policies for daily_question_pool (public read)
CREATE POLICY "Anyone can view active questions"
  ON daily_question_pool FOR SELECT
  TO authenticated
  USING (is_active = true);

-- RLS Policies for family_member_invitations
CREATE POLICY "Users can view invitations for their engrams"
  ON family_member_invitations FOR SELECT
  TO authenticated
  USING (auth.uid() = inviter_user_id);

CREATE POLICY "Users can create invitations for their engrams"
  ON family_member_invitations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = inviter_user_id);

CREATE POLICY "Users can update their invitations"
  ON family_member_invitations FOR UPDATE
  TO authenticated
  USING (auth.uid() = inviter_user_id)
  WITH CHECK (auth.uid() = inviter_user_id);

-- RLS Policies for external_responses
CREATE POLICY "Users can view responses for their engrams"
  ON external_responses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM engrams
      WHERE engrams.id = external_responses.engram_id
      AND engrams.user_id = auth.uid()
    )
  );

-- Allow anonymous inserts with valid invitation token (handled by edge function)
CREATE POLICY "Anonymous can insert with valid token"
  ON external_responses FOR INSERT
  TO anon
  WITH CHECK (true);

-- RLS Policies for trait_task_associations
CREATE POLICY "Users can view associations for their traits"
  ON trait_task_associations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM personality_traits pt
      JOIN engrams e ON e.id = pt.engram_id
      WHERE pt.id = trait_task_associations.trait_id
      AND e.user_id = auth.uid()
    )
  );

-- Functions for personality analysis

-- Function to extract personality traits from responses
CREATE OR REPLACE FUNCTION extract_personality_traits(target_engram_id uuid)
RETURNS void AS $$
DECLARE
  response_record RECORD;
  dimension_record RECORD;
BEGIN
  -- For each dimension, analyze responses and extract traits
  FOR dimension_record IN
    SELECT * FROM personality_dimensions WHERE is_active = true
  LOOP
    -- This is a placeholder - in production, this would use AI/NLP
    -- to analyze response text and extract personality traits
    INSERT INTO personality_traits (
      engram_id,
      dimension_id,
      trait_name,
      trait_value,
      confidence_score
    )
    SELECT
      target_engram_id,
      dimension_record.id,
      'trait_' || dimension_record.dimension_name,
      'analyzed_value',
      0.5
    ON CONFLICT (engram_id, dimension_id, trait_name) DO NOTHING;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to update dimension scores
CREATE OR REPLACE FUNCTION update_dimension_scores()
RETURNS TRIGGER AS $$
DECLARE
  dimension_scores jsonb := '{}'::jsonb;
  dim_record RECORD;
  response_count int;
  total_responses int;
BEGIN
  -- Calculate completeness for each dimension
  FOR dim_record IN SELECT id, dimension_name FROM personality_dimensions WHERE is_active = true
  LOOP
    SELECT COUNT(*) INTO response_count
    FROM engram_daily_responses
    WHERE engram_id = NEW.engram_id
    AND dimension_id = dim_record.id;

    dimension_scores := dimension_scores || jsonb_build_object(
      dim_record.dimension_name,
      LEAST(100, (response_count::float / 30.0 * 100)::int)
    );
  END LOOP;

  -- Update engram_progress
  UPDATE engram_progress
  SET dimension_scores = dimension_scores
  WHERE engram_id = NEW.engram_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_dimension_scores
  AFTER INSERT ON engram_daily_responses
  FOR EACH ROW
  EXECUTE FUNCTION update_dimension_scores();

-- Function to generate invitation token
CREATE OR REPLACE FUNCTION generate_invitation_token()
RETURNS text AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'base64');
END;
$$ LANGUAGE plpgsql;

-- Function to check invitation validity
CREATE OR REPLACE FUNCTION is_invitation_valid(token text)
RETURNS boolean AS $$
DECLARE
  invitation_record RECORD;
BEGIN
  SELECT * INTO invitation_record
  FROM family_member_invitations
  WHERE invitation_token = token
  AND status = 'accepted'
  AND expires_at > now();

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Add indexes for performance
CREATE INDEX idx_personality_traits_engram_dimension ON personality_traits(engram_id, dimension_id);
CREATE INDEX idx_engram_responses_engram_dimension ON engram_daily_responses(engram_id, dimension_id);
