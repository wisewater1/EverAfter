/*
  # Fix Column Mismatches Between Frontend and Database

  The frontend expects certain column names that don't exist in the database.
  This migration adds the missing columns to maintain compatibility.
*/

-- ============================================================================
-- 1. Fix family_members table (add avatar_url and created_at)
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'family_members' AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE family_members ADD COLUMN avatar_url text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'family_members' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE family_members ADD COLUMN created_at timestamptz DEFAULT now();
  END IF;
END $$;

-- ============================================================================
-- 2. Fix agent_tasks table (add task_title and due_date aliases/columns)
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agent_tasks' AND column_name = 'task_title'
  ) THEN
    ALTER TABLE agent_tasks ADD COLUMN task_title text;
    -- Copy existing data from title to task_title
    UPDATE agent_tasks SET task_title = title WHERE task_title IS NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agent_tasks' AND column_name = 'due_date'
  ) THEN
    ALTER TABLE agent_tasks ADD COLUMN due_date timestamptz;
    -- Copy existing data from scheduled_for to due_date
    UPDATE agent_tasks SET due_date = scheduled_for WHERE due_date IS NULL;
  END IF;
END $$;

-- ============================================================================
-- 3. Fix health_metrics table (add metric_type and recorded_at if missing)
-- ============================================================================
DO $$
BEGIN
  -- Add metric_type column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'health_metrics' AND column_name = 'metric_type'
  ) THEN
    ALTER TABLE health_metrics ADD COLUMN metric_type text;
    -- Copy from metric column if it exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'health_metrics' AND column_name = 'metric'
    ) THEN
      UPDATE health_metrics SET metric_type = metric WHERE metric_type IS NULL;
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  -- Add recorded_at column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'health_metrics' AND column_name = 'recorded_at'
  ) THEN
    ALTER TABLE health_metrics ADD COLUMN recorded_at timestamptz;
    -- Copy from ts column if it exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'health_metrics' AND column_name = 'ts'
    ) THEN
      UPDATE health_metrics SET recorded_at = ts WHERE recorded_at IS NULL;
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  -- Add unit column if missing (frontend requests it)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'health_metrics' AND column_name = 'unit'
  ) THEN
    ALTER TABLE health_metrics ADD COLUMN unit text;
  END IF;
END $$;

-- ============================================================================
-- 4. Fix insight_reports table (add missing columns if table exists)
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'insight_reports') THEN
    -- Add report_title if missing
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'insight_reports' AND column_name = 'report_title'
    ) THEN
      ALTER TABLE insight_reports ADD COLUMN report_title text;
    END IF;

    -- Add report_type if missing
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'insight_reports' AND column_name = 'report_type'
    ) THEN
      ALTER TABLE insight_reports ADD COLUMN report_type text DEFAULT 'general';
    END IF;

    -- Add generated_at if missing
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'insight_reports' AND column_name = 'generated_at'
    ) THEN
      ALTER TABLE insight_reports ADD COLUMN generated_at timestamptz DEFAULT now();
    END IF;

    -- Add key_findings if missing
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'insight_reports' AND column_name = 'key_findings'
    ) THEN
      ALTER TABLE insight_reports ADD COLUMN key_findings jsonb DEFAULT '[]'::jsonb;
    END IF;
  ELSE
    -- Create table if it doesn't exist
    CREATE TABLE insight_reports (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      report_title text,
      report_type text DEFAULT 'general',
      generated_at timestamptz DEFAULT now(),
      key_findings jsonb DEFAULT '[]'::jsonb,
      full_report text,
      data_sources jsonb DEFAULT '[]'::jsonb,
      recommendations jsonb DEFAULT '[]'::jsonb,
      created_at timestamptz DEFAULT now()
    );
  END IF;
END $$;

-- Enable RLS (safe to run multiple times)
ALTER TABLE insight_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own insight reports" ON insight_reports;
CREATE POLICY "Users can view own insight reports"
  ON insight_reports FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can create own insight reports" ON insight_reports;
CREATE POLICY "Users can create own insight reports"
  ON insight_reports FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

-- ============================================================================
-- 5. Fix health_connections table (ensure it has expected columns)
-- ============================================================================
DO $$
BEGIN
  -- Add service_name if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'health_connections' AND column_name = 'service_name'
  ) THEN
    ALTER TABLE health_connections ADD COLUMN service_name text;
    -- Try to populate from provider column if exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'health_connections' AND column_name = 'provider'
    ) THEN
      UPDATE health_connections SET service_name = provider WHERE service_name IS NULL;
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  -- Add service_type if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'health_connections' AND column_name = 'service_type'
  ) THEN
    ALTER TABLE health_connections ADD COLUMN service_type text DEFAULT 'health_tracker';
  END IF;
END $$;

DO $$
BEGIN
  -- Add sync_frequency if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'health_connections' AND column_name = 'sync_frequency'
  ) THEN
    ALTER TABLE health_connections ADD COLUMN sync_frequency text DEFAULT 'daily';
  END IF;
END $$;

-- ============================================================================
-- 6. Create indexes for new columns (conditionally)
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_family_members_created_at ON family_members(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_due_date ON agent_tasks(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_health_metrics_recorded_at ON health_metrics(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_health_metrics_metric_type ON health_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_insight_reports_user_id ON insight_reports(user_id);

-- Create generated_at index only if column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'insight_reports' AND column_name = 'generated_at'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_insight_reports_generated_at ON insight_reports(generated_at DESC);
  END IF;
END $$;

-- ============================================================================
-- 7. Ensure RLS is enabled and has proper policies
-- ============================================================================

-- family_members RLS check
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'family_members' AND policyname = 'Users can view own family members'
  ) THEN
    CREATE POLICY "Users can view own family members"
      ON family_members FOR SELECT
      TO authenticated
      USING (user_id = (SELECT auth.uid()));
  END IF;
END $$;

-- health_metrics RLS check
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'health_metrics' AND policyname = 'Users can view own health metrics'
  ) THEN
    CREATE POLICY "Users can view own health metrics"
      ON health_metrics FOR SELECT
      TO authenticated
      USING (user_id = (SELECT auth.uid()));
  END IF;
END $$;

-- agent_tasks RLS check
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'agent_tasks' AND policyname = 'Users can view own agent tasks'
  ) THEN
    CREATE POLICY "Users can view own agent tasks"
      ON agent_tasks FOR SELECT
      TO authenticated
      USING (user_id = (SELECT auth.uid()));
  END IF;
END $$;

-- health_connections RLS check
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'health_connections' AND policyname = 'Users can view own health connections'
  ) THEN
    CREATE POLICY "Users can view own health connections"
      ON health_connections FOR SELECT
      TO authenticated
      USING (user_id = (SELECT auth.uid()));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'health_connections' AND policyname = 'Users can insert own health connections'
  ) THEN
    CREATE POLICY "Users can insert own health connections"
      ON health_connections FOR INSERT
      TO authenticated
      WITH CHECK (user_id = (SELECT auth.uid()));
  END IF;
END $$;

-- ============================================================================
-- 8. Add triggers to keep task_title and due_date in sync with title/scheduled_for
-- ============================================================================
CREATE OR REPLACE FUNCTION sync_agent_task_columns()
RETURNS TRIGGER AS $$
BEGIN
  -- Sync title to task_title
  IF NEW.title IS NOT NULL AND (NEW.task_title IS NULL OR NEW.task_title != NEW.title) THEN
    NEW.task_title := NEW.title;
  END IF;
  IF NEW.task_title IS NOT NULL AND (NEW.title IS NULL OR NEW.title != NEW.task_title) THEN
    NEW.title := NEW.task_title;
  END IF;

  -- Sync scheduled_for to due_date
  IF NEW.scheduled_for IS NOT NULL AND NEW.due_date IS NULL THEN
    NEW.due_date := NEW.scheduled_for;
  END IF;
  IF NEW.due_date IS NOT NULL AND NEW.scheduled_for IS NULL THEN
    NEW.scheduled_for := NEW.due_date;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_agent_task_columns_trigger ON agent_tasks;
CREATE TRIGGER sync_agent_task_columns_trigger
  BEFORE INSERT OR UPDATE ON agent_tasks
  FOR EACH ROW
  EXECUTE FUNCTION sync_agent_task_columns();

COMMENT ON FUNCTION sync_agent_task_columns() IS
'Keeps title/task_title and scheduled_for/due_date in sync for backwards compatibility';
