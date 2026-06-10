-- ═══════════════════════════════════════════════════════════════════
-- Delphi Health Trajectory — Supabase Migration
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. Observations (raw data points) ───────────────────────────────
CREATE TABLE IF NOT EXISTS dht_observations (
    obs_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    person_id       TEXT NOT NULL,
    family_id       TEXT,
    source          TEXT NOT NULL DEFAULT 'manual',
    category        TEXT NOT NULL DEFAULT 'vital',
    metric          TEXT NOT NULL,
    value           TEXT NOT NULL,              -- stored as text; cast to float at query time
    unit            TEXT DEFAULT '',
    recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sync_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    confidence      FLOAT DEFAULT 1.0,
    tags            TEXT[] DEFAULT '{}',
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dht_obs_person   ON dht_observations (person_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_dht_obs_metric   ON dht_observations (person_id, metric, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_dht_obs_family   ON dht_observations (family_id, recorded_at DESC);

-- ── 2. DHT Trajectories (computed, one row per person) ──────────────
CREATE TABLE IF NOT EXISTS dht_trajectories (
    dht_id                  UUID DEFAULT gen_random_uuid(),
    person_id               TEXT PRIMARY KEY,
    family_id               TEXT,
    computed_at             TIMESTAMPTZ DEFAULT NOW(),
    data_freshness_seconds  INTEGER DEFAULT 0,
    observation_count       INTEGER DEFAULT 0,
    data_quality            TEXT DEFAULT 'empty',
    baselines               JSONB DEFAULT '{}',
    rolling_deltas_7d       JSONB DEFAULT '{}',
    rolling_deltas_30d      JSONB DEFAULT '{}',
    variability             JSONB DEFAULT '{}',
    adherence_signals       JSONB DEFAULT '{}',
    trend_breaks            JSONB DEFAULT '[]',
    anomalies               JSONB DEFAULT '[]',
    context_tags            TEXT[] DEFAULT '{}',
    short_term              JSONB,
    mid_term                JSONB,
    long_term               JSONB,
    overall_direction       TEXT DEFAULT 'unknown',
    risk_cards              JSONB DEFAULT '[]',
    leading_indicators      JSONB DEFAULT '[]',
    next_best_measurement   JSONB,
    confidence              FLOAT DEFAULT 0.0,
    uncertainty_lower       FLOAT DEFAULT 0.0,
    uncertainty_upper       FLOAT DEFAULT 1.0,
    saint_notes             TEXT[] DEFAULT '{}',
    ocean_version           INTEGER,
    behavioral_modifiers    JSONB,
    updated_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dht_traj_family ON dht_trajectories (family_id);

-- ── 3. OCEAN Profiles (versioned — immutable per version) ────────────
CREATE TABLE IF NOT EXISTS ocean_profiles (
    profile_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    person_id       TEXT NOT NULL,
    version         INTEGER NOT NULL DEFAULT 1,
    taken_at        TIMESTAMPTZ DEFAULT NOW(),
    scores          JSONB NOT NULL DEFAULT '{"O":50,"C":50,"E":50,"A":50,"N":50}',
    behavioral_modifiers JSONB,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (person_id, version)
);

CREATE INDEX IF NOT EXISTS idx_ocean_person ON ocean_profiles (person_id, version DESC);

-- ── 4. Consent Records (one per person) ─────────────────────────────
CREATE TABLE IF NOT EXISTS dht_consents (
    person_id           TEXT PRIMARY KEY,
    granted_by          TEXT NOT NULL,
    can_view_raw        TEXT[] DEFAULT '{}',
    can_view_summary    TEXT[] DEFAULT '{}',
    can_edit            TEXT[] DEFAULT '{}',
    alert_targets       TEXT[] DEFAULT '{}',
    society_opt_in      BOOLEAN DEFAULT FALSE,
    clinician_access    TEXT[] DEFAULT '{}',
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ── 5. Audit Log ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dht_audit_log (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp       TIMESTAMPTZ DEFAULT NOW(),
    actor_id        TEXT NOT NULL,
    person_id       TEXT NOT NULL,
    action          TEXT NOT NULL,
    data_accessed   TEXT NOT NULL,
    reason          TEXT,
    saint_triggered TEXT
);

CREATE INDEX IF NOT EXISTS idx_dht_audit_person ON dht_audit_log (person_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_dht_audit_actor  ON dht_audit_log (actor_id, timestamp DESC);

-- ── 6. Row-Level Security (RLS) ─────────────────────────────────────
-- Enable RLS on all DHT tables
ALTER TABLE dht_observations    ENABLE ROW LEVEL SECURITY;
ALTER TABLE dht_trajectories    ENABLE ROW LEVEL SECURITY;
ALTER TABLE ocean_profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE dht_consents        ENABLE ROW LEVEL SECURITY;
ALTER TABLE dht_audit_log       ENABLE ROW LEVEL SECURITY;

-- Policy: users can access their own data (backend uses service role key → bypasses RLS)
-- Frontend direct access: user sees only their own person_id rows
CREATE POLICY dht_obs_own    ON dht_observations  FOR ALL USING (person_id = auth.uid()::TEXT);
CREATE POLICY dht_traj_own   ON dht_trajectories  FOR ALL USING (person_id = auth.uid()::TEXT);
CREATE POLICY ocean_own      ON ocean_profiles     FOR ALL USING (person_id = auth.uid()::TEXT);
CREATE POLICY consent_own    ON dht_consents       FOR ALL USING (person_id = auth.uid()::TEXT);
CREATE POLICY audit_own      ON dht_audit_log      FOR ALL USING (person_id = auth.uid()::TEXT);

-- ── 7. Trigger: auto-update updated_at on dht_trajectories ──────────
CREATE OR REPLACE FUNCTION update_dht_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_dht_updated_at ON dht_trajectories;
CREATE TRIGGER trg_dht_updated_at
    BEFORE UPDATE ON dht_trajectories
    FOR EACH ROW EXECUTE FUNCTION update_dht_updated_at();

-- ═══════════════════════════════════════════════════════════════════
-- Migration complete.
-- Tables: dht_observations, dht_trajectories, ocean_profiles,
--         dht_consents, dht_audit_log
-- RLS enabled with per-user policies.
-- ═══════════════════════════════════════════════════════════════════
