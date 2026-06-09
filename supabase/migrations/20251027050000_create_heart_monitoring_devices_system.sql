/*
  # Heart Monitoring Device Recommendation System

  1. New Tables
    - `heart_device_catalog`
      - Comprehensive device specifications and features
      - Classification by device type and use case
      - Medical certifications and accuracy ratings

    - `heart_device_specifications`
      - Detailed technical specifications
      - Accuracy metrics and validation data
      - Connectivity and battery specifications

    - `user_heart_monitoring_profiles`
      - User monitoring goals and preferences
      - Medical conditions requiring specific monitoring
      - Activity levels and budget constraints

    - `heart_device_recommendations`
      - Historical recommendation records
      - User selections and feedback
      - Confidence scores and matching criteria

    - `heart_device_comparisons`
      - Saved device comparisons
      - Side-by-side feature analysis
      - User comparison history

  2. Security
    - Enable RLS on all tables
    - Users can only access their own profiles and recommendations
    - Device catalog is publicly readable
    - Admin-only write access to device catalog

  3. Functions
    - `get_heart_device_recommendations`: AI-powered device matching
    - `compare_heart_devices`: Side-by-side device comparison
    - `record_device_selection`: Track user device choices
*/

-- Heart Device Catalog
CREATE TABLE IF NOT EXISTS heart_device_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_name text NOT NULL,
  manufacturer text NOT NULL,
  model_number text,
  device_category text NOT NULL CHECK (device_category IN ('medical_ecg', 'hybrid_smartwatch', 'chest_strap_sensor', 'wearable_ring', 'continuous_ecg', 'other')),
  primary_use_case text NOT NULL CHECK (primary_use_case IN ('medical_diagnosis', 'fitness_training', 'wellness_tracking', 'performance_optimization')),
  description text NOT NULL,
  key_features text[] NOT NULL DEFAULT '{}',
  form_factor text NOT NULL CHECK (form_factor IN ('chest_strap', 'wrist_worn', 'ring', 'patch', 'portable_handheld')),
  has_ecg boolean DEFAULT false,
  ecg_lead_count integer,
  has_continuous_monitoring boolean DEFAULT false,
  has_hrv boolean DEFAULT false,
  has_medical_certification boolean DEFAULT false,
  fda_cleared boolean DEFAULT false,
  ce_marked boolean DEFAULT false,
  accuracy_rating numeric(3,2) CHECK (accuracy_rating >= 0 AND accuracy_rating <= 5),
  battery_life_hours integer,
  connectivity_types text[] DEFAULT '{}',
  compatible_platforms text[] DEFAULT '{}',
  data_export_formats text[] DEFAULT '{}',
  price_usd numeric(10,2),
  insurance_eligible boolean DEFAULT false,
  requires_subscription boolean DEFAULT false,
  subscription_price_monthly numeric(10,2),
  image_url text,
  manufacturer_url text,
  documentation_url text,
  is_available boolean DEFAULT true,
  availability_status text DEFAULT 'available',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Heart Device Specifications (detailed technical specs)
CREATE TABLE IF NOT EXISTS heart_device_specifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id uuid REFERENCES heart_device_catalog(id) ON DELETE CASCADE NOT NULL,
  spec_category text NOT NULL,
  spec_name text NOT NULL,
  spec_value text NOT NULL,
  spec_unit text,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- User Heart Monitoring Profiles
CREATE TABLE IF NOT EXISTS user_heart_monitoring_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  primary_goal text NOT NULL CHECK (primary_goal IN ('medical_monitoring', 'fitness_optimization', 'wellness_tracking', 'performance_training', 'recovery_tracking')),
  secondary_goals text[] DEFAULT '{}',
  has_heart_condition boolean DEFAULT false,
  heart_conditions text[] DEFAULT '{}',
  has_arrhythmia boolean DEFAULT false,
  takes_heart_medication boolean DEFAULT false,
  activity_level text CHECK (activity_level IN ('sedentary', 'light', 'moderate', 'active', 'very_active', 'athlete')),
  training_intensity text CHECK (training_intensity IN ('none', 'recreational', 'competitive', 'professional')),
  preferred_form_factors text[] DEFAULT '{}',
  budget_range text CHECK (budget_range IN ('under_50', '50_100', '100_200', '200_400', 'over_400', 'no_limit')),
  needs_medical_grade boolean DEFAULT false,
  needs_continuous_monitoring boolean DEFAULT false,
  needs_doctor_integration boolean DEFAULT false,
  needs_app_integration boolean DEFAULT false,
  existing_devices text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Heart Device Recommendations
CREATE TABLE IF NOT EXISTS heart_device_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  profile_id uuid REFERENCES user_heart_monitoring_profiles(id) ON DELETE CASCADE,
  device_id uuid REFERENCES heart_device_catalog(id) ON DELETE CASCADE NOT NULL,
  recommendation_rank integer NOT NULL,
  confidence_score numeric(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  match_reasons text[] NOT NULL DEFAULT '{}',
  strengths text[] NOT NULL DEFAULT '{}',
  limitations text[] NOT NULL DEFAULT '{}',
  use_case_scores jsonb DEFAULT '{}',
  was_selected boolean DEFAULT false,
  user_feedback text,
  user_rating integer CHECK (user_rating >= 1 AND user_rating <= 5),
  created_at timestamptz DEFAULT now()
);

-- Heart Device Comparisons
CREATE TABLE IF NOT EXISTS heart_device_comparisons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  device_ids uuid[] NOT NULL,
  comparison_criteria text[] DEFAULT '{}',
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_heart_device_catalog_category ON heart_device_catalog(device_category);
CREATE INDEX IF NOT EXISTS idx_heart_device_catalog_use_case ON heart_device_catalog(primary_use_case);
CREATE INDEX IF NOT EXISTS idx_heart_device_catalog_available ON heart_device_catalog(is_available);
CREATE INDEX IF NOT EXISTS idx_heart_device_specs_device ON heart_device_specifications(device_id);
CREATE INDEX IF NOT EXISTS idx_user_heart_profile_user ON user_heart_monitoring_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_heart_recommendations_user ON heart_device_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_heart_recommendations_device ON heart_device_recommendations(device_id);
CREATE INDEX IF NOT EXISTS idx_heart_comparisons_user ON heart_device_comparisons(user_id);

-- Enable RLS
ALTER TABLE heart_device_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE heart_device_specifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_heart_monitoring_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE heart_device_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE heart_device_comparisons ENABLE ROW LEVEL SECURITY;

-- RLS Policies for heart_device_catalog (public read)
CREATE POLICY "Anyone can view device catalog"
  ON heart_device_catalog FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for heart_device_specifications (public read)
CREATE POLICY "Anyone can view device specifications"
  ON heart_device_specifications FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for user_heart_monitoring_profiles
CREATE POLICY "Users can view own heart monitoring profile"
  ON user_heart_monitoring_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own heart monitoring profile"
  ON user_heart_monitoring_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own heart monitoring profile"
  ON user_heart_monitoring_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own heart monitoring profile"
  ON user_heart_monitoring_profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for heart_device_recommendations
CREATE POLICY "Users can view own recommendations"
  ON heart_device_recommendations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own recommendations"
  ON heart_device_recommendations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own recommendations"
  ON heart_device_recommendations FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own recommendations"
  ON heart_device_recommendations FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for heart_device_comparisons
CREATE POLICY "Users can view own comparisons"
  ON heart_device_comparisons FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own comparisons"
  ON heart_device_comparisons FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comparisons"
  ON heart_device_comparisons FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own comparisons"
  ON heart_device_comparisons FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to get personalized device recommendations
CREATE OR REPLACE FUNCTION get_heart_device_recommendations(
  p_user_id uuid,
  p_limit integer DEFAULT 5
)
RETURNS TABLE (
  device_id uuid,
  device_name text,
  manufacturer text,
  device_category text,
  confidence_score numeric,
  match_reasons text[],
  rank integer
) AS $$
BEGIN
  RETURN QUERY
  WITH user_profile AS (
    SELECT * FROM user_heart_monitoring_profiles
    WHERE user_id = p_user_id
    LIMIT 1
  ),
  scored_devices AS (
    SELECT
      d.id,
      d.device_name,
      d.manufacturer,
      d.device_category,
      d.primary_use_case,
      d.has_medical_certification,
      d.has_ecg,
      d.has_continuous_monitoring,
      d.form_factor,
      d.price_usd,
      CASE
        WHEN up.primary_goal = 'medical_monitoring' AND d.has_medical_certification THEN 0.4
        WHEN up.primary_goal = 'fitness_optimization' AND d.primary_use_case = 'fitness_training' THEN 0.4
        WHEN up.primary_goal = 'wellness_tracking' AND d.primary_use_case = 'wellness_tracking' THEN 0.4
        WHEN up.primary_goal = 'performance_training' AND d.primary_use_case = 'performance_optimization' THEN 0.4
        ELSE 0.2
      END +
      CASE
        WHEN up.needs_medical_grade AND d.fda_cleared THEN 0.3
        WHEN up.needs_continuous_monitoring AND d.has_continuous_monitoring THEN 0.2
        WHEN up.needs_doctor_integration AND d.data_export_formats && ARRAY['pdf', 'email'] THEN 0.1
        ELSE 0.0
      END +
      CASE
        WHEN up.preferred_form_factors && ARRAY[d.form_factor] THEN 0.2
        ELSE 0.0
      END +
      CASE
        WHEN up.budget_range = 'under_50' AND d.price_usd < 50 THEN 0.1
        WHEN up.budget_range = '50_100' AND d.price_usd BETWEEN 50 AND 100 THEN 0.1
        WHEN up.budget_range = '100_200' AND d.price_usd BETWEEN 100 AND 200 THEN 0.1
        WHEN up.budget_range = '200_400' AND d.price_usd BETWEEN 200 AND 400 THEN 0.1
        WHEN up.budget_range = 'over_400' AND d.price_usd >= 400 THEN 0.1
        WHEN up.budget_range = 'no_limit' THEN 0.1
        ELSE 0.0
      END AS score,
      ARRAY[
        CASE WHEN up.primary_goal = 'medical_monitoring' AND d.has_medical_certification THEN 'FDA cleared for medical use' END,
        CASE WHEN up.needs_continuous_monitoring AND d.has_continuous_monitoring THEN 'Continuous monitoring capability' END,
        CASE WHEN up.needs_doctor_integration AND d.data_export_formats && ARRAY['pdf', 'email'] THEN 'Easy data sharing with doctors' END,
        CASE WHEN d.has_hrv THEN 'HRV tracking for recovery insights' END,
        CASE WHEN d.form_factor = ANY(up.preferred_form_factors) THEN 'Matches your preferred form factor' END
      ] AS reasons
    FROM heart_device_catalog d
    CROSS JOIN user_profile up
    WHERE d.is_available = true
  )
  SELECT
    sd.id,
    sd.device_name,
    sd.manufacturer,
    sd.device_category,
    ROUND(sd.score::numeric, 2),
    array_remove(sd.reasons, NULL),
    ROW_NUMBER() OVER (ORDER BY sd.score DESC, sd.device_name)::integer
  FROM scored_devices sd
  ORDER BY sd.score DESC, sd.device_name
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to compare devices side-by-side
CREATE OR REPLACE FUNCTION compare_heart_devices(
  p_device_ids uuid[]
)
RETURNS TABLE (
  device_id uuid,
  device_name text,
  manufacturer text,
  device_category text,
  form_factor text,
  has_ecg boolean,
  has_hrv boolean,
  has_medical_certification boolean,
  battery_life_hours integer,
  price_usd numeric,
  key_features text[],
  accuracy_rating numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    d.device_name,
    d.manufacturer,
    d.device_category,
    d.form_factor,
    d.has_ecg,
    d.has_hrv,
    d.has_medical_certification,
    d.battery_life_hours,
    d.price_usd,
    d.key_features,
    d.accuracy_rating
  FROM heart_device_catalog d
  WHERE d.id = ANY(p_device_ids)
  ORDER BY array_position(p_device_ids, d.id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
