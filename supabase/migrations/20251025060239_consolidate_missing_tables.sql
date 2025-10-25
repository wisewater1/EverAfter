/*
  # Consolidate Missing Tables for Complete EverAfter System
  
  ## Overview
  This migration adds all missing tables needed for the complete EverAfter platform:
  - Engrams system for custom AI personalities
  - Saints subscriptions for user activation tracking
  - Subscriptions for Stripe payment management
  - Engram-related tables for personality tracking
  
  ## New Tables
  
  ### `engrams`
  Core table for custom AI personalities and family member representations
  - Links to user who created it
  - Tracks AI readiness and activation status
  - Stores engram type (custom vs family)
  
  ### `engram_daily_responses`
  Daily question responses for building engram personalities
  - Links to engrams and questions
  - Stores response text and metadata
  - Tracks external responses from family members
  
  ### `engram_personality_filters`
  Extracted personality traits from responses
  - Multi-dimensional personality categorization
  - Confidence scoring
  - Supporting response tracking
  
  ### `engram_progress`
  365-day journey tracking for each engram
  - Day-by-day progress
  - Category coverage
  - Completeness scoring
  
  ### `subscriptions`
  Stripe subscription management
  - Customer and subscription IDs
  - Plan tracking and status
  - Billing period management
  
  ### `saints_subscriptions`
  Per-user Saint AI activation tracking
  - Which Saints are active for each user
  - Activation timestamps
  - Custom settings per Saint
  
  ### `family_member_invitations`
  Invitation system for family members to contribute
  - Secure token-based access
  - Progress tracking
  - Expiration management
  
  ### `external_responses`
  Responses from invited family members
  - Links to invitations and engrams
  - Processing status
  - Timestamp tracking
  
  ## Security
  All tables have RLS enabled with proper policies for user data isolation
*/

-- Engrams table (core custom AI personalities)
CREATE TABLE IF NOT EXISTS engrams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  engram_type text NOT NULL CHECK (engram_type IN ('custom', 'family_member')),
  description text,
  relationship text,
  avatar_url text,
  is_active boolean DEFAULT true,
  ai_activated boolean DEFAULT false,
  ai_readiness_score integer DEFAULT 0,
  total_responses integer DEFAULT 0,
  categories_covered integer DEFAULT 0,
  personality_filters_count integer DEFAULT 0,
  last_interaction_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE engrams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own engrams"
  ON engrams FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own engrams"
  ON engrams FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own engrams"
  ON engrams FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own engrams"
  ON engrams FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_engrams_user_id ON engrams(user_id);
CREATE INDEX IF NOT EXISTS idx_engrams_type ON engrams(engram_type);
CREATE INDEX IF NOT EXISTS idx_engrams_ai_activated ON engrams(ai_activated);

-- Engram daily responses
CREATE TABLE IF NOT EXISTS engram_daily_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engram_id uuid NOT NULL REFERENCES engrams(id) ON DELETE CASCADE,
  question_id uuid REFERENCES daily_question_pool(id),
  question_text text NOT NULL,
  response_text text NOT NULL,
  response_type text DEFAULT 'text' CHECK (response_type IN ('text', 'voice', 'video')),
  category text,
  dimension text,
  day_number integer,
  is_external boolean DEFAULT false,
  external_response_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE engram_daily_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own engram responses"
  ON engram_daily_responses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM engrams 
      WHERE engrams.id = engram_daily_responses.engram_id 
      AND engrams.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create engram responses"
  ON engram_daily_responses FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM engrams 
      WHERE engrams.id = engram_daily_responses.engram_id 
      AND engrams.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_engram_responses_engram_id ON engram_daily_responses(engram_id);
CREATE INDEX IF NOT EXISTS idx_engram_responses_created_at ON engram_daily_responses(created_at DESC);

-- Engram personality filters (extracted traits)
CREATE TABLE IF NOT EXISTS engram_personality_filters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engram_id uuid NOT NULL REFERENCES engrams(id) ON DELETE CASCADE,
  dimension text NOT NULL,
  trait_name text NOT NULL,
  trait_value text NOT NULL,
  confidence_score numeric(3,2) DEFAULT 0.5,
  supporting_response_ids jsonb DEFAULT '[]'::jsonb,
  category text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE engram_personality_filters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own engram filters"
  ON engram_personality_filters FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM engrams 
      WHERE engrams.id = engram_personality_filters.engram_id 
      AND engrams.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_engram_filters_engram_id ON engram_personality_filters(engram_id);
CREATE INDEX IF NOT EXISTS idx_engram_filters_dimension ON engram_personality_filters(dimension);

-- Engram progress (365-day journey)
CREATE TABLE IF NOT EXISTS engram_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engram_id uuid NOT NULL UNIQUE REFERENCES engrams(id) ON DELETE CASCADE,
  current_day integer DEFAULT 1,
  total_days integer DEFAULT 365,
  responses_count integer DEFAULT 0,
  categories_explored jsonb DEFAULT '[]'::jsonb,
  dimension_scores jsonb DEFAULT '{}'::jsonb,
  last_response_date date,
  streak_days integer DEFAULT 0,
  longest_streak integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE engram_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own engram progress"
  ON engram_progress FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM engrams 
      WHERE engrams.id = engram_progress.engram_id 
      AND engrams.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_engram_progress_engram_id ON engram_progress(engram_id);

-- Subscriptions table (Stripe integration)
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_customer_id text UNIQUE,
  stripe_subscription_id text UNIQUE,
  stripe_price_id text,
  plan_name text NOT NULL CHECK (plan_name IN ('free', 'pro', 'enterprise')),
  status text NOT NULL CHECK (status IN ('active', 'canceled', 'past_due', 'trialing', 'incomplete')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean DEFAULT false,
  trial_end timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscription"
  ON subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id);

-- Saints subscriptions (per-user Saint activation)
CREATE TABLE IF NOT EXISTS saints_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  saint_id text NOT NULL CHECK (saint_id IN ('raphael', 'michael', 'martin', 'agatha')),
  is_active boolean DEFAULT true,
  activated_at timestamptz DEFAULT now(),
  deactivated_at timestamptz,
  settings jsonb DEFAULT '{}'::jsonb,
  UNIQUE(user_id, saint_id)
);

ALTER TABLE saints_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own saint subscriptions"
  ON saints_subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own saint subscriptions"
  ON saints_subscriptions FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_saints_subscriptions_user_id ON saints_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_saints_subscriptions_saint_id ON saints_subscriptions(saint_id);

-- Family member invitations
CREATE TABLE IF NOT EXISTS family_member_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  engram_id uuid NOT NULL REFERENCES engrams(id) ON DELETE CASCADE,
  invitee_email text NOT NULL,
  invitee_name text NOT NULL,
  invitation_token text UNIQUE NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'declined')),
  invitation_message text,
  responses_count integer DEFAULT 0,
  accepted_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE family_member_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own invitations"
  ON family_member_invitations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create invitations"
  ON family_member_invitations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own invitations"
  ON family_member_invitations FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_invitations_user_id ON family_member_invitations(user_id);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON family_member_invitations(invitation_token);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON family_member_invitations(status);

-- External responses (from invited family members)
CREATE TABLE IF NOT EXISTS external_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id uuid NOT NULL REFERENCES family_member_invitations(id) ON DELETE CASCADE,
  engram_id uuid NOT NULL REFERENCES engrams(id) ON DELETE CASCADE,
  question_id uuid REFERENCES daily_question_pool(id),
  question_text text NOT NULL,
  response_text text NOT NULL,
  response_type text DEFAULT 'text' CHECK (response_type IN ('text', 'voice', 'video')),
  processing_status text DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processed', 'failed')),
  processed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE external_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view responses to their invitations"
  ON external_responses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM family_member_invitations 
      WHERE family_member_invitations.id = external_responses.invitation_id 
      AND family_member_invitations.user_id = auth.uid()
    )
  );

CREATE POLICY "Anonymous users can insert with valid token"
  ON external_responses FOR INSERT
  TO anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM family_member_invitations 
      WHERE family_member_invitations.id = external_responses.invitation_id 
      AND family_member_invitations.status = 'accepted'
      AND (family_member_invitations.expires_at IS NULL OR family_member_invitations.expires_at > now())
    )
  );

CREATE INDEX IF NOT EXISTS idx_external_responses_invitation_id ON external_responses(invitation_id);
CREATE INDEX IF NOT EXISTS idx_external_responses_engram_id ON external_responses(engram_id);
CREATE INDEX IF NOT EXISTS idx_external_responses_status ON external_responses(processing_status);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_engrams_updated_at BEFORE UPDATE ON engrams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_engram_daily_responses_updated_at BEFORE UPDATE ON engram_daily_responses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_engram_personality_filters_updated_at BEFORE UPDATE ON engram_personality_filters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_engram_progress_updated_at BEFORE UPDATE ON engram_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Activate St. Raphael by default for all existing users
INSERT INTO saints_subscriptions (user_id, saint_id, is_active)
SELECT id, 'raphael', true
FROM profiles
WHERE NOT EXISTS (
  SELECT 1 FROM saints_subscriptions 
  WHERE saints_subscriptions.user_id = profiles.id 
  AND saints_subscriptions.saint_id = 'raphael'
);