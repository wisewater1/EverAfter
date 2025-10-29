/*
  # Terra Health Integration System

  1. New Tables
    - `terra_users`
      - Maps app users to Terra user IDs
      - Tracks provider connections
    - `terra_connections`
      - Stores connection status per provider
      - Tracks last sync times and errors
    - `terra_metrics_raw`
      - Raw webhook payloads from Terra
      - Preserves original data for reprocessing
    - `terra_metrics_normalized`
      - Normalized health metrics
      - Uniform schema across all providers
    - `terra_sync_jobs`
      - Tracks backfill and polling jobs
      - Manages job status and retries
    - `terra_webhook_events`
      - Logs all webhook events
      - For debugging and replay
    - `terra_audit_log`
      - Privacy actions (export, delete)
      - Audit trail for compliance

  2. Security
    - Enable RLS on all tables
    - Users can only access their own data
    - Service role for webhook ingestion
    - Audit log for privacy actions

  3. Indexes
    - Optimize common queries
    - Provider + timestamp lookups
    - Metric type filtering
*/

-- Terra Users table
CREATE TABLE IF NOT EXISTS terra_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  provider TEXT NOT NULL,
  terra_user_id TEXT NOT NULL,
  reference_id TEXT,
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'error', 'revoked')),
  last_webhook_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_terra_users_user_id ON terra_users(user_id);
CREATE INDEX IF NOT EXISTS idx_terra_users_provider ON terra_users(provider);
CREATE INDEX IF NOT EXISTS idx_terra_users_terra_user_id ON terra_users(terra_user_id);

-- Terra Connections table
CREATE TABLE IF NOT EXISTS terra_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  provider TEXT NOT NULL,
  status TEXT DEFAULT 'connected' CHECK (status IN ('connected', 'disconnected', 'error', 'pending')),
  last_sync_at TIMESTAMPTZ,
  last_error TEXT,
  error_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_terra_connections_user_id ON terra_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_terra_connections_status ON terra_connections(status);

-- Terra Metrics Raw table (stores original webhook payloads)
CREATE TABLE IF NOT EXISTS terra_metrics_raw (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  provider TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  webhook_id TEXT,
  received_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_terra_metrics_raw_user_id ON terra_metrics_raw(user_id);
CREATE INDEX IF NOT EXISTS idx_terra_metrics_raw_provider ON terra_metrics_raw(provider);
CREATE INDEX IF NOT EXISTS idx_terra_metrics_raw_event_type ON terra_metrics_raw(event_type);
CREATE INDEX IF NOT EXISTS idx_terra_metrics_raw_received_at ON terra_metrics_raw(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_terra_metrics_raw_webhook_id ON terra_metrics_raw(webhook_id);

-- Terra Metrics Normalized table
CREATE TABLE IF NOT EXISTS terra_metrics_normalized (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  source TEXT NOT NULL,
  provider TEXT NOT NULL,
  metric_type TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  value NUMERIC,
  value_text TEXT,
  unit TEXT,
  quality TEXT,
  metadata JSONB DEFAULT '{}',
  raw_id UUID REFERENCES terra_metrics_raw(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, provider, metric_type, metric_name, timestamp)
);

CREATE INDEX IF NOT EXISTS idx_terra_metrics_normalized_user_id ON terra_metrics_normalized(user_id);
CREATE INDEX IF NOT EXISTS idx_terra_metrics_normalized_provider ON terra_metrics_normalized(provider);
CREATE INDEX IF NOT EXISTS idx_terra_metrics_normalized_metric_type ON terra_metrics_normalized(metric_type);
CREATE INDEX IF NOT EXISTS idx_terra_metrics_normalized_timestamp ON terra_metrics_normalized(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_terra_metrics_normalized_composite ON terra_metrics_normalized(user_id, metric_type, timestamp DESC);

-- Terra Sync Jobs table
CREATE TABLE IF NOT EXISTS terra_sync_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  provider TEXT NOT NULL,
  job_type TEXT NOT NULL CHECK (job_type IN ('backfill', 'poll', 'manual')),
  window_start TIMESTAMPTZ NOT NULL,
  window_end TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  last_attempt_at TIMESTAMPTZ,
  error_message TEXT,
  result JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_terra_sync_jobs_user_id ON terra_sync_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_terra_sync_jobs_status ON terra_sync_jobs(status);
CREATE INDEX IF NOT EXISTS idx_terra_sync_jobs_created_at ON terra_sync_jobs(created_at DESC);

-- Terra Webhook Events table (for debugging and replay)
CREATE TABLE IF NOT EXISTS terra_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  provider TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  terra_user_id TEXT,
  payload JSONB NOT NULL,
  headers JSONB,
  signature_valid BOOLEAN,
  processed BOOLEAN DEFAULT FALSE,
  error_message TEXT,
  received_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_terra_webhook_events_webhook_id ON terra_webhook_events(webhook_id);
CREATE INDEX IF NOT EXISTS idx_terra_webhook_events_user_id ON terra_webhook_events(user_id);
CREATE INDEX IF NOT EXISTS idx_terra_webhook_events_received_at ON terra_webhook_events(received_at DESC);

-- Terra Audit Log table
CREATE TABLE IF NOT EXISTS terra_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('export', 'delete', 'revoke', 'consent')),
  provider TEXT,
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_terra_audit_log_user_id ON terra_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_terra_audit_log_action ON terra_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_terra_audit_log_created_at ON terra_audit_log(created_at DESC);

-- Enable Row Level Security
ALTER TABLE terra_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE terra_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE terra_metrics_raw ENABLE ROW LEVEL SECURITY;
ALTER TABLE terra_metrics_normalized ENABLE ROW LEVEL SECURITY;
ALTER TABLE terra_sync_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE terra_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE terra_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for terra_users
CREATE POLICY "Users can view own Terra users"
  ON terra_users FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own Terra users"
  ON terra_users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own Terra users"
  ON terra_users FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for terra_connections
CREATE POLICY "Users can view own Terra connections"
  ON terra_connections FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own Terra connections"
  ON terra_connections FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own Terra connections"
  ON terra_connections FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for terra_metrics_raw
CREATE POLICY "Users can view own raw metrics"
  ON terra_metrics_raw FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for terra_metrics_normalized
CREATE POLICY "Users can view own normalized metrics"
  ON terra_metrics_normalized FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for terra_sync_jobs
CREATE POLICY "Users can view own sync jobs"
  ON terra_sync_jobs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for terra_webhook_events
CREATE POLICY "Users can view own webhook events"
  ON terra_webhook_events FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for terra_audit_log
CREATE POLICY "Users can view own audit log"
  ON terra_audit_log FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_terra_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_terra_users_updated_at
  BEFORE UPDATE ON terra_users
  FOR EACH ROW
  EXECUTE FUNCTION update_terra_updated_at();

CREATE TRIGGER update_terra_connections_updated_at
  BEFORE UPDATE ON terra_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_terra_updated_at();

CREATE TRIGGER update_terra_sync_jobs_updated_at
  BEFORE UPDATE ON terra_sync_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_terra_updated_at();
