-- Two gaps found while investigating "personality profiles don't do anything
-- and don't differentiate family members":
--
-- 1. EngramTrainingWizard.tsx has always written to engram_family_links and
--    engram_personality_profiles when linking a trained engram to a St.
--    Joseph family member and saving that engram's quiz results - both
--    writes are wrapped in a silent catch ("table may not exist yet") because
--    neither table was ever created. Every attempt to associate an engram
--    with a specific family member, and every saved personality profile from
--    that flow, has silently no-opped since the feature was written.
--
-- 2. capture_personality_snapshot() (see
--    20251026142215_create_archetypal_conversation_system.sql) has always
--    selected archetypal_ais.core_values and .communication_style, columns
--    that were never added to the table - every call to this function
--    errors. ArchetypalAIChat.tsx's ArchetypalAI interface has also always
--    expected these two fields to exist and be real arrays/strings.

ALTER TABLE public.archetypal_ais
    ADD COLUMN IF NOT EXISTS core_values text[] DEFAULT ARRAY[]::text[],
    ADD COLUMN IF NOT EXISTS communication_style text;

CREATE TABLE IF NOT EXISTS public.engram_family_links (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    engram_id uuid NOT NULL REFERENCES public.archetypal_ais(id) ON DELETE CASCADE,
    joseph_member_id text NOT NULL,
    relationship text,
    additional_relationships jsonb NOT NULL DEFAULT '[]'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (engram_id)
);

CREATE INDEX IF NOT EXISTS idx_engram_family_links_user ON public.engram_family_links(user_id);
CREATE INDEX IF NOT EXISTS idx_engram_family_links_member ON public.engram_family_links(user_id, joseph_member_id);

ALTER TABLE public.engram_family_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS engram_family_links_owner_all ON public.engram_family_links;
CREATE POLICY engram_family_links_owner_all
    ON public.engram_family_links
    FOR ALL
    TO authenticated
    USING ((select auth.uid()) = user_id)
    WITH CHECK ((select auth.uid()) = user_id);

CREATE TABLE IF NOT EXISTS public.engram_personality_profiles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    engram_id uuid NOT NULL REFERENCES public.archetypal_ais(id) ON DELETE CASCADE,
    profile jsonb NOT NULL DEFAULT '{}'::jsonb,
    joseph_member_id text,
    relationship text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (engram_id)
);

CREATE INDEX IF NOT EXISTS idx_engram_personality_profiles_user ON public.engram_personality_profiles(user_id);

ALTER TABLE public.engram_personality_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS engram_personality_profiles_owner_all ON public.engram_personality_profiles;
CREATE POLICY engram_personality_profiles_owner_all
    ON public.engram_personality_profiles
    FOR ALL
    TO authenticated
    USING ((select auth.uid()) = user_id)
    WITH CHECK ((select auth.uid()) = user_id);

CREATE OR REPLACE FUNCTION public.touch_engram_family_links_updated_at()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_engram_family_links_updated_at ON public.engram_family_links;
CREATE TRIGGER trg_engram_family_links_updated_at
    BEFORE UPDATE ON public.engram_family_links
    FOR EACH ROW
    EXECUTE FUNCTION public.touch_engram_family_links_updated_at();

DROP TRIGGER IF EXISTS trg_engram_personality_profiles_updated_at ON public.engram_personality_profiles;
CREATE TRIGGER trg_engram_personality_profiles_updated_at
    BEFORE UPDATE ON public.engram_personality_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.touch_engram_family_links_updated_at();
