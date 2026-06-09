/*
  # Agent Tasks System for St. Raphael Health Management

  1. New Tables
    - `agent_tasks`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `saint_id` (text) - which saint AI is handling this
      - `task_type` (text) - appointment, prescription, lab_results, insurance, wellness, etc.
      - `title` (text) - task title
      - `description` (text) - detailed description
      - `status` (text) - pending, in_progress, completed, failed, scheduled
      - `priority` (text) - low, medium, high
      - `details` (jsonb) - structured task details
      - `result` (jsonb) - task completion results
      - `scheduled_for` (timestamptz) - when task should execute
      - `completed_at` (timestamptz) - when task was completed
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `agent_task_logs`
      - `id` (uuid, primary key)
      - `task_id` (uuid, references agent_tasks)
      - `action` (text) - what happened
      - `details` (jsonb) - action details
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Users can only access their own tasks
    - Tasks are private to each user

  3. Functions
    - Function to automatically update `updated_at` timestamp
*/

-- Create agent_tasks table
CREATE TABLE IF NOT EXISTS agent_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  saint_id text NOT NULL DEFAULT 'raphael',
  task_type text NOT NULL,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pending',
  priority text NOT NULL DEFAULT 'medium',
  details jsonb DEFAULT '{}'::jsonb,
  result jsonb DEFAULT '{}'::jsonb,
  scheduled_for timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create agent_task_logs table
CREATE TABLE IF NOT EXISTS agent_task_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES agent_tasks(id) ON DELETE CASCADE NOT NULL,
  action text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_agent_tasks_user_id ON agent_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_saint_id ON agent_tasks(saint_id);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_status ON agent_tasks(status);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_created_at ON agent_tasks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_task_logs_task_id ON agent_task_logs(task_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for agent_tasks
DROP TRIGGER IF EXISTS update_agent_tasks_updated_at ON agent_tasks;
CREATE TRIGGER update_agent_tasks_updated_at
  BEFORE UPDATE ON agent_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE agent_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_task_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for agent_tasks
CREATE POLICY "Users can view own agent tasks"
  ON agent_tasks FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own agent tasks"
  ON agent_tasks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own agent tasks"
  ON agent_tasks FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own agent tasks"
  ON agent_tasks FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for agent_task_logs
CREATE POLICY "Users can view logs for own tasks"
  ON agent_task_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM agent_tasks
      WHERE agent_tasks.id = agent_task_logs.task_id
      AND agent_tasks.user_id = auth.uid()
    )
  );

CREATE POLICY "System can create task logs"
  ON agent_task_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM agent_tasks
      WHERE agent_tasks.id = agent_task_logs.task_id
      AND agent_tasks.user_id = auth.uid()
    )
  );
