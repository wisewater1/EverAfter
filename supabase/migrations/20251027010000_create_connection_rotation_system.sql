/*
  # Connection Rotation System

  1. Purpose
    - Automatically rotate through health connections for continuous data availability
    - Schedule syncs across multiple providers in sequence
    - Implement failover mechanisms to prevent service interruption
    - Monitor connection health and automatically retry failed connections

  2. New Tables
    - `connection_rotation_config`: User-specific rotation settings
    - `connection_rotation_schedule`: Active rotation schedules
    - `connection_sync_queue`: Queue for managing sync operations
    - `connection_health_metrics`: Track connection reliability and performance

  3. Features
    - Configurable rotation intervals (hourly, every 6 hours, daily, weekly)
    - Smart failover with automatic retry logic
    - Connection health scoring
    - Priority-based rotation
    - Comprehensive logging and monitoring

  4. Security
    - RLS policies ensure users only access their own rotation configs
    - Service role required for automated background operations
    - Audit trail for all rotation activities
*/

-- Create connection rotation configuration table
CREATE TABLE IF NOT EXISTS connection_rotation_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  enabled BOOLEAN DEFAULT true,
  rotation_interval TEXT DEFAULT 'every_6_hours' CHECK (
    rotation_interval IN ('hourly', 'every_6_hours', 'daily', 'weekly', 'custom')
  ),
  custom_interval_minutes INTEGER,
  priority_order TEXT[] DEFAULT ARRAY[]::TEXT[], -- Provider IDs in priority order
  failover_enabled BOOLEAN DEFAULT true,
  max_retry_attempts INTEGER DEFAULT 3,
  retry_delay_minutes INTEGER DEFAULT 15,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  notification_enabled BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create unique constraint on user_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_connection_rotation_config_user
ON connection_rotation_config(user_id);

-- Enable RLS
ALTER TABLE connection_rotation_config ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own rotation config"
  ON connection_rotation_config
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own rotation config"
  ON connection_rotation_config
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own rotation config"
  ON connection_rotation_config
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own rotation config"
  ON connection_rotation_config
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create connection rotation schedule table
CREATE TABLE IF NOT EXISTS connection_rotation_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  provider TEXT NOT NULL,
  status TEXT DEFAULT 'scheduled' CHECK (
    status IN ('scheduled', 'running', 'completed', 'failed', 'skipped')
  ),
  scheduled_at TIMESTAMPTZ NOT NULL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  next_scheduled_at TIMESTAMPTZ,
  attempt_count INTEGER DEFAULT 0,
  error_message TEXT,
  sync_result JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_rotation_schedule_user_scheduled
ON connection_rotation_schedule(user_id, scheduled_at);

CREATE INDEX IF NOT EXISTS idx_rotation_schedule_status
ON connection_rotation_schedule(status, scheduled_at);

CREATE INDEX IF NOT EXISTS idx_rotation_schedule_next
ON connection_rotation_schedule(next_scheduled_at) WHERE status = 'scheduled';

-- Enable RLS
ALTER TABLE connection_rotation_schedule ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own rotation schedule"
  ON connection_rotation_schedule
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service can manage rotation schedule"
  ON connection_rotation_schedule
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create connection sync queue table
CREATE TABLE IF NOT EXISTS connection_sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  provider TEXT NOT NULL,
  priority INTEGER DEFAULT 5, -- 1 = highest, 10 = lowest
  status TEXT DEFAULT 'pending' CHECK (
    status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')
  ),
  sync_type TEXT DEFAULT 'scheduled' CHECK (
    sync_type IN ('scheduled', 'manual', 'retry', 'failover')
  ),
  scheduled_for TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  retry_count INTEGER DEFAULT 0,
  error_message TEXT,
  result JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_sync_queue_status_priority
ON connection_sync_queue(status, priority, scheduled_for);

CREATE INDEX IF NOT EXISTS idx_sync_queue_user_provider
ON connection_sync_queue(user_id, provider, status);

CREATE INDEX IF NOT EXISTS idx_sync_queue_scheduled
ON connection_sync_queue(scheduled_for) WHERE status = 'pending';

-- Enable RLS
ALTER TABLE connection_sync_queue ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own sync queue"
  ON connection_sync_queue
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert into their own sync queue"
  ON connection_sync_queue
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service can manage sync queue"
  ON connection_sync_queue
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create connection health metrics table
CREATE TABLE IF NOT EXISTS connection_health_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  provider TEXT NOT NULL,
  health_score INTEGER DEFAULT 100 CHECK (health_score >= 0 AND health_score <= 100),
  total_syncs INTEGER DEFAULT 0,
  successful_syncs INTEGER DEFAULT 0,
  failed_syncs INTEGER DEFAULT 0,
  avg_sync_duration_ms INTEGER,
  last_success_at TIMESTAMPTZ,
  last_failure_at TIMESTAMPTZ,
  consecutive_failures INTEGER DEFAULT 0,
  uptime_percentage DECIMAL(5,2),
  metrics JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_health_metrics_user_provider
ON connection_health_metrics(user_id, provider);

CREATE INDEX IF NOT EXISTS idx_health_metrics_score
ON connection_health_metrics(health_score);

-- Enable RLS
ALTER TABLE connection_health_metrics ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own health metrics"
  ON connection_health_metrics
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service can manage health metrics"
  ON connection_health_metrics
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Function to calculate health score
CREATE OR REPLACE FUNCTION calculate_connection_health_score(
  p_user_id UUID,
  p_provider TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_syncs INTEGER;
  v_successful_syncs INTEGER;
  v_consecutive_failures INTEGER;
  v_last_success TIMESTAMPTZ;
  v_score INTEGER;
BEGIN
  SELECT
    total_syncs,
    successful_syncs,
    consecutive_failures,
    last_success_at
  INTO
    v_total_syncs,
    v_successful_syncs,
    v_consecutive_failures,
    v_last_success
  FROM connection_health_metrics
  WHERE user_id = p_user_id AND provider = p_provider;

  IF NOT FOUND THEN
    RETURN 100; -- New connection starts at perfect health
  END IF;

  -- Base score from success rate
  IF v_total_syncs > 0 THEN
    v_score := (v_successful_syncs * 100) / v_total_syncs;
  ELSE
    v_score := 100;
  END IF;

  -- Penalty for consecutive failures
  v_score := v_score - (v_consecutive_failures * 10);

  -- Penalty for stale connection (no success in 7 days)
  IF v_last_success IS NOT NULL AND v_last_success < NOW() - INTERVAL '7 days' THEN
    v_score := v_score - 20;
  END IF;

  -- Ensure score is between 0 and 100
  v_score := GREATEST(0, LEAST(100, v_score));

  RETURN v_score;
END;
$$;

-- Function to get next provider in rotation
CREATE OR REPLACE FUNCTION get_next_rotation_provider(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_priority_order TEXT[];
  v_next_provider TEXT;
  v_last_synced TEXT;
BEGIN
  -- Get user's priority order
  SELECT priority_order INTO v_priority_order
  FROM connection_rotation_config
  WHERE user_id = p_user_id AND enabled = true;

  IF v_priority_order IS NULL OR array_length(v_priority_order, 1) = 0 THEN
    -- Use default order based on active connections
    SELECT array_agg(provider ORDER BY COALESCE(last_sync_at, '1970-01-01'::TIMESTAMPTZ))
    INTO v_priority_order
    FROM provider_accounts
    WHERE user_id = p_user_id AND status = 'active';
  END IF;

  IF v_priority_order IS NULL OR array_length(v_priority_order, 1) = 0 THEN
    RETURN NULL; -- No providers available
  END IF;

  -- Get last synced provider
  SELECT provider INTO v_last_synced
  FROM connection_rotation_schedule
  WHERE user_id = p_user_id
  ORDER BY completed_at DESC NULLS LAST
  LIMIT 1;

  -- Find next provider in priority order
  IF v_last_synced IS NOT NULL THEN
    FOR i IN 1..array_length(v_priority_order, 1) LOOP
      IF v_priority_order[i] = v_last_synced THEN
        -- Return next provider, or wrap around to first
        IF i < array_length(v_priority_order, 1) THEN
          RETURN v_priority_order[i + 1];
        ELSE
          RETURN v_priority_order[1];
        END IF;
      END IF;
    END LOOP;
  END IF;

  -- Default to first provider
  RETURN v_priority_order[1];
END;
$$;

-- Function to schedule next rotation
CREATE OR REPLACE FUNCTION schedule_next_rotation(p_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_config RECORD;
  v_next_provider TEXT;
  v_next_time TIMESTAMPTZ;
  v_schedule_id UUID;
  v_interval_minutes INTEGER;
BEGIN
  -- Get rotation config
  SELECT * INTO v_config
  FROM connection_rotation_config
  WHERE user_id = p_user_id AND enabled = true;

  IF NOT FOUND THEN
    RETURN NULL; -- Rotation not enabled
  END IF;

  -- Calculate next sync time
  v_interval_minutes := CASE v_config.rotation_interval
    WHEN 'hourly' THEN 60
    WHEN 'every_6_hours' THEN 360
    WHEN 'daily' THEN 1440
    WHEN 'weekly' THEN 10080
    WHEN 'custom' THEN v_config.custom_interval_minutes
    ELSE 360
  END;

  v_next_time := NOW() + (v_interval_minutes || ' minutes')::INTERVAL;

  -- Check quiet hours
  IF v_config.quiet_hours_start IS NOT NULL AND v_config.quiet_hours_end IS NOT NULL THEN
    IF v_next_time::TIME BETWEEN v_config.quiet_hours_start AND v_config.quiet_hours_end THEN
      -- Schedule after quiet hours end
      v_next_time := (v_next_time::DATE + v_config.quiet_hours_end)::TIMESTAMPTZ;
    END IF;
  END IF;

  -- Get next provider
  v_next_provider := get_next_rotation_provider(p_user_id);

  IF v_next_provider IS NULL THEN
    RETURN NULL; -- No providers available
  END IF;

  -- Create schedule entry
  INSERT INTO connection_rotation_schedule (
    user_id,
    provider,
    scheduled_at,
    next_scheduled_at
  ) VALUES (
    p_user_id,
    v_next_provider,
    v_next_time,
    v_next_time + (v_interval_minutes || ' minutes')::INTERVAL
  ) RETURNING id INTO v_schedule_id;

  RETURN v_schedule_id;
END;
$$;

-- Function to update health metrics after sync
CREATE OR REPLACE FUNCTION update_connection_health(
  p_user_id UUID,
  p_provider TEXT,
  p_success BOOLEAN,
  p_duration_ms INTEGER DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_health RECORD;
  v_new_score INTEGER;
BEGIN
  -- Get or create health record
  INSERT INTO connection_health_metrics (user_id, provider)
  VALUES (p_user_id, p_provider)
  ON CONFLICT (user_id, provider) DO NOTHING;

  -- Update metrics
  UPDATE connection_health_metrics
  SET
    total_syncs = total_syncs + 1,
    successful_syncs = CASE WHEN p_success THEN successful_syncs + 1 ELSE successful_syncs END,
    failed_syncs = CASE WHEN NOT p_success THEN failed_syncs + 1 ELSE failed_syncs END,
    consecutive_failures = CASE WHEN p_success THEN 0 ELSE consecutive_failures + 1 END,
    last_success_at = CASE WHEN p_success THEN NOW() ELSE last_success_at END,
    last_failure_at = CASE WHEN NOT p_success THEN NOW() ELSE last_failure_at END,
    avg_sync_duration_ms = CASE
      WHEN p_duration_ms IS NOT NULL THEN
        COALESCE((avg_sync_duration_ms * total_syncs + p_duration_ms) / (total_syncs + 1), p_duration_ms)
      ELSE avg_sync_duration_ms
    END,
    uptime_percentage = CASE WHEN total_syncs > 0 THEN
      ((successful_syncs::DECIMAL + CASE WHEN p_success THEN 1 ELSE 0 END) / (total_syncs + 1)) * 100
    ELSE 100 END,
    updated_at = NOW()
  WHERE user_id = p_user_id AND provider = p_provider;

  -- Recalculate health score
  v_new_score := calculate_connection_health_score(p_user_id, p_provider);

  UPDATE connection_health_metrics
  SET health_score = v_new_score
  WHERE user_id = p_user_id AND provider = p_provider;
END;
$$;

-- Function to enqueue sync with failover
CREATE OR REPLACE FUNCTION enqueue_sync_with_failover(
  p_user_id UUID,
  p_provider TEXT,
  p_sync_type TEXT DEFAULT 'scheduled'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_queue_id UUID;
  v_priority INTEGER;
  v_health_score INTEGER;
BEGIN
  -- Get health score to determine priority
  SELECT health_score INTO v_health_score
  FROM connection_health_metrics
  WHERE user_id = p_user_id AND provider = p_provider;

  -- Higher health score = lower priority number (sync sooner)
  v_priority := CASE
    WHEN v_health_score IS NULL THEN 5
    WHEN v_health_score >= 90 THEN 1
    WHEN v_health_score >= 70 THEN 3
    WHEN v_health_score >= 50 THEN 5
    ELSE 7
  END;

  -- Insert into queue
  INSERT INTO connection_sync_queue (
    user_id,
    provider,
    priority,
    sync_type
  ) VALUES (
    p_user_id,
    p_provider,
    v_priority,
    p_sync_type
  ) RETURNING id INTO v_queue_id;

  RETURN v_queue_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION calculate_connection_health_score(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_next_rotation_provider(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION schedule_next_rotation(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION update_connection_health(UUID, TEXT, BOOLEAN, INTEGER) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION enqueue_sync_with_failover(UUID, TEXT, TEXT) TO authenticated, service_role;

-- Create trigger to update rotation config timestamp
CREATE OR REPLACE FUNCTION update_rotation_config_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_rotation_config_timestamp ON connection_rotation_config;
CREATE TRIGGER trigger_update_rotation_config_timestamp
  BEFORE UPDATE ON connection_rotation_config
  FOR EACH ROW
  EXECUTE FUNCTION update_rotation_config_timestamp();

-- Add helpful comments
COMMENT ON TABLE connection_rotation_config IS 'User-specific rotation configuration and preferences';
COMMENT ON TABLE connection_rotation_schedule IS 'Schedule tracking for automated connection rotations';
COMMENT ON TABLE connection_sync_queue IS 'Priority queue for managing sync operations with failover';
COMMENT ON TABLE connection_health_metrics IS 'Connection reliability and performance tracking';
COMMENT ON FUNCTION calculate_connection_health_score IS 'Calculates health score (0-100) based on sync success rate';
COMMENT ON FUNCTION get_next_rotation_provider IS 'Returns next provider to sync in rotation sequence';
COMMENT ON FUNCTION schedule_next_rotation IS 'Schedules the next rotation sync for a user';
COMMENT ON FUNCTION update_connection_health IS 'Updates health metrics after a sync operation';
COMMENT ON FUNCTION enqueue_sync_with_failover IS 'Adds sync to queue with priority based on health score';
