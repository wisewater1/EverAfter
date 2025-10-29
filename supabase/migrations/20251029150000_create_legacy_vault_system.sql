/*
  # Legacy Vault System

  1. New Tables
    - `vault_items` - Core vault storage (capsules, memorials, wills, messages)
      - Type-based storage with JSON payload
      - Encryption key references
      - Unlock rules and scheduling
      - Status tracking through lifecycle

    - `beneficiaries` - Contact registry
      - Email and name storage
      - Reusable across vault items
      - Role assignments per item

    - `beneficiary_links` - Item-beneficiary relationships
      - Many-to-many linking
      - Role-based access (viewer, custodian, executor)
      - Per-item permissions

    - `vault_consents` - Consent tracking
      - Purpose-based consent (export, share, publish)
      - Expiration and interaction caps
      - Audit compliance

    - `vault_audit_logs` - Complete audit trail
      - Every action logged
      - Snapshot and consent references
      - SHA256 hash tracking
      - Immutable record

    - `vault_receipts` - Export/delivery receipts
      - Watermark data
      - Download tracking
      - Integrity verification

  2. Security
    - Enable RLS on all tables
    - User-scoped access policies
    - Custodian and executor roles
    - Encryption at rest

  3. Features
    - Time-based unlocking
    - Event-triggered delivery
    - Role-based access control
    - Audit trail with hashing
    - Receipt generation
*/

-- Enums
DO $$ BEGIN
  CREATE TYPE vault_type AS ENUM ('CAPSULE', 'MEMORIAL', 'WILL', 'MESSAGE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE item_status AS ENUM ('DRAFT', 'SCHEDULED', 'LOCKED', 'PUBLISHED', 'PAUSED', 'SENT', 'ARCHIVED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE unlock_rule AS ENUM ('DATE', 'DEATH_CERT', 'CUSTODIAN_APPROVAL', 'HEARTBEAT_TIMEOUT');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE beneficiary_role AS ENUM ('VIEWER', 'CUSTODIAN', 'EXECUTOR');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Vault Items table
CREATE TABLE IF NOT EXISTS vault_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type vault_type NOT NULL,
  title text NOT NULL,
  slug text UNIQUE,
  status item_status DEFAULT 'DRAFT',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  encryption_key_id text,
  unlock_at timestamptz,
  unlock_rule unlock_rule,
  heartbeat_timeout_days integer,
  is_encrypted boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  published_at timestamptz,
  locked_at timestamptz,
  delivered_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_vault_items_user_type ON vault_items(user_id, type);
CREATE INDEX IF NOT EXISTS idx_vault_items_status ON vault_items(status);
CREATE INDEX IF NOT EXISTS idx_vault_items_unlock ON vault_items(unlock_at) WHERE status = 'SCHEDULED';
CREATE INDEX IF NOT EXISTS idx_vault_items_slug ON vault_items(slug) WHERE slug IS NOT NULL;

-- Beneficiaries table
CREATE TABLE IF NOT EXISTS beneficiaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  email text NOT NULL,
  name text,
  phone text,
  relationship text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, email)
);

CREATE INDEX IF NOT EXISTS idx_beneficiaries_user ON beneficiaries(user_id);
CREATE INDEX IF NOT EXISTS idx_beneficiaries_email ON beneficiaries(email);

-- Beneficiary Links table
CREATE TABLE IF NOT EXISTS beneficiary_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vault_item_id uuid REFERENCES vault_items(id) ON DELETE CASCADE NOT NULL,
  beneficiary_id uuid REFERENCES beneficiaries(id) ON DELETE CASCADE NOT NULL,
  role beneficiary_role DEFAULT 'VIEWER',
  granted_at timestamptz DEFAULT now(),
  accessed_at timestamptz,
  access_count integer DEFAULT 0,
  UNIQUE(vault_item_id, beneficiary_id)
);

CREATE INDEX IF NOT EXISTS idx_beneficiary_links_item ON beneficiary_links(vault_item_id);
CREATE INDEX IF NOT EXISTS idx_beneficiary_links_beneficiary ON beneficiary_links(beneficiary_id);

-- Vault Consents table
CREATE TABLE IF NOT EXISTS vault_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  vault_item_id uuid REFERENCES vault_items(id) ON DELETE CASCADE,
  purpose text NOT NULL,
  scope text[] DEFAULT ARRAY[]::text[],
  granted_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  interaction_cap integer,
  interaction_count integer DEFAULT 0,
  revoked_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_vault_consents_user ON vault_consents(user_id);
CREATE INDEX IF NOT EXISTS idx_vault_consents_item ON vault_consents(vault_item_id);
CREATE INDEX IF NOT EXISTS idx_vault_consents_active ON vault_consents(user_id, purpose)
  WHERE revoked_at IS NULL AND (expires_at IS NULL OR expires_at > now());

-- Vault Audit Logs table
CREATE TABLE IF NOT EXISTS vault_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  vault_item_id uuid REFERENCES vault_items(id) ON DELETE SET NULL,
  action text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  snapshot_id text,
  consent_id uuid REFERENCES vault_consents(id) ON DELETE SET NULL,
  venue_id text,
  sha256 text,
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vault_audit_user ON vault_audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vault_audit_item ON vault_audit_logs(vault_item_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vault_audit_action ON vault_audit_logs(action, created_at DESC);

-- Vault Receipts table
CREATE TABLE IF NOT EXISTS vault_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vault_item_id uuid REFERENCES vault_items(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  receipt_type text NOT NULL,
  snapshot_id text NOT NULL,
  consent_id uuid REFERENCES vault_consents(id) ON DELETE SET NULL,
  venue_id text,
  sha256 text NOT NULL,
  file_url text,
  watermark_data jsonb,
  created_at timestamptz DEFAULT now(),
  downloaded_at timestamptz,
  download_count integer DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_vault_receipts_item ON vault_receipts(vault_item_id);
CREATE INDEX IF NOT EXISTS idx_vault_receipts_user ON vault_receipts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vault_receipts_snapshot ON vault_receipts(snapshot_id);

-- Enable Row Level Security
ALTER TABLE vault_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE beneficiaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE beneficiary_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_receipts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for vault_items
CREATE POLICY "Users can view own vault items"
  ON vault_items FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id OR
    id IN (
      SELECT vault_item_id FROM beneficiary_links bl
      JOIN beneficiaries b ON bl.beneficiary_id = b.id
      WHERE b.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can insert own vault items"
  ON vault_items FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own vault items"
  ON vault_items FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own vault items"
  ON vault_items FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for beneficiaries
CREATE POLICY "Users can view own beneficiaries"
  ON beneficiaries FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own beneficiaries"
  ON beneficiaries FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for beneficiary_links
CREATE POLICY "Users can view links for own items"
  ON beneficiary_links FOR SELECT
  TO authenticated
  USING (
    vault_item_id IN (
      SELECT id FROM vault_items WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage links for own items"
  ON beneficiary_links FOR ALL
  TO authenticated
  USING (
    vault_item_id IN (
      SELECT id FROM vault_items WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    vault_item_id IN (
      SELECT id FROM vault_items WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for vault_consents
CREATE POLICY "Users can view own consents"
  ON vault_consents FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own consents"
  ON vault_consents FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for vault_audit_logs
CREATE POLICY "Users can view own audit logs"
  ON vault_audit_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert audit logs"
  ON vault_audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for vault_receipts
CREATE POLICY "Users can view own receipts"
  ON vault_receipts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can create receipts"
  ON vault_receipts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Triggers
CREATE OR REPLACE FUNCTION update_vault_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER vault_items_updated_at
  BEFORE UPDATE ON vault_items
  FOR EACH ROW
  EXECUTE FUNCTION update_vault_items_updated_at();

-- Function to create audit log
CREATE OR REPLACE FUNCTION log_vault_action()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO vault_audit_logs (user_id, vault_item_id, action, details)
    VALUES (NEW.user_id, NEW.id, 'CREATED', jsonb_build_object('type', NEW.type, 'title', NEW.title));
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO vault_audit_logs (user_id, vault_item_id, action, details)
    VALUES (NEW.user_id, NEW.id, 'UPDATED', jsonb_build_object('status', NEW.status));
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO vault_audit_logs (user_id, vault_item_id, action, details)
    VALUES (OLD.user_id, OLD.id, 'DELETED', jsonb_build_object('type', OLD.type));
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER vault_items_audit
  AFTER INSERT OR UPDATE OR DELETE ON vault_items
  FOR EACH ROW
  EXECUTE FUNCTION log_vault_action();
