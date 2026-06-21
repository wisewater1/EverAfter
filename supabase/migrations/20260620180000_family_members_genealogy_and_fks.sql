-- =============================================================================
-- family_members → genealogy node + cross-feature FKs
-- =============================================================================
-- The codebase currently has TWO concepts of "family member":
--
--   1. public.family_members (created 2025-10-06): an invited-collaborator
--      row — name, email, relationship, access_level. Used for the "invite
--      family member to view your engram" flow.
--
--   2. buildFamilyTree() in src/lib/joseph/genealogy.ts: an in-memory
--      genealogy graph with first_name, last_name, birth/death dates,
--      generation, occupation, engram_id, etc. Never touches the DB.
--
-- Because (2) is in-memory only, every cross-feature link (vault_items per
-- member, voice profile per member, calendar per member, …) has to be a
-- string match heuristic. PR #64's MemberVaultPanel ships with one of
-- those heuristics — works most of the time but breaks for two cousins
-- named "James" with different family roles.
--
-- This migration is the foundation that lets us start replacing those
-- heuristics with real FKs:
--
--   A) Extend family_members with the genealogy columns from
--      buildFamilyTree() so the two concepts can converge. Every new
--      column is NULLABLE so the existing invitation flow is unaffected.
--
--   B) Add family_member_id (UUID, NULL, FK → family_members(id), ON
--      DELETE SET NULL) to vault_items and beneficiaries. Future PRs can
--      populate the column on create + use it for deterministic lookup.
--
-- No backfill in this migration — the genealogy rows are still seeded
-- client-side, and there's no canonical mapping yet between the seeded
-- ids ('gp1', 'p1', ...) and the eventual DB rows. The frontend will
-- upsert on first save, future PRs will add a backfill helper.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- A) Extend family_members with genealogy columns (all NULLABLE)
-- -----------------------------------------------------------------------------

ALTER TABLE public.family_members
    ADD COLUMN IF NOT EXISTS first_name      text,
    ADD COLUMN IF NOT EXISTS last_name       text,
    ADD COLUMN IF NOT EXISTS gender          text CHECK (gender IS NULL OR gender IN ('male', 'female', 'other')),
    ADD COLUMN IF NOT EXISTS birth_date      date,
    ADD COLUMN IF NOT EXISTS death_date      date,
    ADD COLUMN IF NOT EXISTS birth_place     text,
    ADD COLUMN IF NOT EXISTS photo_url       text,
    ADD COLUMN IF NOT EXISTS bio             text,
    ADD COLUMN IF NOT EXISTS generation      integer DEFAULT 0,
    ADD COLUMN IF NOT EXISTS occupation      text,
    ADD COLUMN IF NOT EXISTS family_role     text,
    ADD COLUMN IF NOT EXISTS engram_id       text,
    ADD COLUMN IF NOT EXISTS calendar_url    text,
    -- Stable legacy id from buildFamilyTree() ('gp1', 'p1', ...) so a
    -- frontend backfill knows whether a seeded member already exists in
    -- the DB. Scoped per user (a row's legacy_id only needs to be unique
    -- within one user's family).
    ADD COLUMN IF NOT EXISTS legacy_id       text,
    ADD COLUMN IF NOT EXISTS metadata        jsonb DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS updated_at      timestamptz DEFAULT now();

-- Backfill first_name + last_name from the existing `name` column so
-- future queries can rely on the new structure even for invitation rows.
-- We only set them when both are still NULL — never overwrite real edits.
UPDATE public.family_members
SET
    first_name = COALESCE(first_name, split_part(name, ' ', 1)),
    last_name  = COALESCE(last_name,  NULLIF(substring(name FROM position(' ' IN name) + 1), ''))
WHERE first_name IS NULL OR last_name IS NULL;

-- Per-user uniqueness on legacy_id so a seeded tree can be upserted by
-- (user_id, legacy_id) without colliding across users.
CREATE UNIQUE INDEX IF NOT EXISTS family_members_user_legacy_unique
    ON public.family_members (user_id, legacy_id)
    WHERE legacy_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS family_members_user_id_idx
    ON public.family_members (user_id);

CREATE INDEX IF NOT EXISTS family_members_engram_id_idx
    ON public.family_members (engram_id)
    WHERE engram_id IS NOT NULL;


-- -----------------------------------------------------------------------------
-- B) Cross-feature FK columns
-- -----------------------------------------------------------------------------

-- vault_items — so a Will / Capsule / Memorial / Message can be authored
--               FOR a specific family member, not just FROM the user.
ALTER TABLE public.vault_items
    ADD COLUMN IF NOT EXISTS family_member_id uuid
        REFERENCES public.family_members(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_vault_items_family_member
    ON public.vault_items(family_member_id)
    WHERE family_member_id IS NOT NULL;

-- beneficiaries — so a tree member can be linked to their beneficiary row
--                 deterministically (PR #64's MemberVaultPanel heuristic
--                 becomes a real lookup once this is populated).
ALTER TABLE public.beneficiaries
    ADD COLUMN IF NOT EXISTS family_member_id uuid
        REFERENCES public.family_members(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_beneficiaries_family_member
    ON public.beneficiaries(family_member_id)
    WHERE family_member_id IS NOT NULL;


-- -----------------------------------------------------------------------------
-- C) RLS on the new FK targets — the existing policies on family_members,
--    vault_items, and beneficiaries already enforce owner-only access
--    via user_id. The FK doesn't change that surface; we only need to
--    ensure that updates to family_member_id can't point at someone
--    else's family member row.
--
--    Postgres FK constraints handle row existence + cascade. The remaining
--    risk is "user_a sets vault_items.family_member_id = user_b's
--    family_member.id". Because the SELECT policy on family_members
--    only returns the caller's rows, the FK insert/update CAN still
--    succeed against a hidden row (Postgres FK checks use the table
--    owner's privileges, not RLS). Add an explicit cross-check policy
--    addendum to vault_items + beneficiaries.
-- -----------------------------------------------------------------------------

-- Helper: ensure the family_member_id (if set) belongs to the caller.
DROP POLICY IF EXISTS vault_items_family_member_belongs_to_user ON public.vault_items;
CREATE POLICY vault_items_family_member_belongs_to_user
    ON public.vault_items
    FOR ALL
    TO authenticated
    USING (
        family_member_id IS NULL
        OR EXISTS (
            SELECT 1 FROM public.family_members fm
            WHERE fm.id = vault_items.family_member_id
              AND fm.user_id = (select auth.uid())
        )
    )
    WITH CHECK (
        family_member_id IS NULL
        OR EXISTS (
            SELECT 1 FROM public.family_members fm
            WHERE fm.id = vault_items.family_member_id
              AND fm.user_id = (select auth.uid())
        )
    );

DROP POLICY IF EXISTS beneficiaries_family_member_belongs_to_user ON public.beneficiaries;
CREATE POLICY beneficiaries_family_member_belongs_to_user
    ON public.beneficiaries
    FOR ALL
    TO authenticated
    USING (
        family_member_id IS NULL
        OR EXISTS (
            SELECT 1 FROM public.family_members fm
            WHERE fm.id = beneficiaries.family_member_id
              AND fm.user_id = (select auth.uid())
        )
    )
    WITH CHECK (
        family_member_id IS NULL
        OR EXISTS (
            SELECT 1 FROM public.family_members fm
            WHERE fm.id = beneficiaries.family_member_id
              AND fm.user_id = (select auth.uid())
        )
    );


-- -----------------------------------------------------------------------------
-- D) updated_at trigger for the new column
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.family_members_set_updated_at()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS family_members_set_updated_at ON public.family_members;
CREATE TRIGGER family_members_set_updated_at
    BEFORE UPDATE ON public.family_members
    FOR EACH ROW EXECUTE FUNCTION public.family_members_set_updated_at();
