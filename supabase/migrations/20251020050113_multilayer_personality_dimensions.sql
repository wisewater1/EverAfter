/*
  # Multi-Layer Personality System for Archetypal AIs

  1. Key Features
    - Multi-dimensional personality analysis across 5 core + 10 sub-dimensions
    - Hierarchical question categorization 
    - Personality trait extraction with confidence scoring
    - Trait-to-task association for AI behavior customization
    - Support for both user responses and family member responses

  2. New Tables
    - `personality_dimensions` - Hierarchical personality dimensions
    - `personality_traits` - Extracted traits per dimension for each AI
    - `question_categories` - Hierarchical question organization
    - `daily_question_pool` - Enhanced question bank with dimension links
    - `trait_task_associations` - Links personality traits to AI task execution

  3. Enhancements to Existing Tables
    - Add dimension tracking to `daily_question_responses`
    - Add personality completeness scores to `archetypal_ais`
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
('conflict_resolution', 'Conflict Resolution', 'Handling disagreements', 1, 52, ARRAY['communication'])
ON CONFLICT (dimension_name) DO NOTHING;

-- Update parent relationships  
UPDATE personality_dimensions SET parent_dimension_id = (SELECT id FROM personality_dimensions WHERE dimension_name = 'core_values') WHERE dimension_name IN ('moral_compass', 'life_priorities');
UPDATE personality_dimensions SET parent_dimension_id = (SELECT id FROM personality_dimensions WHERE dimension_name = 'emotional_patterns') WHERE dimension_name IN ('emotional_expression', 'empathy_level');
UPDATE personality_dimensions SET parent_dimension_id = (SELECT id FROM personality_dimensions WHERE dimension_name = 'communication_style') WHERE dimension_name IN ('verbal_style', 'humor_style');
UPDATE personality_dimensions SET parent_dimension_id = (SELECT id FROM personality_dimensions WHERE dimension_name = 'decision_making') WHERE dimension_name IN ('risk_assessment', 'problem_solving');
UPDATE personality_dimensions SET parent_dimension_id = (SELECT id FROM personality_dimensions WHERE dimension_name = 'social_behavior') WHERE dimension_name IN ('relationship_approach', 'conflict_resolution');

-- Personality Traits (Extracted from responses)
CREATE TABLE IF NOT EXISTS personality_traits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_id uuid NOT NULL REFERENCES archetypal_ais(id) ON DELETE CASCADE,
  dimension_id uuid NOT NULL REFERENCES personality_dimensions(id) ON DELETE CASCADE,
  trait_name text NOT NULL,
  trait_value text NOT NULL,
  confidence_score float DEFAULT 0.0 CHECK (confidence_score >= 0 AND confidence_score <= 1),
  supporting_responses uuid[] DEFAULT ARRAY[]::uuid[],
  extracted_at timestamptz DEFAULT now(),
  last_updated timestamptz DEFAULT now(),
  is_verified boolean DEFAULT false,
  UNIQUE(ai_id, dimension_id, trait_name)
);

CREATE INDEX IF NOT EXISTS idx_personality_traits_ai ON personality_traits(ai_id);
CREATE INDEX IF NOT EXISTS idx_personality_traits_dimension ON personality_traits(dimension_id);
CREATE INDEX IF NOT EXISTS idx_personality_traits_confidence ON personality_traits(confidence_score DESC);
CREATE INDEX IF NOT EXISTS idx_personality_traits_ai_dimension ON personality_traits(ai_id, dimension_id);

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
('wellness_practices', 'Wellness Practices', 'Exercise, meditation, self-care', 1, 62)
ON CONFLICT (category_name) DO NOTHING;

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

CREATE INDEX IF NOT EXISTS idx_daily_question_pool_category ON daily_question_pool(category_id);
CREATE INDEX IF NOT EXISTS idx_daily_question_pool_dimension ON daily_question_pool(dimension_id);
CREATE INDEX IF NOT EXISTS idx_daily_question_pool_day_range ON daily_question_pool(day_range_start, day_range_end);

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

CREATE INDEX IF NOT EXISTS idx_trait_task_associations_trait ON trait_task_associations(trait_id);
CREATE INDEX IF NOT EXISTS idx_trait_task_associations_task_type ON trait_task_associations(task_type);
CREATE INDEX IF NOT EXISTS idx_trait_task_associations_relevance ON trait_task_associations(relevance_score DESC);

-- Enhance archetypal_ais table with dimension tracking
ALTER TABLE archetypal_ais ADD COLUMN IF NOT EXISTS dimension_scores jsonb DEFAULT '{}'::jsonb;
ALTER TABLE archetypal_ais ADD COLUMN IF NOT EXISTS completeness_by_category jsonb DEFAULT '{}'::jsonb;

-- Update daily_question_responses to link with dimensions
ALTER TABLE daily_question_responses ADD COLUMN IF NOT EXISTS dimension_id uuid REFERENCES personality_dimensions(id) ON DELETE SET NULL;
ALTER TABLE daily_question_responses ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES question_categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_daily_responses_dimension ON daily_question_responses(dimension_id);
CREATE INDEX IF NOT EXISTS idx_daily_responses_category ON daily_question_responses(category_id);
CREATE INDEX IF NOT EXISTS idx_daily_responses_user_dimension ON daily_question_responses(user_id, dimension_id);

-- Enable Row Level Security
ALTER TABLE personality_dimensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE personality_traits ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_question_pool ENABLE ROW LEVEL SECURITY;
ALTER TABLE trait_task_associations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for personality_dimensions (public read for authenticated users)
DROP POLICY IF EXISTS "Anyone can view active dimensions" ON personality_dimensions;
CREATE POLICY "Anyone can view active dimensions"
  ON personality_dimensions FOR SELECT
  TO authenticated
  USING (is_active = true);

-- RLS Policies for personality_traits
DROP POLICY IF EXISTS "Users can view traits for their AIs" ON personality_traits;
CREATE POLICY "Users can view traits for their AIs"
  ON personality_traits FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM archetypal_ais
      WHERE archetypal_ais.id = personality_traits.ai_id
      AND archetypal_ais.user_id = auth.uid()
    )
  );

-- RLS Policies for question_categories (public read)
DROP POLICY IF EXISTS "Anyone can view active categories" ON question_categories;
CREATE POLICY "Anyone can view active categories"
  ON question_categories FOR SELECT
  TO authenticated
  USING (is_active = true);

-- RLS Policies for daily_question_pool (public read)
DROP POLICY IF EXISTS "Anyone can view active questions" ON daily_question_pool;
CREATE POLICY "Anyone can view active questions"
  ON daily_question_pool FOR SELECT
  TO authenticated
  USING (is_active = true);

-- RLS Policies for trait_task_associations
DROP POLICY IF EXISTS "Users can view associations for their traits" ON trait_task_associations;
CREATE POLICY "Users can view associations for their traits"
  ON trait_task_associations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM personality_traits pt
      JOIN archetypal_ais ai ON ai.id = pt.ai_id
      WHERE pt.id = trait_task_associations.trait_id
      AND ai.user_id = auth.uid()
    )
  );

-- Function to update dimension scores when responses are added
CREATE OR REPLACE FUNCTION update_ai_dimension_scores()
RETURNS TRIGGER AS $$
DECLARE
  dimension_scores jsonb := '{}'::jsonb;
  dim_record RECORD;
  response_count int;
  ai_record RECORD;
BEGIN
  -- Get the AI associated with this user
  SELECT id INTO ai_record FROM archetypal_ais WHERE user_id = NEW.user_id LIMIT 1;
  
  IF ai_record.id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Calculate completeness for each dimension
  FOR dim_record IN SELECT id, dimension_name FROM personality_dimensions WHERE is_active = true AND depth_level = 0
  LOOP
    SELECT COUNT(*) INTO response_count
    FROM daily_question_responses
    WHERE user_id = NEW.user_id
    AND dimension_id = dim_record.id;

    dimension_scores := dimension_scores || jsonb_build_object(
      dim_record.dimension_name,
      LEAST(100, (response_count::float / 30.0 * 100)::int)
    );
  END LOOP;

  -- Update archetypal_ais
  UPDATE archetypal_ais
  SET dimension_scores = dimension_scores,
      total_memories = (SELECT COUNT(*) FROM daily_question_responses WHERE user_id = NEW.user_id)
  WHERE id = ai_record.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_ai_dimension_scores ON daily_question_responses;
CREATE TRIGGER trigger_update_ai_dimension_scores
  AFTER INSERT ON daily_question_responses
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_dimension_scores();