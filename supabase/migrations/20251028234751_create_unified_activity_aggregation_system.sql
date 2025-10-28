/*
  # Create Unified Activity Aggregation System

  1. New Tables
    - `unified_activities` - Central table for all app activities with auto-rotation
    - `activity_rotation_config` - Configuration for activity display rotation
    - `activity_category_stats` - Real-time stats for activity categories

  2. New Views
    - `v_today_activities` - View for today's activities
    - `v_activity_rotation_display` - Current rotation state for UI

  3. New Functions
    - `log_unified_activity()` - Log activity from anywhere in app
    - `get_rotating_activity_categories()` - Get current rotation state
    - `rotate_activity_categories()` - Manual rotation trigger

  4. Triggers
    - Auto-log activities from existing tables
    - Update category stats in real-time

  5. Security
    - Enable RLS on all new tables
    - Policies for authenticated users
*/

-- Create unified activities table
CREATE TABLE IF NOT EXISTS public.unified_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_type text NOT NULL CHECK (source_type IN (
    'saint', 'health', 'medication', 'task', 'engram', 
    'appointment', 'connection', 'insight', 'chat', 'file'
  )),
  source_id uuid,
  category text NOT NULL CHECK (category IN (
    'protection', 'support', 'memory', 'communication',
    'health', 'medication', 'appointment', 'task',
    'insight', 'connection', 'family', 'learning'
  )),
  action text NOT NULL,
  description text,
  impact text DEFAULT 'medium' CHECK (impact IN ('high', 'medium', 'low')),
  status text DEFAULT 'completed' CHECK (status IN ('completed', 'in_progress', 'scheduled', 'failed')),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_unified_activities_user_created ON public.unified_activities(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_unified_activities_category ON public.unified_activities(category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_unified_activities_source ON public.unified_activities(source_type, source_id);

-- Create activity rotation config table
CREATE TABLE IF NOT EXISTS public.activity_rotation_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rotation_interval_seconds integer DEFAULT 10 CHECK (rotation_interval_seconds >= 5),
  current_rotation_index integer DEFAULT 0,
  enabled boolean DEFAULT true,
  last_rotated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_activity_rotation_user ON public.activity_rotation_config(user_id);

-- Create activity category stats table for real-time counts
CREATE TABLE IF NOT EXISTS public.activity_category_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category text NOT NULL,
  display_name text NOT NULL,
  icon_name text NOT NULL,
  color text NOT NULL,
  today_count integer DEFAULT 0,
  week_count integer DEFAULT 0,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  last_activity_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, category)
);

CREATE INDEX IF NOT EXISTS idx_activity_category_stats_user ON public.activity_category_stats(user_id, sort_order);

-- Create view for today's activities
CREATE OR REPLACE VIEW public.v_today_activities AS
SELECT 
  ua.*,
  acs.display_name as category_display_name,
  acs.icon_name,
  acs.color as category_color
FROM public.unified_activities ua
LEFT JOIN public.activity_category_stats acs 
  ON ua.user_id = acs.user_id AND ua.category = acs.category
WHERE ua.created_at >= CURRENT_DATE
ORDER BY ua.created_at DESC;

-- Create view for activity rotation display
CREATE OR REPLACE VIEW public.v_activity_rotation_display AS
SELECT 
  acs.*,
  arc.rotation_interval_seconds,
  arc.current_rotation_index,
  arc.enabled as rotation_enabled,
  arc.last_rotated_at
FROM public.activity_category_stats acs
JOIN public.activity_rotation_config arc ON acs.user_id = arc.user_id
WHERE acs.is_active = true
ORDER BY acs.sort_order;

-- Function to log unified activity
CREATE OR REPLACE FUNCTION public.log_unified_activity(
  p_user_id uuid,
  p_source_type text,
  p_category text,
  p_action text,
  p_description text DEFAULT NULL,
  p_source_id uuid DEFAULT NULL,
  p_impact text DEFAULT 'medium',
  p_status text DEFAULT 'completed',
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_activity_id uuid;
BEGIN
  -- Insert activity
  INSERT INTO public.unified_activities (
    user_id, source_type, source_id, category, action, 
    description, impact, status, metadata
  )
  VALUES (
    p_user_id, p_source_type, p_source_id, p_category, p_action,
    p_description, p_impact, p_status, p_metadata
  )
  RETURNING id INTO v_activity_id;

  -- Update category stats
  INSERT INTO public.activity_category_stats (
    user_id, category, display_name, icon_name, color, 
    today_count, week_count, last_activity_at
  )
  VALUES (
    p_user_id, 
    p_category,
    INITCAP(p_category),
    CASE p_category
      WHEN 'protection' THEN 'Shield'
      WHEN 'support' THEN 'Heart'
      WHEN 'memory' THEN 'Brain'
      WHEN 'communication' THEN 'MessageCircle'
      WHEN 'health' THEN 'Activity'
      WHEN 'medication' THEN 'Pill'
      WHEN 'appointment' THEN 'Calendar'
      WHEN 'task' THEN 'CheckSquare'
      WHEN 'insight' THEN 'Lightbulb'
      WHEN 'connection' THEN 'Link'
      WHEN 'family' THEN 'Users'
      WHEN 'learning' THEN 'BookOpen'
      ELSE 'Star'
    END,
    CASE p_category
      WHEN 'protection' THEN 'blue'
      WHEN 'support' THEN 'rose'
      WHEN 'memory' THEN 'emerald'
      WHEN 'communication' THEN 'purple'
      WHEN 'health' THEN 'cyan'
      WHEN 'medication' THEN 'orange'
      WHEN 'appointment' THEN 'indigo'
      WHEN 'task' THEN 'teal'
      WHEN 'insight' THEN 'amber'
      WHEN 'connection' THEN 'sky'
      WHEN 'family' THEN 'pink'
      WHEN 'learning' THEN 'violet'
      ELSE 'slate'
    END,
    1, 1, now()
  )
  ON CONFLICT (user_id, category) 
  DO UPDATE SET
    today_count = CASE 
      WHEN DATE_TRUNC('day', activity_category_stats.last_activity_at) = CURRENT_DATE 
      THEN activity_category_stats.today_count + 1
      ELSE 1
    END,
    week_count = CASE
      WHEN activity_category_stats.last_activity_at >= CURRENT_DATE - interval '7 days'
      THEN activity_category_stats.week_count + 1
      ELSE 1
    END,
    last_activity_at = now(),
    updated_at = now();

  RETURN v_activity_id;
END;
$$;

-- Function to get rotating activity categories
CREATE OR REPLACE FUNCTION public.get_rotating_activity_categories(p_user_id uuid)
RETURNS TABLE (
  category text,
  display_name text,
  icon_name text,
  color text,
  today_count integer,
  is_current boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_rotation_index integer;
  v_total_categories integer;
BEGIN
  -- Get current rotation index
  SELECT current_rotation_index INTO v_rotation_index
  FROM public.activity_rotation_config
  WHERE user_id = p_user_id;

  -- Get total active categories
  SELECT COUNT(*) INTO v_total_categories
  FROM public.activity_category_stats
  WHERE user_id = p_user_id AND is_active = true;

  -- Return categories with current rotation indicator
  RETURN QUERY
  SELECT 
    acs.category,
    acs.display_name,
    acs.icon_name,
    acs.color,
    acs.today_count,
    (ROW_NUMBER() OVER (ORDER BY acs.sort_order) - 1) % GREATEST(v_total_categories, 1) = v_rotation_index AS is_current
  FROM public.activity_category_stats acs
  WHERE acs.user_id = p_user_id AND acs.is_active = true
  ORDER BY acs.sort_order;
END;
$$;

-- Function to rotate activity categories
CREATE OR REPLACE FUNCTION public.rotate_activity_categories(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_total_categories integer;
BEGIN
  -- Get total active categories
  SELECT COUNT(*) INTO v_total_categories
  FROM public.activity_category_stats
  WHERE user_id = p_user_id AND is_active = true;

  -- Rotate to next index
  UPDATE public.activity_rotation_config
  SET 
    current_rotation_index = (current_rotation_index + 1) % GREATEST(v_total_categories, 1),
    last_rotated_at = now(),
    updated_at = now()
  WHERE user_id = p_user_id;
END;
$$;

-- Trigger to auto-log saint activities
CREATE OR REPLACE FUNCTION public.trigger_log_saint_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  PERFORM public.log_unified_activity(
    NEW.user_id,
    'saint',
    NEW.category,
    NEW.action,
    NEW.description,
    NEW.id,
    NEW.impact,
    NEW.status,
    jsonb_build_object('saint_id', NEW.saint_id)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_saint_activity_to_unified ON public.saint_activities;
CREATE TRIGGER trigger_saint_activity_to_unified
  AFTER INSERT ON public.saint_activities
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_log_saint_activity();

-- Trigger to auto-log medication logs
CREATE OR REPLACE FUNCTION public.trigger_log_medication_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  PERFORM public.log_unified_activity(
    NEW.user_id,
    'medication',
    'medication',
    CASE WHEN NEW.taken THEN 'Medication Taken' ELSE 'Medication Skipped' END,
    'Medication log entry',
    NEW.id,
    'high',
    CASE WHEN NEW.taken THEN 'completed' ELSE 'failed' END,
    jsonb_build_object('medication_id', NEW.medication_id, 'taken', NEW.taken)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_medication_log_to_unified ON public.medication_logs;
CREATE TRIGGER trigger_medication_log_to_unified
  AFTER INSERT ON public.medication_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_log_medication_activity();

-- Trigger to auto-log tasks
CREATE OR REPLACE FUNCTION public.trigger_log_task_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    PERFORM public.log_unified_activity(
      NEW.user_id,
      'task',
      'task',
      'Task Completed',
      NEW.title,
      NEW.id,
      CASE NEW.priority
        WHEN 'urgent' THEN 'high'
        WHEN 'high' THEN 'high'
        WHEN 'normal' THEN 'medium'
        ELSE 'low'
      END,
      'completed',
      jsonb_build_object('task_type', NEW.task_type, 'priority', NEW.priority)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_task_to_unified ON public.engram_ai_tasks;
CREATE TRIGGER trigger_task_to_unified
  AFTER INSERT OR UPDATE ON public.engram_ai_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_log_task_activity();

-- Enable RLS
ALTER TABLE public.unified_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_rotation_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_category_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies for unified_activities
CREATE POLICY "Users can view own activities"
  ON public.unified_activities FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can insert activities"
  ON public.unified_activities FOR INSERT
  TO public
  WITH CHECK (true);

-- RLS Policies for activity_rotation_config
CREATE POLICY "Users can view own rotation config"
  ON public.activity_rotation_config FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own rotation config"
  ON public.activity_rotation_config FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "System can insert rotation config"
  ON public.activity_rotation_config FOR INSERT
  TO public
  WITH CHECK (true);

-- RLS Policies for activity_category_stats
CREATE POLICY "Users can view own category stats"
  ON public.activity_category_stats FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own category stats"
  ON public.activity_category_stats FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "System can insert category stats"
  ON public.activity_category_stats FOR INSERT
  TO public
  WITH CHECK (true);

-- Initialize rotation config for existing users
INSERT INTO public.activity_rotation_config (user_id, rotation_interval_seconds, enabled)
SELECT DISTINCT p.id, 10, true
FROM public.profiles p
ON CONFLICT (user_id) DO NOTHING;

COMMENT ON TABLE public.unified_activities IS 'Central activity log aggregating all app activities for unified display';
COMMENT ON TABLE public.activity_rotation_config IS 'Configuration for auto-rotating activity categories in the UI';
COMMENT ON TABLE public.activity_category_stats IS 'Real-time statistics for activity categories';
COMMENT ON FUNCTION public.log_unified_activity IS 'Logs activity from any source to unified activity stream';
