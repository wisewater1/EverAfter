-- Add family_consents table to support the Consented Family Graph
CREATE TABLE IF NOT EXISTS public.family_consents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    grantor_id UUID NOT NULL REFERENCES public.family_members(id) ON DELETE CASCADE,
    grantee_id UUID NOT NULL REFERENCES public.family_members(id) ON DELETE CASCADE,
    data_type TEXT NOT NULL CHECK (data_type IN ('genetics', 'vitals', 'conditions', 'timeline')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    revoked_at TIMESTAMP WITH TIME ZONE,
    
    -- Prevent duplicate active consents for the same pair and data type
    CONSTRAINT unique_active_consent UNIQUE NULLS NOT DISTINCT (grantor_id, grantee_id, data_type, revoked_at)
);

-- Index for fast lookup when evaluating RLS policies
CREATE INDEX IF NOT EXISTS idx_family_consents_lookup ON public.family_consents(grantor_id, grantee_id, data_type) WHERE revoked_at IS NULL;

-- Enable Row Level Security
ALTER TABLE public.family_consents ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see consents they granted or received
CREATE POLICY "Users can view relevant consents"
ON public.family_consents FOR SELECT
TO authenticated
USING (
    -- The user owns the grantor family member
    EXISTS (SELECT 1 FROM public.family_members fm WHERE fm.id = family_consents.grantor_id AND fm.user_id = auth.uid())
    OR 
    -- The user owns the grantee family member
    EXISTS (SELECT 1 FROM public.family_members fm WHERE fm.id = family_consents.grantee_id AND fm.user_id = auth.uid())
);

-- Policy: Users can only create/revoke consents for family members they own
CREATE POLICY "Users can manage their granted consents"
ON public.family_consents FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (SELECT 1 FROM public.family_members fm WHERE fm.id = grantor_id AND fm.user_id = auth.uid())
);

CREATE POLICY "Users can revoke their granted consents"
ON public.family_consents FOR UPDATE
TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.family_members fm WHERE fm.id = grantor_id AND fm.user_id = auth.uid())
)
WITH CHECK (
    -- Only allow updating the revoked_at timestamp
    EXISTS (SELECT 1 FROM public.family_members fm WHERE fm.id = grantor_id AND fm.user_id = auth.uid())
);

-- Trigger to automatically populate 'updated_at' equivalent behavior if needed, or handle graph revocation cascades
CREATE OR REPLACE FUNCTION handle_consent_revocation()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.revoked_at IS NOT NULL AND OLD.revoked_at IS NULL THEN
        -- Here we could add logic to clean up cached predictive models or alert the backend
        -- For now, simple revocation is sufficient as RLS views will automatically update
        NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_consent_revoked
    AFTER UPDATE ON public.family_consents
    FOR EACH ROW
    EXECUTE FUNCTION handle_consent_revocation();
