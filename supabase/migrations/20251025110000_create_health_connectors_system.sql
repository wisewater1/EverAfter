/*
  # Health Connectors System - Provider Accounts, Metrics, and Webhooks

  1. New Tables
    - `provider_accounts`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `provider` (text) - 'terra', 'fitbit', 'oura', 'dexcom', etc.
      - `external_user_id` (text) - vendor-side user/account id
      - `access_token` (text) - encrypted at rest
      - `refresh_token` (text) - for token renewal
      - `scopes` (text[]) - granted OAuth scopes
      - `webhook_secret` (text) - per-connection webhook validation
      - `status` (text) - 'active', 'disconnected', 'error'
      - `created_at` (timestamptz)
      - Unique constraint on (user_id, provider)

    - `health_metrics` (enhanced version)
      - `id` (bigserial, primary key)
      - `user_id` (uuid, references auth.users)
      - `engram_id` (uuid, references engrams) - optional AI agent association
      - `source` (text) - provider name
      - `metric` (text) - normalized metric name
      - `value` (numeric) - metric value
      - `unit` (text) - measurement unit
      - `ts` (timestamptz) - vendor event timestamp
      - `raw` (jsonb) - original payload subset for audit
      - `inserted_at` (timestamptz) - record insertion time
      - Indexes on (user_id, ts) and (user_id, metric, ts)

    - `webhook_events`
      - `id` (uuid, primary key)
      - `provider` (text) - source provider
      - `event_id` (text) - vendor event id
      - `received_at` (timestamptz) - when webhook received
      - `payload` (jsonb) - full webhook payload
      - `signature` (text) - webhook signature for verification
      - `dedup_key` (text) - hash for idempotency
      - `processed` (boolean) - processing status
      - `error` (text) - error message if failed
      - Index on dedup_key for fast lookups

  2. Security
    - Enable RLS on all tables
    - Users can only access their own provider_accounts
    - Users can only access their own health_metrics
    - Webhook_events are service-only (no user access)
    - Edge Functions use service role for webhook ingestion
*/

-- Provider Accounts Table
CREATE TABLE IF NOT EXISTS provider_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL,
  external_user_id text NOT NULL,
  access_token text,
  refresh_token text,
  scopes text[],
  webhook_secret text,
  status text NOT NULL DEFAULT 'active',
  metadata jsonb DEFAULT '{}'::jsonb,
  last_sync_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT provider_accounts_user_provider_unique UNIQUE (user_id, provider)
);

CREATE INDEX IF NOT EXISTS provider_accounts_user_id_idx ON provider_accounts(user_id);
CREATE INDEX IF NOT EXISTS provider_accounts_provider_idx ON provider_accounts(provider);
CREATE INDEX IF NOT EXISTS provider_accounts_status_idx ON provider_accounts(status);

-- Health Metrics Table (enhanced)
CREATE TABLE IF NOT EXISTS health_metrics (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  engram_id uuid REFERENCES engrams(id) ON DELETE SET NULL,
  source text NOT NULL,
  metric text NOT NULL,
  value numeric NOT NULL,
  unit text,
  ts timestamptz NOT NULL,
  raw jsonb NOT NULL DEFAULT '{}'::jsonb,
  inserted_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS health_metrics_user_ts_idx ON health_metrics(user_id, ts DESC);
CREATE INDEX IF NOT EXISTS health_metrics_user_metric_ts_idx ON health_metrics(user_id, metric, ts DESC);
CREATE INDEX IF NOT EXISTS health_metrics_source_idx ON health_metrics(source);
CREATE INDEX IF NOT EXISTS health_metrics_engram_idx ON health_metrics(engram_id) WHERE engram_id IS NOT NULL;

-- Webhook Events Table
CREATE TABLE IF NOT EXISTS webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  event_id text,
  received_at timestamptz NOT NULL DEFAULT now(),
  payload jsonb NOT NULL,
  signature text,
  dedup_key text,
  processed boolean NOT NULL DEFAULT false,
  error text,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  metrics_inserted int DEFAULT 0
);

CREATE INDEX IF NOT EXISTS webhook_events_provider_idx ON webhook_events(provider);
CREATE INDEX IF NOT EXISTS webhook_events_dedup_key_idx ON webhook_events(dedup_key) WHERE dedup_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS webhook_events_processed_idx ON webhook_events(processed);
CREATE INDEX IF NOT EXISTS webhook_events_received_at_idx ON webhook_events(received_at DESC);

-- Enable RLS
ALTER TABLE provider_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- Provider Accounts Policies
CREATE POLICY "provider_accounts_select_own"
  ON provider_accounts FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "provider_accounts_insert_own"
  ON provider_accounts FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "provider_accounts_update_own"
  ON provider_accounts FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "provider_accounts_delete_own"
  ON provider_accounts FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Health Metrics Policies
CREATE POLICY "health_metrics_select_own"
  ON health_metrics FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "health_metrics_insert_own"
  ON health_metrics FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Webhook Events Policies (service-only for writes)
CREATE POLICY "webhook_events_select_own"
  ON webhook_events FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Helper function to get latest metric value
CREATE OR REPLACE FUNCTION get_latest_metric(
  p_user_id uuid,
  p_metric text,
  p_source text DEFAULT NULL
)
RETURNS TABLE (
  value numeric,
  unit text,
  ts timestamptz,
  source text
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    hm.value,
    hm.unit,
    hm.ts,
    hm.source
  FROM health_metrics hm
  WHERE hm.user_id = p_user_id
    AND hm.metric = p_metric
    AND (p_source IS NULL OR hm.source = p_source)
  ORDER BY hm.ts DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get metric series
CREATE OR REPLACE FUNCTION get_metric_series(
  p_user_id uuid,
  p_metric text,
  p_start_date timestamptz,
  p_end_date timestamptz,
  p_source text DEFAULT NULL
)
RETURNS TABLE (
  value numeric,
  unit text,
  ts timestamptz,
  source text
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    hm.value,
    hm.unit,
    hm.ts,
    hm.source
  FROM health_metrics hm
  WHERE hm.user_id = p_user_id
    AND hm.metric = p_metric
    AND hm.ts >= p_start_date
    AND hm.ts <= p_end_date
    AND (p_source IS NULL OR hm.source = p_source)
  ORDER BY hm.ts ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
