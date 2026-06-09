/*
  # Monetization System for EverAfter AI

  1. New Tables
    - `engram_premium_features`
      - Tracks fast-track activations and premium question category purchases per engram
      - Includes activation dates, category access, and purchase history

    - `marketplace_templates`
      - Expert-created engram templates available for purchase
      - Includes template metadata, pricing, ratings, and sample content

    - `marketplace_purchases`
      - User purchases of marketplace templates
      - Links users to purchased templates for cloning

    - `legacy_vault`
      - Digital afterlife content including time capsules and memorial pages
      - Scheduled message delivery and secure document storage

    - `subscription_tiers`
      - Defines available subscription tiers and their features
      - Used for pricing display and feature gating

    - `user_subscriptions`
      - Tracks active subscriptions per user across different tiers
      - Includes billing cycle, status, and Stripe subscription IDs

    - `health_premium_features`
      - Tracks health-specific premium features per user
      - Includes nutrition plans, telemedicine access, report export limits

    - `partner_integrations`
      - Health partner integrations (supplements, labs, insurance)
      - Tracks affiliate links and user connections

  2. Security
    - Enable RLS on all tables
    - Users can only access their own data
    - Marketplace templates are readable by all authenticated users
*/

-- Engram Premium Features
CREATE TABLE IF NOT EXISTS engram_premium_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  engram_id UUID NOT NULL,
  fast_track_enabled BOOLEAN DEFAULT false,
  fast_track_activated_at TIMESTAMPTZ,
  premium_categories JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, engram_id)
);

-- Marketplace Templates
CREATE TABLE IF NOT EXISTS marketplace_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  creator_name TEXT NOT NULL,
  creator_badge TEXT,
  price_usd DECIMAL(10,2) NOT NULL DEFAULT 0,
  personality_traits JSONB DEFAULT '{}'::jsonb,
  sample_conversations JSONB DEFAULT '[]'::jsonb,
  question_categories JSONB DEFAULT '[]'::jsonb,
  avatar_url TEXT,
  rating DECIMAL(3,2) DEFAULT 0,
  total_purchases INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Marketplace Purchases
CREATE TABLE IF NOT EXISTS marketplace_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  template_id UUID REFERENCES marketplace_templates(id) ON DELETE CASCADE NOT NULL,
  price_paid DECIMAL(10,2) NOT NULL,
  stripe_payment_id TEXT,
  cloned_engram_id UUID,
  purchased_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, template_id)
);

-- Legacy Vault
CREATE TABLE IF NOT EXISTS legacy_vault (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  vault_type TEXT CHECK (vault_type IN ('time_capsule', 'memorial_page', 'digital_will', 'scheduled_message', 'secure_document')) NOT NULL,
  title TEXT NOT NULL,
  content JSONB DEFAULT '{}'::jsonb,
  recipients JSONB DEFAULT '[]'::jsonb,
  scheduled_delivery_date TIMESTAMPTZ,
  delivery_status TEXT CHECK (delivery_status IN ('scheduled', 'delivered', 'cancelled')) DEFAULT 'scheduled',
  is_public BOOLEAN DEFAULT false,
  memorial_url TEXT UNIQUE,
  storage_tier TEXT CHECK (storage_tier IN ('standard', '10_year', '25_year', 'lifetime')) DEFAULT 'standard',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Subscription Tiers
CREATE TABLE IF NOT EXISTS subscription_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_name TEXT UNIQUE NOT NULL,
  tier_category TEXT CHECK (tier_category IN ('base', 'engram', 'health', 'legacy', 'marketplace')) NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT NOT NULL,
  price_monthly DECIMAL(10,2) NOT NULL DEFAULT 0,
  price_yearly DECIMAL(10,2) NOT NULL DEFAULT 0,
  features JSONB DEFAULT '[]'::jsonb,
  stripe_price_id_monthly TEXT,
  stripe_price_id_yearly TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- User Subscriptions
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tier_id UUID REFERENCES subscription_tiers(id) ON DELETE CASCADE NOT NULL,
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  status TEXT CHECK (status IN ('active', 'past_due', 'cancelled', 'trialing', 'paused')) DEFAULT 'active',
  billing_cycle TEXT CHECK (billing_cycle IN ('monthly', 'yearly')) DEFAULT 'monthly',
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  cancelled_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Health Premium Features
CREATE TABLE IF NOT EXISTS health_premium_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  nutrition_plan_access BOOLEAN DEFAULT false,
  telemedicine_access BOOLEAN DEFAULT false,
  prescription_refill_access BOOLEAN DEFAULT false,
  unlimited_reports BOOLEAN DEFAULT false,
  monthly_report_limit INTEGER DEFAULT 3,
  reports_used_this_month INTEGER DEFAULT 0,
  report_limit_reset_date DATE DEFAULT CURRENT_DATE,
  partner_integrations JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Partner Integrations
CREATE TABLE IF NOT EXISTS partner_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_name TEXT NOT NULL,
  partner_category TEXT CHECK (partner_category IN ('supplement', 'wearable', 'lab', 'insurance', 'telemedicine')) NOT NULL,
  logo_url TEXT,
  description TEXT,
  affiliate_link TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE engram_premium_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE legacy_vault ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_premium_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_integrations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for engram_premium_features
CREATE POLICY "Users can view own engram premium features"
  ON engram_premium_features FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own engram premium features"
  ON engram_premium_features FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own engram premium features"
  ON engram_premium_features FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for marketplace_templates
CREATE POLICY "All authenticated users can view active marketplace templates"
  ON marketplace_templates FOR SELECT
  TO authenticated
  USING (is_active = true);

-- RLS Policies for marketplace_purchases
CREATE POLICY "Users can view own marketplace purchases"
  ON marketplace_purchases FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own marketplace purchases"
  ON marketplace_purchases FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for legacy_vault
CREATE POLICY "Users can view own legacy vault items"
  ON legacy_vault FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own legacy vault items"
  ON legacy_vault FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own legacy vault items"
  ON legacy_vault FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own legacy vault items"
  ON legacy_vault FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for subscription_tiers
CREATE POLICY "All authenticated users can view active subscription tiers"
  ON subscription_tiers FOR SELECT
  TO authenticated
  USING (is_active = true);

-- RLS Policies for user_subscriptions
CREATE POLICY "Users can view own subscriptions"
  ON user_subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscriptions"
  ON user_subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions"
  ON user_subscriptions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for health_premium_features
CREATE POLICY "Users can view own health premium features"
  ON health_premium_features FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own health premium features"
  ON health_premium_features FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own health premium features"
  ON health_premium_features FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for partner_integrations
CREATE POLICY "All authenticated users can view active partner integrations"
  ON partner_integrations FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_engram_premium_features_user_id ON engram_premium_features(user_id);
CREATE INDEX IF NOT EXISTS idx_engram_premium_features_engram_id ON engram_premium_features(engram_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_templates_category ON marketplace_templates(category);
CREATE INDEX IF NOT EXISTS idx_marketplace_templates_featured ON marketplace_templates(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_marketplace_purchases_user_id ON marketplace_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_purchases_template_id ON marketplace_purchases(template_id);
CREATE INDEX IF NOT EXISTS idx_legacy_vault_user_id ON legacy_vault(user_id);
CREATE INDEX IF NOT EXISTS idx_legacy_vault_delivery_status ON legacy_vault(delivery_status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_health_premium_features_user_id ON health_premium_features(user_id);
CREATE INDEX IF NOT EXISTS idx_partner_integrations_category ON partner_integrations(partner_category);

-- Seed subscription tiers
INSERT INTO subscription_tiers (tier_name, tier_category, display_name, description, price_monthly, price_yearly, features, sort_order) VALUES
  ('engram_premium', 'engram', 'Engram Premium', 'Unlock your AI personality faster with premium features', 14.99, 149.99, '["Fast-track activation at 50% readiness", "Access to premium question categories", "Audio/video memory uploads with AI reflections", "Priority AI chat responses"]'::jsonb, 1),
  ('health_premium', 'health', 'Health Premium', 'Advanced health monitoring and personalized care', 24.99, 249.99, '["Personalized nutrition plans", "Telemedicine integration", "Prescription refill services", "Unlimited health report exports", "Partner supplement discounts"]'::jsonb, 2),
  ('legacy_premium', 'legacy', 'Legacy Premium', 'Secure your digital afterlife for generations', 19.99, 199.99, '["Time-capsule messages with scheduled delivery", "Custom memorial pages", "Digital will and secure vault", "25-year guaranteed storage", "Unlimited scheduled messages"]'::jsonb, 3),
  ('ultimate_bundle', 'base', 'Ultimate Bundle', 'All premium features in one comprehensive package', 49.99, 499.99, '["All Engram Premium features", "All Health Premium features", "All Legacy Premium features", "Marketplace credit: $20/month", "Priority support", "Early access to new features"]'::jsonb, 4)
ON CONFLICT (tier_name) DO NOTHING;

-- Seed marketplace templates
INSERT INTO marketplace_templates (name, title, description, category, creator_name, creator_badge, price_usd, personality_traits, sample_conversations, rating, is_featured) VALUES
  ('wealth_mentor', 'Wealth Mentor AI', 'Expert financial advisor trained on decades of investment wisdom, portfolio management, and wealth-building strategies', 'Finance', 'Expert Finance Team', 'Verified Expert', 29.99, '{"expertise": ["investment strategy", "portfolio management", "tax optimization", "retirement planning"], "style": "analytical and strategic", "tone": "professional yet approachable"}'::jsonb, '[{"question": "How should I diversify my portfolio?", "response": "Let me analyze your risk tolerance and time horizon to create a balanced strategy..."}]'::jsonb, 4.8, true),
  ('grief_counselor', 'Grief Counselor AI', 'Compassionate support trained in grief processing, loss navigation, and emotional healing techniques', 'Wellness', 'Licensed Therapist Collective', 'Verified Expert', 24.99, '{"expertise": ["grief processing", "emotional support", "coping strategies", "healing journey"], "style": "empathetic and patient", "tone": "warm and understanding"}'::jsonb, '[{"question": "I am struggling with recent loss", "response": "I hear your pain, and I want you to know that what you are feeling is valid..."}]'::jsonb, 4.9, true),
  ('life_coach', 'Life Coach AI', 'Motivational coach specializing in goal setting, productivity, and personal transformation', 'Personal Development', 'Peak Performance Institute', 'Verified Expert', 19.99, '{"expertise": ["goal setting", "habit formation", "motivation", "accountability"], "style": "encouraging and action-oriented", "tone": "energetic and supportive"}'::jsonb, '[{"question": "How do I stay motivated?", "response": "Motivation comes and goes, but systems keep you moving forward..."}]'::jsonb, 4.7, true),
  ('career_advisor', 'Career Advisor AI', 'Professional career strategist with expertise in job transitions, negotiations, and career advancement', 'Career', 'Executive Coaching Group', 'Verified Expert', 27.99, '{"expertise": ["career transitions", "salary negotiation", "leadership development", "networking"], "style": "strategic and insightful", "tone": "confident and direct"}'::jsonb, '[{"question": "Should I ask for a raise?", "response": "Let us evaluate your market value and build a compelling case..."}]'::jsonb, 4.6, false),
  ('creative_muse', 'Creative Muse AI', 'Artistic inspiration engine trained on creative processes, storytelling, and innovative thinking', 'Creativity', 'Artists Collective', 'Verified Creator', 16.99, '{"expertise": ["creative ideation", "storytelling", "artistic expression", "innovation"], "style": "imaginative and spontaneous", "tone": "playful and inspiring"}'::jsonb, '[{"question": "I have writers block", "response": "Let us explore what your creative mind is trying to tell you..."}]'::jsonb, 4.5, false),
  ('relationship_coach', 'Relationship Coach AI', 'Relationship expert trained in communication, conflict resolution, and building deeper connections', 'Relationships', 'Relationship Institute', 'Verified Expert', 22.99, '{"expertise": ["communication skills", "conflict resolution", "emotional intelligence", "intimacy building"], "style": "understanding and insightful", "tone": "caring and honest"}'::jsonb, '[{"question": "How can I improve communication with my partner?", "response": "Effective communication starts with active listening and vulnerability..."}]'::jsonb, 4.8, true)
ON CONFLICT (id) DO NOTHING;

-- Seed partner integrations
INSERT INTO partner_integrations (partner_name, partner_category, description, sort_order) VALUES
  ('NutriPro Supplements', 'supplement', 'Premium supplement provider with science-backed formulations', 1),
  ('LabCorp Direct', 'lab', 'Comprehensive lab testing and health screenings', 2),
  ('Teladoc Health', 'telemedicine', '24/7 access to board-certified physicians', 3),
  ('Garmin Health', 'wearable', 'Advanced fitness tracking and health monitoring', 4),
  ('HealthPartners Insurance', 'insurance', 'Comprehensive health insurance solutions', 5)
ON CONFLICT (id) DO NOTHING;
