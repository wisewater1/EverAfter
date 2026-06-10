-- Create Guardian Intercessions table for Human-in-the-loop approvals

CREATE TABLE IF NOT EXISTS public.guardian_intercessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    saint_id TEXT NOT NULL,
    description TEXT NOT NULL,
    tool_name TEXT NOT NULL,
    tool_kwargs JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    execution_result JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient querying by the UI
CREATE INDEX IF NOT EXISTS idx_intercessions_user_id ON public.guardian_intercessions(user_id);
CREATE INDEX IF NOT EXISTS idx_intercessions_status ON public.guardian_intercessions(status);
CREATE INDEX IF NOT EXISTS idx_intercessions_saint_id ON public.guardian_intercessions(saint_id);

-- Apply basic RLS
ALTER TABLE public.guardian_intercessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own intercessions"
    ON public.guardian_intercessions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own intercessions"
    ON public.guardian_intercessions FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all intercessions"
    ON public.guardian_intercessions USING (true);
