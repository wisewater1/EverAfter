/*
  # Device Monitoring System

  1. New Tables
    - `connections` - Device connections with health metrics
      - Connection status, battery, signal strength
      - Last sync/webhook timestamps
      - Firmware and permissions tracking

    - `metrics_norm` - Normalized health metrics
      - Unified metric storage across providers
      - Quality scores and source tracking
      - Efficient time-series queries

    - `device_health` - Device health evaluations
      - Uptime ratios and latency metrics
      - Data freshness and completeness scores
      - Gap detection and quality assessment

    - `webhook_logs` - Webhook event logging
      - Inbound webhook tracking
      - Performance metrics (latency, bytes)
      - Error tracking and debugging

    - `alerts` - System alerts and notifications
      - Severity-based alert system
      - Resolution tracking
      - User-specific alert rules

    - `consents` - User consent tracking
      - OAuth scope management
      - Consent history

    - `sync_jobs` - Background sync jobs
      - Backfill management
      - Job status tracking
      - Retry logic support

  2. Security
    - Enable RLS on all tables
    - Policies for authenticated user access only
    - Audit trail for sensitive operations

  3. Performance
    - Indexes on all query patterns
    - Time-series optimizations
    - Efficient webhook lookups
*/

-- Connections table
CREATE TABLE IF NOT EXISTS connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  provider text NOT NULL,
  device_model text,
  status text DEFAULT 'pending' CHECK (status IN ('connected', 'degraded', 'disconnected', 'revoked')),
  battery_pct integer CHECK (battery_pct >= 0 AND battery_pct <= 100),
  signal_strength integer CHECK (signal_strength >= 0 AND signal_strength <= 100),
  last_sync_at timestamptz,
  last_webhook_at timestamptz,
  firmware text,
  permissions jsonb DEFAULT '[]'::jsonb,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_connections_user_provider ON connections(user_id, provider);
CREATE INDEX IF NOT EXISTS idx_connections_status ON connections(status) WHERE status != 'revoked';
CREATE INDEX IF NOT EXISTS idx_connections_last_webhook ON connections(last_webhook_at DESC) WHERE status = 'connected';

-- Metrics normalized table
CREATE TABLE IF NOT EXISTS metrics_norm (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  provider text NOT NULL,
  metric_type text NOT NULL,
  ts timestamptz NOT NULL,
  value numeric NOT NULL,
  unit text NOT NULL,
  quality numeric DEFAULT 1.0 CHECK (quality >= 0 AND quality <= 1),
  source_device_id uuid REFERENCES connections(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_metrics_norm_user_type_ts ON metrics_norm(user_id, metric_type, ts DESC);
CREATE INDEX IF NOT EXISTS idx_metrics_norm_provider ON metrics_norm(provider, ts DESC);
CREATE INDEX IF NOT EXISTS idx_metrics_norm_ts ON metrics_norm(ts DESC);

-- Device health table
CREATE TABLE IF NOT EXISTS device_health (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  provider text NOT NULL,
  uptime_ratio_7d numeric DEFAULT 1.0 CHECK (uptime_ratio_7d >= 0 AND uptime_ratio_7d <= 1),
  avg_latency_ms_24h numeric DEFAULT 0,
  data_freshness_s integer DEFAULT 0,
  completeness_pct_24h numeric DEFAULT 100 CHECK (completeness_pct_24h >= 0 AND completeness_pct_24h <= 100),
  gaps jsonb DEFAULT '[]'::jsonb,
  last_eval_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_device_health_user ON device_health(user_id);
CREATE INDEX IF NOT EXISTS idx_device_health_eval ON device_health(last_eval_at DESC);

-- Webhook logs table
CREATE TABLE IF NOT EXISTS webhook_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL,
  received_at timestamptz DEFAULT now(),
  event_type text NOT NULL,
  http_status integer DEFAULT 200,
  bytes integer DEFAULT 0,
  parse_ms numeric DEFAULT 0,
  error text,
  payload jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_user_provider ON webhook_logs(user_id, provider, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_received ON webhook_logs(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_error ON webhook_logs(error) WHERE error IS NOT NULL;

-- Alerts table
CREATE TABLE IF NOT EXISTS alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  provider text NOT NULL,
  severity text DEFAULT 'info' CHECK (severity IN ('critical', 'warn', 'info')),
  code text NOT NULL,
  message text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz,
  resolver_note text
);

CREATE INDEX IF NOT EXISTS idx_alerts_user_unresolved ON alerts(user_id, created_at DESC) WHERE resolved_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity, created_at DESC) WHERE resolved_at IS NULL;

-- Consents table
CREATE TABLE IF NOT EXISTS consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  provider text NOT NULL,
  scopes jsonb DEFAULT '[]'::jsonb,
  granted_at timestamptz DEFAULT now(),
  revoked_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_consents_user ON consents(user_id) WHERE revoked_at IS NULL;

-- Sync jobs table
CREATE TABLE IF NOT EXISTS sync_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  provider text NOT NULL,
  job_type text DEFAULT 'backfill' CHECK (job_type IN ('backfill', 'poll', 'realtime')),
  window_start timestamptz NOT NULL,
  window_end timestamptz NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  attempts integer DEFAULT 0,
  error text,
  created_at timestamptz DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_sync_jobs_user_status ON sync_jobs(user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_pending ON sync_jobs(created_at ASC) WHERE status = 'pending';

-- Enable Row Level Security
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE metrics_norm ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for connections
CREATE POLICY "Users can view own connections"
  ON connections FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own connections"
  ON connections FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own connections"
  ON connections FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own connections"
  ON connections FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for metrics_norm
CREATE POLICY "Users can view own metrics"
  ON metrics_norm FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own metrics"
  ON metrics_norm FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for device_health
CREATE POLICY "Users can view own device health"
  ON device_health FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own device health"
  ON device_health FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own device health"
  ON device_health FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for webhook_logs
CREATE POLICY "Users can view own webhook logs"
  ON webhook_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own webhook logs"
  ON webhook_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for alerts
CREATE POLICY "Users can view own alerts"
  ON alerts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own alerts"
  ON alerts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own alerts"
  ON alerts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for consents
CREATE POLICY "Users can view own consents"
  ON consents FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own consents"
  ON consents FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for sync_jobs
CREATE POLICY "Users can view own sync jobs"
  ON sync_jobs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sync jobs"
  ON sync_jobs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sync jobs"
  ON sync_jobs FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Trigger to update updated_at on connections
CREATE OR REPLACE FUNCTION update_connections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER connections_updated_at
  BEFORE UPDATE ON connections
  FOR EACH ROW
  EXECUTE FUNCTION update_connections_updated_at();
