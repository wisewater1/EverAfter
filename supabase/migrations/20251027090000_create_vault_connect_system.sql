/*
  # Create Vault Connect System

  A comprehensive system for managing secure connections between users and
  trusted legacy partners (estate planning, insurance, funeral services, etc.)

  ## Overview
  This migration creates the infrastructure for the Vault Connect API, enabling
  users to securely share their encrypted Engrams and digital legacy data with
  verified partner organizations.

  ## New Tables

  1. `vault_partners`
     - Stores verified partner organizations
     - Includes trust scores, verification status, and contact information
     - Partners can be estate planners, insurance companies, funeral homes, etc.

  2. `vault_connections`
     - Manages user connections with partners
     - Tracks connection status, permissions, and data sharing levels
     - Includes encryption key management and expiry handling

  3. `vault_connection_logs`
     - Audit trail for all connection activities
     - Tracks data access, sync events, and status changes

  ## Security Features
  - Row Level Security (RLS) enabled on all tables
  - Users can only see their own connections
  - Partners table is read-only for users
  - Comprehensive audit logging
  - Encryption key hash storage (not the actual keys)

  ## Data Sharing Levels
  - **basic**: Name, contact info only
  - **standard**: Basic + engram summaries
  - **full**: All data including detailed engrams and documents
*/

-- ============================================================================
-- TABLE: vault_partners
-- ============================================================================

CREATE TABLE IF NOT EXISTS vault_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(name) > 0 AND length(name) <= 255),
  category text NOT NULL CHECK (category IN ('estate_planning', 'insurance', 'funeral_services', 'legal', 'financial')),
  description text NOT NULL CHECK (length(description) <= 1000),
  logo_url text,
  website_url text,
  contact_email text NOT NULL CHECK (contact_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  contact_phone text,
  is_verified boolean NOT NULL DEFAULT false,
  trust_score integer NOT NULL DEFAULT 0 CHECK (trust_score >= 0 AND trust_score <= 100),
  api_endpoint text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for vault_partners
CREATE INDEX IF NOT EXISTS idx_vault_partners_category ON vault_partners(category);
CREATE INDEX IF NOT EXISTS idx_vault_partners_verified ON vault_partners(is_verified);
CREATE INDEX IF NOT EXISTS idx_vault_partners_trust_score ON vault_partners(trust_score DESC);
CREATE INDEX IF NOT EXISTS idx_vault_partners_name ON vault_partners USING gin(to_tsvector('english', name));

-- ============================================================================
-- TABLE: vault_connections
-- ============================================================================

CREATE TABLE IF NOT EXISTS vault_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  partner_id uuid NOT NULL REFERENCES vault_partners(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'revoked')),
  data_sharing_level text NOT NULL DEFAULT 'standard' CHECK (data_sharing_level IN ('basic', 'standard', 'full')),
  encryption_key_hash text NOT NULL,
  permissions text[] NOT NULL DEFAULT ARRAY[]::text[],
  connected_at timestamptz,
  expires_at timestamptz,
  last_sync_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, partner_id, status) WHERE status != 'revoked'
);

-- Indexes for vault_connections
CREATE INDEX IF NOT EXISTS idx_vault_connections_user ON vault_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_vault_connections_partner ON vault_connections(partner_id);
CREATE INDEX IF NOT EXISTS idx_vault_connections_status ON vault_connections(status);
CREATE INDEX IF NOT EXISTS idx_vault_connections_expires ON vault_connections(expires_at) WHERE expires_at IS NOT NULL;

-- ============================================================================
-- TABLE: vault_connection_logs
-- ============================================================================

CREATE TABLE IF NOT EXISTS vault_connection_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid NOT NULL REFERENCES vault_connections(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  partner_id uuid NOT NULL REFERENCES vault_partners(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('created', 'activated', 'suspended', 'revoked', 'data_shared', 'synced', 'permission_updated')),
  event_details jsonb DEFAULT '{}'::jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for vault_connection_logs
CREATE INDEX IF NOT EXISTS idx_vault_connection_logs_connection ON vault_connection_logs(connection_id);
CREATE INDEX IF NOT EXISTS idx_vault_connection_logs_user ON vault_connection_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_vault_connection_logs_event ON vault_connection_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_vault_connection_logs_created ON vault_connection_logs(created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS
ALTER TABLE vault_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_connection_logs ENABLE ROW LEVEL SECURITY;

-- vault_partners policies (read-only for all authenticated users)
CREATE POLICY "Authenticated users can view verified partners"
  ON vault_partners FOR SELECT
  TO authenticated
  USING (is_verified = true);

-- vault_connections policies
CREATE POLICY "Users can view own connections"
  ON vault_connections FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own connections"
  ON vault_connections FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own connections"
  ON vault_connections FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own connections"
  ON vault_connections FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- vault_connection_logs policies
CREATE POLICY "Users can view own connection logs"
  ON vault_connection_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert connection logs"
  ON vault_connection_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_vault_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for vault_partners
DROP TRIGGER IF EXISTS update_vault_partners_updated_at ON vault_partners;
CREATE TRIGGER update_vault_partners_updated_at
  BEFORE UPDATE ON vault_partners
  FOR EACH ROW
  EXECUTE FUNCTION update_vault_updated_at();

-- Trigger for vault_connections
DROP TRIGGER IF EXISTS update_vault_connections_updated_at ON vault_connections;
CREATE TRIGGER update_vault_connections_updated_at
  BEFORE UPDATE ON vault_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_vault_updated_at();

-- Function to log connection events
CREATE OR REPLACE FUNCTION log_vault_connection_event()
RETURNS TRIGGER AS $$
DECLARE
  event_type_val text;
BEGIN
  -- Determine event type
  IF TG_OP = 'INSERT' THEN
    event_type_val := 'created';
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status != NEW.status THEN
      event_type_val := NEW.status; -- 'activated', 'suspended', 'revoked'
    ELSIF OLD.permissions != NEW.permissions THEN
      event_type_val := 'permission_updated';
    ELSIF OLD.last_sync_at != NEW.last_sync_at THEN
      event_type_val := 'synced';
    ELSE
      RETURN NEW; -- No logging for other updates
    END IF;
  ELSE
    RETURN NEW;
  END IF;

  -- Insert log entry
  INSERT INTO vault_connection_logs (
    connection_id,
    user_id,
    partner_id,
    event_type,
    event_details
  ) VALUES (
    COALESCE(NEW.id, OLD.id),
    COALESCE(NEW.user_id, OLD.user_id),
    COALESCE(NEW.partner_id, OLD.partner_id),
    event_type_val,
    jsonb_build_object(
      'old_status', OLD.status,
      'new_status', NEW.status,
      'data_sharing_level', NEW.data_sharing_level
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for automatic connection logging
DROP TRIGGER IF EXISTS log_vault_connection_event_trigger ON vault_connections;
CREATE TRIGGER log_vault_connection_event_trigger
  AFTER INSERT OR UPDATE ON vault_connections
  FOR EACH ROW
  EXECUTE FUNCTION log_vault_connection_event();

-- Function to check and expire connections
CREATE OR REPLACE FUNCTION expire_vault_connections()
RETURNS void AS $$
BEGIN
  UPDATE vault_connections
  SET status = 'revoked',
      updated_at = now()
  WHERE status = 'active'
    AND expires_at IS NOT NULL
    AND expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- SEED DATA - Sample Verified Partners
-- ============================================================================

INSERT INTO vault_partners (name, category, description, contact_email, is_verified, trust_score, website_url, metadata) VALUES
  (
    'Legacy Trust Partners',
    'estate_planning',
    'Secure encrypted data sharing with verified partners for seamless legacy execution and estate management.',
    'contact@legacytrustpartners.com',
    true,
    95,
    'https://legacytrustpartners.com',
    '{"certifications": ["ISO 27001", "SOC 2"], "years_in_business": 15}'::jsonb
  ),
  (
    'Eternal Care Insurance',
    'insurance',
    'Secure encrypted data sharing with verified partners for seamless legacy execution and estate management.',
    'support@eternalcareinsurance.com',
    true,
    92,
    'https://eternalcareinsurance.com',
    '{"coverage_types": ["life", "legacy", "estate"], "policies_managed": 50000}'::jsonb
  ),
  (
    'Memorial Services Network',
    'funeral_services',
    'Secure encrypted data sharing with verified partners for seamless legacy execution and estate management.',
    'hello@memorialservicesnetwork.com',
    true,
    88,
    'https://memorialservicesnetwork.com',
    '{"locations": 250, "services": ["burial", "cremation", "memorial planning"]}'::jsonb
  )
ON CONFLICT DO NOTHING;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE vault_partners IS 'Verified partner organizations for secure legacy data sharing';
COMMENT ON TABLE vault_connections IS 'User connections with legacy partners, including permissions and encryption keys';
COMMENT ON TABLE vault_connection_logs IS 'Audit trail for all connection events and data access';

COMMENT ON COLUMN vault_partners.trust_score IS 'Calculated trust score (0-100) based on verification, certifications, and user feedback';
COMMENT ON COLUMN vault_connections.encryption_key_hash IS 'SHA-256 hash of the encryption key (not the key itself)';
COMMENT ON COLUMN vault_connections.data_sharing_level IS 'Level of data shared: basic (contact only), standard (+ engram summaries), full (all data)';
COMMENT ON COLUMN vault_connections.expires_at IS 'Optional expiry date for temporary connections';
