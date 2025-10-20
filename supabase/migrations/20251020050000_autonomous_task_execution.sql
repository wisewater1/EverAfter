/*
  # Autonomous Task Execution System

  1. New Tables
    - `agent_credentials` - Secure credential storage for AI agents
    - `agent_task_queue` - Background task queue for autonomous execution
    - `agent_task_executions` - Detailed execution history and logs
    - `agent_notifications` - Health and task-related notifications
    - `agent_email_logs` - Email sending history
    - `credential_requests` - Requests for credentials when needed

  2. Security
    - RLS enabled on all tables
    - Encrypted credential storage
    - User-scoped access controls
    - Audit logging for all operations

  3. Features
    - Background task execution
    - Credential management with approval workflow
    - Email sending on behalf of users
    - Health notification tracking
    - Complete execution audit trail
*/

-- Agent Credentials (encrypted storage)
CREATE TABLE IF NOT EXISTS agent_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  engram_id uuid REFERENCES engrams(id) ON DELETE CASCADE,
  credential_type text NOT NULL CHECK (credential_type IN ('email', 'health_portal', 'pharmacy', 'insurance', 'custom')),
  service_name text NOT NULL,
  username text,
  encrypted_password text,
  additional_data jsonb DEFAULT '{}'::jsonb,
  is_verified boolean DEFAULT false,
  last_used_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_agent_credentials_user ON agent_credentials(user_id);
CREATE INDEX idx_agent_credentials_engram ON agent_credentials(engram_id);
CREATE INDEX idx_agent_credentials_type ON agent_credentials(credential_type);

-- Agent Task Queue (for background execution)
CREATE TABLE IF NOT EXISTS agent_task_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engram_id uuid NOT NULL REFERENCES engrams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_type text NOT NULL CHECK (task_type IN (
    'doctor_appointment', 'prescription_refill', 'insurance_claim',
    'lab_results', 'health_reminder', 'email_send', 'research', 'custom'
  )),
  task_title text NOT NULL,
  task_description text NOT NULL,
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),

  -- Execution details
  status text DEFAULT 'pending' CHECK (status IN (
    'pending', 'awaiting_credentials', 'in_progress', 'completed',
    'failed', 'cancelled', 'requires_approval'
  )),
  scheduled_for timestamptz DEFAULT now(),
  retry_count int DEFAULT 0,
  max_retries int DEFAULT 3,

  -- Task configuration
  requires_credentials boolean DEFAULT false,
  credential_ids uuid[] DEFAULT ARRAY[]::uuid[],
  execution_config jsonb DEFAULT '{}'::jsonb,

  -- Results
  result jsonb,
  error_message text,
  completion_percentage int DEFAULT 0,

  -- Timestamps
  started_at timestamptz,
  completed_at timestamptz,
  last_retry_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_agent_task_queue_status ON agent_task_queue(status);
CREATE INDEX idx_agent_task_queue_user ON agent_task_queue(user_id);
CREATE INDEX idx_agent_task_queue_engram ON agent_task_queue(engram_id);
CREATE INDEX idx_agent_task_queue_scheduled ON agent_task_queue(scheduled_for);
CREATE INDEX idx_agent_task_queue_type ON agent_task_queue(task_type);

-- Agent Task Executions (detailed execution logs)
CREATE TABLE IF NOT EXISTS agent_task_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES agent_task_queue(id) ON DELETE CASCADE,
  execution_step text NOT NULL,
  step_order int NOT NULL,
  status text NOT NULL CHECK (status IN ('started', 'in_progress', 'completed', 'failed', 'skipped')),
  step_description text,
  step_result jsonb,
  error_details text,
  duration_ms bigint,
  ai_reasoning text,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX idx_agent_task_executions_task ON agent_task_executions(task_id);
CREATE INDEX idx_agent_task_executions_order ON agent_task_executions(task_id, step_order);

-- Agent Notifications (health & task notifications)
CREATE TABLE IF NOT EXISTS agent_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  engram_id uuid REFERENCES engrams(id) ON DELETE CASCADE,
  task_id uuid REFERENCES agent_task_queue(id) ON DELETE SET NULL,

  notification_type text NOT NULL CHECK (notification_type IN (
    'task_completed', 'task_failed', 'credential_needed', 'approval_needed',
    'appointment_scheduled', 'prescription_ready', 'lab_results_available',
    'health_reminder', 'insurance_update', 'custom'
  )),

  title text NOT NULL,
  message text NOT NULL,
  priority text DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),

  -- Notification state
  is_read boolean DEFAULT false,
  is_actionable boolean DEFAULT false,
  action_url text,
  action_taken boolean DEFAULT false,

  -- Health-specific fields
  health_category text,
  related_appointment_date timestamptz,
  medication_name text,

  -- Metadata
  metadata jsonb DEFAULT '{}'::jsonb,

  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_agent_notifications_user ON agent_notifications(user_id);
CREATE INDEX idx_agent_notifications_unread ON agent_notifications(user_id, is_read);
CREATE INDEX idx_agent_notifications_type ON agent_notifications(notification_type);
CREATE INDEX idx_agent_notifications_created ON agent_notifications(created_at DESC);

-- Agent Email Logs (emails sent by AI)
CREATE TABLE IF NOT EXISTS agent_email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES agent_task_queue(id) ON DELETE SET NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  engram_id uuid REFERENCES engrams(id) ON DELETE SET NULL,

  -- Email details
  to_addresses text[] NOT NULL,
  cc_addresses text[] DEFAULT ARRAY[]::text[],
  subject text NOT NULL,
  body_text text NOT NULL,
  body_html text,

  -- Sending details
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'bounced')),
  provider text DEFAULT 'sendgrid',
  provider_message_id text,

  -- Context
  email_purpose text,
  is_automated boolean DEFAULT true,
  requires_approval boolean DEFAULT true,
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,

  sent_at timestamptz,
  failed_at timestamptz,
  error_message text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_agent_email_logs_user ON agent_email_logs(user_id);
CREATE INDEX idx_agent_email_logs_task ON agent_email_logs(task_id);
CREATE INDEX idx_agent_email_logs_status ON agent_email_logs(status);

-- Credential Requests (when AI needs credentials)
CREATE TABLE IF NOT EXISTS credential_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES agent_task_queue(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  engram_id uuid REFERENCES engrams(id) ON DELETE SET NULL,

  credential_type text NOT NULL,
  service_name text NOT NULL,
  purpose text NOT NULL,
  ai_reasoning text,

  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),

  -- Provided credentials (encrypted)
  provided_username text,
  provided_password_encrypted text,
  additional_info jsonb DEFAULT '{}'::jsonb,

  responded_at timestamptz,
  expires_at timestamptz DEFAULT (now() + interval '24 hours'),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_credential_requests_user ON credential_requests(user_id);
CREATE INDEX idx_credential_requests_task ON credential_requests(task_id);
CREATE INDEX idx_credential_requests_status ON credential_requests(status);

-- Health Task Templates (common health tasks)
CREATE TABLE IF NOT EXISTS health_task_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name text NOT NULL UNIQUE,
  task_type text NOT NULL,
  display_name text NOT NULL,
  description text,
  required_credentials text[],
  default_priority text DEFAULT 'medium',
  execution_steps jsonb NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Insert common health task templates
INSERT INTO health_task_templates (template_name, task_type, display_name, description, required_credentials, execution_steps) VALUES
('doctor_appointment_booking', 'doctor_appointment', 'Book Doctor Appointment', 'Schedule an appointment with your healthcare provider',
  ARRAY['health_portal'],
  '[
    {"step": "login_to_portal", "description": "Log into patient portal"},
    {"step": "find_available_slots", "description": "Search for available appointment times"},
    {"step": "select_appointment", "description": "Choose best available slot"},
    {"step": "confirm_booking", "description": "Confirm appointment details"},
    {"step": "send_confirmation", "description": "Send confirmation email to user"}
  ]'::jsonb),

('prescription_refill', 'prescription_refill', 'Refill Prescription', 'Request prescription refill from pharmacy',
  ARRAY['pharmacy'],
  '[
    {"step": "login_to_pharmacy", "description": "Access pharmacy account"},
    {"step": "locate_prescription", "description": "Find prescription in system"},
    {"step": "request_refill", "description": "Submit refill request"},
    {"step": "confirm_pickup", "description": "Confirm pickup details"},
    {"step": "notify_user", "description": "Notify when ready for pickup"}
  ]'::jsonb),

('lab_results_check', 'lab_results', 'Check Lab Results', 'Check and retrieve laboratory test results',
  ARRAY['health_portal'],
  '[
    {"step": "login_to_portal", "description": "Access patient portal"},
    {"step": "check_results", "description": "Check for new lab results"},
    {"step": "download_results", "description": "Download result documents"},
    {"step": "analyze_results", "description": "AI analysis of results"},
    {"step": "notify_user", "description": "Alert user of new results"}
  ]'::jsonb);

-- Enable Row Level Security
ALTER TABLE agent_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_task_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_task_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE credential_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_task_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for agent_credentials
CREATE POLICY "Users can view own credentials"
  ON agent_credentials FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own credentials"
  ON agent_credentials FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own credentials"
  ON agent_credentials FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own credentials"
  ON agent_credentials FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for agent_task_queue
CREATE POLICY "Users can view own tasks"
  ON agent_task_queue FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tasks"
  ON agent_task_queue FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tasks"
  ON agent_task_queue FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own tasks"
  ON agent_task_queue FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for agent_task_executions
CREATE POLICY "Users can view own task executions"
  ON agent_task_executions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM agent_task_queue
      WHERE agent_task_queue.id = agent_task_executions.task_id
      AND agent_task_queue.user_id = auth.uid()
    )
  );

-- RLS Policies for agent_notifications
CREATE POLICY "Users can view own notifications"
  ON agent_notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON agent_notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for agent_email_logs
CREATE POLICY "Users can view own email logs"
  ON agent_email_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for credential_requests
CREATE POLICY "Users can view own credential requests"
  ON credential_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own credential requests"
  ON credential_requests FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for health_task_templates
CREATE POLICY "Anyone can view templates"
  ON health_task_templates FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Functions for task management

-- Function to update task status
CREATE OR REPLACE FUNCTION update_task_status()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();

  -- Auto-set timestamps based on status
  IF NEW.status = 'in_progress' AND OLD.status != 'in_progress' THEN
    NEW.started_at = now();
  END IF;

  IF NEW.status IN ('completed', 'failed', 'cancelled') AND OLD.status NOT IN ('completed', 'failed', 'cancelled') THEN
    NEW.completed_at = now();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_task_status
  BEFORE UPDATE ON agent_task_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_task_status();

-- Function to create notification when task completes
CREATE OR REPLACE FUNCTION create_task_notification()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('completed', 'failed') AND OLD.status NOT IN ('completed', 'failed') THEN
    INSERT INTO agent_notifications (
      user_id,
      engram_id,
      task_id,
      notification_type,
      title,
      message,
      priority,
      is_actionable
    ) VALUES (
      NEW.user_id,
      NEW.engram_id,
      NEW.id,
      CASE WHEN NEW.status = 'completed' THEN 'task_completed' ELSE 'task_failed' END,
      CASE WHEN NEW.status = 'completed'
        THEN 'Task Completed: ' || NEW.task_title
        ELSE 'Task Failed: ' || NEW.task_title
      END,
      CASE WHEN NEW.status = 'completed'
        THEN 'Your task has been completed successfully.'
        ELSE 'Your task encountered an error: ' || COALESCE(NEW.error_message, 'Unknown error')
      END,
      CASE WHEN NEW.status = 'failed' THEN 'high' ELSE 'normal' END,
      CASE WHEN NEW.status = 'failed' THEN true ELSE false END
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_task_notification
  AFTER UPDATE ON agent_task_queue
  FOR EACH ROW
  EXECUTE FUNCTION create_task_notification();

-- Function to auto-expire credential requests
CREATE OR REPLACE FUNCTION expire_old_credential_requests()
RETURNS void AS $$
BEGIN
  UPDATE credential_requests
  SET status = 'expired'
  WHERE status = 'pending'
  AND expires_at < now();
END;
$$ LANGUAGE plpgsql;

-- Create index for faster querying of pending tasks
CREATE INDEX idx_agent_task_queue_pending ON agent_task_queue(status, scheduled_for)
WHERE status IN ('pending', 'awaiting_credentials', 'in_progress');

-- Create composite indexes for common queries
CREATE INDEX idx_agent_notifications_user_unread ON agent_notifications(user_id, created_at DESC)
WHERE is_read = false;

CREATE INDEX idx_agent_task_queue_active ON agent_task_queue(user_id, status, created_at DESC)
WHERE status NOT IN ('completed', 'cancelled', 'failed');
