/*
  # St. Raphael Health Connections - Comprehensive Expansion

  This migration expands health device integrations while preserving all existing connections.

  ## New Tables

  1. **health_providers_registry**
     - Central registry of all health data providers
     - Includes OAuth config, capabilities, and feature flags

  2. **health_unified_metrics**
     - Unified data model for all health metrics
     - Normalized format across all providers

  3. **health_sync_jobs**
     - Background sync job tracking
     - Retry logic and error handling

  4. **health_webhooks**
     - Webhook registration and handling
     - Event logs and replay capability

  5. **health_feature_flags**
     - Per-integration feature flags
     - Staged rollout support

  6. **health_connection_audit**
     - Connection activity audit log
     - Security and compliance tracking

  ## Security
  - RLS policies for all tables
  - Encrypted token storage
  - No PII in logs

  ## Important Notes
  - All existing connections are preserved
  - New integrations are additive only
  - Feature flags control rollout
*/

-- =====================================================
-- 1. Health Providers Registry
-- =====================================================

CREATE TABLE IF NOT EXISTS public.health_providers_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_key text UNIQUE NOT NULL,
  display_name text NOT NULL,
  description text,
  category text NOT NULL, -- 'os_hub', 'wearable', 'metabolic', 'home_vitals', 'fertility', 'aggregator'
  vendor_name text NOT NULL,
  icon_url text,
  brand_color text,

  -- OAuth Configuration
  oauth_enabled boolean DEFAULT false,
  oauth_authorize_url text,
  oauth_token_url text,
  oauth_scopes text[],
  oauth_client_id_env_key text, -- Reference to env variable

  -- API Configuration
  api_base_url text,
  api_version text,
  rate_limit_per_minute integer DEFAULT 60,
  supports_webhooks boolean DEFAULT false,
  webhook_events text[],

  -- Capabilities
  supported_metrics text[], -- Array of metric types this provider supports
  data_freshness_minutes integer DEFAULT 60, -- How often data should be synced
  requires_device_pairing boolean DEFAULT false,

  -- Feature Flags
  is_enabled boolean DEFAULT false,
  is_beta boolean DEFAULT false,
  rollout_percentage integer DEFAULT 0, -- 0-100 for staged rollout

  -- Metadata
  documentation_url text,
  support_email text,
  terms_url text,
  privacy_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  CONSTRAINT valid_category CHECK (category IN ('os_hub', 'wearable', 'metabolic', 'home_vitals', 'fertility', 'aggregator')),
  CONSTRAINT valid_rollout CHECK (rollout_percentage BETWEEN 0 AND 100)
);

CREATE INDEX IF NOT EXISTS idx_health_providers_category ON public.health_providers_registry(category);
CREATE INDEX IF NOT EXISTS idx_health_providers_enabled ON public.health_providers_registry(is_enabled) WHERE is_enabled = true;

-- Enable RLS
ALTER TABLE public.health_providers_registry ENABLE ROW LEVEL SECURITY;

-- Public read for enabled providers
CREATE POLICY "Anyone can view enabled providers"
  ON public.health_providers_registry
  FOR SELECT
  USING (is_enabled = true);

-- =====================================================
-- 2. Health Unified Metrics (Expanded Data Model)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.health_unified_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connection_id uuid REFERENCES public.health_connections(id) ON DELETE SET NULL,

  -- Source Information
  provider_key text NOT NULL REFERENCES public.health_providers_registry(provider_key),
  source_device_id text, -- Device identifier from provider
  source_record_id text, -- Original record ID from provider

  -- Metric Data
  metric_type text NOT NULL, -- 'steps', 'heart_rate', 'glucose', 'sleep_stages', etc.
  value numeric NOT NULL,
  unit text NOT NULL, -- Normalized units (steps, bpm, mg/dL, minutes, etc.)

  -- Temporal Information
  start_time timestamptz NOT NULL,
  end_time timestamptz,
  sampling_rate text, -- 'instant', 'continuous', 'daily_summary', etc.
  timezone text DEFAULT 'UTC',

  -- Quality and Metadata
  quality_flag text DEFAULT 'normal', -- 'normal', 'low_quality', 'estimated', 'user_entered'
  confidence_score numeric, -- 0.0 to 1.0
  data_source text, -- 'sensor', 'manual', 'derived', 'third_party'

  -- Contextual Data
  activity_context text, -- 'rest', 'exercise', 'sleep', etc.
  tags text[], -- User or system tags
  notes text, -- User notes or system annotations

  -- Ingestion Tracking
  ingestion_id uuid DEFAULT gen_random_uuid(),
  received_at timestamptz DEFAULT now(),
  processed_at timestamptz DEFAULT now(),

  -- Raw Data Reference
  raw_blob_ref text, -- Reference to stored raw JSON/blob if needed

  created_at timestamptz DEFAULT now(),

  CONSTRAINT valid_metric_type CHECK (metric_type IN (
    'steps', 'distance', 'active_minutes', 'calories', 'floors',
    'heart_rate', 'hrv', 'resting_hr',
    'sleep_stages', 'sleep_duration', 'sleep_score',
    'spo2', 'respiration_rate',
    'bp_systolic', 'bp_diastolic', 'pulse_pressure',
    'weight', 'body_fat', 'bmi', 'muscle_mass', 'bone_mass',
    'glucose', 'insulin_units', 'carbs',
    'therapy_usage_minutes', 'therapy_pressure',
    'temperature', 'bbt',
    'cycle_phase', 'period_flow', 'ovulation',
    'vo2_max', 'training_load', 'recovery_score',
    'stress_level', 'energy_level', 'mood'
  )),
  CONSTRAINT valid_quality CHECK (quality_flag IN ('normal', 'low_quality', 'estimated', 'user_entered', 'device_calibrating')),
  CONSTRAINT valid_confidence CHECK (confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 1))
);

CREATE INDEX IF NOT EXISTS idx_unified_metrics_user_id ON public.health_unified_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_unified_metrics_connection_id ON public.health_unified_metrics(connection_id);
CREATE INDEX IF NOT EXISTS idx_unified_metrics_provider ON public.health_unified_metrics(provider_key);
CREATE INDEX IF NOT EXISTS idx_unified_metrics_type ON public.health_unified_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_unified_metrics_time ON public.health_unified_metrics(start_time DESC);
CREATE INDEX IF NOT EXISTS idx_unified_metrics_user_time ON public.health_unified_metrics(user_id, start_time DESC);
CREATE INDEX IF NOT EXISTS idx_unified_metrics_user_type_time ON public.health_unified_metrics(user_id, metric_type, start_time DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_unified_metrics_dedup ON public.health_unified_metrics(user_id, provider_key, source_record_id) WHERE source_record_id IS NOT NULL;

-- Enable RLS
ALTER TABLE public.health_unified_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own health metrics"
  ON public.health_unified_metrics
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own health metrics"
  ON public.health_unified_metrics
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own health metrics"
  ON public.health_unified_metrics
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own health metrics"
  ON public.health_unified_metrics
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- =====================================================
-- 3. Health Sync Jobs
-- =====================================================

CREATE TABLE IF NOT EXISTS public.health_sync_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connection_id uuid REFERENCES public.health_connections(id) ON DELETE CASCADE,
  provider_key text NOT NULL REFERENCES public.health_providers_registry(provider_key),

  -- Job Configuration
  sync_type text NOT NULL DEFAULT 'incremental', -- 'initial', 'incremental', 'backfill', 'manual'
  sync_window_start timestamptz,
  sync_window_end timestamptz,
  metric_types text[], -- Specific metrics to sync, null means all

  -- Job Status
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed', 'cancelled'
  started_at timestamptz,
  completed_at timestamptz,

  -- Progress Tracking
  total_records integer,
  processed_records integer DEFAULT 0,
  failed_records integer DEFAULT 0,
  progress_percentage integer DEFAULT 0,

  -- Error Handling
  error_message text,
  error_code text,
  retry_count integer DEFAULT 0,
  max_retries integer DEFAULT 3,
  next_retry_at timestamptz,

  -- Performance Metrics
  api_calls_made integer DEFAULT 0,
  data_points_synced integer DEFAULT 0,
  duration_ms integer,

  -- Metadata
  triggered_by text DEFAULT 'system', -- 'system', 'user', 'webhook', 'schedule'
  job_metadata jsonb,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  CONSTRAINT valid_sync_type CHECK (sync_type IN ('initial', 'incremental', 'backfill', 'manual')),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  CONSTRAINT valid_progress CHECK (progress_percentage BETWEEN 0 AND 100)
);

CREATE INDEX IF NOT EXISTS idx_sync_jobs_user_id ON public.health_sync_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_connection_id ON public.health_sync_jobs(connection_id);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_status ON public.health_sync_jobs(status) WHERE status IN ('pending', 'running');
CREATE INDEX IF NOT EXISTS idx_sync_jobs_retry ON public.health_sync_jobs(next_retry_at) WHERE status = 'failed' AND next_retry_at IS NOT NULL;

-- Enable RLS
ALTER TABLE public.health_sync_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sync jobs"
  ON public.health_sync_jobs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- =====================================================
-- 4. Health Webhooks
-- =====================================================

CREATE TABLE IF NOT EXISTS public.health_webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connection_id uuid REFERENCES public.health_connections(id) ON DELETE CASCADE,
  provider_key text NOT NULL REFERENCES public.health_providers_registry(provider_key),

  -- Webhook Configuration
  webhook_url text NOT NULL,
  webhook_secret text, -- Encrypted webhook verification secret
  event_types text[] NOT NULL,
  is_active boolean DEFAULT true,

  -- Registration Info
  provider_webhook_id text, -- ID from provider's system
  registered_at timestamptz DEFAULT now(),
  expires_at timestamptz, -- Some providers require re-registration
  last_verified_at timestamptz,

  -- Event Processing
  last_event_at timestamptz,
  total_events_received integer DEFAULT 0,
  failed_events integer DEFAULT 0,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhooks_user_id ON public.health_webhooks(user_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_connection_id ON public.health_webhooks(connection_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_active ON public.health_webhooks(is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.health_webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own webhooks"
  ON public.health_webhooks
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- =====================================================
-- 5. Health Webhook Events
-- =====================================================

CREATE TABLE IF NOT EXISTS public.health_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id uuid REFERENCES public.health_webhooks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_key text NOT NULL REFERENCES public.health_providers_registry(provider_key),

  -- Event Data
  event_type text NOT NULL,
  event_id text, -- Provider's event ID
  payload jsonb NOT NULL,
  signature text, -- Webhook signature for verification

  -- Processing Status
  status text NOT NULL DEFAULT 'received', -- 'received', 'processing', 'processed', 'failed', 'ignored'
  processed_at timestamptz,
  sync_job_id uuid REFERENCES public.health_sync_jobs(id),

  -- Error Info
  error_message text,
  retry_count integer DEFAULT 0,

  -- Metadata
  source_ip text,
  user_agent text,

  received_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),

  CONSTRAINT valid_event_status CHECK (status IN ('received', 'processing', 'processed', 'failed', 'ignored'))
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_webhook_id ON public.health_webhook_events(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_user_id ON public.health_webhook_events(user_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_status ON public.health_webhook_events(status) WHERE status IN ('received', 'processing');
CREATE INDEX IF NOT EXISTS idx_webhook_events_received ON public.health_webhook_events(received_at DESC);

-- Enable RLS
ALTER TABLE public.health_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own webhook events"
  ON public.health_webhook_events
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- =====================================================
-- 6. Health Feature Flags
-- =====================================================

CREATE TABLE IF NOT EXISTS public.health_feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_key text UNIQUE NOT NULL,
  display_name text NOT NULL,
  description text,

  -- Flag Configuration
  is_enabled boolean DEFAULT false,
  rollout_percentage integer DEFAULT 0, -- 0-100
  allowed_user_ids uuid[], -- Specific users in beta
  blocked_user_ids uuid[], -- Explicitly blocked users

  -- Conditions
  requires_tier text, -- 'free', 'premium', 'enterprise'
  min_app_version text,
  environment text[] DEFAULT ARRAY['production'], -- 'development', 'staging', 'production'

  -- Related Entities
  provider_keys text[], -- Which providers this flag affects

  -- Metadata
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  CONSTRAINT valid_rollout CHECK (rollout_percentage BETWEEN 0 AND 100)
);

CREATE INDEX IF NOT EXISTS idx_feature_flags_enabled ON public.health_feature_flags(is_enabled) WHERE is_enabled = true;

-- Enable RLS
ALTER TABLE public.health_feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view feature flags"
  ON public.health_feature_flags
  FOR SELECT
  USING (true);

-- =====================================================
-- 7. Health Connection Audit Log
-- =====================================================

CREATE TABLE IF NOT EXISTS public.health_connection_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connection_id uuid REFERENCES public.health_connections(id) ON DELETE SET NULL,
  provider_key text NOT NULL,

  -- Action Details
  action text NOT NULL, -- 'connected', 'disconnected', 'token_refreshed', 'sync_started', 'sync_completed', 'sync_failed', 'consent_granted', 'consent_revoked'
  action_details jsonb,

  -- Context
  ip_address inet,
  user_agent text,
  triggered_by text DEFAULT 'user', -- 'user', 'system', 'api'

  -- Outcome
  success boolean DEFAULT true,
  error_message text,

  created_at timestamptz DEFAULT now(),

  CONSTRAINT valid_action CHECK (action IN (
    'connected', 'disconnected', 'token_refreshed',
    'sync_started', 'sync_completed', 'sync_failed',
    'consent_granted', 'consent_revoked', 'data_deleted',
    'webhook_registered', 'webhook_unregistered'
  ))
);

CREATE INDEX IF NOT EXISTS idx_audit_user_id ON public.health_connection_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_connection_id ON public.health_connection_audit(connection_id);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON public.health_connection_audit(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action ON public.health_connection_audit(action);

-- Enable RLS
ALTER TABLE public.health_connection_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own audit logs"
  ON public.health_connection_audit
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- =====================================================
-- 8. Helper Functions
-- =====================================================

-- Function to check if user has access to a provider (feature flag check)
CREATE OR REPLACE FUNCTION public.user_has_provider_access(
  p_user_id uuid,
  p_provider_key text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_provider record;
  v_flag record;
  v_random_value integer;
BEGIN
  -- Get provider info
  SELECT * INTO v_provider
  FROM public.health_providers_registry
  WHERE provider_key = p_provider_key;

  IF NOT FOUND OR NOT v_provider.is_enabled THEN
    RETURN false;
  END IF;

  -- Check feature flags
  FOR v_flag IN
    SELECT * FROM public.health_feature_flags
    WHERE p_provider_key = ANY(provider_keys)
    AND is_enabled = true
  LOOP
    -- Check if user is explicitly allowed
    IF p_user_id = ANY(v_flag.allowed_user_ids) THEN
      RETURN true;
    END IF;

    -- Check if user is blocked
    IF p_user_id = ANY(v_flag.blocked_user_ids) THEN
      RETURN false;
    END IF;

    -- Check rollout percentage
    IF v_flag.rollout_percentage < 100 THEN
      -- Use consistent hash for user
      v_random_value := (hashtext(p_user_id::text) % 100);
      IF v_random_value >= v_flag.rollout_percentage THEN
        RETURN false;
      END IF;
    END IF;
  END LOOP;

  -- Default: allow if provider is enabled and no blocking flags
  RETURN true;
END;
$$;

-- Function to get next sync time for a connection
CREATE OR REPLACE FUNCTION public.get_next_sync_time(
  p_connection_id uuid
)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_last_sync timestamptz;
  v_freshness_minutes integer;
BEGIN
  SELECT
    hc.last_synced_at,
    hpr.data_freshness_minutes
  INTO v_last_sync, v_freshness_minutes
  FROM public.health_connections hc
  JOIN public.health_providers_registry hpr ON hc.provider = hpr.provider_key
  WHERE hc.id = p_connection_id;

  IF v_last_sync IS NULL THEN
    RETURN now();
  END IF;

  RETURN v_last_sync + (v_freshness_minutes || ' minutes')::interval;
END;
$$;

-- =====================================================
-- 9. Seed Initial Provider Registry
-- =====================================================

-- OS Hubs
INSERT INTO public.health_providers_registry (provider_key, display_name, description, category, vendor_name, icon_url, brand_color, oauth_enabled, supported_metrics, is_enabled, is_beta) VALUES
('apple_health', 'Apple Health', 'Sync data from iPhone Health app', 'os_hub', 'Apple', '/icons/apple-health.svg', '#FF2D55', true, ARRAY['steps', 'distance', 'heart_rate', 'sleep_duration', 'active_minutes'], true, false),
('android_health_connect', 'Android Health Connect', 'Sync data from Android Health Connect', 'os_hub', 'Google', '/icons/android-health.svg', '#34A853', true, ARRAY['steps', 'distance', 'heart_rate', 'sleep_duration', 'active_minutes'], true, false)
ON CONFLICT (provider_key) DO NOTHING;

-- Wearables
INSERT INTO public.health_providers_registry (provider_key, display_name, description, category, vendor_name, brand_color, oauth_enabled, supports_webhooks, supported_metrics, is_enabled) VALUES
('garmin', 'Garmin', 'Fitness and outdoor GPS watches', 'wearable', 'Garmin', '#007CC3', true, true, ARRAY['steps', 'distance', 'heart_rate', 'hrv', 'sleep_stages', 'spo2', 'vo2_max', 'training_load'], true),
('fitbit', 'Fitbit', 'Popular fitness tracker and smartwatch', 'wearable', 'Fitbit', '#00B0B9', true, true, ARRAY['steps', 'distance', 'heart_rate', 'hrv', 'sleep_stages', 'spo2', 'active_minutes'], true),
('oura', 'Oura Ring', 'Advanced sleep and recovery tracking ring', 'wearable', 'Oura', '#0D1321', true, true, ARRAY['heart_rate', 'hrv', 'sleep_stages', 'temperature', 'spo2', 'recovery_score'], true),
('whoop', 'WHOOP', 'Performance optimization wearable', 'wearable', 'WHOOP', '#F7C331', true, true, ARRAY['heart_rate', 'hrv', 'sleep_stages', 'recovery_score', 'training_load', 'calories'], true),
('samsung_health', 'Samsung Health', 'Sync Samsung Health data', 'wearable', 'Samsung', '#1428A0', true, false, ARRAY['steps', 'distance', 'heart_rate', 'sleep_duration', 'active_minutes'], true)
ON CONFLICT (provider_key) DO NOTHING;

-- Metabolic/Diabetes
INSERT INTO public.health_providers_registry (provider_key, display_name, description, category, vendor_name, brand_color, oauth_enabled, supports_webhooks, supported_metrics, is_enabled) VALUES
('dexcom_cgm', 'Dexcom CGM', 'Continuous glucose monitoring with real-time data', 'metabolic', 'Dexcom', '#FF6900', true, true, ARRAY['glucose'], true),
('abbott_libre', 'Abbott Libre', 'FreeStyle Libre via aggregator partners', 'metabolic', 'Abbott', '#00857C', true, false, ARRAY['glucose'], true)
ON CONFLICT (provider_key) DO NOTHING;

-- Home Vitals and Sleep
INSERT INTO public.health_providers_registry (provider_key, display_name, description, category, vendor_name, brand_color, oauth_enabled, supported_metrics, is_enabled) VALUES
('withings', 'Withings', 'Connected scales and health monitors', 'home_vitals', 'Withings', '#1BA5E1', true, ARRAY['weight', 'body_fat', 'bp_systolic', 'bp_diastolic', 'heart_rate', 'sleep_duration'], true),
('omron', 'Omron', 'Blood pressure monitors', 'home_vitals', 'Omron', '#005BAA', false, ARRAY['bp_systolic', 'bp_diastolic', 'heart_rate'], false),
('resmed', 'ResMed AirSense', 'Therapy adherence via cloud/app', 'home_vitals', 'ResMed', '#009FDA', true, ARRAY['therapy_usage_minutes', 'therapy_pressure', 'respiration_rate'], false)
ON CONFLICT (provider_key) DO NOTHING;

-- Fertility and Women's Health
INSERT INTO public.health_providers_registry (provider_key, display_name, description, category, vendor_name, brand_color, oauth_enabled, supported_metrics, is_enabled, is_beta) VALUES
('ava', 'Ava', 'Fertility tracking bracelet', 'fertility', 'Ava', '#FF5A8D', true, ARRAY['bbt', 'heart_rate', 'hrv', 'sleep_duration', 'cycle_phase'], false, true),
('tempdrop', 'Tempdrop', 'Wearable BBT sensor', 'fertility', 'Tempdrop', '#E94F88', false, ARRAY['bbt', 'cycle_phase'], false, true)
ON CONFLICT (provider_key) DO NOTHING;

-- Aggregators
INSERT INTO public.health_providers_registry (provider_key, display_name, description, category, vendor_name, brand_color, oauth_enabled, supported_metrics, is_enabled) VALUES
('terra', 'Terra', 'Unified API for 300+ wearables with real-time webhooks', 'aggregator', 'Terra', '#7C3AED', true, ARRAY['steps', 'distance', 'heart_rate', 'hrv', 'sleep_stages', 'spo2', 'calories', 'active_minutes'], true),
('validic', 'Validic', 'Healthcare-grade data aggregation', 'aggregator', 'Validic', '#4A90E2', true, ARRAY['steps', 'heart_rate', 'weight', 'glucose', 'bp_systolic', 'bp_diastolic'], false),
('human_api', 'Human API', 'Health data aggregation platform', 'aggregator', 'Human API', '#00C9A7', true, ARRAY['steps', 'heart_rate', 'weight', 'glucose', 'sleep_duration'], false)
ON CONFLICT (provider_key) DO NOTHING;

-- =====================================================
-- 10. Update Triggers
-- =====================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_health_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_health_providers_updated_at
  BEFORE UPDATE ON public.health_providers_registry
  FOR EACH ROW
  EXECUTE FUNCTION public.update_health_updated_at();

CREATE TRIGGER update_health_sync_jobs_updated_at
  BEFORE UPDATE ON public.health_sync_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_health_updated_at();

CREATE TRIGGER update_health_webhooks_updated_at
  BEFORE UPDATE ON public.health_webhooks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_health_updated_at();

CREATE TRIGGER update_health_feature_flags_updated_at
  BEFORE UPDATE ON public.health_feature_flags
  FOR EACH ROW
  EXECUTE FUNCTION public.update_health_updated_at();

-- =====================================================
-- 11. Comments for Documentation
-- =====================================================

COMMENT ON TABLE public.health_providers_registry IS 'Central registry of all health data providers with OAuth config and capabilities';
COMMENT ON TABLE public.health_unified_metrics IS 'Unified data model for all health metrics across providers with normalized format';
COMMENT ON TABLE public.health_sync_jobs IS 'Background sync job tracking with retry logic and error handling';
COMMENT ON TABLE public.health_webhooks IS 'Webhook registration and handling for real-time data updates';
COMMENT ON TABLE public.health_webhook_events IS 'Individual webhook event logs with processing status';
COMMENT ON TABLE public.health_feature_flags IS 'Feature flag system for staged rollout of new integrations';
COMMENT ON TABLE public.health_connection_audit IS 'Audit log for all connection activities and security events';
