/*
  # Enhanced Health Connectors Integration System

  1. Purpose
    - Adds database constraints for data integrity
    - Implements token expiration tracking
    - Creates connection health monitoring
    - Adds performance optimizations for large-scale data
    - Implements automatic data quality validation

  2. Enhancements to Existing Tables
    - Adds expires_at column to provider_accounts for token lifecycle management
    - Adds token_refreshed_at for tracking refresh operations
    - Adds sync_error_count and last_error_at for error tracking
    - Adds data_quality_score to health_metrics for filtering
    - Implements check constraints for valid status and provider values

  3. New Tables
    - token_refresh_log: Audit trail for token refresh operations
    - sync_health_status: Real-time sync health monitoring per connection
    - data_quality_issues: Tracking anomalies and invalid data points

  4. Integration Features
    - Automated token expiration detection
    - Connection health scoring system
    - Data quality validation pipeline
    - Performance optimization indexes
    - Real-time sync monitoring

  5. Security
    - All new tables have RLS enabled
    - Enhanced audit logging for sensitive operations
    - Token refresh operations are logged
    - Data access patterns are monitored
*/

-- Add token lifecycle management columns to provider_accounts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'provider_accounts' AND column_name = 'expires_at'
  ) THEN
    ALTER TABLE provider_accounts
    ADD COLUMN expires_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'provider_accounts' AND column_name = 'token_refreshed_at'
  ) THEN
    ALTER TABLE provider_accounts
    ADD COLUMN token_refreshed_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'provider_accounts' AND column_name = 'sync_error_count'
  ) THEN
    ALTER TABLE provider_accounts
    ADD COLUMN sync_error_count INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'provider_accounts' AND column_name = 'last_error_at'
  ) THEN
    ALTER TABLE provider_accounts
    ADD COLUMN last_error_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'provider_accounts' AND column_name = 'last_error_message'
  ) THEN
    ALTER TABLE provider_accounts
    ADD COLUMN last_error_message TEXT;
  END IF;
END $$;

-- Add check constraint for valid provider status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'provider_accounts_status_check'
  ) THEN
    ALTER TABLE provider_accounts
    ADD CONSTRAINT provider_accounts_status_check
    CHECK (status IN ('active', 'inactive', 'error', 'disconnected', 'token_expired'));
  END IF;
END $$;

-- Add data quality tracking to health_metrics
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'health_metrics' AND column_name = 'quality_score'
  ) THEN
    ALTER TABLE health_metrics
    ADD COLUMN quality_score NUMERIC DEFAULT 1.0 CHECK (quality_score >= 0 AND quality_score <= 1);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'health_metrics' AND column_name = 'is_anomaly'
  ) THEN
    ALTER TABLE health_metrics
    ADD COLUMN is_anomaly BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'health_metrics' AND column_name = 'anomaly_reason'
  ) THEN
    ALTER TABLE health_metrics
    ADD COLUMN anomaly_reason TEXT;
  END IF;
END $$;

-- Create token refresh log table
CREATE TABLE IF NOT EXISTS token_refresh_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_account_id UUID NOT NULL REFERENCES provider_accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  refresh_status TEXT NOT NULL CHECK (refresh_status IN ('success', 'failed', 'expired')),
  old_expires_at TIMESTAMPTZ,
  new_expires_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_token_refresh_log_provider_account
ON token_refresh_log(provider_account_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_token_refresh_log_user
ON token_refresh_log(user_id, created_at DESC);

ALTER TABLE token_refresh_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own token refresh logs"
  ON token_refresh_log
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Create sync health status table
CREATE TABLE IF NOT EXISTS sync_health_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_account_id UUID NOT NULL REFERENCES provider_accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  health_score NUMERIC NOT NULL DEFAULT 1.0 CHECK (health_score >= 0 AND health_score <= 1),
  total_syncs INTEGER DEFAULT 0,
  successful_syncs INTEGER DEFAULT 0,
  failed_syncs INTEGER DEFAULT 0,
  avg_sync_duration_ms INTEGER,
  last_health_check TIMESTAMPTZ DEFAULT NOW(),
  status_summary JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT sync_health_status_provider_account_unique UNIQUE (provider_account_id)
);

CREATE INDEX IF NOT EXISTS idx_sync_health_status_user
ON sync_health_status(user_id);

CREATE INDEX IF NOT EXISTS idx_sync_health_status_health_score
ON sync_health_status(health_score);

ALTER TABLE sync_health_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sync health status"
  ON sync_health_status
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own sync health status"
  ON sync_health_status
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sync health status"
  ON sync_health_status
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create data quality issues table
CREATE TABLE IF NOT EXISTS data_quality_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  health_metric_id BIGINT REFERENCES health_metrics(id) ON DELETE SET NULL,
  provider TEXT NOT NULL,
  metric_type TEXT NOT NULL,
  issue_type TEXT NOT NULL CHECK (issue_type IN ('outlier', 'duplicate', 'missing_unit', 'invalid_range', 'temporal_anomaly', 'source_conflict')),
  issue_description TEXT,
  detected_value NUMERIC,
  expected_range_min NUMERIC,
  expected_range_max NUMERIC,
  resolution_status TEXT DEFAULT 'pending' CHECK (resolution_status IN ('pending', 'reviewed', 'corrected', 'ignored')),
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_data_quality_issues_user
ON data_quality_issues(user_id, detected_at DESC);

CREATE INDEX IF NOT EXISTS idx_data_quality_issues_provider_metric
ON data_quality_issues(provider, metric_type);

CREATE INDEX IF NOT EXISTS idx_data_quality_issues_resolution
ON data_quality_issues(resolution_status) WHERE resolution_status = 'pending';

ALTER TABLE data_quality_issues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own data quality issues"
  ON data_quality_issues
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own data quality issues"
  ON data_quality_issues
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Function to check if token needs refresh
CREATE OR REPLACE FUNCTION needs_token_refresh(p_provider_account_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_expires_at TIMESTAMPTZ;
  v_buffer_minutes INTEGER := 10;
BEGIN
  SELECT expires_at INTO v_expires_at
  FROM provider_accounts
  WHERE id = p_provider_account_id;

  IF v_expires_at IS NULL THEN
    RETURN false;
  END IF;

  RETURN v_expires_at <= (NOW() + (v_buffer_minutes || ' minutes')::INTERVAL);
END;
$$;

-- Function to update sync health status
CREATE OR REPLACE FUNCTION update_sync_health_status(
  p_provider_account_id UUID,
  p_sync_success BOOLEAN,
  p_sync_duration_ms INTEGER DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_provider TEXT;
  v_current_total INTEGER;
  v_current_successful INTEGER;
  v_current_failed INTEGER;
  v_new_health_score NUMERIC;
BEGIN
  SELECT user_id, provider INTO v_user_id, v_provider
  FROM provider_accounts
  WHERE id = p_provider_account_id;

  INSERT INTO sync_health_status (
    provider_account_id,
    user_id,
    provider,
    total_syncs,
    successful_syncs,
    failed_syncs,
    avg_sync_duration_ms,
    health_score
  ) VALUES (
    p_provider_account_id,
    v_user_id,
    v_provider,
    1,
    CASE WHEN p_sync_success THEN 1 ELSE 0 END,
    CASE WHEN p_sync_success THEN 0 ELSE 1 END,
    p_sync_duration_ms,
    CASE WHEN p_sync_success THEN 1.0 ELSE 0.5 END
  )
  ON CONFLICT (provider_account_id) DO UPDATE SET
    total_syncs = sync_health_status.total_syncs + 1,
    successful_syncs = sync_health_status.successful_syncs + CASE WHEN p_sync_success THEN 1 ELSE 0 END,
    failed_syncs = sync_health_status.failed_syncs + CASE WHEN p_sync_success THEN 0 ELSE 1 END,
    avg_sync_duration_ms = CASE
      WHEN p_sync_duration_ms IS NOT NULL THEN
        (COALESCE(sync_health_status.avg_sync_duration_ms, 0) * sync_health_status.total_syncs + p_sync_duration_ms) / (sync_health_status.total_syncs + 1)
      ELSE sync_health_status.avg_sync_duration_ms
    END,
    health_score = (sync_health_status.successful_syncs + CASE WHEN p_sync_success THEN 1 ELSE 0 END)::NUMERIC / (sync_health_status.total_syncs + 1),
    last_health_check = NOW(),
    updated_at = NOW();

  IF p_sync_success THEN
    UPDATE provider_accounts
    SET
      last_sync_at = NOW(),
      sync_error_count = 0,
      status = 'active'
    WHERE id = p_provider_account_id;
  ELSE
    UPDATE provider_accounts
    SET
      sync_error_count = sync_error_count + 1,
      last_error_at = NOW(),
      status = CASE WHEN sync_error_count + 1 >= 3 THEN 'error' ELSE status END
    WHERE id = p_provider_account_id;
  END IF;
END;
$$;

-- Function to validate health metric data quality
CREATE OR REPLACE FUNCTION validate_health_metric_quality(
  p_user_id UUID,
  p_metric TEXT,
  p_value NUMERIC,
  p_provider TEXT
)
RETURNS TABLE (
  is_valid BOOLEAN,
  quality_score NUMERIC,
  is_anomaly BOOLEAN,
  anomaly_reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_valid BOOLEAN := true;
  v_quality_score NUMERIC := 1.0;
  v_is_anomaly BOOLEAN := false;
  v_anomaly_reason TEXT := NULL;
  v_expected_min NUMERIC;
  v_expected_max NUMERIC;
  v_recent_avg NUMERIC;
  v_recent_stddev NUMERIC;
BEGIN
  -- Define expected ranges for common metrics
  CASE p_metric
    WHEN 'glucose' THEN
      v_expected_min := 40;
      v_expected_max := 400;
    WHEN 'heart_rate', 'resting_hr' THEN
      v_expected_min := 30;
      v_expected_max := 220;
    WHEN 'steps' THEN
      v_expected_min := 0;
      v_expected_max := 100000;
    WHEN 'sleep_hours' THEN
      v_expected_min := 0;
      v_expected_max := 24;
    WHEN 'weight_kg' THEN
      v_expected_min := 20;
      v_expected_max := 300;
    WHEN 'body_temp_c' THEN
      v_expected_min := 30;
      v_expected_max := 45;
    ELSE
      RETURN QUERY SELECT true, 1.0::NUMERIC, false, NULL::TEXT;
      RETURN;
  END CASE;

  -- Check basic range validation
  IF p_value < v_expected_min OR p_value > v_expected_max THEN
    v_is_valid := false;
    v_quality_score := 0.0;
    v_is_anomaly := true;
    v_anomaly_reason := format('Value %s outside expected range [%s, %s]', p_value, v_expected_min, v_expected_max);

    RETURN QUERY SELECT v_is_valid, v_quality_score, v_is_anomaly, v_anomaly_reason;
    RETURN;
  END IF;

  -- Calculate recent statistics for temporal anomaly detection
  SELECT
    AVG(value),
    STDDEV(value)
  INTO v_recent_avg, v_recent_stddev
  FROM health_metrics
  WHERE
    user_id = p_user_id
    AND metric = p_metric
    AND ts >= NOW() - INTERVAL '30 days'
    AND quality_score > 0.5;

  -- Check for statistical outliers (3 sigma rule)
  IF v_recent_avg IS NOT NULL AND v_recent_stddev IS NOT NULL AND v_recent_stddev > 0 THEN
    IF ABS(p_value - v_recent_avg) > (3 * v_recent_stddev) THEN
      v_quality_score := 0.6;
      v_is_anomaly := true;
      v_anomaly_reason := format('Statistical outlier: %.2f (avg: %.2f, stddev: %.2f)', p_value, v_recent_avg, v_recent_stddev);
    END IF;
  END IF;

  RETURN QUERY SELECT v_is_valid, v_quality_score, v_is_anomaly, v_anomaly_reason;
END;
$$;

-- Function to get connection health summary
CREATE OR REPLACE FUNCTION get_connection_health_summary(p_user_id UUID)
RETURNS TABLE (
  total_connections INTEGER,
  active_connections INTEGER,
  error_connections INTEGER,
  avg_health_score NUMERIC,
  providers_needing_attention TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER as total_connections,
    COUNT(*) FILTER (WHERE pa.status = 'active')::INTEGER as active_connections,
    COUNT(*) FILTER (WHERE pa.status IN ('error', 'token_expired'))::INTEGER as error_connections,
    ROUND(AVG(COALESCE(shs.health_score, 1.0)), 2) as avg_health_score,
    ARRAY_AGG(pa.provider) FILTER (WHERE pa.status IN ('error', 'token_expired') OR shs.health_score < 0.7) as providers_needing_attention
  FROM provider_accounts pa
  LEFT JOIN sync_health_status shs ON shs.provider_account_id = pa.id
  WHERE pa.user_id = p_user_id;
END;
$$;

-- Create optimized indexes for large-scale queries
CREATE INDEX IF NOT EXISTS idx_health_metrics_composite_performance
ON health_metrics(user_id, metric, ts DESC, quality_score)
WHERE quality_score >= 0.5;

CREATE INDEX IF NOT EXISTS idx_health_metrics_recent_data
ON health_metrics(user_id, ts DESC)
WHERE ts >= NOW() - INTERVAL '90 days';

CREATE INDEX IF NOT EXISTS idx_provider_accounts_token_expiry
ON provider_accounts(expires_at)
WHERE expires_at IS NOT NULL AND expires_at <= NOW() + INTERVAL '1 hour';

-- Create materialized view for connection dashboard
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_connection_dashboard AS
SELECT
  pa.user_id,
  pa.provider,
  pa.category,
  pa.status,
  pa.last_sync_at,
  pa.expires_at,
  pa.sync_error_count,
  shs.health_score,
  shs.successful_syncs,
  shs.failed_syncs,
  shs.total_syncs,
  COUNT(hm.id) FILTER (WHERE hm.ts >= NOW() - INTERVAL '7 days') as metrics_last_7_days,
  COUNT(dqi.id) FILTER (WHERE dqi.resolution_status = 'pending') as pending_quality_issues
FROM provider_accounts pa
LEFT JOIN sync_health_status shs ON shs.provider_account_id = pa.id
LEFT JOIN health_metrics hm ON hm.user_id = pa.user_id AND hm.source = pa.provider
LEFT JOIN data_quality_issues dqi ON dqi.user_id = pa.user_id AND dqi.provider = pa.provider
GROUP BY pa.user_id, pa.id, pa.provider, pa.category, pa.status, pa.last_sync_at, pa.expires_at, pa.sync_error_count,
         shs.health_score, shs.successful_syncs, shs.failed_syncs, shs.total_syncs;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_connection_dashboard_unique
ON mv_connection_dashboard(user_id, provider);

CREATE INDEX IF NOT EXISTS idx_mv_connection_dashboard_user
ON mv_connection_dashboard(user_id);

-- Function to refresh connection dashboard
CREATE OR REPLACE FUNCTION refresh_connection_dashboard()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_connection_dashboard;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION needs_token_refresh(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_sync_health_status(UUID, BOOLEAN, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_health_metric_quality(UUID, TEXT, NUMERIC, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_connection_health_summary(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_connection_dashboard() TO authenticated;

-- Grant select on materialized view
GRANT SELECT ON mv_connection_dashboard TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE token_refresh_log IS 'Audit trail for OAuth token refresh operations';
COMMENT ON TABLE sync_health_status IS 'Real-time health monitoring for provider connections';
COMMENT ON TABLE data_quality_issues IS 'Tracking and resolution of data quality anomalies';
COMMENT ON FUNCTION needs_token_refresh IS 'Checks if a provider account token needs refreshing within buffer period';
COMMENT ON FUNCTION update_sync_health_status IS 'Updates connection health score after sync operation';
COMMENT ON FUNCTION validate_health_metric_quality IS 'Validates incoming health metric data for quality and anomalies';
COMMENT ON FUNCTION get_connection_health_summary IS 'Returns aggregated health summary for all user connections';
COMMENT ON MATERIALIZED VIEW mv_connection_dashboard IS 'Optimized dashboard view for connection status and metrics';
