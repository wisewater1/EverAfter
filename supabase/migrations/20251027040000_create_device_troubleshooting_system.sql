/*
  # Create Device Troubleshooting System

  1. New Tables
    - `device_troubleshooting_guides`
      - Comprehensive troubleshooting guides for all connectable devices
      - Step-by-step instructions with priorities
      - Device-specific and general diagnostics

    - `troubleshooting_sessions`
      - Track user troubleshooting attempts
      - Record which steps were tried
      - Capture success/failure outcomes

    - `troubleshooting_steps`
      - Individual troubleshooting steps
      - Ordered by priority and effectiveness
      - Links to guides with success rates

    - `device_diagnostics_log`
      - Automated diagnostic test results
      - Real-time connectivity checks
      - Historical troubleshooting data

    - `troubleshooting_ai_context`
      - AI assistant context for device issues
      - Common patterns and solutions
      - User-specific troubleshooting history

  2. Security
    - Enable RLS on all tables
    - Users can only access their own troubleshooting data
    - Guides are publicly readable for authenticated users

  3. Functions
    - `run_device_diagnostics()` - Automated connectivity testing
    - `get_troubleshooting_guide()` - Fetch appropriate guide
    - `log_troubleshooting_attempt()` - Track user actions
    - `get_ai_troubleshooting_context()` - Context for AI assistant
*/

-- Device Troubleshooting Guides
CREATE TABLE IF NOT EXISTS device_troubleshooting_guides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_type text NOT NULL,
  device_name text NOT NULL,
  manufacturer text NOT NULL,
  issue_category text NOT NULL,
  issue_title text NOT NULL,
  severity text NOT NULL DEFAULT 'medium',
  guide_content jsonb NOT NULL,
  success_rate numeric(5,2) DEFAULT 0,
  total_attempts integer DEFAULT 0,
  avg_resolution_time_minutes integer DEFAULT 0,
  requires_support boolean DEFAULT false,
  tags text[] DEFAULT ARRAY[]::text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_guides_device_type ON device_troubleshooting_guides(device_type);
CREATE INDEX IF NOT EXISTS idx_guides_category ON device_troubleshooting_guides(issue_category);
CREATE INDEX IF NOT EXISTS idx_guides_tags ON device_troubleshooting_guides USING gin(tags);

-- Troubleshooting Steps
CREATE TABLE IF NOT EXISTS troubleshooting_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id uuid REFERENCES device_troubleshooting_guides(id) ON DELETE CASCADE,
  step_number integer NOT NULL,
  step_title text NOT NULL,
  step_description text NOT NULL,
  step_type text NOT NULL,
  action_required text,
  expected_result text,
  troubleshooting_tips text[],
  warning_message text,
  success_rate numeric(5,2) DEFAULT 0,
  avg_completion_time_seconds integer DEFAULT 60,
  requires_device_access boolean DEFAULT false,
  requires_app_restart boolean DEFAULT false,
  requires_device_restart boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_steps_guide ON troubleshooting_steps(guide_id, step_number);

-- Troubleshooting Sessions
CREATE TABLE IF NOT EXISTS troubleshooting_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  device_connection_id uuid REFERENCES device_connections(id) ON DELETE SET NULL,
  guide_id uuid REFERENCES device_troubleshooting_guides(id) ON DELETE SET NULL,
  device_type text NOT NULL,
  issue_description text,
  session_status text DEFAULT 'in_progress',
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  resolution_status text,
  steps_completed jsonb DEFAULT '[]'::jsonb,
  steps_skipped jsonb DEFAULT '[]'::jsonb,
  user_notes text,
  ai_assistance_used boolean DEFAULT false,
  support_ticket_created boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON troubleshooting_sessions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_device ON troubleshooting_sessions(device_connection_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON troubleshooting_sessions(session_status);

-- Device Diagnostics Log
CREATE TABLE IF NOT EXISTS device_diagnostics_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  device_connection_id uuid REFERENCES device_connections(id) ON DELETE CASCADE,
  session_id uuid REFERENCES troubleshooting_sessions(id) ON DELETE SET NULL,
  diagnostic_type text NOT NULL,
  test_name text NOT NULL,
  test_result text NOT NULL,
  result_details jsonb,
  error_message text,
  recommendations text[],
  severity text DEFAULT 'info',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_diagnostics_user ON device_diagnostics_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_diagnostics_device ON device_diagnostics_log(device_connection_id);
CREATE INDEX IF NOT EXISTS idx_diagnostics_session ON device_diagnostics_log(session_id);

-- Troubleshooting AI Context
CREATE TABLE IF NOT EXISTS troubleshooting_ai_context (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  device_type text NOT NULL,
  issue_pattern text NOT NULL,
  context_data jsonb NOT NULL,
  resolution_history jsonb DEFAULT '[]'::jsonb,
  success_count integer DEFAULT 0,
  failure_count integer DEFAULT 0,
  last_used_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_context_user ON troubleshooting_ai_context(user_id, device_type);
CREATE INDEX IF NOT EXISTS idx_ai_context_pattern ON troubleshooting_ai_context(issue_pattern);

-- Enable RLS
ALTER TABLE device_troubleshooting_guides ENABLE ROW LEVEL SECURITY;
ALTER TABLE troubleshooting_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE troubleshooting_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_diagnostics_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE troubleshooting_ai_context ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Guides (public read for authenticated)
CREATE POLICY "Authenticated users can view troubleshooting guides"
  ON device_troubleshooting_guides FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for Steps (public read for authenticated)
CREATE POLICY "Authenticated users can view troubleshooting steps"
  ON troubleshooting_steps FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for Sessions
CREATE POLICY "Users can view own troubleshooting sessions"
  ON troubleshooting_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own troubleshooting sessions"
  ON troubleshooting_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own troubleshooting sessions"
  ON troubleshooting_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for Diagnostics Log
CREATE POLICY "Users can view own diagnostics log"
  ON device_diagnostics_log FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own diagnostics log"
  ON device_diagnostics_log FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for AI Context
CREATE POLICY "Users can view own AI troubleshooting context"
  ON troubleshooting_ai_context FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own AI troubleshooting context"
  ON troubleshooting_ai_context FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own AI troubleshooting context"
  ON troubleshooting_ai_context FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Function: Get Troubleshooting Guide
CREATE OR REPLACE FUNCTION get_troubleshooting_guide(
  p_device_type text,
  p_issue_category text DEFAULT NULL
)
RETURNS TABLE (
  guide_id uuid,
  device_type text,
  device_name text,
  issue_title text,
  severity text,
  guide_content jsonb,
  success_rate numeric,
  steps jsonb
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    g.id as guide_id,
    g.device_type,
    g.device_name,
    g.issue_title,
    g.severity,
    g.guide_content,
    g.success_rate,
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'step_number', s.step_number,
          'title', s.step_title,
          'description', s.step_description,
          'type', s.step_type,
          'action_required', s.action_required,
          'expected_result', s.expected_result,
          'tips', s.troubleshooting_tips,
          'warning', s.warning_message,
          'success_rate', s.success_rate
        ) ORDER BY s.step_number
      )
      FROM troubleshooting_steps s
      WHERE s.guide_id = g.id
    ) as steps
  FROM device_troubleshooting_guides g
  WHERE g.device_type = p_device_type
    AND (p_issue_category IS NULL OR g.issue_category = p_issue_category)
  ORDER BY g.success_rate DESC, g.severity DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Run Device Diagnostics
CREATE OR REPLACE FUNCTION run_device_diagnostics(
  p_user_id uuid,
  p_device_connection_id uuid,
  p_session_id uuid DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_device_info record;
  v_diagnostics jsonb;
  v_tests jsonb[] := ARRAY[]::jsonb[];
BEGIN
  -- Get device info
  SELECT * INTO v_device_info
  FROM device_connections
  WHERE id = p_device_connection_id AND user_id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Device connection not found'
    );
  END IF;

  -- Test 1: Connection Status
  v_tests := array_append(v_tests, jsonb_build_object(
    'test_name', 'Connection Status Check',
    'result', CASE
      WHEN v_device_info.status = 'active' THEN 'pass'
      WHEN v_device_info.status = 'error' THEN 'fail'
      ELSE 'warning'
    END,
    'details', jsonb_build_object(
      'current_status', v_device_info.status,
      'last_sync', v_device_info.last_sync_at
    )
  ));

  -- Test 2: Token Validity
  v_tests := array_append(v_tests, jsonb_build_object(
    'test_name', 'Authentication Token Check',
    'result', CASE
      WHEN v_device_info.token_expires_at > now() THEN 'pass'
      WHEN v_device_info.token_expires_at IS NULL THEN 'unknown'
      ELSE 'fail'
    END,
    'details', jsonb_build_object(
      'expires_at', v_device_info.token_expires_at,
      'needs_refresh', v_device_info.token_expires_at < now() + interval '7 days'
    )
  ));

  -- Test 3: Recent Activity
  v_tests := array_append(v_tests, jsonb_build_object(
    'test_name', 'Recent Activity Check',
    'result', CASE
      WHEN v_device_info.last_sync_at > now() - interval '1 hour' THEN 'pass'
      WHEN v_device_info.last_sync_at > now() - interval '24 hours' THEN 'warning'
      ELSE 'fail'
    END,
    'details', jsonb_build_object(
      'last_sync', v_device_info.last_sync_at,
      'hours_since_sync', EXTRACT(epoch FROM (now() - v_device_info.last_sync_at)) / 3600
    )
  ));

  -- Log all diagnostic results
  INSERT INTO device_diagnostics_log (
    user_id, device_connection_id, session_id,
    diagnostic_type, test_name, test_result, result_details
  )
  SELECT
    p_user_id,
    p_device_connection_id,
    p_session_id,
    'automated',
    test->>'test_name',
    test->>'result',
    test->'details'
  FROM unnest(v_tests) AS test;

  RETURN jsonb_build_object(
    'success', true,
    'device_type', v_device_info.device_type,
    'provider', v_device_info.provider,
    'tests', v_tests,
    'overall_status', CASE
      WHEN (SELECT count(*) FROM unnest(v_tests) t WHERE t->>'result' = 'fail') > 0 THEN 'issues_found'
      WHEN (SELECT count(*) FROM unnest(v_tests) t WHERE t->>'result' = 'warning') > 0 THEN 'warnings'
      ELSE 'healthy'
    END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Log Troubleshooting Attempt
CREATE OR REPLACE FUNCTION log_troubleshooting_attempt(
  p_session_id uuid,
  p_step_id uuid,
  p_action text,
  p_result text,
  p_notes text DEFAULT NULL
)
RETURNS boolean AS $$
DECLARE
  v_session record;
BEGIN
  SELECT * INTO v_session FROM troubleshooting_sessions WHERE id = p_session_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Update session with step completion
  UPDATE troubleshooting_sessions
  SET
    steps_completed = steps_completed || jsonb_build_object(
      'step_id', p_step_id,
      'action', p_action,
      'result', p_result,
      'timestamp', now(),
      'notes', p_notes
    ),
    updated_at = now()
  WHERE id = p_session_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get AI Troubleshooting Context
CREATE OR REPLACE FUNCTION get_ai_troubleshooting_context(
  p_user_id uuid,
  p_device_type text
)
RETURNS jsonb AS $$
DECLARE
  v_context jsonb;
BEGIN
  SELECT jsonb_build_object(
    'user_history', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'session_id', id,
          'device_type', device_type,
          'issue', issue_description,
          'resolution', resolution_status,
          'completed_at', completed_at
        ) ORDER BY created_at DESC
      )
      FROM troubleshooting_sessions
      WHERE user_id = p_user_id
        AND device_type = p_device_type
      LIMIT 10
    ),
    'common_issues', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'issue', issue_title,
          'success_rate', success_rate,
          'category', issue_category
        ) ORDER BY success_rate DESC
      )
      FROM device_troubleshooting_guides
      WHERE device_type = p_device_type
      LIMIT 5
    ),
    'recent_diagnostics', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'test', test_name,
          'result', test_result,
          'timestamp', created_at
        ) ORDER BY created_at DESC
      )
      FROM device_diagnostics_log
      WHERE user_id = p_user_id
      LIMIT 20
    )
  ) INTO v_context;

  RETURN v_context;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
