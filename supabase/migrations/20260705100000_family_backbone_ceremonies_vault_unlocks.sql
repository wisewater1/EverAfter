-- =============================================================================
-- Shared family backbone + Ceremonies + Legacy Vault unlock flows
-- =============================================================================
-- Every person in a user's family tree is one canonical row in
-- public.family_members (uuid id, owner user_id, legacy_id bridge for the
-- client-side graph ids). This migration adds the pieces the rest of the
-- product attaches to that canonical row:
--
--   1. family_member_links   - relationship edges (parent/child/spouse/sibling)
--   2. family_tree_events    - life timeline events (birth, marriage, passing,
--                              milestones, ceremonies) shown in Chronicle
--   3. ceremonies            - planned and completed family ceremonies,
--                              surfaced in Calendar and Chronicle
--   4. vault_unlock_requests - successor access requests for Legacy Vault
--                              items whose unlock rule requires a decision
--                              (custodian approval or a verified life event)
--   5. profiles.last_check_in_at - quiet activity heartbeat used by the
--                              HEARTBEAT_TIMEOUT vault unlock rule
--
-- All tables are owner-scoped with RLS; vault_unlock_requests additionally
-- allows the designated successor (by verified email) to create and view
-- their own requests, mirroring the vault_items beneficiary policy.
-- =============================================================================

-- 1) Relationship edges ------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.family_member_links (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    from_member_id uuid NOT NULL REFERENCES public.family_members(id) ON DELETE CASCADE,
    to_member_id uuid NOT NULL REFERENCES public.family_members(id) ON DELETE CASCADE,
    link_type text NOT NULL CHECK (link_type IN ('parent', 'child', 'spouse', 'sibling')),
    created_at timestamptz DEFAULT now(),
    UNIQUE (user_id, from_member_id, to_member_id, link_type)
);

CREATE INDEX IF NOT EXISTS idx_family_member_links_user ON public.family_member_links(user_id);
CREATE INDEX IF NOT EXISTS idx_family_member_links_from ON public.family_member_links(from_member_id);
CREATE INDEX IF NOT EXISTS idx_family_member_links_to ON public.family_member_links(to_member_id);

ALTER TABLE public.family_member_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS family_member_links_owner_all ON public.family_member_links;
CREATE POLICY family_member_links_owner_all
    ON public.family_member_links
    FOR ALL
    TO authenticated
    USING ((select auth.uid()) = user_id)
    WITH CHECK (
        (select auth.uid()) = user_id
        AND EXISTS (
            SELECT 1 FROM public.family_members fm
            WHERE fm.id = family_member_links.from_member_id
              AND fm.user_id = (select auth.uid())
        )
        AND EXISTS (
            SELECT 1 FROM public.family_members fm
            WHERE fm.id = family_member_links.to_member_id
              AND fm.user_id = (select auth.uid())
        )
    );

-- 2) Family timeline events ---------------------------------------------------
CREATE TABLE IF NOT EXISTS public.family_tree_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    member_id uuid REFERENCES public.family_members(id) ON DELETE SET NULL,
    legacy_event_id text,
    event_type text NOT NULL CHECK (event_type IN ('birth', 'marriage', 'passing', 'milestone', 'ceremony', 'anniversary', 'other')),
    event_date date,
    title text NOT NULL,
    description text,
    location text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS family_tree_events_user_legacy_unique
    ON public.family_tree_events (user_id, legacy_event_id)
    WHERE legacy_event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_family_tree_events_user ON public.family_tree_events(user_id);
CREATE INDEX IF NOT EXISTS idx_family_tree_events_member ON public.family_tree_events(member_id) WHERE member_id IS NOT NULL;

ALTER TABLE public.family_tree_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS family_tree_events_owner_all ON public.family_tree_events;
CREATE POLICY family_tree_events_owner_all
    ON public.family_tree_events
    FOR ALL
    TO authenticated
    USING ((select auth.uid()) = user_id)
    WITH CHECK ((select auth.uid()) = user_id);

-- 3) Ceremonies ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ceremonies (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title text NOT NULL,
    description text,
    ceremony_type text NOT NULL DEFAULT 'remembrance'
        CHECK (ceremony_type IN ('remembrance', 'gratitude', 'blessing', 'milestone', 'legacy', 'seasonal', 'custom')),
    scheduled_at timestamptz,
    duration_minutes integer,
    location text,
    honoree_member_id uuid REFERENCES public.family_members(id) ON DELETE SET NULL,
    participant_member_ids uuid[] NOT NULL DEFAULT '{}',
    script jsonb NOT NULL DEFAULT '[]'::jsonb,
    status text NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'scheduled', 'completed', 'archived')),
    completed_at timestamptz,
    reflection text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ceremonies_user ON public.ceremonies(user_id);
CREATE INDEX IF NOT EXISTS idx_ceremonies_scheduled ON public.ceremonies(scheduled_at) WHERE scheduled_at IS NOT NULL;

ALTER TABLE public.ceremonies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ceremonies_owner_all ON public.ceremonies;
CREATE POLICY ceremonies_owner_all
    ON public.ceremonies
    FOR ALL
    TO authenticated
    USING ((select auth.uid()) = user_id)
    WITH CHECK ((select auth.uid()) = user_id);

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ceremonies_set_updated_at ON public.ceremonies;
CREATE TRIGGER ceremonies_set_updated_at
    BEFORE UPDATE ON public.ceremonies
    FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS family_tree_events_set_updated_at ON public.family_tree_events;
CREATE TRIGGER family_tree_events_set_updated_at
    BEFORE UPDATE ON public.family_tree_events
    FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 4) Vault unlock requests ------------------------------------------------------
-- Supports the CUSTODIAN_APPROVAL and DEATH_CERT (verified passing) unlock
-- rules: a designated successor asks for access, the custodian or the vault
-- owner reviews, and the vault scheduler releases the item only after an
-- approved decision. If a trigger condition cannot be verified, the request
-- stays pending and the item remains sealed - the documented fallback.
CREATE TABLE IF NOT EXISTS public.vault_unlock_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    vault_item_id uuid NOT NULL REFERENCES public.vault_items(id) ON DELETE CASCADE,
    owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    requested_by_email text NOT NULL,
    request_reason text,
    evidence_note text,
    status text NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'declined', 'expired')),
    decided_by_email text,
    decided_at timestamptz,
    created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vault_unlock_requests_item ON public.vault_unlock_requests(vault_item_id);
CREATE INDEX IF NOT EXISTS idx_vault_unlock_requests_owner ON public.vault_unlock_requests(owner_user_id);

ALTER TABLE public.vault_unlock_requests ENABLE ROW LEVEL SECURITY;

-- Owner: full control over requests on their items.
DROP POLICY IF EXISTS vault_unlock_requests_owner_all ON public.vault_unlock_requests;
CREATE POLICY vault_unlock_requests_owner_all
    ON public.vault_unlock_requests
    FOR ALL
    TO authenticated
    USING ((select auth.uid()) = owner_user_id)
    WITH CHECK ((select auth.uid()) = owner_user_id);

-- Successor (beneficiary/custodian by email): may open and view their own requests.
DROP POLICY IF EXISTS vault_unlock_requests_successor_select ON public.vault_unlock_requests;
CREATE POLICY vault_unlock_requests_successor_select
    ON public.vault_unlock_requests
    FOR SELECT
    TO authenticated
    USING (
        requested_by_email = (SELECT email FROM auth.users WHERE id = (select auth.uid()))
    );

DROP POLICY IF EXISTS vault_unlock_requests_successor_insert ON public.vault_unlock_requests;
CREATE POLICY vault_unlock_requests_successor_insert
    ON public.vault_unlock_requests
    FOR INSERT
    TO authenticated
    WITH CHECK (
        requested_by_email = (SELECT email FROM auth.users WHERE id = (select auth.uid()))
        AND vault_item_id IN (
            SELECT bl.vault_item_id
            FROM public.beneficiary_links bl
            JOIN public.beneficiaries b ON b.id = bl.beneficiary_id
            WHERE b.email = (SELECT email FROM auth.users WHERE id = (select auth.uid()))
        )
    );

-- Custodians (by email) may review requests for items they steward.
DROP POLICY IF EXISTS vault_unlock_requests_custodian_update ON public.vault_unlock_requests;
CREATE POLICY vault_unlock_requests_custodian_update
    ON public.vault_unlock_requests
    FOR UPDATE
    TO authenticated
    USING (
        vault_item_id IN (
            SELECT bl.vault_item_id
            FROM public.beneficiary_links bl
            JOIN public.beneficiaries b ON b.id = bl.beneficiary_id
            WHERE bl.role IN ('CUSTODIAN', 'EXECUTOR')
              AND b.email = (SELECT email FROM auth.users WHERE id = (select auth.uid()))
        )
    )
    WITH CHECK (
        vault_item_id IN (
            SELECT bl.vault_item_id
            FROM public.beneficiary_links bl
            JOIN public.beneficiaries b ON b.id = bl.beneficiary_id
            WHERE bl.role IN ('CUSTODIAN', 'EXECUTOR')
              AND b.email = (SELECT email FROM auth.users WHERE id = (select auth.uid()))
        )
    );

-- 5) Quiet activity check-in for HEARTBEAT_TIMEOUT ------------------------------
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS last_check_in_at timestamptz DEFAULT now();
