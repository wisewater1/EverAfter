/*
  # Glucose & Metabolic Health System

  1. New Tables
    - `glucose_readings`
      - High-frequency CGM data (every 5 minutes typical)
      - Normalized to mg/dL with original unit preserved
      - Supports multiple sources: Dexcom, Libre (via aggregator), Terra, manual, FHIR
      - Includes trend and quality indicators
      - Unique constraint on (user_id, engram_id, ts, src)

    - `lab_results`
      - Laboratory test results (HbA1c, etc.)
      - LOINC codes for standardization
      - FHIR integration support
      - Unit preservation with source tracking

    - `metabolic_events`
      - User-logged context events
      - Types: meal, insulin, exercise, illness, note
      - Carb counting, insulin dosing, intensity tracking
      - Free-text notes for qualitative data

    - `glucose_daily_agg`
      - Pre-computed daily aggregates
      - Time-in-Range (TIR) 70-180 mg/dL
      - Hypoglycemic and hyperglycemic event counts
      - Mean, standard deviation, GMI (Glucose Management Indicator)
      - Primary key on (day, user_id, engram_id)

    - `connector_tokens`
      - Secure vault for OAuth tokens
      - Encrypted at rest via Supabase
      - Refresh token support
      - Expiration tracking

    - `connector_consent_ledger`
      - Audit trail of all consent grants/revocations
      - Scope tracking
      - Compliance documentation

  2. Security
    - RLS enabled on all tables
    - Users can only access their own data
    - Tokens vault has strict service-role-only policies
    - Consent ledger is append-only for users

  3. Indexes
    - Optimized for time-series queries
    - Fast lookups by user, engram, and timestamp
    - Source-based filtering
*/

-- High-frequency glucose readings from CGM devices
CREATE TABLE IF NOT EXISTS glucose_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  engram_id uuid NOT NULL REFERENCES engrams(id) ON DELETE CASCADE,
  ts timestamptz NOT NULL,
  value numeric NOT NULL,
  unit text NOT NULL DEFAULT 'mg/dL',
  src text NOT NULL CHECK (src IN ('dexcom', 'libre-agg', 'terra', 'manual', 'fhir')),
  trend text,
  quality text,
  raw jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT glucose_readings_unique UNIQUE (user_id, engram_id, ts, src)
);

CREATE INDEX IF NOT EXISTS glucose_readings_user_engram_ts_idx ON glucose_readings(user_id, engram_id, ts DESC);
CREATE INDEX IF NOT EXISTS glucose_readings_src_idx ON glucose_readings(src);
CREATE INDEX IF NOT EXISTS glucose_readings_ts_idx ON glucose_readings(ts DESC);
CREATE INDEX IF NOT EXISTS glucose_readings_user_ts_idx ON glucose_readings(user_id, ts DESC);

-- Laboratory test results (HbA1c, lipids, etc.)
CREATE TABLE IF NOT EXISTS lab_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  engram_id uuid NOT NULL REFERENCES engrams(id) ON DELETE CASCADE,
  ts timestamptz NOT NULL,
  loinc text,
  name text NOT NULL,
  value numeric NOT NULL,
  unit text NOT NULL,
  src text NOT NULL,
  raw jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lab_results_user_engram_ts_idx ON lab_results(user_id, engram_id, ts DESC);
CREATE INDEX IF NOT EXISTS lab_results_loinc_idx ON lab_results(loinc) WHERE loinc IS NOT NULL;
CREATE INDEX IF NOT EXISTS lab_results_name_idx ON lab_results(name);

-- Metabolic context events (meals, insulin, exercise, notes)
CREATE TABLE IF NOT EXISTS metabolic_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  engram_id uuid NOT NULL REFERENCES engrams(id) ON DELETE CASCADE,
  ts timestamptz NOT NULL,
  type text NOT NULL CHECK (type IN ('meal', 'insulin', 'exercise', 'illness', 'note')),
  carbs_g numeric,
  insulin_units numeric,
  intensity text,
  text text,
  raw jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS metabolic_events_user_engram_ts_idx ON metabolic_events(user_id, engram_id, ts DESC);
CREATE INDEX IF NOT EXISTS metabolic_events_type_idx ON metabolic_events(type);

-- Daily glucose aggregates (computed by cron jobs)
CREATE TABLE IF NOT EXISTS glucose_daily_agg (
  day date NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  engram_id uuid NOT NULL REFERENCES engrams(id) ON DELETE CASCADE,
  tir_70_180_pct numeric,
  hypo_events integer DEFAULT 0,
  hyper_events integer DEFAULT 0,
  mean_glucose numeric,
  gmi numeric,
  sd_glucose numeric,
  readings_count integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (day, user_id, engram_id)
);

CREATE INDEX IF NOT EXISTS glucose_daily_agg_user_engram_day_idx ON glucose_daily_agg(user_id, engram_id, day DESC);

-- Secure vault for connector OAuth tokens
CREATE TABLE IF NOT EXISTS connector_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connector_id text NOT NULL,
  access_token text NOT NULL,
  refresh_token text,
  expires_at timestamptz,
  scopes text[],
  meta jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT connector_tokens_user_connector_unique UNIQUE (user_id, connector_id)
);

CREATE INDEX IF NOT EXISTS connector_tokens_user_idx ON connector_tokens(user_id);
CREATE INDEX IF NOT EXISTS connector_tokens_connector_idx ON connector_tokens(connector_id);
CREATE INDEX IF NOT EXISTS connector_tokens_expires_idx ON connector_tokens(expires_at) WHERE expires_at IS NOT NULL;

-- Consent audit ledger
CREATE TABLE IF NOT EXISTS connector_consent_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connector_id text NOT NULL,
  action text NOT NULL CHECK (action IN ('grant', 'revoke', 'refresh')),
  scopes text[],
  granted_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  ip_address inet,
  user_agent text,
  meta jsonb DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS connector_consent_ledger_user_idx ON connector_consent_ledger(user_id);
CREATE INDEX IF NOT EXISTS connector_consent_ledger_connector_idx ON connector_consent_ledger(connector_id);
CREATE INDEX IF NOT EXISTS connector_consent_ledger_action_idx ON connector_consent_ledger(action);

-- Job execution audit log
CREATE TABLE IF NOT EXISTS glucose_job_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  rows_written integer DEFAULT 0,
  duration_ms integer,
  status text NOT NULL CHECK (status IN ('running', 'success', 'failed')),
  error text,
  meta jsonb DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS glucose_job_audit_job_name_idx ON glucose_job_audit(job_name);
CREATE INDEX IF NOT EXISTS glucose_job_audit_started_at_idx ON glucose_job_audit(started_at DESC);

-- Enable RLS
ALTER TABLE glucose_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE metabolic_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE glucose_daily_agg ENABLE ROW LEVEL SECURITY;
ALTER TABLE connector_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE connector_consent_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE glucose_job_audit ENABLE ROW LEVEL SECURITY;

-- Glucose Readings Policies
CREATE POLICY "glucose_readings_select_own"
  ON glucose_readings FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "glucose_readings_insert_own"
  ON glucose_readings FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Lab Results Policies
CREATE POLICY "lab_results_select_own"
  ON lab_results FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "lab_results_insert_own"
  ON lab_results FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Metabolic Events Policies
CREATE POLICY "metabolic_events_select_own"
  ON metabolic_events FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "metabolic_events_insert_own"
  ON metabolic_events FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "metabolic_events_update_own"
  ON metabolic_events FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Glucose Daily Aggregates Policies
CREATE POLICY "glucose_daily_agg_select_own"
  ON glucose_daily_agg FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "glucose_daily_agg_insert_own"
  ON glucose_daily_agg FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Connector Tokens Policies (service role only for writes)
CREATE POLICY "connector_tokens_select_own"
  ON connector_tokens FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Consent Ledger Policies (users can read their own, append-only)
CREATE POLICY "connector_consent_ledger_select_own"
  ON connector_consent_ledger FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "connector_consent_ledger_insert_own"
  ON connector_consent_ledger FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Job Audit is service-only (no user policies)

-- Helper Functions

-- Convert glucose value to mg/dL
CREATE OR REPLACE FUNCTION to_mg_dl(
  value numeric,
  unit text
) RETURNS numeric AS $$
BEGIN
  IF unit = 'mmol/L' THEN
    RETURN value * 18.0182;
  END IF;
  RETURN value;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Compute Time-in-Range for a set of readings
CREATE OR REPLACE FUNCTION compute_tir(
  p_user_id uuid,
  p_engram_id uuid,
  p_start_date timestamptz,
  p_end_date timestamptz,
  p_low numeric DEFAULT 70,
  p_high numeric DEFAULT 180
) RETURNS TABLE (
  tir_pct numeric,
  below_pct numeric,
  above_pct numeric,
  total_readings bigint
) AS $$
BEGIN
  RETURN QUERY
  WITH readings AS (
    SELECT
      value,
      CASE
        WHEN value >= p_low AND value <= p_high THEN 'in_range'
        WHEN value < p_low THEN 'below'
        ELSE 'above'
      END AS category
    FROM glucose_readings
    WHERE user_id = p_user_id
      AND engram_id = p_engram_id
      AND ts >= p_start_date
      AND ts <= p_end_date
      AND unit = 'mg/dL'
  ),
  counts AS (
    SELECT
      COUNT(*) FILTER (WHERE category = 'in_range') AS in_range,
      COUNT(*) FILTER (WHERE category = 'below') AS below,
      COUNT(*) FILTER (WHERE category = 'above') AS above,
      COUNT(*) AS total
    FROM readings
  )
  SELECT
    ROUND((in_range::numeric / NULLIF(total, 0) * 100), 2) AS tir_pct,
    ROUND((below::numeric / NULLIF(total, 0) * 100), 2) AS below_pct,
    ROUND((above::numeric / NULLIF(total, 0) * 100), 2) AS above_pct,
    total AS total_readings
  FROM counts;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get glucose statistics for a window
CREATE OR REPLACE FUNCTION get_glucose_stats(
  p_user_id uuid,
  p_engram_id uuid,
  p_start_date timestamptz,
  p_end_date timestamptz
) RETURNS TABLE (
  mean_glucose numeric,
  median_glucose numeric,
  sd_glucose numeric,
  min_glucose numeric,
  max_glucose numeric,
  total_readings bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ROUND(AVG(value), 1) AS mean_glucose,
    ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY value), 1) AS median_glucose,
    ROUND(STDDEV(value), 1) AS sd_glucose,
    MIN(value) AS min_glucose,
    MAX(value) AS max_glucose,
    COUNT(*) AS total_readings
  FROM glucose_readings
  WHERE user_id = p_user_id
    AND engram_id = p_engram_id
    AND ts >= p_start_date
    AND ts <= p_end_date
    AND unit = 'mg/dL';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
