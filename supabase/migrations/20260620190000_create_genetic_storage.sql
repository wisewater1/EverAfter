-- =============================================================================
-- Genetic information storage — schema + RLS + storage bucket
-- =============================================================================
-- PR 1 of the genetics roadmap. Creates the tables, storage bucket, and
-- access policies that let EverAfter accept consumer DNA exports
-- (23andMe / Ancestry / MyHeritage raw files, plus VCF/CRAM later) and
-- attach them to family tree members from PR #69's family_members table.
--
-- DESIGN DECISIONS
--
-- 1. Two tables, not one. genetic_profiles is one row per uploaded file;
--    variant_calls is per-row variant data extracted from it. Letting
--    the variants live in their own table lets Postgres do fast trait
--    lookups (rsid, chromosome+position) without scanning a giant jsonb
--    every query.
--
-- 2. Client-side encryption is the storage model (Crypt4GH-JS in browser,
--    user's vault key as recipient). The DB never sees plaintext bytes
--    — only the encrypted blob path + sha256 + size. is_encrypted +
--    encryption_key_id are stored so the frontend can find the right
--    decryption key when reading back.
--
-- 3. family_member_id is OPTIONAL (NULL) and ON DELETE SET NULL. PR #69
--    has not landed at the time this migration is written; once it
--    does, the linkage is live. If PR #69 lands first, the FK is the
--    deterministic link future PRs use to resolve "this DNA belongs to
--    [member]" without name-match heuristics.
--
-- 4. posthumous_directive is a jsonb on every profile. This is the moat
--    — every other genetic platform punts on "what happens after I'm
--    gone." EverAfter ships with first-class structured directives.
--    Default policy is "ask_pdg" — a designated Posthumous Data
--    Guardian must be consulted before any survivor access.
--
-- 5. RLS is enforced at every layer:
--      - genetic_profiles: owner-only via user_id
--      - variant_calls:    owner-only via FK to genetic_profiles
--      - storage.objects:  owner-only via auth.uid() prefix in path
--
-- 6. No sample biological material is stored — only digital data. State
--    laws (Indiana HB 1521, CalGIPA, etc.) often treat physical samples
--    differently. EverAfter is digital-only by construction.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- A) genetic_profiles — one row per uploaded DNA dataset
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.genetic_profiles (
    id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    family_member_id         uuid REFERENCES public.family_members(id) ON DELETE SET NULL,

    -- File shape + provenance ------------------------------------------------
    -- format encodes the upstream file shape. The parser branches on this
    -- before extracting variant_calls.
    format                   text NOT NULL
        CHECK (format IN ('23andme', 'ancestrydna', 'myheritage', 'familytree', 'vcf', 'cram', 'bam', 'fastq')),
    source_provider          text,                 -- '23andMe', 'AncestryDNA', etc.
    chip_version             text,                 -- '23andMe v5', 'Illumina GSA v2', ...
    snp_count                integer DEFAULT 0,    -- count of variant_calls rows for this profile
    sample_count             integer DEFAULT 1,    -- almost always 1 for consumer DNA

    -- Storage --------------------------------------------------------------
    -- blob_path is the object key inside the 'genetic-profiles' bucket.
    -- The bucket is private; access flows through signed URLs minted server-
    -- side or directly via the authenticated Supabase storage client.
    blob_path                text NOT NULL,
    blob_size_bytes          bigint,
    blob_sha256              text,                 -- content hash for dedup + integrity
    is_encrypted             boolean NOT NULL DEFAULT true,
    -- encryption_key_id references the user's vault key the file was
    -- encrypted to. EverAfter never receives the key itself.
    encryption_key_id        text,

    -- Provenance + safety --------------------------------------------------
    upload_provenance        jsonb DEFAULT '{}'::jsonb,
    -- Default policy reflects the safest stance for a tool whose entire
    -- premise is the user's eventual absence: nothing flows to anyone
    -- without an explicit, named Posthumous Data Guardian decision.
    posthumous_directive     jsonb NOT NULL DEFAULT jsonb_build_object(
        'policy',                       'ask_pdg',
        'destroy_after_days',           NULL,
        'notify_pdg_ids',               '[]'::jsonb,
        'actionable_findings_to_pdg',   false,
        'raw_data_to_pdg',              false,
        'notify_blood_relatives',       'ask'
    ),
    metadata                 jsonb DEFAULT '{}'::jsonb,

    -- Timestamps -----------------------------------------------------------
    uploaded_at              timestamptz DEFAULT now(),
    created_at               timestamptz DEFAULT now(),
    updated_at               timestamptz DEFAULT now(),

    -- Constraints ----------------------------------------------------------
    -- Same content uploaded twice for the same (user, family_member,
    -- format) is a no-op. blob_sha256 is the dedup key.
    CONSTRAINT genetic_profiles_no_duplicate UNIQUE (user_id, family_member_id, format, blob_sha256)
);

CREATE INDEX IF NOT EXISTS idx_genetic_profiles_user
    ON public.genetic_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_genetic_profiles_family_member
    ON public.genetic_profiles(family_member_id) WHERE family_member_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_genetic_profiles_format
    ON public.genetic_profiles(user_id, format);

ALTER TABLE public.genetic_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS genetic_profiles_owner_select ON public.genetic_profiles;
DROP POLICY IF EXISTS genetic_profiles_owner_insert ON public.genetic_profiles;
DROP POLICY IF EXISTS genetic_profiles_owner_update ON public.genetic_profiles;
DROP POLICY IF EXISTS genetic_profiles_owner_delete ON public.genetic_profiles;

CREATE POLICY genetic_profiles_owner_select ON public.genetic_profiles
    FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY genetic_profiles_owner_insert ON public.genetic_profiles
    FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY genetic_profiles_owner_update ON public.genetic_profiles
    FOR UPDATE TO authenticated
    USING ((select auth.uid()) = user_id)
    WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY genetic_profiles_owner_delete ON public.genetic_profiles
    FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);

-- Cross-check: if family_member_id is set, it must belong to the caller.
-- Postgres FK enforcement is RLS-blind by default; this closes the hole.
DROP POLICY IF EXISTS genetic_profiles_family_member_belongs_to_user ON public.genetic_profiles;
CREATE POLICY genetic_profiles_family_member_belongs_to_user
    ON public.genetic_profiles FOR ALL TO authenticated
    USING (
        family_member_id IS NULL OR EXISTS (
            SELECT 1 FROM public.family_members fm
            WHERE fm.id = genetic_profiles.family_member_id
              AND fm.user_id = (select auth.uid())
        )
    )
    WITH CHECK (
        family_member_id IS NULL OR EXISTS (
            SELECT 1 FROM public.family_members fm
            WHERE fm.id = genetic_profiles.family_member_id
              AND fm.user_id = (select auth.uid())
        )
    );


-- -----------------------------------------------------------------------------
-- B) variant_calls — per-variant rows extracted from a genetic profile
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.variant_calls (
    id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    genetic_profile_id   uuid NOT NULL REFERENCES public.genetic_profiles(id) ON DELETE CASCADE,

    -- The four columns every consumer DNA export has -----------------------
    rsid                 text NOT NULL,    -- 'rs429358' etc.
    chromosome           text NOT NULL,    -- '1'..'22' / 'X' / 'Y' / 'MT'
    position             bigint NOT NULL,  -- 1-based base position
    genotype             text NOT NULL,    -- 'AG' / 'TT' / '--' (no-call)

    -- Quality + downstream tagging -----------------------------------------
    confidence           text CHECK (confidence IS NULL OR confidence IN ('high', 'medium', 'low', 'no_call')),
    -- trait_id is filled by a later PR that maps variants → hereditary
    -- conditions. Indexed only when non-null.
    trait_id             text,

    created_at           timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_variant_calls_profile
    ON public.variant_calls(genetic_profile_id);
CREATE INDEX IF NOT EXISTS idx_variant_calls_rsid
    ON public.variant_calls(genetic_profile_id, rsid);
CREATE INDEX IF NOT EXISTS idx_variant_calls_pos
    ON public.variant_calls(genetic_profile_id, chromosome, position);
CREATE INDEX IF NOT EXISTS idx_variant_calls_trait
    ON public.variant_calls(trait_id) WHERE trait_id IS NOT NULL;

ALTER TABLE public.variant_calls ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS variant_calls_owner_select ON public.variant_calls;
DROP POLICY IF EXISTS variant_calls_owner_insert ON public.variant_calls;
DROP POLICY IF EXISTS variant_calls_owner_update ON public.variant_calls;
DROP POLICY IF EXISTS variant_calls_owner_delete ON public.variant_calls;

-- Ownership flows via FK: read/write iff the parent genetic_profile is yours.
CREATE POLICY variant_calls_owner_select ON public.variant_calls
    FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.genetic_profiles gp
        WHERE gp.id = variant_calls.genetic_profile_id
          AND gp.user_id = (select auth.uid())
    ));
CREATE POLICY variant_calls_owner_insert ON public.variant_calls
    FOR INSERT TO authenticated
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.genetic_profiles gp
        WHERE gp.id = variant_calls.genetic_profile_id
          AND gp.user_id = (select auth.uid())
    ));
CREATE POLICY variant_calls_owner_update ON public.variant_calls
    FOR UPDATE TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.genetic_profiles gp
        WHERE gp.id = variant_calls.genetic_profile_id
          AND gp.user_id = (select auth.uid())
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.genetic_profiles gp
        WHERE gp.id = variant_calls.genetic_profile_id
          AND gp.user_id = (select auth.uid())
    ));
CREATE POLICY variant_calls_owner_delete ON public.variant_calls
    FOR DELETE TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.genetic_profiles gp
        WHERE gp.id = variant_calls.genetic_profile_id
          AND gp.user_id = (select auth.uid())
    ));


-- -----------------------------------------------------------------------------
-- C) updated_at trigger on genetic_profiles
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.genetic_profiles_set_updated_at()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS genetic_profiles_updated_at ON public.genetic_profiles;
CREATE TRIGGER genetic_profiles_updated_at
    BEFORE UPDATE ON public.genetic_profiles
    FOR EACH ROW EXECUTE FUNCTION public.genetic_profiles_set_updated_at();


-- -----------------------------------------------------------------------------
-- D) Private storage bucket for the encrypted blobs
-- -----------------------------------------------------------------------------
-- Path convention: <auth.uid()>/<genetic_profile_id>.<ext>.c4gh
-- Storage RLS keys off the first folder being the caller's uid string.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'genetic-profiles',
    'genetic-profiles',
    false,
    524288000,                            -- 500 MB cap per file (enough for VCF, not BAM/CRAM)
    ARRAY[
        'application/octet-stream',       -- Crypt4GH containers + arbitrary binary
        'application/gzip',               -- raw 23andMe / AncestryDNA exports
        'text/plain',                     -- raw unzipped exports (last resort)
        'text/tab-separated-values'       -- raw unzipped exports
    ]
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS genetic_profiles_storage_select ON storage.objects;
DROP POLICY IF EXISTS genetic_profiles_storage_insert ON storage.objects;
DROP POLICY IF EXISTS genetic_profiles_storage_update ON storage.objects;
DROP POLICY IF EXISTS genetic_profiles_storage_delete ON storage.objects;

CREATE POLICY genetic_profiles_storage_select ON storage.objects
    FOR SELECT TO authenticated
    USING (
        bucket_id = 'genetic-profiles'
        AND (storage.foldername(name))[1] = (select auth.uid())::text
    );
CREATE POLICY genetic_profiles_storage_insert ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'genetic-profiles'
        AND (storage.foldername(name))[1] = (select auth.uid())::text
    );
CREATE POLICY genetic_profiles_storage_update ON storage.objects
    FOR UPDATE TO authenticated
    USING (
        bucket_id = 'genetic-profiles'
        AND (storage.foldername(name))[1] = (select auth.uid())::text
    )
    WITH CHECK (
        bucket_id = 'genetic-profiles'
        AND (storage.foldername(name))[1] = (select auth.uid())::text
    );
CREATE POLICY genetic_profiles_storage_delete ON storage.objects
    FOR DELETE TO authenticated
    USING (
        bucket_id = 'genetic-profiles'
        AND (storage.foldername(name))[1] = (select auth.uid())::text
    );
