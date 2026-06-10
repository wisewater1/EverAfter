/*
  # EverAfter AI Marketplace - Enhanced Schema

  1. New Tables
    - `marketplace_template_manifests`
      - Stores autonomous agent configurations for templates
      - Includes system prompts, tools, memory schemas, and execution parameters

    - `marketplace_template_reviews`
      - User ratings and feedback for purchased templates
      - Includes star ratings, comments, and helpful votes

    - `marketplace_template_runs`
      - Tracks all template executions for analytics and billing
      - Records runtime, tokens used, and completion status

    - `marketplace_creator_profiles`
      - Creator information including Stripe Connect details
      - Revenue tracking and creator tier management

    - `marketplace_template_versions`
      - Version control for template updates
      - Changelog and migration notes

    - `marketplace_purchased_instances`
      - Active instances of purchased templates
      - Configuration, status, and autonomous task tracking

  2. Enhanced Tables
    - Add manifest fields to marketplace_templates
    - Add creator_tier and approval workflow fields

  3. Security
    - Enable RLS on all tables
    - Creators can only access their own templates and analytics
    - Users can only access purchased templates and public listings
*/

-- Add manifest and creator tier fields to existing marketplace_templates table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'marketplace_templates' AND column_name = 'manifest_id'
  ) THEN
    ALTER TABLE marketplace_templates
      ADD COLUMN manifest_id UUID,
      ADD COLUMN creator_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
      ADD COLUMN approval_status TEXT CHECK (approval_status IN ('draft', 'pending_review', 'approved', 'rejected')) DEFAULT 'draft',
      ADD COLUMN approval_notes TEXT,
      ADD COLUMN runs_autonomously BOOLEAN DEFAULT false,
      ADD COLUMN allows_scheduling BOOLEAN DEFAULT true,
      ADD COLUMN version TEXT DEFAULT '1.0.0',
      ADD COLUMN changelog TEXT,
      ADD COLUMN total_runs INTEGER DEFAULT 0,
      ADD COLUMN active_users INTEGER DEFAULT 0,
      ADD COLUMN revenue_total DECIMAL(10,2) DEFAULT 0;
  END IF;
END $$;

-- Create marketplace_template_manifests table
CREATE TABLE IF NOT EXISTS marketplace_template_manifests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES marketplace_templates(id) ON DELETE CASCADE NOT NULL,
  version TEXT NOT NULL DEFAULT '1.0.0',
  system_prompt TEXT NOT NULL,
  model TEXT DEFAULT 'gpt-4o-mini',
  temperature DECIMAL(3,2) DEFAULT 0.7,
  max_tokens INTEGER DEFAULT 1000,
  tools JSONB DEFAULT '[]'::jsonb,
  memory_schema JSONB DEFAULT '{}'::jsonb,
  autonomous_config JSONB DEFAULT '{}'::jsonb,
  api_requirements JSONB DEFAULT '[]'::jsonb,
  resource_limits JSONB DEFAULT '{"max_runs_per_day": 100, "max_memory_mb": 512}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create marketplace_template_reviews table
CREATE TABLE IF NOT EXISTS marketplace_template_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES marketplace_templates(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
  title TEXT,
  comment TEXT,
  helpful_votes INTEGER DEFAULT 0,
  is_verified_purchase BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(template_id, user_id)
);

-- Create marketplace_template_runs table
CREATE TABLE IF NOT EXISTS marketplace_template_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES marketplace_templates(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  instance_id UUID,
  run_type TEXT CHECK (run_type IN ('demo', 'chat', 'autonomous', 'scheduled')) NOT NULL,
  status TEXT CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')) DEFAULT 'pending',
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  runtime_seconds INTEGER DEFAULT 0,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Create marketplace_creator_profiles table
CREATE TABLE IF NOT EXISTS marketplace_creator_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  bio TEXT,
  avatar_url TEXT,
  creator_tier TEXT CHECK (creator_tier IN ('free', 'verified', 'premium', 'enterprise')) DEFAULT 'free',
  stripe_connect_id TEXT UNIQUE,
  stripe_onboarding_complete BOOLEAN DEFAULT false,
  revenue_share_percentage DECIMAL(5,2) DEFAULT 80.00,
  total_revenue DECIMAL(10,2) DEFAULT 0,
  total_templates INTEGER DEFAULT 0,
  total_sales INTEGER DEFAULT 0,
  average_rating DECIMAL(3,2) DEFAULT 0,
  is_verified BOOLEAN DEFAULT false,
  verification_badge TEXT,
  social_links JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create marketplace_template_versions table
CREATE TABLE IF NOT EXISTS marketplace_template_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES marketplace_templates(id) ON DELETE CASCADE NOT NULL,
  version TEXT NOT NULL,
  changelog TEXT NOT NULL,
  manifest_snapshot JSONB NOT NULL,
  is_breaking_change BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL
);

-- Create marketplace_purchased_instances table
CREATE TABLE IF NOT EXISTS marketplace_purchased_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id UUID REFERENCES marketplace_purchases(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  template_id UUID REFERENCES marketplace_templates(id) ON DELETE CASCADE NOT NULL,
  archetypal_ai_id UUID,
  instance_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  custom_config JSONB DEFAULT '{}'::jsonb,
  last_run_at TIMESTAMPTZ,
  total_runs INTEGER DEFAULT 0,
  total_autonomous_tasks INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE marketplace_template_manifests ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_template_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_template_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_creator_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_template_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_purchased_instances ENABLE ROW LEVEL SECURITY;

-- RLS Policies for marketplace_template_manifests
CREATE POLICY "Creators can view own template manifests"
  ON marketplace_template_manifests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM marketplace_templates mt
      WHERE mt.id = marketplace_template_manifests.template_id
      AND mt.creator_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view manifests of purchased templates"
  ON marketplace_template_manifests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM marketplace_purchases mp
      WHERE mp.template_id = marketplace_template_manifests.template_id
      AND mp.user_id = auth.uid()
    )
  );

CREATE POLICY "Creators can insert own template manifests"
  ON marketplace_template_manifests FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM marketplace_templates mt
      WHERE mt.id = marketplace_template_manifests.template_id
      AND mt.creator_user_id = auth.uid()
    )
  );

CREATE POLICY "Creators can update own template manifests"
  ON marketplace_template_manifests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM marketplace_templates mt
      WHERE mt.id = marketplace_template_manifests.template_id
      AND mt.creator_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM marketplace_templates mt
      WHERE mt.id = marketplace_template_manifests.template_id
      AND mt.creator_user_id = auth.uid()
    )
  );

-- RLS Policies for marketplace_template_reviews
CREATE POLICY "All authenticated users can view reviews"
  ON marketplace_template_reviews FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create reviews for purchased templates"
  ON marketplace_template_reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM marketplace_purchases mp
      WHERE mp.template_id = marketplace_template_reviews.template_id
      AND mp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own reviews"
  ON marketplace_template_reviews FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own reviews"
  ON marketplace_template_reviews FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for marketplace_template_runs
CREATE POLICY "Users can view own template runs"
  ON marketplace_template_runs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Creators can view runs of their templates"
  ON marketplace_template_runs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM marketplace_templates mt
      WHERE mt.id = marketplace_template_runs.template_id
      AND mt.creator_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own template runs"
  ON marketplace_template_runs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for marketplace_creator_profiles
CREATE POLICY "All authenticated users can view creator profiles"
  ON marketplace_creator_profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own creator profile"
  ON marketplace_creator_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own creator profile"
  ON marketplace_creator_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for marketplace_template_versions
CREATE POLICY "Users can view versions of active templates"
  ON marketplace_template_versions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM marketplace_templates mt
      WHERE mt.id = marketplace_template_versions.template_id
      AND mt.is_active = true
    )
  );

CREATE POLICY "Creators can insert versions for own templates"
  ON marketplace_template_versions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM marketplace_templates mt
      WHERE mt.id = marketplace_template_versions.template_id
      AND mt.creator_user_id = auth.uid()
    )
  );

-- RLS Policies for marketplace_purchased_instances
CREATE POLICY "Users can view own purchased instances"
  ON marketplace_purchased_instances FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own purchased instances"
  ON marketplace_purchased_instances FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own purchased instances"
  ON marketplace_purchased_instances FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own purchased instances"
  ON marketplace_purchased_instances FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Update RLS policies for marketplace_templates to support creators
DROP POLICY IF EXISTS "All authenticated users can view active marketplace templates" ON marketplace_templates;

CREATE POLICY "All authenticated users can view approved marketplace templates"
  ON marketplace_templates FOR SELECT
  TO authenticated
  USING (is_active = true AND approval_status = 'approved');

CREATE POLICY "Creators can view own templates"
  ON marketplace_templates FOR SELECT
  TO authenticated
  USING (creator_user_id = auth.uid());

CREATE POLICY "Creators can insert own templates"
  ON marketplace_templates FOR INSERT
  TO authenticated
  WITH CHECK (creator_user_id = auth.uid());

CREATE POLICY "Creators can update own templates"
  ON marketplace_templates FOR UPDATE
  TO authenticated
  USING (creator_user_id = auth.uid())
  WITH CHECK (creator_user_id = auth.uid());

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_marketplace_template_manifests_template_id ON marketplace_template_manifests(template_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_template_reviews_template_id ON marketplace_template_reviews(template_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_template_reviews_rating ON marketplace_template_reviews(rating DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_template_runs_template_id ON marketplace_template_runs(template_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_template_runs_user_id ON marketplace_template_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_template_runs_created_at ON marketplace_template_runs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_creator_profiles_user_id ON marketplace_creator_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_creator_profiles_tier ON marketplace_creator_profiles(creator_tier);
CREATE INDEX IF NOT EXISTS idx_marketplace_template_versions_template_id ON marketplace_template_versions(template_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_purchased_instances_user_id ON marketplace_purchased_instances(user_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_purchased_instances_purchase_id ON marketplace_purchased_instances(purchase_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_templates_creator ON marketplace_templates(creator_user_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_templates_approval_status ON marketplace_templates(approval_status);

-- Functions for analytics and aggregation
CREATE OR REPLACE FUNCTION update_template_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE marketplace_templates
  SET
    rating = (
      SELECT COALESCE(AVG(rating), 0)
      FROM marketplace_template_reviews
      WHERE template_id = NEW.template_id
    )
  WHERE id = NEW.template_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_template_rating_trigger
  AFTER INSERT OR UPDATE OR DELETE ON marketplace_template_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_template_rating();

CREATE OR REPLACE FUNCTION update_creator_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE marketplace_creator_profiles
  SET
    total_templates = (
      SELECT COUNT(*)
      FROM marketplace_templates
      WHERE creator_user_id = NEW.creator_user_id
    ),
    average_rating = (
      SELECT COALESCE(AVG(mt.rating), 0)
      FROM marketplace_templates mt
      WHERE mt.creator_user_id = NEW.creator_user_id
    )
  WHERE user_id = NEW.creator_user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_creator_stats_trigger
  AFTER INSERT OR UPDATE ON marketplace_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_creator_stats();
