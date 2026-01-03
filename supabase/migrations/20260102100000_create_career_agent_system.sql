-- Career Agent System Migration
-- Creates tables for the Personal Career Agent feature
-- Integrates career coaching, goal tracking, lead capture, and public chat

-- ============================================================================
-- 1. CAREER PROFILES TABLE
-- Extended career data for users, including public chat settings
-- ============================================================================
CREATE TABLE IF NOT EXISTS career_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Professional Information
  linkedin_summary text,
  current_role text,
  industry text,
  years_experience integer,
  skills jsonb DEFAULT '[]'::jsonb,
  career_interests jsonb DEFAULT '[]'::jsonb,

  -- Public Chat Settings
  public_chat_enabled boolean DEFAULT false,
  public_chat_token text UNIQUE,
  public_chat_greeting text DEFAULT 'Hi! I''m an AI assistant that can answer questions about my career and background. How can I help you?',

  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  CONSTRAINT unique_user_career_profile UNIQUE (user_id)
);

-- ============================================================================
-- 2. CAREER CHAT MESSAGES TABLE
-- Stores conversation history for both authenticated and anonymous users
-- ============================================================================
CREATE TABLE IF NOT EXISTS career_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User identification (one of these should be set)
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  visitor_token text,  -- For anonymous visitors using public chat
  profile_owner_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,  -- Whose career agent is this

  -- Message content
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content text NOT NULL,

  -- Tool execution tracking
  tool_calls jsonb DEFAULT '[]'::jsonb,

  -- Metadata
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),

  -- Ensure either user_id or visitor_token is provided
  CONSTRAINT valid_sender CHECK (user_id IS NOT NULL OR visitor_token IS NOT NULL)
);

-- ============================================================================
-- 3. CAREER GOALS TABLE
-- Tracks user's career objectives with progress tracking
-- ============================================================================
CREATE TABLE IF NOT EXISTS career_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Goal details
  goal_title text NOT NULL,
  goal_description text,
  goal_category text NOT NULL CHECK (goal_category IN (
    'skills',        -- Learning new skills
    'role',          -- Job title/position goals
    'salary',        -- Compensation goals
    'network',       -- Networking/connections
    'certification', -- Certifications/education
    'project',       -- Project-based goals
    'other'          -- Miscellaneous
  )),

  -- Progress tracking
  target_value text,
  current_progress text,
  progress_percentage integer DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),

  -- Status and priority
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned', 'paused')),
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),

  -- Timeline
  target_date date,
  completed_at timestamptz,

  -- Metadata
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- 4. CAREER LEADS TABLE
-- Captures interested visitor contact information
-- ============================================================================
CREATE TABLE IF NOT EXISTS career_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,  -- Career profile owner

  -- Visitor information
  visitor_email text NOT NULL,
  visitor_name text,
  visitor_company text,
  visitor_role text,

  -- Interest details
  opportunity_interest text,  -- What they're interested in
  notes text,                 -- Additional context from conversation

  -- Source tracking
  source_token text,          -- Public chat token they used
  conversation_context jsonb DEFAULT '{}'::jsonb,  -- Relevant conversation snippets

  -- Status management
  status text NOT NULL DEFAULT 'new' CHECK (status IN (
    'new',        -- Just captured
    'contacted',  -- User has reached out
    'qualified',  -- Qualified as real opportunity
    'converted',  -- Became actual opportunity
    'rejected'    -- Not a fit
  )),

  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- 5. CAREER UNKNOWN QUESTIONS TABLE
-- Logs questions the AI couldn't answer for knowledge base improvement
-- ============================================================================
CREATE TABLE IF NOT EXISTS career_unknown_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,  -- Career profile owner

  -- Question details
  question_text text NOT NULL,
  visitor_token text,  -- If from anonymous visitor

  -- Context
  context jsonb DEFAULT '{}'::jsonb,  -- Conversation context when asked
  attempted_response text,            -- What the AI tried to say

  -- Resolution
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'ignored')),
  resolution text,                    -- How it was resolved (added to knowledge base, etc.)

  -- Metadata
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Career profiles
CREATE INDEX IF NOT EXISTS idx_career_profiles_user_id ON career_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_career_profiles_public_token ON career_profiles(public_chat_token) WHERE public_chat_token IS NOT NULL;

-- Career chat messages
CREATE INDEX IF NOT EXISTS idx_career_chat_messages_user_id ON career_chat_messages(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_career_chat_messages_visitor_token ON career_chat_messages(visitor_token) WHERE visitor_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_career_chat_messages_profile_owner ON career_chat_messages(profile_owner_id);
CREATE INDEX IF NOT EXISTS idx_career_chat_messages_created_at ON career_chat_messages(created_at DESC);

-- Career goals
CREATE INDEX IF NOT EXISTS idx_career_goals_user_id ON career_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_career_goals_status ON career_goals(status);
CREATE INDEX IF NOT EXISTS idx_career_goals_category ON career_goals(goal_category);
CREATE INDEX IF NOT EXISTS idx_career_goals_target_date ON career_goals(target_date) WHERE target_date IS NOT NULL;

-- Career leads
CREATE INDEX IF NOT EXISTS idx_career_leads_user_id ON career_leads(user_id);
CREATE INDEX IF NOT EXISTS idx_career_leads_status ON career_leads(status);
CREATE INDEX IF NOT EXISTS idx_career_leads_created_at ON career_leads(created_at DESC);

-- Career unknown questions
CREATE INDEX IF NOT EXISTS idx_career_unknown_questions_user_id ON career_unknown_questions(user_id);
CREATE INDEX IF NOT EXISTS idx_career_unknown_questions_status ON career_unknown_questions(status);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE career_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_unknown_questions ENABLE ROW LEVEL SECURITY;

-- Career Profiles Policies
CREATE POLICY "Users can view own career profile"
  ON career_profiles FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can create own career profile"
  ON career_profiles FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own career profile"
  ON career_profiles FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own career profile"
  ON career_profiles FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- Career Chat Messages Policies
CREATE POLICY "Users can view own chat messages"
  ON career_chat_messages FOR SELECT
  TO authenticated
  USING (
    user_id = (select auth.uid())
    OR profile_owner_id = (select auth.uid())
  );

CREATE POLICY "Users can create chat messages"
  ON career_chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (select auth.uid())
    OR profile_owner_id = (select auth.uid())
  );

-- Anonymous visitors can insert messages with valid token (validated in Edge Function)
CREATE POLICY "Anonymous can insert chat messages with token"
  ON career_chat_messages FOR INSERT
  TO anon
  WITH CHECK (visitor_token IS NOT NULL);

-- Career Goals Policies
CREATE POLICY "Users can view own career goals"
  ON career_goals FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can create career goals"
  ON career_goals FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own career goals"
  ON career_goals FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own career goals"
  ON career_goals FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- Career Leads Policies
CREATE POLICY "Users can view own leads"
  ON career_leads FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can manage own leads"
  ON career_leads FOR ALL
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- Anonymous can insert leads (via Edge Function with token validation)
CREATE POLICY "Anonymous can submit leads"
  ON career_leads FOR INSERT
  TO anon
  WITH CHECK (true);

-- Career Unknown Questions Policies
CREATE POLICY "Users can view own unknown questions"
  ON career_unknown_questions FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can manage own unknown questions"
  ON career_unknown_questions FOR ALL
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- Anonymous can insert unknown questions (via Edge Function with token validation)
CREATE POLICY "Anonymous can submit unknown questions"
  ON career_unknown_questions FOR INSERT
  TO anon
  WITH CHECK (true);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_career_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_career_profiles_updated_at
  BEFORE UPDATE ON career_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_career_updated_at();

CREATE TRIGGER trigger_career_goals_updated_at
  BEFORE UPDATE ON career_goals
  FOR EACH ROW
  EXECUTE FUNCTION update_career_updated_at();

CREATE TRIGGER trigger_career_leads_updated_at
  BEFORE UPDATE ON career_leads
  FOR EACH ROW
  EXECUTE FUNCTION update_career_updated_at();

-- Auto-set completed_at when goal status changes to completed
CREATE OR REPLACE FUNCTION set_career_goal_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    NEW.completed_at = now();
  ELSIF NEW.status != 'completed' THEN
    NEW.completed_at = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_career_goal_completed
  BEFORE UPDATE ON career_goals
  FOR EACH ROW
  EXECUTE FUNCTION set_career_goal_completed_at();

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Generate unique public chat token
CREATE OR REPLACE FUNCTION generate_public_chat_token()
RETURNS text AS $$
DECLARE
  token text;
  token_exists boolean;
BEGIN
  LOOP
    -- Generate a random 12-character alphanumeric token
    token := encode(gen_random_bytes(9), 'base64');
    token := replace(replace(replace(token, '+', ''), '/', ''), '=', '');
    token := substring(token from 1 for 12);

    -- Check if token already exists
    SELECT EXISTS(SELECT 1 FROM career_profiles WHERE public_chat_token = token) INTO token_exists;

    EXIT WHEN NOT token_exists;
  END LOOP;

  RETURN token;
END;
$$ LANGUAGE plpgsql;

-- Get career profile by public token (for anonymous access)
CREATE OR REPLACE FUNCTION get_career_profile_by_token(p_token text)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  linkedin_summary text,
  current_role text,
  industry text,
  years_experience integer,
  skills jsonb,
  public_chat_greeting text
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cp.id,
    cp.user_id,
    cp.linkedin_summary,
    cp.current_role,
    cp.industry,
    cp.years_experience,
    cp.skills,
    cp.public_chat_greeting
  FROM career_profiles cp
  WHERE cp.public_chat_token = p_token
    AND cp.public_chat_enabled = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE career_profiles IS 'Extended career information for users, including public chat settings';
COMMENT ON TABLE career_chat_messages IS 'Conversation history for career agent chats (both authenticated and anonymous)';
COMMENT ON TABLE career_goals IS 'User career objectives with progress tracking';
COMMENT ON TABLE career_leads IS 'Captured visitor contact information from career chats';
COMMENT ON TABLE career_unknown_questions IS 'Questions the AI could not answer, for knowledge base improvement';

COMMENT ON COLUMN career_profiles.public_chat_token IS 'Unique token for shareable public chat URL';
COMMENT ON COLUMN career_chat_messages.profile_owner_id IS 'The user whose career agent is being chatted with';
COMMENT ON COLUMN career_chat_messages.visitor_token IS 'Identifier for anonymous visitors (not authenticated)';
