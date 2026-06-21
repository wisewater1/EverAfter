-- Enable RLS on voice_* tables to close the "RLS Disabled in Public"
-- finding from Supabase Security Advisor.
--
-- These tables are defined by the SQLAlchemy backend
-- (backend/app/models/engram.py) and were created without RLS, exposing
-- every authenticated user's voice profiles, training samples, training
-- runs, and synth sessions to every other authenticated user.
--
-- owner_user_id is declared as String in the model (TEXT in Postgres),
-- so policies cast (select auth.uid())::text per CLAUDE.md guidance to
-- keep the predicate index-friendly.

ALTER TABLE IF EXISTS public.voice_profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.voice_samples        ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.voice_training_runs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.voice_synth_sessions ENABLE ROW LEVEL SECURITY;

-- voice_profiles -------------------------------------------------------------
DROP POLICY IF EXISTS "voice_profiles_owner_select" ON public.voice_profiles;
CREATE POLICY "voice_profiles_owner_select"
  ON public.voice_profiles
  FOR SELECT
  TO authenticated
  USING ((select auth.uid())::text = owner_user_id);

DROP POLICY IF EXISTS "voice_profiles_owner_insert" ON public.voice_profiles;
CREATE POLICY "voice_profiles_owner_insert"
  ON public.voice_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid())::text = owner_user_id);

DROP POLICY IF EXISTS "voice_profiles_owner_update" ON public.voice_profiles;
CREATE POLICY "voice_profiles_owner_update"
  ON public.voice_profiles
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid())::text = owner_user_id)
  WITH CHECK ((select auth.uid())::text = owner_user_id);

DROP POLICY IF EXISTS "voice_profiles_owner_delete" ON public.voice_profiles;
CREATE POLICY "voice_profiles_owner_delete"
  ON public.voice_profiles
  FOR DELETE
  TO authenticated
  USING ((select auth.uid())::text = owner_user_id);

-- voice_samples --------------------------------------------------------------
DROP POLICY IF EXISTS "voice_samples_owner_select" ON public.voice_samples;
CREATE POLICY "voice_samples_owner_select"
  ON public.voice_samples
  FOR SELECT
  TO authenticated
  USING ((select auth.uid())::text = owner_user_id);

DROP POLICY IF EXISTS "voice_samples_owner_insert" ON public.voice_samples;
CREATE POLICY "voice_samples_owner_insert"
  ON public.voice_samples
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid())::text = owner_user_id);

DROP POLICY IF EXISTS "voice_samples_owner_update" ON public.voice_samples;
CREATE POLICY "voice_samples_owner_update"
  ON public.voice_samples
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid())::text = owner_user_id)
  WITH CHECK ((select auth.uid())::text = owner_user_id);

DROP POLICY IF EXISTS "voice_samples_owner_delete" ON public.voice_samples;
CREATE POLICY "voice_samples_owner_delete"
  ON public.voice_samples
  FOR DELETE
  TO authenticated
  USING ((select auth.uid())::text = owner_user_id);

-- voice_training_runs --------------------------------------------------------
DROP POLICY IF EXISTS "voice_training_runs_owner_select" ON public.voice_training_runs;
CREATE POLICY "voice_training_runs_owner_select"
  ON public.voice_training_runs
  FOR SELECT
  TO authenticated
  USING ((select auth.uid())::text = owner_user_id);

DROP POLICY IF EXISTS "voice_training_runs_owner_insert" ON public.voice_training_runs;
CREATE POLICY "voice_training_runs_owner_insert"
  ON public.voice_training_runs
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid())::text = owner_user_id);

DROP POLICY IF EXISTS "voice_training_runs_owner_update" ON public.voice_training_runs;
CREATE POLICY "voice_training_runs_owner_update"
  ON public.voice_training_runs
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid())::text = owner_user_id)
  WITH CHECK ((select auth.uid())::text = owner_user_id);

DROP POLICY IF EXISTS "voice_training_runs_owner_delete" ON public.voice_training_runs;
CREATE POLICY "voice_training_runs_owner_delete"
  ON public.voice_training_runs
  FOR DELETE
  TO authenticated
  USING ((select auth.uid())::text = owner_user_id);

-- voice_synth_sessions -------------------------------------------------------
DROP POLICY IF EXISTS "voice_synth_sessions_owner_select" ON public.voice_synth_sessions;
CREATE POLICY "voice_synth_sessions_owner_select"
  ON public.voice_synth_sessions
  FOR SELECT
  TO authenticated
  USING ((select auth.uid())::text = owner_user_id);

DROP POLICY IF EXISTS "voice_synth_sessions_owner_insert" ON public.voice_synth_sessions;
CREATE POLICY "voice_synth_sessions_owner_insert"
  ON public.voice_synth_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid())::text = owner_user_id);

DROP POLICY IF EXISTS "voice_synth_sessions_owner_update" ON public.voice_synth_sessions;
CREATE POLICY "voice_synth_sessions_owner_update"
  ON public.voice_synth_sessions
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid())::text = owner_user_id)
  WITH CHECK ((select auth.uid())::text = owner_user_id);

DROP POLICY IF EXISTS "voice_synth_sessions_owner_delete" ON public.voice_synth_sessions;
CREATE POLICY "voice_synth_sessions_owner_delete"
  ON public.voice_synth_sessions
  FOR DELETE
  TO authenticated
  USING ((select auth.uid())::text = owner_user_id);
