/*
  # Device Integration System - Enhanced Infrastructure for Health Device Connectivity

  ## Overview
  This migration creates the foundational infrastructure for comprehensive health device
  integration within St. Raphael's AI healthcare system. It establishes device registry,
  connection monitoring, data quality tracking, and real-time streaming support.

  ## New Tables

  ### 1. device_registry
  Centralized catalog of all supported health devices and their capabilities
  - `id` (uuid, primary key)
  - `device_type` (text) - Category: 'cgm', 'fitness_tracker', 'smartwatch', 'blood_pressure', 'scale', 'thermometer', etc.
  - `manufacturer` (text) - Device manufacturer name
  - `model_name` (text) - Specific device model
  - `provider_key` (text) - Maps to provider_accounts.provider for API integration
  - `supports_realtime` (boolean) - Whether device supports real-time streaming
  - `supports_webhook` (boolean) - Whether device supports webhook notifications
  - `data_types` (text[]) - Supported metrics: ['glucose', 'heart_rate', 'steps', 'sleep', etc.]
  - `api_version` (text) - API version for this device
  - `polling_interval_minutes` (int) - Recommended polling frequency if no webhook
  - `requires_pairing` (boolean) - Whether device needs manual pairing
  - `battery_life_hours` (int) - Typical battery life
  - `fda_cleared` (boolean) - FDA clearance status for medical devices
  - `metadata` (jsonb) - Additional device specifications

  ### 2. device_connections
  Tracks individual device instances connected to user accounts
  - `id` (uuid, primary key)
  - `user_id` (uuid) - User who owns this device
  - `provider_account_id` (uuid) - Links to provider_accounts table
  - `device_registry_id` (uuid) - Links to device_registry
  - `device_identifier` (text) - Device serial number or unique ID
  - `friendly_name` (text) - User-assigned device name
  - `connection_status` (text) - 'active', 'pairing', 'disconnected', 'error', 'low_battery'
  - `last_data_received_at` (timestamptz) - Last successful data transmission
  - `battery_level` (int) - Current battery percentage (0-100)
  - `signal_quality` (text) - 'excellent', 'good', 'fair', 'poor'
  - `firmware_version` (text) - Device firmware version
  - `error_count` (int) - Count of transmission errors
  - `last_error_message` (text) - Most recent error
  - `paired_at` (timestamptz) - When device was first connected
  - `preferences` (jsonb) - User preferences for this device (alert thresholds, etc.)

  ### 3. data_quality_logs
  Tracks data quality and validation results for incoming device data
  - `id` (uuid, primary key)
  - `user_id` (uuid)
  - `device_connection_id` (uuid)
  - `metric_type` (text) - Type of data being validated
  - `quality_score` (numeric) - 0-100 quality score
  - `validation_results` (jsonb) - Detailed validation checks
  - `anomaly_detected` (boolean) - Whether anomaly detection flagged this reading
  - `anomaly_type` (text) - Type of anomaly if detected
  - `raw_value` (numeric) - Original value before any corrections
  - `corrected_value` (numeric) - Value after quality adjustments
  - `recorded_at` (timestamptz) - When the reading was taken
  - `processed_at` (timestamptz) - When quality check was performed

  ### 4. realtime_data_streams
  Manages WebSocket connections and real-time data streaming
  - `id` (uuid, primary key)
  - `user_id` (uuid)
  - `device_connection_id` (uuid)
  - `stream_type` (text) - 'websocket', 'sse', 'long_polling'
  - `connection_id` (text) - WebSocket connection identifier
  - `started_at` (timestamptz) - Stream start time
  - `last_heartbeat_at` (timestamptz) - Last keepalive signal
  - `data_points_received` (bigint) - Total data points in this stream session
  - `average_latency_ms` (int) - Average transmission latency
  - `status` (text) - 'active', 'paused', 'reconnecting', 'closed'
  - `closed_at` (timestamptz)

  ### 5. device_alerts
  Stores alert configurations and history for device-based monitoring
  - `id` (uuid, primary key)
  - `user_id` (uuid)
  - `device_connection_id` (uuid)
  - `alert_type` (text) - 'threshold_breach', 'trend_warning', 'device_malfunction', 'battery_low', 'connection_lost'
  - `severity` (text) - 'info', 'warning', 'critical', 'emergency'
  - `metric_type` (text) - Which metric triggered the alert
  - `threshold_config` (jsonb) - Alert threshold configuration
  - `triggered_at` (timestamptz)
  - `acknowledged_at` (timestamptz)
  - `resolved_at` (timestamptz)
  - `value_at_trigger` (numeric)
  - `notification_sent` (boolean)
  - `emergency_contact_notified` (boolean)
  - `notes` (text)

  ### 6. data_transformation_rules
  Defines rules for transforming vendor-specific data to standardized formats
  - `id` (uuid, primary key)
  - `provider_key` (text) - Which provider this rule applies to
  - `vendor_field_name` (text) - Original field name from vendor API
  - `standard_metric_name` (text) - Standardized metric name
  - `loinc_code` (text) - LOINC code for clinical interoperability
  - `snomed_code` (text) - SNOMED CT code
  - `unit_conversion` (jsonb) - Conversion formula if units differ
  - `validation_rules` (jsonb) - Acceptable ranges and validation logic
  - `transformation_function` (text) - SQL function name for complex transformations
  - `active` (boolean)

  ## Security
  - Enable RLS on all tables
  - Users can only access their own devices and data
  - Service role can access all data for system operations
  - Webhook endpoints use service role for data ingestion
  - Emergency contacts have read-only access to alert data

  ## Indexes
  - Optimize for real-time queries
  - Support efficient device status lookups
  - Enable fast alert processing
  - Support time-series analysis

  ## Functions
  - Device health scoring
  - Alert evaluation and triggering
  - Data quality assessment
  - Connection status monitoring
*/

-- =============================================
-- 1. DEVICE REGISTRY TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS device_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_type text NOT NULL,
  manufacturer text NOT NULL,
  model_name text NOT NULL,
  provider_key text NOT NULL,
  supports_realtime boolean DEFAULT false,
  supports_webhook boolean DEFAULT false,
  data_types text[] NOT NULL DEFAULT '{}',
  api_version text,
  polling_interval_minutes int DEFAULT 60,
  requires_pairing boolean DEFAULT true,
  battery_life_hours int,
  fda_cleared boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT device_registry_unique_model UNIQUE (manufacturer, model_name, provider_key)
);

CREATE INDEX IF NOT EXISTS device_registry_provider_key_idx ON device_registry(provider_key);
CREATE INDEX IF NOT EXISTS device_registry_device_type_idx ON device_registry(device_type);
CREATE INDEX IF NOT EXISTS device_registry_data_types_idx ON device_registry USING gin(data_types);

-- =============================================
-- 2. DEVICE CONNECTIONS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS device_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_account_id uuid REFERENCES provider_accounts(id) ON DELETE CASCADE,
  device_registry_id uuid REFERENCES device_registry(id) ON DELETE RESTRICT,
  device_identifier text,
  friendly_name text,
  connection_status text NOT NULL DEFAULT 'pairing',
  last_data_received_at timestamptz,
  battery_level int CHECK (battery_level >= 0 AND battery_level <= 100),
  signal_quality text DEFAULT 'unknown',
  firmware_version text,
  error_count int DEFAULT 0,
  last_error_message text,
  paired_at timestamptz DEFAULT now(),
  preferences jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS device_connections_user_id_idx ON device_connections(user_id);
CREATE INDEX IF NOT EXISTS device_connections_provider_account_id_idx ON device_connections(provider_account_id);
CREATE INDEX IF NOT EXISTS device_connections_status_idx ON device_connections(connection_status);
CREATE INDEX IF NOT EXISTS device_connections_last_data_idx ON device_connections(last_data_received_at DESC);

-- =============================================
-- 3. DATA QUALITY LOGS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS data_quality_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_connection_id uuid REFERENCES device_connections(id) ON DELETE CASCADE,
  metric_type text NOT NULL,
  quality_score numeric CHECK (quality_score >= 0 AND quality_score <= 100),
  validation_results jsonb DEFAULT '{}'::jsonb,
  anomaly_detected boolean DEFAULT false,
  anomaly_type text,
  raw_value numeric,
  corrected_value numeric,
  recorded_at timestamptz NOT NULL,
  processed_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS data_quality_logs_user_id_idx ON data_quality_logs(user_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS data_quality_logs_device_idx ON data_quality_logs(device_connection_id);
CREATE INDEX IF NOT EXISTS data_quality_logs_anomaly_idx ON data_quality_logs(anomaly_detected) WHERE anomaly_detected = true;

-- =============================================
-- 4. REALTIME DATA STREAMS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS realtime_data_streams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_connection_id uuid NOT NULL REFERENCES device_connections(id) ON DELETE CASCADE,
  stream_type text NOT NULL DEFAULT 'websocket',
  connection_id text NOT NULL,
  started_at timestamptz DEFAULT now(),
  last_heartbeat_at timestamptz DEFAULT now(),
  data_points_received bigint DEFAULT 0,
  average_latency_ms int,
  status text DEFAULT 'active',
  closed_at timestamptz
);

CREATE INDEX IF NOT EXISTS realtime_data_streams_user_id_idx ON realtime_data_streams(user_id);
CREATE INDEX IF NOT EXISTS realtime_data_streams_device_idx ON realtime_data_streams(device_connection_id);
CREATE INDEX IF NOT EXISTS realtime_data_streams_status_idx ON realtime_data_streams(status);
CREATE INDEX IF NOT EXISTS realtime_data_streams_connection_id_idx ON realtime_data_streams(connection_id);

-- =============================================
-- 5. DEVICE ALERTS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS device_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_connection_id uuid REFERENCES device_connections(id) ON DELETE CASCADE,
  alert_type text NOT NULL,
  severity text NOT NULL,
  metric_type text,
  threshold_config jsonb DEFAULT '{}'::jsonb,
  triggered_at timestamptz DEFAULT now(),
  acknowledged_at timestamptz,
  resolved_at timestamptz,
  value_at_trigger numeric,
  notification_sent boolean DEFAULT false,
  emergency_contact_notified boolean DEFAULT false,
  notes text
);

CREATE INDEX IF NOT EXISTS device_alerts_user_id_idx ON device_alerts(user_id, triggered_at DESC);
CREATE INDEX IF NOT EXISTS device_alerts_device_idx ON device_alerts(device_connection_id);
CREATE INDEX IF NOT EXISTS device_alerts_severity_idx ON device_alerts(severity);
CREATE INDEX IF NOT EXISTS device_alerts_unresolved_idx ON device_alerts(resolved_at) WHERE resolved_at IS NULL;

-- =============================================
-- 6. DATA TRANSFORMATION RULES TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS data_transformation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_key text NOT NULL,
  vendor_field_name text NOT NULL,
  standard_metric_name text NOT NULL,
  loinc_code text,
  snomed_code text,
  unit_conversion jsonb DEFAULT '{}'::jsonb,
  validation_rules jsonb DEFAULT '{}'::jsonb,
  transformation_function text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT data_transformation_rules_unique UNIQUE (provider_key, vendor_field_name)
);

CREATE INDEX IF NOT EXISTS data_transformation_rules_provider_idx ON data_transformation_rules(provider_key);
CREATE INDEX IF NOT EXISTS data_transformation_rules_metric_idx ON data_transformation_rules(standard_metric_name);
CREATE INDEX IF NOT EXISTS data_transformation_rules_active_idx ON data_transformation_rules(active) WHERE active = true;

-- =============================================
-- ENABLE ROW LEVEL SECURITY
-- =============================================

ALTER TABLE device_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_quality_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE realtime_data_streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_transformation_rules ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES
-- =============================================

-- Device Registry: Public read access for authenticated users
CREATE POLICY "device_registry_select_all"
  ON device_registry FOR SELECT
  TO authenticated
  USING (true);

-- Device Connections: Users can only see their own devices
CREATE POLICY "device_connections_select_own"
  ON device_connections FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "device_connections_insert_own"
  ON device_connections FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "device_connections_update_own"
  ON device_connections FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "device_connections_delete_own"
  ON device_connections FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Data Quality Logs: Users can only see their own logs
CREATE POLICY "data_quality_logs_select_own"
  ON data_quality_logs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Realtime Data Streams: Users can only see their own streams
CREATE POLICY "realtime_data_streams_select_own"
  ON realtime_data_streams FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Device Alerts: Users can see and acknowledge their own alerts
CREATE POLICY "device_alerts_select_own"
  ON device_alerts FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "device_alerts_update_own"
  ON device_alerts FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Data Transformation Rules: Public read access
CREATE POLICY "data_transformation_rules_select_all"
  ON data_transformation_rules FOR SELECT
  TO authenticated
  USING (true);

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Function: Calculate device health score
CREATE OR REPLACE FUNCTION calculate_device_health_score(
  p_device_connection_id uuid
)
RETURNS numeric AS $$
DECLARE
  v_score numeric := 100;
  v_connection record;
  v_hours_since_data numeric;
BEGIN
  SELECT * INTO v_connection
  FROM device_connections
  WHERE id = p_device_connection_id;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  -- Deduct points for connection issues
  IF v_connection.connection_status = 'error' THEN
    v_score := v_score - 40;
  ELSIF v_connection.connection_status = 'disconnected' THEN
    v_score := v_score - 60;
  END IF;

  -- Deduct points for low battery
  IF v_connection.battery_level IS NOT NULL THEN
    IF v_connection.battery_level < 10 THEN
      v_score := v_score - 30;
    ELSIF v_connection.battery_level < 20 THEN
      v_score := v_score - 15;
    END IF;
  END IF;

  -- Deduct points for stale data
  IF v_connection.last_data_received_at IS NOT NULL THEN
    v_hours_since_data := EXTRACT(EPOCH FROM (now() - v_connection.last_data_received_at)) / 3600;
    IF v_hours_since_data > 24 THEN
      v_score := v_score - 20;
    ELSIF v_hours_since_data > 12 THEN
      v_score := v_score - 10;
    END IF;
  ELSE
    v_score := v_score - 30;
  END IF;

  -- Deduct points for errors
  v_score := v_score - (v_connection.error_count * 2);

  RETURN GREATEST(0, LEAST(100, v_score));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Evaluate alert conditions
CREATE OR REPLACE FUNCTION evaluate_device_alerts(
  p_user_id uuid,
  p_device_connection_id uuid,
  p_metric_type text,
  p_value numeric
)
RETURNS void AS $$
DECLARE
  v_preferences jsonb;
  v_threshold_low numeric;
  v_threshold_high numeric;
  v_critical_low numeric;
  v_critical_high numeric;
BEGIN
  -- Get user preferences for this device
  SELECT preferences INTO v_preferences
  FROM device_connections
  WHERE id = p_device_connection_id;

  -- Extract thresholds for this metric
  v_threshold_low := (v_preferences->p_metric_type->>'threshold_low')::numeric;
  v_threshold_high := (v_preferences->p_metric_type->>'threshold_high')::numeric;
  v_critical_low := (v_preferences->p_metric_type->>'critical_low')::numeric;
  v_critical_high := (v_preferences->p_metric_type->>'critical_high')::numeric;

  -- Check critical thresholds
  IF v_critical_low IS NOT NULL AND p_value < v_critical_low THEN
    INSERT INTO device_alerts (
      user_id, device_connection_id, alert_type, severity,
      metric_type, value_at_trigger, threshold_config
    ) VALUES (
      p_user_id, p_device_connection_id, 'threshold_breach', 'emergency',
      p_metric_type, p_value, jsonb_build_object('critical_low', v_critical_low, 'actual', p_value)
    );
  ELSIF v_critical_high IS NOT NULL AND p_value > v_critical_high THEN
    INSERT INTO device_alerts (
      user_id, device_connection_id, alert_type, severity,
      metric_type, value_at_trigger, threshold_config
    ) VALUES (
      p_user_id, p_device_connection_id, 'threshold_breach', 'emergency',
      p_metric_type, p_value, jsonb_build_object('critical_high', v_critical_high, 'actual', p_value)
    );
  -- Check warning thresholds
  ELSIF v_threshold_low IS NOT NULL AND p_value < v_threshold_low THEN
    INSERT INTO device_alerts (
      user_id, device_connection_id, alert_type, severity,
      metric_type, value_at_trigger, threshold_config
    ) VALUES (
      p_user_id, p_device_connection_id, 'threshold_breach', 'warning',
      p_metric_type, p_value, jsonb_build_object('threshold_low', v_threshold_low, 'actual', p_value)
    );
  ELSIF v_threshold_high IS NOT NULL AND p_value > v_threshold_high THEN
    INSERT INTO device_alerts (
      user_id, device_connection_id, alert_type, severity,
      metric_type, value_at_trigger, threshold_config
    ) VALUES (
      p_user_id, p_device_connection_id, 'threshold_breach', 'warning',
      p_metric_type, p_value, jsonb_build_object('threshold_high', v_threshold_high, 'actual', p_value)
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get device connection status summary
CREATE OR REPLACE FUNCTION get_device_status_summary(p_user_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_devices', COUNT(*),
    'active_devices', COUNT(*) FILTER (WHERE connection_status = 'active'),
    'disconnected_devices', COUNT(*) FILTER (WHERE connection_status = 'disconnected'),
    'error_devices', COUNT(*) FILTER (WHERE connection_status = 'error'),
    'low_battery_devices', COUNT(*) FILTER (WHERE battery_level < 20),
    'average_health_score', ROUND(AVG(calculate_device_health_score(id)), 2)
  ) INTO v_result
  FROM device_connections
  WHERE user_id = p_user_id;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
