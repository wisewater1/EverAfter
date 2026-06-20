-- =============================================================================
-- RLS Audit Sweep
-- =============================================================================
-- The Supabase Security Advisor flagged voice_profiles / voice_samples /
-- voice_training_runs / voice_synth_sessions for "RLS Disabled in Public"
-- (covered by the 20260616120000 migration). The SQLAlchemy backend
-- (backend/app/models/) creates many more tables in the same pattern: no
-- Supabase migration, no RLS, every row visible via the anon key.
--
-- This migration enables RLS and adds owner-only policies on the
-- high-confidence direct-ownership tables that audit script confirmed.
-- Every policy uses (select auth.uid()) per CLAUDE.md so the predicate
-- stays index-friendly. ALTER TABLE IF EXISTS / DROP POLICY IF EXISTS
-- make the migration re-runnable.
--
-- The FastAPI backend uses the service role to write to these tables and
-- bypasses RLS — so backend writes continue to work. Edge Functions that
-- call Supabase with a user JWT will now be RLS-enforced, which is the
-- whole point.
--
-- NOT INCLUDED IN THIS PASS (need follow-up review):
--   - compliance_controls, restore_drills      — no owner column (system-wide)
--   - metrics, devices                          — ownership via sources.userId FK
--   - sources                                   — uses camelCase userId + linked tables
--   - agent_interactions                        — no owner column found
--   - family_events, family_nodes, family_*     — nullable user_id, may be deprecated
--   - bulletin_messages, shopping_items, family_tasks, calendar_events
--                                                — nullable user_id, household-scoped
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Helper: macro-like template the rest of the file follows.
--
-- For each ownership pattern below, every covered table gets:
--   ALTER TABLE IF EXISTS … ENABLE ROW LEVEL SECURITY;
--   four DROP POLICY IF EXISTS / CREATE POLICY blocks
-- with predicates picked from one of:
--
--   user_id (text):       (select auth.uid())::text = user_id
--   user_id (uuid):       (select auth.uid()) = user_id
--   owner_user_id (text): (select auth.uid())::text = owner_user_id
--   owner_user_id (uuid): (select auth.uid()) = owner_user_id
--   userId (text):        (select auth.uid())::text = "userId"
--   via FK:               EXISTS (SELECT 1 FROM parent WHERE parent.id = … AND
--                                   (select auth.uid())::text = parent.user_id)
-- -----------------------------------------------------------------------------


-- =============================================================================
-- PATTERN 1: user_id TEXT
-- =============================================================================

-- bank_connections, bank_imported_transactions, budget_categories,
-- finance_transactions, causal_drift_events, causal_evidence_ledger,
-- causal_experiments, causal_measurement_recommendations, causal_predictions,
-- delphi_trajectories, governance_proposals, governance_protocols

DO $$
DECLARE
    t text;
    tables text[] := ARRAY[
        'bank_connections',
        'bank_imported_transactions',
        'budget_categories',
        'finance_transactions',
        'causal_drift_events',
        'causal_evidence_ledger',
        'causal_experiments',
        'causal_measurement_recommendations',
        'causal_predictions',
        'delphi_trajectories',
        'governance_proposals',
        'governance_protocols'
    ];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t) THEN
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_owner_select', t);
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_owner_insert', t);
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_owner_update', t);
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_owner_delete', t);
            EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING ((select auth.uid())::text = user_id)', t || '_owner_select', t);
            EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK ((select auth.uid())::text = user_id)', t || '_owner_insert', t);
            EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING ((select auth.uid())::text = user_id) WITH CHECK ((select auth.uid())::text = user_id)', t || '_owner_update', t);
            EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING ((select auth.uid())::text = user_id)', t || '_owner_delete', t);
        END IF;
    END LOOP;
END $$;


-- =============================================================================
-- PATTERN 2: owner_user_id TEXT
-- =============================================================================

-- health_prediction_scenarios

DO $$
DECLARE
    t text;
    tables text[] := ARRAY[
        'health_prediction_scenarios'
    ];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t) THEN
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_owner_select', t);
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_owner_insert', t);
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_owner_update', t);
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_owner_delete', t);
            EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING ((select auth.uid())::text = owner_user_id)', t || '_owner_select', t);
            EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK ((select auth.uid())::text = owner_user_id)', t || '_owner_insert', t);
            EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING ((select auth.uid())::text = owner_user_id) WITH CHECK ((select auth.uid())::text = owner_user_id)', t || '_owner_update', t);
            EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING ((select auth.uid())::text = owner_user_id)', t || '_owner_delete', t);
        END IF;
    END LOOP;
END $$;


-- =============================================================================
-- PATTERN 3: user_id UUID
-- =============================================================================

-- saint_knowledge, integrity_history, guardian_intercessions, engram_assets,
-- time_capsules, elohim_anchors

DO $$
DECLARE
    t text;
    tables text[] := ARRAY[
        'saint_knowledge',
        'integrity_history',
        'guardian_intercessions',
        'engram_assets',
        'time_capsules',
        'elohim_anchors'
    ];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t) THEN
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_owner_select', t);
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_owner_insert', t);
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_owner_update', t);
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_owner_delete', t);
            EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING ((select auth.uid()) = user_id)', t || '_owner_select', t);
            EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id)', t || '_owner_insert', t);
            EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id)', t || '_owner_update', t);
            EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING ((select auth.uid()) = user_id)', t || '_owner_delete', t);
        END IF;
    END LOOP;
END $$;


-- =============================================================================
-- PATTERN 4: owner_user_id UUID
-- =============================================================================

-- quiz_invites

DO $$
DECLARE
    t text;
    tables text[] := ARRAY[
        'quiz_invites'
    ];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t) THEN
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_owner_select', t);
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_owner_insert', t);
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_owner_update', t);
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_owner_delete', t);
            EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING ((select auth.uid()) = owner_user_id)', t || '_owner_select', t);
            EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = owner_user_id)', t || '_owner_insert', t);
            EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING ((select auth.uid()) = owner_user_id) WITH CHECK ((select auth.uid()) = owner_user_id)', t || '_owner_update', t);
            EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING ((select auth.uid()) = owner_user_id)', t || '_owner_delete', t);
        END IF;
    END LOOP;
END $$;


-- =============================================================================
-- PATTERN 5: camelCase "userId" TEXT  (Prisma-style identifiers)
-- =============================================================================

-- audit_logs, jit_access_requests

DO $$
DECLARE
    t text;
    tables text[] := ARRAY[
        'audit_logs',
        'jit_access_requests'
    ];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t) THEN
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_owner_select', t);
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_owner_insert', t);
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_owner_update', t);
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_owner_delete', t);
            EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING ((select auth.uid())::text = "userId")', t || '_owner_select', t);
            EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK ((select auth.uid())::text = "userId")', t || '_owner_insert', t);
            EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING ((select auth.uid())::text = "userId") WITH CHECK ((select auth.uid())::text = "userId")', t || '_owner_update', t);
            EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING ((select auth.uid())::text = "userId")', t || '_owner_delete', t);
        END IF;
    END LOOP;
END $$;


-- =============================================================================
-- PATTERN 6: ownership via FK to a parent table whose user_id is TEXT
-- =============================================================================
--
-- bank_accounts → bank_connections.id          (bank_connections.user_id TEXT)
-- budget_envelopes → budget_categories.id      (budget_categories.user_id TEXT)
-- causal_experiment_days → causal_experiments.id (causal_experiments.user_id TEXT)

-- bank_accounts -----------------------------------------------------------
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'bank_accounts') THEN
        ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS bank_accounts_owner_select ON public.bank_accounts;
        DROP POLICY IF EXISTS bank_accounts_owner_insert ON public.bank_accounts;
        DROP POLICY IF EXISTS bank_accounts_owner_update ON public.bank_accounts;
        DROP POLICY IF EXISTS bank_accounts_owner_delete ON public.bank_accounts;

        CREATE POLICY bank_accounts_owner_select ON public.bank_accounts
            FOR SELECT TO authenticated
            USING (EXISTS (SELECT 1 FROM public.bank_connections bc
                           WHERE bc.id = bank_accounts.connection_id
                             AND (select auth.uid())::text = bc.user_id));
        CREATE POLICY bank_accounts_owner_insert ON public.bank_accounts
            FOR INSERT TO authenticated
            WITH CHECK (EXISTS (SELECT 1 FROM public.bank_connections bc
                                WHERE bc.id = bank_accounts.connection_id
                                  AND (select auth.uid())::text = bc.user_id));
        CREATE POLICY bank_accounts_owner_update ON public.bank_accounts
            FOR UPDATE TO authenticated
            USING (EXISTS (SELECT 1 FROM public.bank_connections bc
                           WHERE bc.id = bank_accounts.connection_id
                             AND (select auth.uid())::text = bc.user_id))
            WITH CHECK (EXISTS (SELECT 1 FROM public.bank_connections bc
                                WHERE bc.id = bank_accounts.connection_id
                                  AND (select auth.uid())::text = bc.user_id));
        CREATE POLICY bank_accounts_owner_delete ON public.bank_accounts
            FOR DELETE TO authenticated
            USING (EXISTS (SELECT 1 FROM public.bank_connections bc
                           WHERE bc.id = bank_accounts.connection_id
                             AND (select auth.uid())::text = bc.user_id));
    END IF;
END $$;

-- budget_envelopes --------------------------------------------------------
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'budget_envelopes') THEN
        ALTER TABLE public.budget_envelopes ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS budget_envelopes_owner_select ON public.budget_envelopes;
        DROP POLICY IF EXISTS budget_envelopes_owner_insert ON public.budget_envelopes;
        DROP POLICY IF EXISTS budget_envelopes_owner_update ON public.budget_envelopes;
        DROP POLICY IF EXISTS budget_envelopes_owner_delete ON public.budget_envelopes;

        CREATE POLICY budget_envelopes_owner_select ON public.budget_envelopes
            FOR SELECT TO authenticated
            USING (EXISTS (SELECT 1 FROM public.budget_categories bc
                           WHERE bc.id = budget_envelopes.category_id
                             AND (select auth.uid())::text = bc.user_id));
        CREATE POLICY budget_envelopes_owner_insert ON public.budget_envelopes
            FOR INSERT TO authenticated
            WITH CHECK (EXISTS (SELECT 1 FROM public.budget_categories bc
                                WHERE bc.id = budget_envelopes.category_id
                                  AND (select auth.uid())::text = bc.user_id));
        CREATE POLICY budget_envelopes_owner_update ON public.budget_envelopes
            FOR UPDATE TO authenticated
            USING (EXISTS (SELECT 1 FROM public.budget_categories bc
                           WHERE bc.id = budget_envelopes.category_id
                             AND (select auth.uid())::text = bc.user_id))
            WITH CHECK (EXISTS (SELECT 1 FROM public.budget_categories bc
                                WHERE bc.id = budget_envelopes.category_id
                                  AND (select auth.uid())::text = bc.user_id));
        CREATE POLICY budget_envelopes_owner_delete ON public.budget_envelopes
            FOR DELETE TO authenticated
            USING (EXISTS (SELECT 1 FROM public.budget_categories bc
                           WHERE bc.id = budget_envelopes.category_id
                             AND (select auth.uid())::text = bc.user_id));
    END IF;
END $$;

-- causal_experiment_days --------------------------------------------------
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'causal_experiment_days') THEN
        ALTER TABLE public.causal_experiment_days ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS causal_experiment_days_owner_select ON public.causal_experiment_days;
        DROP POLICY IF EXISTS causal_experiment_days_owner_insert ON public.causal_experiment_days;
        DROP POLICY IF EXISTS causal_experiment_days_owner_update ON public.causal_experiment_days;
        DROP POLICY IF EXISTS causal_experiment_days_owner_delete ON public.causal_experiment_days;

        CREATE POLICY causal_experiment_days_owner_select ON public.causal_experiment_days
            FOR SELECT TO authenticated
            USING (EXISTS (SELECT 1 FROM public.causal_experiments ce
                           WHERE ce.id = causal_experiment_days.experiment_id
                             AND (select auth.uid())::text = ce.user_id));
        CREATE POLICY causal_experiment_days_owner_insert ON public.causal_experiment_days
            FOR INSERT TO authenticated
            WITH CHECK (EXISTS (SELECT 1 FROM public.causal_experiments ce
                                WHERE ce.id = causal_experiment_days.experiment_id
                                  AND (select auth.uid())::text = ce.user_id));
        CREATE POLICY causal_experiment_days_owner_update ON public.causal_experiment_days
            FOR UPDATE TO authenticated
            USING (EXISTS (SELECT 1 FROM public.causal_experiments ce
                           WHERE ce.id = causal_experiment_days.experiment_id
                             AND (select auth.uid())::text = ce.user_id))
            WITH CHECK (EXISTS (SELECT 1 FROM public.causal_experiments ce
                                WHERE ce.id = causal_experiment_days.experiment_id
                                  AND (select auth.uid())::text = ce.user_id));
        CREATE POLICY causal_experiment_days_owner_delete ON public.causal_experiment_days
            FOR DELETE TO authenticated
            USING (EXISTS (SELECT 1 FROM public.causal_experiments ce
                           WHERE ce.id = causal_experiment_days.experiment_id
                             AND (select auth.uid())::text = ce.user_id));
    END IF;
END $$;
