-- Onboarding System Migration
-- Creates tables for first-time user onboarding flow
-- Includes health demographics, onboarding progress tracking, and media consent

-- ============================================================================
-- 1. HEALTH DEMOGRAPHICS TABLE
-- Captures initial health profile data during onboarding
-- ============================================================================
CREATE TABLE IF NOT EXISTS health_demographics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Basic Demographics
  date_of_birth date,
  age integer CHECK (age >= 0 AND age <= 150),
  gender text CHECK (gender IN ('male', 'female', 'non_binary', 'prefer_not_to_say', 'other')),
  gender_other text, -- If gender = 'other'

  -- Physical Measurements
  weight_kg numeric(5,2) CHECK (weight_kg > 0 AND weight_kg < 500),
  height_cm numeric(5,2) CHECK (height_cm > 0 AND height_cm < 300),
  weight_unit text DEFAULT 'kg' CHECK (weight_unit IN ('kg', 'lbs')),
  height_unit text DEFAULT 'cm' CHECK (height_unit IN ('cm', 'ft_in')),

  -- Health Conditions (multi-select)
  health_conditions jsonb DEFAULT '[]'::jsonb,
  -- Example: ["diabetes_type1", "diabetes_type2", "heart_disease", "hypertension", "asthma", "arthritis"]

  -- Allergies
  allergies jsonb DEFAULT '[]'::jsonb,
  -- Example: ["penicillin", "peanuts", "shellfish"]

  -- Current Medications
  current_medications jsonb DEFAULT '[]'::jsonb,
  -- Example: [{"name": "Metformin", "dosage": "500mg", "frequency": "twice daily"}]

  -- Health Goals (multi-select)
  health_goals jsonb DEFAULT '[]'::jsonb,
  -- Example: ["lose_weight", "sleep_better", "manage_stress", "build_muscle", "improve_cardio"]

  -- Activity Level
  activity_level text CHECK (activity_level IN (
    'sedentary',      -- Little or no exercise
    'lightly_active', -- Light exercise 1-3 days/week
    'moderately_active', -- Moderate exercise 3-5 days/week
    'very_active',    -- Hard exercise 6-7 days/week
    'extremely_active' -- Very hard exercise, physical job
  )),

  -- Sleep
  typical_sleep_hours numeric(3,1) CHECK (typical_sleep_hours >= 0 AND typical_sleep_hours <= 24),
  sleep_quality text CHECK (sleep_quality IN ('poor', 'fair', 'good', 'excellent')),

  -- Stress Level
  stress_level text CHECK (stress_level IN ('low', 'moderate', 'high', 'very_high')),

  -- Diet Preferences
  diet_type text CHECK (diet_type IN (
    'omnivore', 'vegetarian', 'vegan', 'pescatarian',
    'keto', 'paleo', 'mediterranean', 'other'
  )),

  -- Emergency Contact (optional during onboarding)
  emergency_contact_name text,
  emergency_contact_phone text,
  emergency_contact_relationship text,

  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  CONSTRAINT unique_user_health_demographics UNIQUE (user_id)
);

-- ============================================================================
-- 2. ONBOARDING STATUS TABLE
-- Tracks user's progress through onboarding steps
-- ============================================================================
CREATE TABLE IF NOT EXISTS onboarding_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Step Tracking
  current_step integer DEFAULT 1 CHECK (current_step >= 1 AND current_step <= 10),
  total_steps integer DEFAULT 7,

  -- Completed Steps (tracks which steps are done)
  completed_steps jsonb DEFAULT '[]'::jsonb,
  -- Example: ["welcome", "meet_raphael", "health_profile", "health_connections"]

  -- Step-specific status
  welcome_completed boolean DEFAULT false,
  meet_raphael_completed boolean DEFAULT false,
  health_profile_completed boolean DEFAULT false,
  health_connections_completed boolean DEFAULT false,
  media_permissions_completed boolean DEFAULT false,
  first_engram_completed boolean DEFAULT false,
  onboarding_complete boolean DEFAULT false,

  -- Skip tracking
  skipped_steps jsonb DEFAULT '[]'::jsonb,
  skip_reason text,

  -- Timing
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  last_step_at timestamptz DEFAULT now(),

  -- Analytics
  time_spent_seconds integer DEFAULT 0,
  device_type text, -- mobile, tablet, desktop

  CONSTRAINT unique_user_onboarding UNIQUE (user_id)
);

-- ============================================================================
-- 3. MEDIA CONSENT TABLE
-- Records user consent for photo/video/camera access
-- ============================================================================
CREATE TABLE IF NOT EXISTS media_consent (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Permission Grants
  photo_library_access boolean DEFAULT false,
  camera_access boolean DEFAULT false,
  video_access boolean DEFAULT false,
  microphone_access boolean DEFAULT false,

  -- Consent Details
  consent_given_at timestamptz,
  consent_version text DEFAULT '1.0',
  consent_ip_address inet,

  -- Purpose Acknowledgments
  acknowledged_photo_use boolean DEFAULT false,  -- For visage/personality
  acknowledged_ai_analysis boolean DEFAULT false, -- For AI processing
  acknowledged_family_sharing boolean DEFAULT false, -- For legacy sharing

  -- Granular Controls
  allow_face_detection boolean DEFAULT false,
  allow_expression_analysis boolean DEFAULT false,
  allow_scene_analysis boolean DEFAULT false,
  allow_avatar_generation boolean DEFAULT false,

  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  CONSTRAINT unique_user_media_consent UNIQUE (user_id)
);

-- ============================================================================
-- 4. ADD ONBOARDING FLAG TO PROFILES
-- Quick check for onboarding completion
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'has_completed_onboarding'
  ) THEN
    ALTER TABLE profiles ADD COLUMN has_completed_onboarding boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'onboarding_skipped'
  ) THEN
    ALTER TABLE profiles ADD COLUMN onboarding_skipped boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'onboarding_skipped_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN onboarding_skipped_at timestamptz;
  END IF;
END $$;

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Health Demographics
CREATE INDEX IF NOT EXISTS idx_health_demographics_user_id ON health_demographics(user_id);

-- Onboarding Status
CREATE INDEX IF NOT EXISTS idx_onboarding_status_user_id ON onboarding_status(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_status_complete ON onboarding_status(onboarding_complete);

-- Media Consent
CREATE INDEX IF NOT EXISTS idx_media_consent_user_id ON media_consent(user_id);

-- Profiles onboarding flag
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding ON profiles(has_completed_onboarding)
  WHERE has_completed_onboarding = false;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE health_demographics ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_consent ENABLE ROW LEVEL SECURITY;

-- Health Demographics Policies
CREATE POLICY "Users can view own health demographics"
  ON health_demographics FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can create own health demographics"
  ON health_demographics FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own health demographics"
  ON health_demographics FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own health demographics"
  ON health_demographics FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- Onboarding Status Policies
CREATE POLICY "Users can view own onboarding status"
  ON onboarding_status FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can create own onboarding status"
  ON onboarding_status FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own onboarding status"
  ON onboarding_status FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- Media Consent Policies
CREATE POLICY "Users can view own media consent"
  ON media_consent FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can create own media consent"
  ON media_consent FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own media consent"
  ON media_consent FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_onboarding_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_health_demographics_updated_at
  BEFORE UPDATE ON health_demographics
  FOR EACH ROW
  EXECUTE FUNCTION update_onboarding_updated_at();

CREATE TRIGGER trigger_media_consent_updated_at
  BEFORE UPDATE ON media_consent
  FOR EACH ROW
  EXECUTE FUNCTION update_onboarding_updated_at();

-- Auto-update profiles.has_completed_onboarding when onboarding completes
CREATE OR REPLACE FUNCTION sync_onboarding_completion()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.onboarding_complete = true AND (OLD.onboarding_complete IS NULL OR OLD.onboarding_complete = false) THEN
    UPDATE profiles
    SET has_completed_onboarding = true
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_sync_onboarding_completion
  AFTER UPDATE ON onboarding_status
  FOR EACH ROW
  EXECUTE FUNCTION sync_onboarding_completion();

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Get user's onboarding progress
CREATE OR REPLACE FUNCTION get_onboarding_progress(p_user_id uuid)
RETURNS TABLE (
  current_step integer,
  total_steps integer,
  completed_steps jsonb,
  is_complete boolean,
  percent_complete integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    os.current_step,
    os.total_steps,
    os.completed_steps,
    os.onboarding_complete,
    CASE
      WHEN os.total_steps > 0 THEN
        (jsonb_array_length(os.completed_steps) * 100 / os.total_steps)::integer
      ELSE 0
    END
  FROM onboarding_status os
  WHERE os.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Initialize onboarding for new user
CREATE OR REPLACE FUNCTION initialize_onboarding(p_user_id uuid)
RETURNS uuid AS $$
DECLARE
  v_status_id uuid;
BEGIN
  INSERT INTO onboarding_status (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING
  RETURNING id INTO v_status_id;

  RETURN v_status_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE health_demographics IS 'User health profile data collected during onboarding';
COMMENT ON TABLE onboarding_status IS 'Tracks user progress through onboarding wizard';
COMMENT ON TABLE media_consent IS 'Records user consent for photo/video/media access';

COMMENT ON COLUMN health_demographics.health_conditions IS 'Array of health condition identifiers';
COMMENT ON COLUMN health_demographics.health_goals IS 'Array of health goal identifiers';
COMMENT ON COLUMN onboarding_status.completed_steps IS 'Array of step identifiers that have been completed';
COMMENT ON COLUMN media_consent.consent_version IS 'Version of consent agreement user agreed to';
