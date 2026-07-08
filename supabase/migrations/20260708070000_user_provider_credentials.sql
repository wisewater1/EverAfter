-- Lets a signed-in user store their own third-party API key (e.g. their own
-- OpenAI key) instead of depending solely on the shared, centrally-configured
-- Edge Function secret. Edge functions that support this check for a row here
-- first and fall back to the shared env secret when the user hasn't set one.
--
-- Scope note: this only makes sense for providers where a single API key is
-- enough to make calls on the user's behalf (OpenAI, Groq). OAuth-based health
-- providers (Fitbit, Terra, Dexcom, Oura) authenticate the APP with the
-- provider, not the end user with an API key, so those still require the
-- shared app-level client id/secret to be configured centrally regardless of
-- what a user enters here.

CREATE TABLE IF NOT EXISTS public.user_provider_credentials (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider text NOT NULL CHECK (provider IN ('openai', 'groq')),
    api_key text NOT NULL,
    label text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_user_provider_credentials_user
    ON public.user_provider_credentials(user_id);

ALTER TABLE public.user_provider_credentials ENABLE ROW LEVEL SECURITY;

-- Only the owning user can see or manage their own key from the client.
-- Edge functions read this table with the service-role key, which bypasses
-- RLS by design, so the server-side lookup used by chat functions is
-- unaffected by this policy.
DROP POLICY IF EXISTS user_provider_credentials_owner_all ON public.user_provider_credentials;
CREATE POLICY user_provider_credentials_owner_all
    ON public.user_provider_credentials
    FOR ALL
    TO authenticated
    USING ((select auth.uid()) = user_id)
    WITH CHECK ((select auth.uid()) = user_id);

CREATE OR REPLACE FUNCTION public.touch_user_provider_credentials_updated_at()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_user_provider_credentials_updated_at ON public.user_provider_credentials;
CREATE TRIGGER trg_user_provider_credentials_updated_at
    BEFORE UPDATE ON public.user_provider_credentials
    FOR EACH ROW
    EXECUTE FUNCTION public.touch_user_provider_credentials_updated_at();
