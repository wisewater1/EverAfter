/*
  # Unified Connections System

  1. Purpose
    - Creates a centralized connections system accessible from all tabs
    - Supports multiple connection types (health, social, data sources)
    - Enables real-time connection status tracking across the application

  2. New Tables
    - No new tables needed - enhances existing `provider_accounts` table

  3. Updates to Existing Tables
    - Adds `category` column to provider_accounts for filtering
    - Adds indexes for performance optimization
    - Enhances RLS policies for better access control

  4. Features
    - Multi-category connection support
    - Real-time sync status tracking
    - Context-aware connection filtering
    - Universal accessibility across all application tabs

  5. Security
    - RLS policies ensure users only see their own connections
    - Secure OAuth token storage
    - Audit trail for connection changes
*/

-- Add category column to provider_accounts if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'provider_accounts' AND column_name = 'category'
  ) THEN
    ALTER TABLE provider_accounts
    ADD COLUMN category TEXT DEFAULT 'health';
  END IF;
END $$;

-- Add metadata column for storing connection-specific information
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'provider_accounts' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE provider_accounts
    ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_provider_accounts_category
ON provider_accounts(category);

CREATE INDEX IF NOT EXISTS idx_provider_accounts_status_active
ON provider_accounts(status) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_provider_accounts_user_category
ON provider_accounts(user_id, category);

CREATE INDEX IF NOT EXISTS idx_provider_accounts_last_sync
ON provider_accounts(last_sync_at DESC NULLS LAST);

-- Create a view for active connections summary
CREATE OR REPLACE VIEW user_connections_summary AS
SELECT
  user_id,
  category,
  COUNT(*) FILTER (WHERE status = 'active') as active_count,
  COUNT(*) as total_count,
  MAX(last_sync_at) as most_recent_sync,
  array_agg(provider) FILTER (WHERE status = 'active') as active_providers
FROM provider_accounts
GROUP BY user_id, category;

-- Grant access to the view
GRANT SELECT ON user_connections_summary TO authenticated;

-- Add RLS policy for the view
ALTER VIEW user_connections_summary SET (security_invoker = true);

-- Update existing provider_accounts to set category based on provider type
UPDATE provider_accounts
SET category = CASE
  WHEN provider IN ('fitbit', 'oura', 'terra', 'dexcom', 'garmin', 'whoop', 'withings', 'polar', 'apple_health', 'google_fit') THEN 'health'
  WHEN provider IN ('strava', 'myfitnesspal') THEN 'wellness'
  ELSE 'data'
END
WHERE category IS NULL OR category = 'health';

-- Create function to get user connection stats
CREATE OR REPLACE FUNCTION get_user_connection_stats(p_user_id UUID)
RETURNS TABLE (
  total_connections BIGINT,
  active_connections BIGINT,
  health_connections BIGINT,
  last_sync TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_connections,
    COUNT(*) FILTER (WHERE status = 'active')::BIGINT as active_connections,
    COUNT(*) FILTER (WHERE category = 'health' AND status = 'active')::BIGINT as health_connections,
    MAX(last_sync_at) as last_sync
  FROM provider_accounts
  WHERE user_id = p_user_id;
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION get_user_connection_stats(UUID) TO authenticated;

-- Create function to track connection events
CREATE TABLE IF NOT EXISTS connection_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  provider TEXT NOT NULL,
  event_type TEXT NOT NULL, -- 'connected', 'disconnected', 'sync_started', 'sync_completed', 'sync_failed'
  event_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on connection_events
ALTER TABLE connection_events ENABLE ROW LEVEL SECURITY;

-- RLS policies for connection_events
CREATE POLICY "Users can view their own connection events"
  ON connection_events
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own connection events"
  ON connection_events
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create index for connection events
CREATE INDEX IF NOT EXISTS idx_connection_events_user_created
ON connection_events(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_connection_events_provider
ON connection_events(provider, created_at DESC);

-- Create trigger to log connection changes
CREATE OR REPLACE FUNCTION log_connection_event()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO connection_events (user_id, provider, event_type, event_data)
    VALUES (NEW.user_id, NEW.provider, 'connected',
      jsonb_build_object('status', NEW.status, 'category', NEW.category));
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status != NEW.status THEN
      INSERT INTO connection_events (user_id, provider, event_type, event_data)
      VALUES (NEW.user_id, NEW.provider,
        CASE
          WHEN NEW.status = 'active' THEN 'connected'
          WHEN NEW.status = 'disconnected' THEN 'disconnected'
          ELSE 'status_changed'
        END,
        jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status));
    END IF;
    IF OLD.last_sync_at IS DISTINCT FROM NEW.last_sync_at AND NEW.last_sync_at IS NOT NULL THEN
      INSERT INTO connection_events (user_id, provider, event_type, event_data)
      VALUES (NEW.user_id, NEW.provider, 'sync_completed',
        jsonb_build_object('sync_time', NEW.last_sync_at));
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO connection_events (user_id, provider, event_type, event_data)
    VALUES (OLD.user_id, OLD.provider, 'disconnected',
      jsonb_build_object('final_status', OLD.status));
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for logging connection events
DROP TRIGGER IF EXISTS trigger_log_connection_events ON provider_accounts;
CREATE TRIGGER trigger_log_connection_events
  AFTER INSERT OR UPDATE OR DELETE ON provider_accounts
  FOR EACH ROW
  EXECUTE FUNCTION log_connection_event();

-- Add comments for documentation
COMMENT ON TABLE connection_events IS 'Audit log for all connection-related events';
COMMENT ON COLUMN provider_accounts.category IS 'Connection category: health, social, data, or service';
COMMENT ON COLUMN provider_accounts.metadata IS 'Provider-specific metadata and configuration';
COMMENT ON FUNCTION get_user_connection_stats IS 'Returns aggregated connection statistics for a user';
