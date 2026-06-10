-- Raphael Health Connect API - Database Schema
-- This migration adds tables needed by the API that don't exist in Supabase yet

-- OAuth states table (for CSRF protection)
CREATE TABLE IF NOT EXISTS oauth_states (
  state TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '10 minutes')
);

CREATE INDEX IF NOT EXISTS oauth_states_user_id_idx ON oauth_states(user_id);
CREATE INDEX IF NOT EXISTS oauth_states_expires_at_idx ON oauth_states(expires_at);

-- Devices table (if not exists from previous migrations)
CREATE TABLE IF NOT EXISTS devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES provider_accounts(id) ON DELETE CASCADE,
  provider_device_id TEXT NOT NULL,
  name TEXT,
  model TEXT,
  manufacturer TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(account_id, provider_device_id)
);

CREATE INDEX IF NOT EXISTS devices_account_id_idx ON devices(account_id);

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consent_id UUID REFERENCES consents(id) ON DELETE SET NULL,
  operation TEXT NOT NULL,
  provider TEXT,
  record_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS audit_logs_performed_at_idx ON audit_logs(performed_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_operation_idx ON audit_logs(operation);

-- Cleanup job for expired OAuth states
CREATE OR REPLACE FUNCTION cleanup_expired_oauth_states()
RETURNS void AS $$
BEGIN
  DELETE FROM oauth_states WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Comment explaining the schema
COMMENT ON TABLE oauth_states IS 'Temporary storage for OAuth state parameters (CSRF protection)';
COMMENT ON TABLE devices IS 'Individual health devices and wearables connected through providers';
COMMENT ON TABLE audit_logs IS 'Audit trail for all data access and operations (HIPAA/GDPR compliance)';
