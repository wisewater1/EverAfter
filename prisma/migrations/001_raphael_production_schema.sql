-- St. Raphael Production Schema Migration
-- Creates consent-aware health data system with audit trail

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Health data sources (Terra, Apple Health, etc.)
CREATE TABLE IF NOT EXISTS sources (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    external_user_id TEXT NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    expires_at TIMESTAMPTZ,
    scopes TEXT[] DEFAULT '{}',
    connected_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    last_sync_at TIMESTAMPTZ,
    UNIQUE(user_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_sources_user_id ON sources(user_id);

-- Devices (Fitbit, Oura Ring, CGM, etc.)
CREATE TABLE IF NOT EXISTS devices (
    id TEXT PRIMARY KEY,
    source_id TEXT NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
    provider_device_id TEXT NOT NULL,
    name TEXT,
    model TEXT,
    manufacturer TEXT,
    UNIQUE(source_id, provider_device_id)
);

CREATE INDEX IF NOT EXISTS idx_devices_source_id ON devices(source_id);

-- Health metrics (time-series data)
CREATE TABLE IF NOT EXISTS metrics (
    id TEXT PRIMARY KEY,
    source_id TEXT NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
    device_id TEXT REFERENCES devices(id) ON DELETE SET NULL,
    type TEXT NOT NULL,
    ts TIMESTAMPTZ NOT NULL,
    value DOUBLE PRECISION,
    unit TEXT,
    payload JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_metrics_source_type_ts ON metrics(source_id, type, ts);
CREATE INDEX IF NOT EXISTS idx_metrics_ts ON metrics(ts);

-- Consent records (for data usage)
CREATE TABLE IF NOT EXISTS consents (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    purpose TEXT NOT NULL,
    expires_at TIMESTAMPTZ,
    interaction_cap INTEGER,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_consents_user_purpose ON consents(user_id, purpose);

-- Engram entries (vault memories from Raphael)
CREATE TABLE IF NOT EXISTS engram_entries (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kind TEXT NOT NULL,
    text TEXT NOT NULL,
    tags TEXT[] DEFAULT '{}',
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_engram_entries_user_kind ON engram_entries(user_id, kind);
CREATE INDEX IF NOT EXISTS idx_engram_entries_created_at ON engram_entries(created_at);

-- Audit logs (compliance trail)
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    provider TEXT,
    snapshot_id TEXT,
    consent_id TEXT,
    sha256 TEXT,
    metadata JSONB,
    ts TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_ts ON audit_logs(user_id, ts);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- Emergency contacts
CREATE TABLE IF NOT EXISTS emergency_contacts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    relation TEXT
);

CREATE INDEX IF NOT EXISTS idx_emergency_contacts_user_id ON emergency_contacts(user_id);

-- Agent runs (execution trace)
CREATE TABLE IF NOT EXISTS agent_runs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    agent_id TEXT NOT NULL,
    status TEXT NOT NULL,
    tokens_used INTEGER DEFAULT 0,
    cost_cents INTEGER DEFAULT 0,
    steps JSONB,
    error TEXT,
    started_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_agent_runs_user_agent_started ON agent_runs(user_id, agent_id, started_at);
