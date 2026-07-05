-- PostgREST upsert (supabase-js .upsert with onConflict) targets a plain
-- ON CONFLICT (cols) clause, which Postgres only matches against a full
-- unique index. The legacy-id bridges were created as partial indexes
-- (WHERE legacy_id IS NOT NULL), so every client upsert keyed by
-- (user_id, legacy_id) fails with "no unique or exclusion constraint
-- matching the ON CONFLICT specification". Recreate them as full unique
-- indexes; NULLs are distinct by default, so rows without a legacy id
-- (the invitation flow) are unaffected.

DROP INDEX IF EXISTS public.family_members_user_legacy_unique;
CREATE UNIQUE INDEX IF NOT EXISTS family_members_user_legacy_unique
    ON public.family_members (user_id, legacy_id);

DROP INDEX IF EXISTS public.family_tree_events_user_legacy_unique;
CREATE UNIQUE INDEX IF NOT EXISTS family_tree_events_user_legacy_unique
    ON public.family_tree_events (user_id, legacy_event_id);
