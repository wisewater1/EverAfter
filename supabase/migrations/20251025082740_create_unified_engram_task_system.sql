/*
  # Create Unified Engram Task System (Production)

  Creates the single source of truth for tasks: engram_ai_tasks bound to engrams.
  St. Raphael and all health personas operate through this unified schema.

  ## Tables
  - engram_ai_tasks: Tasks owned by an engram (health companion)
    - Replaces the fragmented agent_tasks/ai_tasks/saint_tasks mess
    - Full audit trail with execution_log
    - RLS enforced with auth.uid()

  ## Security
  - RLS enabled on all tables
  - Users can only access their own engrams' tasks
  - All policies optimized with (select auth.uid())
*/

-- Create engram_ai_tasks table (the ONE task system)
CREATE TABLE IF NOT EXISTS engram_ai_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  engram_id uuid NOT NULL REFERENCES engrams(id) ON DELETE CASCADE,
  title text NOT NULL,
  task_description text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'done', 'failed', 'cancelled')),
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  execution_log jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_engram_ai_tasks_user_id ON engram_ai_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_engram_ai_tasks_engram_id ON engram_ai_tasks(engram_id);
CREATE INDEX IF NOT EXISTS idx_engram_ai_tasks_status ON engram_ai_tasks(status);
CREATE INDEX IF NOT EXISTS idx_engram_ai_tasks_created_at ON engram_ai_tasks(created_at DESC);

-- Enable RLS
ALTER TABLE engram_ai_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies (optimized with select auth.uid())
CREATE POLICY "Users can view own engram tasks" ON engram_ai_tasks
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can create own engram tasks" ON engram_ai_tasks
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own engram tasks" ON engram_ai_tasks
  FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own engram tasks" ON engram_ai_tasks
  FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_engram_task_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  NEW.updated_at = now();
  IF NEW.status IN ('done', 'failed', 'cancelled') AND OLD.status NOT IN ('done', 'failed', 'cancelled') THEN
    NEW.completed_at = now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_engram_task_timestamp_trigger ON engram_ai_tasks;
CREATE TRIGGER update_engram_task_timestamp_trigger
  BEFORE UPDATE ON engram_ai_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_engram_task_timestamp();