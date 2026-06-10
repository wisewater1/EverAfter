/*
  # Comprehensive Schema Fix

  Fixes multiple 400/406 errors by ensuring all required tables, columns,
  RLS policies, and functions exist.
*/

-- ============================================================================
-- 1. ENGRAMS TABLE - Ensure exists with proper structure
-- ============================================================================
CREATE TABLE IF NOT EXISTS engrams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  engram_type text DEFAULT 'custom',
  description text,
  ai_activated boolean DEFAULT false,
  personality_data jsonb DEFAULT '{}'::jsonb,
  voice_settings jsonb DEFAULT '{}'::jsonb,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE engrams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own engrams" ON engrams;
CREATE POLICY "Users can view own engrams"
  ON engrams FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can create own engrams" ON engrams;
CREATE POLICY "Users can create own engrams"
  ON engrams FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own engrams" ON engrams;
CREATE POLICY "Users can update own engrams"
  ON engrams FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can delete own engrams" ON engrams;
CREATE POLICY "Users can delete own engrams"
  ON engrams FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- ============================================================================
-- 2. ANALYTICS_ROTATION_STATE TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS analytics_rotation_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_index integer DEFAULT 0,
  rotation_order jsonb DEFAULT '[]'::jsonb,
  last_rotated_at timestamptz DEFAULT now(),
  auto_rotate boolean DEFAULT true,
  rotation_interval_seconds integer DEFAULT 30,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT unique_analytics_rotation_user UNIQUE (user_id)
);

ALTER TABLE analytics_rotation_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own analytics rotation" ON analytics_rotation_state;
CREATE POLICY "Users can view own analytics rotation"
  ON analytics_rotation_state FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can manage own analytics rotation" ON analytics_rotation_state;
CREATE POLICY "Users can manage own analytics rotation"
  ON analytics_rotation_state FOR ALL
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- ============================================================================
-- 3. DASHBOARD_AUTO_ROTATION TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS dashboard_auto_rotation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  enabled boolean DEFAULT true,
  interval_seconds integer DEFAULT 30,
  current_widget_index integer DEFAULT 0,
  widget_order jsonb DEFAULT '["health_metrics", "activity", "sleep", "heart_rate", "nutrition"]'::jsonb,
  last_rotation_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT unique_dashboard_rotation_user UNIQUE (user_id)
);

ALTER TABLE dashboard_auto_rotation ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own dashboard rotation" ON dashboard_auto_rotation;
CREATE POLICY "Users can view own dashboard rotation"
  ON dashboard_auto_rotation FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can manage own dashboard rotation" ON dashboard_auto_rotation;
CREATE POLICY "Users can manage own dashboard rotation"
  ON dashboard_auto_rotation FOR ALL
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- ============================================================================
-- 4. HEALTH_CONNECTIONS TABLE - Ensure all columns exist
-- ============================================================================
CREATE TABLE IF NOT EXISTS health_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text,
  service_name text,
  service_type text,
  status text DEFAULT 'pending',
  sync_frequency text DEFAULT 'daily',
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  external_user_id text,
  last_sync_at timestamptz,
  sync_error text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'health_connections' AND column_name = 'provider') THEN
    ALTER TABLE health_connections ADD COLUMN provider text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'health_connections' AND column_name = 'service_name') THEN
    ALTER TABLE health_connections ADD COLUMN service_name text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'health_connections' AND column_name = 'service_type') THEN
    ALTER TABLE health_connections ADD COLUMN service_type text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'health_connections' AND column_name = 'status') THEN
    ALTER TABLE health_connections ADD COLUMN status text DEFAULT 'pending';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'health_connections' AND column_name = 'sync_frequency') THEN
    ALTER TABLE health_connections ADD COLUMN sync_frequency text DEFAULT 'daily';
  END IF;
END $$;

ALTER TABLE health_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own health connections" ON health_connections;
CREATE POLICY "Users can view own health connections"
  ON health_connections FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can create own health connections" ON health_connections;
CREATE POLICY "Users can create own health connections"
  ON health_connections FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own health connections" ON health_connections;
CREATE POLICY "Users can update own health connections"
  ON health_connections FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can delete own health connections" ON health_connections;
CREATE POLICY "Users can delete own health connections"
  ON health_connections FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- ============================================================================
-- 5. GET_USER_STORAGE_USAGE RPC FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION get_user_storage_usage()
RETURNS TABLE (
  total_bytes bigint,
  file_count integer,
  storage_limit bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := (SELECT auth.uid());

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  SELECT
    COALESCE(SUM(uf.file_size), 0)::bigint AS total_bytes,
    COUNT(uf.id)::integer AS file_count,
    (5368709120)::bigint AS storage_limit  -- 5GB default limit
  FROM public.user_files uf
  WHERE uf.user_id = v_user_id;
END;
$$;

-- Create user_files table if not exists
CREATE TABLE IF NOT EXISTS user_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint DEFAULT 0,
  mime_type text,
  category text DEFAULT 'general',
  storage_bucket text DEFAULT 'user-files',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own files" ON user_files;
CREATE POLICY "Users can view own files"
  ON user_files FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can manage own files" ON user_files;
CREATE POLICY "Users can manage own files"
  ON user_files FOR ALL
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- ============================================================================
-- 6. INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_engrams_user_id ON engrams(user_id);
CREATE INDEX IF NOT EXISTS idx_engrams_name ON engrams(name);
CREATE INDEX IF NOT EXISTS idx_analytics_rotation_state_user_id ON analytics_rotation_state(user_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_auto_rotation_user_id ON dashboard_auto_rotation(user_id);
CREATE INDEX IF NOT EXISTS idx_health_connections_user_id ON health_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_health_connections_provider ON health_connections(provider);
CREATE INDEX IF NOT EXISTS idx_user_files_user_id ON user_files(user_id);

-- ============================================================================
-- 7. COMMENTS
-- ============================================================================
COMMENT ON TABLE engrams IS 'AI personality engrams created by users';
COMMENT ON TABLE analytics_rotation_state IS 'Tracks dashboard analytics widget rotation state';
COMMENT ON TABLE dashboard_auto_rotation IS 'User preferences for dashboard auto-rotation';
COMMENT ON TABLE health_connections IS 'OAuth connections to health data providers';
COMMENT ON TABLE user_files IS 'User uploaded files and documents';
COMMENT ON FUNCTION get_user_storage_usage() IS 'Returns storage usage statistics for authenticated user';
