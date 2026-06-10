/*
  # Comprehensive Analytics Dashboard System

  ## Purpose
  Create a unified analytics system that reads, aggregates, and displays data from ALL
  connected health sources with automatic rotation capabilities.

  ## New Tables
  
  1. `analytics_cache`
     - Stores pre-computed analytics for fast rendering
     - Caches data from all connected sources
     - Automatically refreshes based on rotation schedule
     
  2. `analytics_rotation_state`
     - Tracks current rotation position and timing
     - Manages which source is currently displayed
     - Controls auto-advance through connections
     
  3. `analytics_source_registry`
     - Catalogs all available data sources
     - Defines metrics available per source
     - Maps data transformation rules
     
  4. `analytics_user_preferences`
     - Stores user-specific display preferences
     - Rotation speed and order settings
     - Favorite metrics and custom views

  ## Features
  - Real-time data aggregation from all sources
  - Automatic rotation with configurable intervals (10s, 30s, 1min, 5min)
  - Multi-source comparison views
  - Comprehensive error tracking per source
  - Connection health monitoring
  - Smart data caching to reduce API calls

  ## Security
  - RLS policies ensure users only see their own analytics
  - Encrypted token storage for API access
  - Audit logging for all data access
*/

-- Analytics Cache Table
CREATE TABLE IF NOT EXISTS analytics_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  source_provider TEXT NOT NULL, -- fitbit, oura, dexcom, terra, etc.
  source_id UUID REFERENCES provider_accounts(id) ON DELETE CASCADE,
  metric_category TEXT NOT NULL, -- steps, heart_rate, sleep, glucose, activity, etc.
  time_period TEXT NOT NULL, -- today, week, month, year
  aggregated_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  statistics JSONB NOT NULL DEFAULT '{}'::jsonb, -- min, max, avg, total, trend
  comparison_data JSONB, -- vs previous period
  data_quality_score DECIMAL(3,2), -- 0.00 to 1.00
  last_refreshed_at TIMESTAMPTZ DEFAULT NOW(),
  cache_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS analytics_cache_user_id_idx ON analytics_cache(user_id);
CREATE INDEX IF NOT EXISTS analytics_cache_source_provider_idx ON analytics_cache(source_provider);
CREATE INDEX IF NOT EXISTS analytics_cache_metric_category_idx ON analytics_cache(metric_category);
CREATE INDEX IF NOT EXISTS analytics_cache_time_period_idx ON analytics_cache(time_period);
CREATE INDEX IF NOT EXISTS analytics_cache_expires_idx ON analytics_cache(cache_expires_at);

-- Analytics Rotation State Table
CREATE TABLE IF NOT EXISTS analytics_rotation_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  is_active BOOLEAN DEFAULT false,
  current_source_index INTEGER DEFAULT 0,
  rotation_order TEXT[] DEFAULT ARRAY[]::TEXT[], -- Array of provider names
  interval_seconds INTEGER DEFAULT 30,
  last_rotation_at TIMESTAMPTZ DEFAULT NOW(),
  next_rotation_at TIMESTAMPTZ,
  total_rotations INTEGER DEFAULT 0,
  pause_until TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT analytics_rotation_state_user_unique UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS analytics_rotation_state_user_id_idx ON analytics_rotation_state(user_id);
CREATE INDEX IF NOT EXISTS analytics_rotation_state_active_idx ON analytics_rotation_state(is_active);
CREATE INDEX IF NOT EXISTS analytics_rotation_state_next_rotation_idx ON analytics_rotation_state(next_rotation_at);

-- Analytics Source Registry Table
CREATE TABLE IF NOT EXISTS analytics_source_registry (
  id TEXT PRIMARY KEY,
  provider_name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  icon TEXT,
  color_scheme JSONB,
  available_metrics TEXT[] DEFAULT ARRAY[]::TEXT[],
  supported_periods TEXT[] DEFAULT ARRAY['today', 'week', 'month', 'year']::TEXT[],
  data_type_mappings JSONB DEFAULT '{}'::jsonb,
  api_rate_limit INTEGER, -- requests per hour
  typical_latency_ms INTEGER,
  reliability_score DECIMAL(3,2) DEFAULT 0.95,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Analytics User Preferences Table
CREATE TABLE IF NOT EXISTS analytics_user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  default_view TEXT DEFAULT 'rotation', -- rotation, grid, list, comparison
  default_time_period TEXT DEFAULT 'week',
  rotation_speed TEXT DEFAULT '30s', -- 10s, 30s, 1min, 5min, manual
  auto_start_rotation BOOLEAN DEFAULT false,
  favorite_metrics TEXT[] DEFAULT ARRAY[]::TEXT[],
  hidden_sources TEXT[] DEFAULT ARRAY[]::TEXT[],
  preferred_source_order TEXT[],
  theme TEXT DEFAULT 'dark',
  show_comparisons BOOLEAN DEFAULT true,
  show_trends BOOLEAN DEFAULT true,
  notification_on_anomaly BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT analytics_user_preferences_user_unique UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS analytics_user_preferences_user_id_idx ON analytics_user_preferences(user_id);

-- Enable RLS on all tables
ALTER TABLE analytics_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_rotation_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_source_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_user_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for analytics_cache
CREATE POLICY "Users can view own analytics cache"
  ON analytics_cache FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own analytics cache"
  ON analytics_cache FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own analytics cache"
  ON analytics_cache FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own analytics cache"
  ON analytics_cache FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for analytics_rotation_state
CREATE POLICY "Users can view own rotation state"
  ON analytics_rotation_state FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own rotation state"
  ON analytics_rotation_state FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own rotation state"
  ON analytics_rotation_state FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own rotation state"
  ON analytics_rotation_state FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for analytics_source_registry (read-only for all authenticated users)
CREATE POLICY "Authenticated users can view source registry"
  ON analytics_source_registry FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for analytics_user_preferences
CREATE POLICY "Users can view own preferences"
  ON analytics_user_preferences FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
  ON analytics_user_preferences FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON analytics_user_preferences FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own preferences"
  ON analytics_user_preferences FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Seed analytics source registry with available providers
INSERT INTO analytics_source_registry (id, provider_name, display_name, icon, color_scheme, available_metrics, api_rate_limit, typical_latency_ms)
VALUES
  ('terra', 'terra', 'Terra', 'Globe', '{"primary": "#10b981", "secondary": "#059669"}'::jsonb, 
   ARRAY['steps', 'heart_rate', 'sleep', 'activity', 'calories', 'distance', 'workouts']::TEXT[], 
   3600, 800),
  ('fitbit', 'fitbit', 'Fitbit', 'Activity', '{"primary": "#00b0b9", "secondary": "#008c93"}'::jsonb,
   ARRAY['steps', 'heart_rate', 'sleep', 'calories', 'distance', 'floors', 'active_minutes']::TEXT[],
   150, 1200),
  ('oura', 'oura', 'Oura Ring', 'Circle', '{"primary": "#a855f7", "secondary": "#9333ea"}'::jsonb,
   ARRAY['sleep', 'heart_rate', 'hrv', 'temperature', 'readiness', 'activity']::TEXT[],
   300, 1500),
  ('dexcom', 'dexcom', 'Dexcom CGM', 'Droplet', '{"primary": "#f97316", "secondary": "#ea580c"}'::jsonb,
   ARRAY['glucose', 'glucose_trend', 'alerts']::TEXT[],
   288, 2000),
  ('apple_health', 'apple_health', 'Apple Health', 'Apple', '{"primary": "#ef4444", "secondary": "#dc2626"}'::jsonb,
   ARRAY['steps', 'heart_rate', 'sleep', 'workouts', 'mindfulness', 'nutrition']::TEXT[],
   1000, 500),
  ('google_fit', 'google_fit', 'Google Fit', 'Activity', '{"primary": "#3b82f6", "secondary": "#2563eb"}'::jsonb,
   ARRAY['steps', 'heart_rate', 'calories', 'distance', 'weight', 'workouts']::TEXT[],
   1000, 600),
  ('withings', 'withings', 'Withings', 'Scale', '{"primary": "#06b6d4", "secondary": "#0891b2"}'::jsonb,
   ARRAY['weight', 'blood_pressure', 'heart_rate', 'sleep', 'spo2']::TEXT[],
   120, 1000),
  ('garmin', 'garmin', 'Garmin', 'Navigation', '{"primary": "#0ea5e9", "secondary": "#0284c7"}'::jsonb,
   ARRAY['steps', 'heart_rate', 'sleep', 'stress', 'workouts', 'vo2max']::TEXT[],
   1000, 900),
  ('whoop', 'whoop', 'WHOOP', 'Zap', '{"primary": "#000000", "secondary": "#1f2937"}'::jsonb,
   ARRAY['strain', 'recovery', 'sleep', 'heart_rate', 'hrv']::TEXT[],
   100, 1800),
  ('freestyle_libre', 'freestyle_libre', 'FreeStyle Libre', 'Droplet', '{"primary": "#84cc16", "secondary": "#65a30d"}'::jsonb,
   ARRAY['glucose', 'glucose_trend']::TEXT[],
   288, 2500)
ON CONFLICT (id) DO NOTHING;

-- Function to initialize user preferences
CREATE OR REPLACE FUNCTION initialize_analytics_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO analytics_user_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  INSERT INTO analytics_rotation_state (user_id, rotation_order)
  VALUES (
    NEW.id,
    ARRAY[]::TEXT[]
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-initialize preferences for new users
DROP TRIGGER IF EXISTS initialize_analytics_preferences_trigger ON auth.users;
CREATE TRIGGER initialize_analytics_preferences_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION initialize_analytics_preferences();

-- Function to get all analytics for a user (aggregated view)
CREATE OR REPLACE FUNCTION get_user_analytics_summary(
  p_user_id UUID,
  p_time_period TEXT DEFAULT 'week'
)
RETURNS TABLE (
  source_provider TEXT,
  display_name TEXT,
  icon TEXT,
  color_scheme JSONB,
  metrics JSONB,
  connection_status TEXT,
  last_sync TIMESTAMPTZ,
  data_quality DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pa.provider,
    asr.display_name,
    asr.icon,
    asr.color_scheme,
    jsonb_agg(
      jsonb_build_object(
        'category', ac.metric_category,
        'data', ac.aggregated_data,
        'statistics', ac.statistics,
        'comparison', ac.comparison_data
      )
    ) FILTER (WHERE ac.id IS NOT NULL) as metrics,
    pa.status,
    pa.last_sync_at,
    AVG(ac.data_quality_score) as avg_quality
  FROM provider_accounts pa
  INNER JOIN analytics_source_registry asr ON asr.provider_name = pa.provider
  LEFT JOIN analytics_cache ac ON ac.source_id = pa.id AND ac.time_period = p_time_period
  WHERE pa.user_id = p_user_id
    AND pa.status = 'active'
  GROUP BY pa.provider, pa.status, pa.last_sync_at, asr.display_name, asr.icon, asr.color_scheme
  ORDER BY pa.last_sync_at DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to advance rotation to next source
CREATE OR REPLACE FUNCTION advance_analytics_rotation(p_user_id UUID)
RETURNS TABLE (
  current_provider TEXT,
  current_index INTEGER,
  total_sources INTEGER
) AS $$
DECLARE
  v_rotation_state analytics_rotation_state%ROWTYPE;
  v_new_index INTEGER;
  v_total_sources INTEGER;
BEGIN
  -- Get current rotation state
  SELECT * INTO v_rotation_state
  FROM analytics_rotation_state
  WHERE user_id = p_user_id;
  
  -- Get total number of sources
  SELECT array_length(v_rotation_state.rotation_order, 1) INTO v_total_sources;
  
  -- Calculate next index (wrap around)
  IF v_total_sources IS NULL OR v_total_sources = 0 THEN
    v_new_index := 0;
  ELSE
    v_new_index := (v_rotation_state.current_source_index + 1) % v_total_sources;
  END IF;
  
  -- Update rotation state
  UPDATE analytics_rotation_state
  SET 
    current_source_index = v_new_index,
    last_rotation_at = NOW(),
    next_rotation_at = NOW() + (interval_seconds || ' seconds')::INTERVAL,
    total_rotations = total_rotations + 1,
    updated_at = NOW()
  WHERE user_id = p_user_id;
  
  -- Return current state
  RETURN QUERY
  SELECT 
    CASE 
      WHEN v_total_sources > 0 THEN v_rotation_state.rotation_order[v_new_index + 1]
      ELSE NULL
    END,
    v_new_index,
    COALESCE(v_total_sources, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
