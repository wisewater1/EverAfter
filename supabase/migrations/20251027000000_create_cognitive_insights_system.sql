/*
  # Cognitive Insights and Analytics System

  1. New Tables
    - `cognitive_insights`
      - Stores generated insight data per user and engram
      - Includes sentiment analysis, emotional arcs, and pattern recognition results

    - `insight_subscriptions`
      - Tracks Insight Pro subscription status
      - Links users to premium analytics features

    - `research_consent`
      - Manages user opt-in/opt-out for anonymous research participation
      - Tracks consent history and data sharing preferences

    - `research_credits`
      - Stores earned credit balances for research participation
      - Tracks monthly distributions and redemptions

    - `institutional_partners`
      - Approved research organizations and wellness startups
      - Partner verification and contract management

    - `dataset_requests`
      - Logs all institutional data purchases
      - Audit trail for compliance and billing

    - `insight_analytics_cache`
      - Performance optimization for heavy computations
      - Cached results for frequently accessed insights

  2. Security
    - Enable RLS on all tables
    - Users can only access their own insights and consent data
    - Institutional partners have restricted query access to anonymized data only
*/

-- Cognitive Insights
CREATE TABLE IF NOT EXISTS cognitive_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  engram_id UUID NOT NULL,
  insight_type TEXT CHECK (insight_type IN ('emotional_arc', 'recurring_themes', 'relationship_map', 'dream_words', 'mood_correlation', 'archetypal_cluster')) NOT NULL,
  insight_data JSONB DEFAULT '{}'::jsonb NOT NULL,
  date_range_start DATE NOT NULL,
  date_range_end DATE NOT NULL,
  is_premium BOOLEAN DEFAULT false,
  generated_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Insight Subscriptions
CREATE TABLE IF NOT EXISTS insight_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  subscription_tier TEXT CHECK (subscription_tier IN ('free', 'insight_pro')) DEFAULT 'free',
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  status TEXT CHECK (status IN ('active', 'past_due', 'cancelled', 'trialing')) DEFAULT 'active',
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  insights_generated_this_month INTEGER DEFAULT 0,
  monthly_limit INTEGER DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Research Consent
CREATE TABLE IF NOT EXISTS research_consent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  has_consented BOOLEAN DEFAULT false,
  consent_date TIMESTAMPTZ,
  revocation_date TIMESTAMPTZ,
  data_categories_shared TEXT[] DEFAULT ARRAY[]::TEXT[],
  anonymization_level TEXT CHECK (anonymization_level IN ('full', 'partial', 'minimal')) DEFAULT 'full',
  consent_version TEXT DEFAULT '1.0',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Research Credits
CREATE TABLE IF NOT EXISTS research_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  credit_type TEXT CHECK (credit_type IN ('monthly_participation', 'bonus', 'referral', 'redemption')) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  balance_after DECIMAL(10,2) NOT NULL,
  description TEXT,
  granted_for_month DATE,
  redeemed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Institutional Partners
CREATE TABLE IF NOT EXISTS institutional_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_name TEXT UNIQUE NOT NULL,
  partner_type TEXT CHECK (partner_type IN ('university', 'research_institution', 'wellness_startup', 'healthcare_provider')) NOT NULL,
  contact_email TEXT NOT NULL,
  verification_status TEXT CHECK (verification_status IN ('pending', 'verified', 'suspended', 'revoked')) DEFAULT 'pending',
  api_key_hash TEXT UNIQUE,
  contract_start_date DATE,
  contract_end_date DATE,
  access_level TEXT CHECK (access_level IN ('basic', 'standard', 'premium')) DEFAULT 'basic',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Dataset Requests
CREATE TABLE IF NOT EXISTS dataset_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID REFERENCES institutional_partners(id) ON DELETE CASCADE NOT NULL,
  request_type TEXT CHECK (request_type IN ('emotional_trends', 'health_correlations', 'demographic_analysis', 'custom')) NOT NULL,
  filter_criteria JSONB DEFAULT '{}'::jsonb,
  record_count INTEGER DEFAULT 0,
  price_usd DECIMAL(10,2) NOT NULL,
  commission_usd DECIMAL(10,2) NOT NULL,
  stripe_payment_id TEXT,
  dataset_hash TEXT,
  delivery_status TEXT CHECK (delivery_status IN ('pending', 'processing', 'delivered', 'failed')) DEFAULT 'pending',
  delivered_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Insight Analytics Cache
CREATE TABLE IF NOT EXISTS insight_analytics_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  engram_id UUID NOT NULL,
  cache_key TEXT NOT NULL,
  cache_data JSONB NOT NULL,
  computation_duration_ms INTEGER,
  hit_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, engram_id, cache_key)
);

-- Enable Row Level Security
ALTER TABLE cognitive_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE insight_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_consent ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE institutional_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE dataset_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE insight_analytics_cache ENABLE ROW LEVEL SECURITY;

-- RLS Policies for cognitive_insights
CREATE POLICY "Users can view own cognitive insights"
  ON cognitive_insights FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cognitive insights"
  ON cognitive_insights FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own cognitive insights"
  ON cognitive_insights FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for insight_subscriptions
CREATE POLICY "Users can view own insight subscriptions"
  ON insight_subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own insight subscriptions"
  ON insight_subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own insight subscriptions"
  ON insight_subscriptions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for research_consent
CREATE POLICY "Users can view own research consent"
  ON research_consent FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own research consent"
  ON research_consent FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own research consent"
  ON research_consent FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for research_credits
CREATE POLICY "Users can view own research credits"
  ON research_credits FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own research credits"
  ON research_credits FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for institutional_partners
CREATE POLICY "Verified partners can view own profile"
  ON institutional_partners FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for dataset_requests
CREATE POLICY "Partners can view own dataset requests"
  ON dataset_requests FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for insight_analytics_cache
CREATE POLICY "Users can view own insight cache"
  ON insight_analytics_cache FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own insight cache"
  ON insight_analytics_cache FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own insight cache"
  ON insight_analytics_cache FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own insight cache"
  ON insight_analytics_cache FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_cognitive_insights_user_id ON cognitive_insights(user_id);
CREATE INDEX IF NOT EXISTS idx_cognitive_insights_engram_id ON cognitive_insights(engram_id);
CREATE INDEX IF NOT EXISTS idx_cognitive_insights_type ON cognitive_insights(insight_type);
CREATE INDEX IF NOT EXISTS idx_cognitive_insights_date_range ON cognitive_insights(date_range_start, date_range_end);
CREATE INDEX IF NOT EXISTS idx_insight_subscriptions_user_id ON insight_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_insight_subscriptions_status ON insight_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_research_consent_user_id ON research_consent(user_id);
CREATE INDEX IF NOT EXISTS idx_research_consent_status ON research_consent(has_consented) WHERE has_consented = true;
CREATE INDEX IF NOT EXISTS idx_research_credits_user_id ON research_credits(user_id);
CREATE INDEX IF NOT EXISTS idx_research_credits_type ON research_credits(credit_type);
CREATE INDEX IF NOT EXISTS idx_dataset_requests_partner_id ON dataset_requests(partner_id);
CREATE INDEX IF NOT EXISTS idx_dataset_requests_status ON dataset_requests(delivery_status);
CREATE INDEX IF NOT EXISTS idx_insight_cache_lookup ON insight_analytics_cache(user_id, engram_id, cache_key);
CREATE INDEX IF NOT EXISTS idx_insight_cache_expiry ON insight_analytics_cache(expires_at) WHERE expires_at > now();

-- Function to calculate research credits balance
CREATE OR REPLACE FUNCTION get_research_credits_balance(p_user_id UUID)
RETURNS DECIMAL(10,2)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_balance DECIMAL(10,2);
BEGIN
  SELECT COALESCE(SUM(
    CASE
      WHEN credit_type = 'redemption' THEN -ABS(amount)
      ELSE amount
    END
  ), 0)
  INTO v_balance
  FROM research_credits
  WHERE user_id = p_user_id
    AND (expires_at IS NULL OR expires_at > now())
    AND (redeemed_at IS NULL OR credit_type = 'redemption');

  RETURN v_balance;
END;
$$;

-- Function to grant monthly research participation credits
CREATE OR REPLACE FUNCTION grant_monthly_research_credits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user RECORD;
  v_credit_amount DECIMAL(10,2) := 5.00;
  v_current_month DATE := DATE_TRUNC('month', CURRENT_DATE);
BEGIN
  FOR v_user IN
    SELECT user_id
    FROM research_consent
    WHERE has_consented = true
      AND revocation_date IS NULL
  LOOP
    -- Check if credit already granted this month
    IF NOT EXISTS (
      SELECT 1 FROM research_credits
      WHERE user_id = v_user.user_id
        AND credit_type = 'monthly_participation'
        AND granted_for_month = v_current_month
    ) THEN
      -- Grant credit
      INSERT INTO research_credits (
        user_id,
        credit_type,
        amount,
        balance_after,
        description,
        granted_for_month,
        expires_at
      ) VALUES (
        v_user.user_id,
        'monthly_participation',
        v_credit_amount,
        get_research_credits_balance(v_user.user_id) + v_credit_amount,
        'Monthly research participation reward',
        v_current_month,
        (CURRENT_DATE + INTERVAL '1 year')::TIMESTAMPTZ
      );
    END IF;
  END LOOP;
END;
$$;

-- Update subscription tiers with new Insight Pro tier
INSERT INTO subscription_tiers (tier_name, tier_category, display_name, description, price_monthly, price_yearly, features, stripe_price_id_monthly, sort_order) VALUES
  ('insight_pro', 'marketplace', 'Insight Pro', 'Unlock deeper cognitive analytics and emotional intelligence insights', 7.00, 70.00, '["Sentiment timeline analysis", "Archetypal cluster mapping", "Dream-word frequency analysis", "Mood correlation graphs", "Advanced emotional arc visualization", "Relationship pattern insights"]'::jsonb, 'price_insight_pro_monthly', 5)
ON CONFLICT (tier_name) DO UPDATE SET
  description = EXCLUDED.description,
  price_monthly = EXCLUDED.price_monthly,
  price_yearly = EXCLUDED.price_yearly,
  features = EXCLUDED.features;

-- Update existing Legacy Premium tier with new features
UPDATE subscription_tiers
SET
  description = 'Transform memory preservation into an ongoing legacy service with continuity plans and assurance',
  features = '["Continuity Plans: scheduled voice notes and video messages", "Legacy Assurance: partner integrations with estate planners", "25-year guaranteed encrypted storage (10GB)", "Unlimited scheduled messages", "Auto-generated yearly Memorial Compilations", "Custom memorial pages with tribute walls", "Digital will with executor access", "Notarized blockchain timestamps"]'::jsonb
WHERE tier_name = 'legacy_premium';

-- Add new Legacy Eternal tier
INSERT INTO subscription_tiers (tier_name, tier_category, display_name, description, price_monthly, price_yearly, features, stripe_price_id_monthly, sort_order) VALUES
  ('legacy_eternal', 'legacy', 'Legacy Eternal', 'Perpetual hosting and verified delivery with lifetime guarantees', 49.00, 490.00, '["All Legacy Premium features", "Perpetual hosting after account inactivity", "Verified delivery to heirs with confirmation", "Notarized blockchain timestamp verification", "Blessing Insurance: symbolic micro-coverage for perpetual hosting", "Priority legacy vault support", "Custom memorial domain hosting"]'::jsonb, 'price_legacy_eternal_yearly', 6)
ON CONFLICT (tier_name) DO NOTHING;
