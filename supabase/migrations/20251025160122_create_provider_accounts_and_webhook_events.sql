/*
  # Fix Missing Health Connector Tables
  
  1. New Tables
    - `provider_accounts`
      - `id` (uuid, primary key) - Unique account identifier
      - `user_id` (uuid, foreign key) - References auth.users
      - `provider` (text) - Provider name (terra, fitbit, oura, dexcom, etc.)
      - `external_user_id` (text) - Vendor-side user/account ID
      - `access_token` (text) - OAuth access token (encrypted at rest)
      - `refresh_token` (text) - OAuth refresh token for renewal
      - `scopes` (text[]) - Granted OAuth scopes array
      - `webhook_secret` (text) - Per-connection webhook validation secret
      - `status` (text) - Connection status (active, disconnected, error)
      - `metadata` (jsonb) - Additional provider-specific metadata
      - `last_sync_at` (timestamptz) - Last successful data sync timestamp
      - `created_at` (timestamptz) - Account creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp
      - Unique constraint on (user_id, provider) to prevent duplicate connections
      
    - `webhook_events`
      - `id` (uuid, primary key) - Unique event identifier
      - `provider` (text) - Source provider name
      - `event_id` (text) - Vendor event ID for tracking
      - `received_at` (timestamptz) - Webhook receipt timestamp
      - `payload` (jsonb) - Full webhook payload for audit
      - `signature` (text) - Webhook signature for verification
      - `dedup_key` (text) - Hash for idempotency checking
      - `processed` (boolean) - Processing status flag
      - `error` (text) - Error message if processing failed
      - `user_id` (uuid, foreign key) - Associated user (nullable)
      - `metrics_inserted` (int) - Count of metrics created from event
      
  2. Security
    - Enable RLS on provider_accounts table
    - Users can only SELECT/INSERT/UPDATE/DELETE their own provider accounts
    - Enable RLS on webhook_events table
    - Users can only SELECT their own webhook events (service role handles inserts)
    - Foreign key constraints ensure data integrity
    
  3. Performance
    - Index on user_id for fast user lookups
    - Index on provider for filtering by provider type
    - Index on status for filtering active connections
    - Index on dedup_key for fast idempotency checks
    - Index on processed flag for unprocessed event queries
    
  4. Notes
    - This migration creates tables that should have been created by migration 20251025110000
    - The health_metrics table already exists and is not recreated
    - All security policies follow the principle of least privilege
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

-- Create indexes for provider_accounts
CREATE INDEX IF NOT EXISTS provider_accounts_user_id_idx ON provider_accounts(user_id);
CREATE INDEX IF NOT EXISTS provider_accounts_provider_idx ON provider_accounts(provider);
CREATE INDEX IF NOT EXISTS provider_accounts_status_idx ON provider_accounts(status);

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

-- Create indexes for webhook_events
CREATE INDEX IF NOT EXISTS webhook_events_provider_idx ON webhook_events(provider);
CREATE INDEX IF NOT EXISTS webhook_events_dedup_key_idx ON webhook_events(dedup_key) WHERE dedup_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS webhook_events_processed_idx ON webhook_events(processed);
CREATE INDEX IF NOT EXISTS webhook_events_received_at_idx ON webhook_events(received_at DESC);

-- Enable RLS on both tables
ALTER TABLE provider_accounts ENABLE ROW LEVEL SECURITY;
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

-- Webhook Events Policies (users can only view their events)
CREATE POLICY "webhook_events_select_own"
  ON webhook_events FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Helper function to get latest metric value (if not exists)
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

-- Helper function to get metric series (if not exists)
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