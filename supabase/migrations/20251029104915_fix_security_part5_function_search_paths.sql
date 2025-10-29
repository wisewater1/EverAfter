/*
  # Fix Security Issues - Part 5: Fix Function Search Paths

  Set immutable search_path for all functions to prevent security issues.
*/

DO $$
BEGIN
  -- Set immutable search_path for all functions (ignore if function doesn't exist)
  BEGIN
    ALTER FUNCTION public.update_agent_memory_access(uuid, timestamp with time zone)
      SET search_path = public, pg_temp;
  EXCEPTION WHEN undefined_function THEN NULL;
  END;

  BEGIN
    ALTER FUNCTION public.get_agent_memory_stats(uuid)
      SET search_path = public, pg_temp;
  EXCEPTION WHEN undefined_function THEN NULL;
  END;

  BEGIN
    ALTER FUNCTION public.get_user_analytics_summary(uuid)
      SET search_path = public, pg_temp;
  EXCEPTION WHEN undefined_function THEN NULL;
  END;

  BEGIN
    ALTER FUNCTION public.capture_personality_snapshot(uuid)
      SET search_path = public, pg_temp;
  EXCEPTION WHEN undefined_function THEN NULL;
  END;

  BEGIN
    ALTER FUNCTION public.clean_expired_dashboard_cache()
      SET search_path = public, pg_temp;
  EXCEPTION WHEN undefined_function THEN NULL;
  END;

  BEGIN
    ALTER FUNCTION public.search_agent_memories(uuid, text, integer)
      SET search_path = public, pg_temp;
  EXCEPTION WHEN undefined_function THEN NULL;
  END;

  BEGIN
    ALTER FUNCTION public.initialize_analytics_preferences(uuid)
      SET search_path = public, pg_temp;
  EXCEPTION WHEN undefined_function THEN NULL;
  END;

  BEGIN
    ALTER FUNCTION public.get_insight_report_stats(uuid)
      SET search_path = public, pg_temp;
  EXCEPTION WHEN undefined_function THEN NULL;
  END;

  BEGIN
    ALTER FUNCTION public.get_latest_metric(uuid, text)
      SET search_path = public, pg_temp;
  EXCEPTION WHEN undefined_function THEN NULL;
  END;

  BEGIN
    ALTER FUNCTION public.calculate_ai_readiness_score(uuid)
      SET search_path = public, pg_temp;
  EXCEPTION WHEN undefined_function THEN NULL;
  END;

  BEGIN
    ALTER FUNCTION public.update_dashboard_updated_at()
      SET search_path = public, pg_temp;
  EXCEPTION WHEN undefined_function THEN NULL;
  END;

  BEGIN
    ALTER FUNCTION public.update_ai_interaction_count()
      SET search_path = public, pg_temp;
  EXCEPTION WHEN undefined_function THEN NULL;
  END;

  BEGIN
    ALTER FUNCTION public.get_latest_insight_report(uuid)
      SET search_path = public, pg_temp;
  EXCEPTION WHEN undefined_function THEN NULL;
  END;

  BEGIN
    ALTER FUNCTION public.handle_new_user()
      SET search_path = public, pg_temp;
  EXCEPTION WHEN undefined_function THEN NULL;
  END;

  BEGIN
    ALTER FUNCTION public.advance_analytics_rotation(uuid)
      SET search_path = public, pg_temp;
  EXCEPTION WHEN undefined_function THEN NULL;
  END;

  BEGIN
    ALTER FUNCTION public.get_metric_series(uuid, text, timestamp with time zone, timestamp with time zone)
      SET search_path = public, pg_temp;
  EXCEPTION WHEN undefined_function THEN NULL;
  END;

  BEGIN
    ALTER FUNCTION public.update_archetypal_ai_activation()
      SET search_path = public, pg_temp;
  EXCEPTION WHEN undefined_function THEN NULL;
  END;
END $$;
