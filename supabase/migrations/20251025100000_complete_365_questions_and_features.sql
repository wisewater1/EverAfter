/*
  # Complete 365-Day Question System + Missing Features

  ## Overview
  Adds remaining questions to reach 365 total, plus missing tables for:
  - User subscription tracking (Stripe integration)
  - Saints AI activation per user
  - Daily question progress tracking

  ## Changes
  1. Add ~275 more questions across all categories to reach 365 total
  2. Create subscriptions table for Stripe payment tracking
  3. Create saints_subscriptions table for user Saint activations
  4. Create user_daily_progress table for streak tracking
  5. Add indexes for performance
*/

-- Create subscriptions table for Stripe integration
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

-- Create saints_subscriptions table for tracking which Saints users have activated
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

-- Create user_daily_progress table for tracking question streaks
CREATE TABLE IF NOT EXISTS user_daily_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  current_day integer DEFAULT 1,
  total_responses integer DEFAULT 0,
  streak_days integer DEFAULT 0,
  last_response_date date,
  longest_streak integer DEFAULT 0,
  categories_explored jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_daily_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own progress"
  ON user_daily_progress FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own progress"
  ON user_daily_progress FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_daily_progress_user_id ON user_daily_progress(user_id);

-- Create daily_question_responses table if not exists (for backward compatibility)
CREATE TABLE IF NOT EXISTS daily_question_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  engram_id uuid REFERENCES archetypal_ais(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  response_text text NOT NULL,
  question_category text,
  day_number integer DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE daily_question_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own responses"
  ON daily_question_responses FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own responses"
  ON daily_question_responses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_daily_question_responses_user_id ON daily_question_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_question_responses_engram_id ON daily_question_responses(engram_id);

-- Insert remaining questions to reach 365 total
INSERT INTO questions (question_text, category, time_of_day, personality_aspect, difficulty) VALUES
-- More Values (20 additional)
('What principle guides you when making tough decisions?', 'values', 'morning', 'decision_making', 'deep'),
('How do you define personal freedom?', 'values', 'afternoon', 'life_philosophy', 'deep'),
('What role does faith or spirituality play in your life?', 'values', 'evening', 'core_values', 'deep'),
('What tradition or ritual is most meaningful to you?', 'values', 'afternoon', 'core_values', 'medium'),
('How important is financial security to you?', 'values', 'morning', 'decision_making', 'medium'),
('What does it mean to live with purpose?', 'values', 'evening', 'life_philosophy', 'deep'),
('How do you balance work and personal life?', 'values', 'afternoon', 'decision_making', 'medium'),
('What sacrifice would you make for family?', 'values', 'evening', 'core_values', 'deep'),
('How do you practice gratitude?', 'values', 'morning', 'emotional_patterns', 'medium'),
('What does loyalty mean to you?', 'values', 'afternoon', 'social_behavior', 'deep'),
('How do you show respect to others?', 'values', 'morning', 'social_behavior', 'medium'),
('What role does honesty play in relationships?', 'values', 'afternoon', 'social_behavior', 'deep'),
('How do you define true wealth?', 'values', 'afternoon', 'core_values', 'deep'),
('What legacy do you want to leave?', 'values', 'evening', 'life_philosophy', 'deep'),
('How do you stay grounded in difficult times?', 'values', 'evening', 'resilience', 'medium'),
('What does kindness look like to you?', 'values', 'morning', 'social_behavior', 'medium'),
('How do you handle moral dilemmas?', 'values', 'afternoon', 'decision_making', 'deep'),
('What brings you inner peace?', 'values', 'evening', 'emotional_patterns', 'medium'),
('How do you define authenticity?', 'values', 'afternoon', 'core_values', 'deep'),
('What does it mean to live intentionally?', 'values', 'morning', 'life_philosophy', 'deep'),

-- More Humor (15 additional)
('What''s your most embarrassing moment that makes you laugh now?', 'humor', 'afternoon', 'emotional_patterns', 'medium'),
('Describe a time when you couldn''t stop laughing', 'humor', 'afternoon', 'emotional_patterns', 'light'),
('What''s your favorite comedy movie or show?', 'humor', 'afternoon', 'communication_style', 'light'),
('Who''s the funniest person you know?', 'humor', 'afternoon', 'social_behavior', 'light'),
('What prank did you pull that was epic?', 'humor', 'afternoon', 'creativity', 'medium'),
('What makes you giggle uncontrollably?', 'humor', 'afternoon', 'emotional_patterns', 'light'),
('Tell me about a time laughter saved the day', 'humor', 'afternoon', 'resilience', 'medium'),
('What''s your go-to joke for breaking the ice?', 'humor', 'morning', 'communication_style', 'light'),
('How do you use humor in tough situations?', 'humor', 'afternoon', 'resilience', 'medium'),
('What comedy style resonates with you most?', 'humor', 'afternoon', 'communication_style', 'light'),
('Describe your laugh - is it loud, quiet, or contagious?', 'humor', 'afternoon', 'emotional_patterns', 'light'),
('What inside joke with friends always cracks you up?', 'humor', 'afternoon', 'social_behavior', 'light'),
('When was the last time you belly-laughed?', 'humor', 'afternoon', 'emotional_patterns', 'light'),
('What''s funnier to you: words or physical comedy?', 'humor', 'afternoon', 'communication_style', 'light'),
('How has your sense of humor evolved over time?', 'humor', 'evening', 'life_philosophy', 'medium'),

-- More Daily Life (25 additional)
('What''s your bedtime routine?', 'daily', 'evening', 'decision_making', 'light'),
('How do you take your coffee or tea?', 'daily', 'morning', 'core_values', 'light'),
('What''s your go-to comfort food?', 'daily', 'afternoon', 'emotional_patterns', 'light'),
('Describe your ideal Sunday', 'daily', 'morning', 'social_behavior', 'light'),
('What music do you listen to while working?', 'daily', 'afternoon', 'creativity', 'light'),
('How do you organize your space?', 'daily', 'afternoon', 'decision_making', 'light'),
('What time do you usually wake up?', 'daily', 'morning', 'emotional_patterns', 'light'),
('Do you prefer routine or spontaneity?', 'daily', 'afternoon', 'decision_making', 'medium'),
('What''s your favorite season and why?', 'daily', 'afternoon', 'emotional_patterns', 'light'),
('How do you spend a rainy day?', 'daily', 'afternoon', 'social_behavior', 'light'),
('What''s your morning beverage of choice?', 'daily', 'morning', 'core_values', 'light'),
('Are you an early bird or night owl?', 'daily', 'morning', 'emotional_patterns', 'light'),
('What''s your favorite way to exercise?', 'daily', 'afternoon', 'decision_making', 'light'),
('How do you manage stress day-to-day?', 'daily', 'afternoon', 'resilience', 'medium'),
('What makes you feel refreshed?', 'daily', 'morning', 'emotional_patterns', 'light'),
('How do you celebrate small wins?', 'daily', 'afternoon', 'emotional_patterns', 'medium'),
('What''s your favorite part of your home?', 'daily', 'afternoon', 'core_values', 'light'),
('How do you prepare for an important day?', 'daily', 'morning', 'decision_making', 'medium'),
('What daily practice keeps you centered?', 'daily', 'morning', 'resilience', 'medium'),
('How do you stay productive?', 'daily', 'afternoon', 'decision_making', 'medium'),
('What''s your favorite way to waste time?', 'daily', 'afternoon', 'creativity', 'light'),
('How do you treat yourself after a hard week?', 'daily', 'evening', 'emotional_patterns', 'light'),
('What sound makes you feel at home?', 'daily', 'evening', 'emotional_patterns', 'light'),
('How do you start your day with intention?', 'daily', 'morning', 'life_philosophy', 'medium'),
('What''s your favorite evening activity?', 'daily', 'evening', 'social_behavior', 'light'),

-- More Relationships (30 additional)
('How do you express love?', 'relationships', 'afternoon', 'social_behavior', 'medium'),
('What''s your idea of a perfect date?', 'relationships', 'afternoon', 'social_behavior', 'light'),
('How do you know when someone really understands you?', 'relationships', 'evening', 'social_behavior', 'deep'),
('What role do you typically play in friendships?', 'relationships', 'afternoon', 'social_behavior', 'medium'),
('How do you help someone who''s struggling?', 'relationships', 'afternoon', 'social_behavior', 'medium'),
('What makes you feel connected to someone?', 'relationships', 'afternoon', 'emotional_patterns', 'medium'),
('How do you maintain boundaries in relationships?', 'relationships', 'afternoon', 'decision_making', 'deep'),
('What quality in a partner is most important?', 'relationships', 'afternoon', 'core_values', 'deep'),
('How do you apologize when you''ve hurt someone?', 'relationships', 'afternoon', 'social_behavior', 'deep'),
('What friendship changed your life?', 'relationships', 'evening', 'social_behavior', 'deep'),
('How do you support loved ones through hard times?', 'relationships', 'afternoon', 'social_behavior', 'medium'),
('What does emotional intimacy mean to you?', 'relationships', 'evening', 'emotional_patterns', 'deep'),
('How do you rebuild trust after it''s broken?', 'relationships', 'evening', 'resilience', 'deep'),
('What relationship pattern have you noticed in yourself?', 'relationships', 'evening', 'life_philosophy', 'deep'),
('How do you show appreciation to loved ones?', 'relationships', 'afternoon', 'social_behavior', 'medium'),
('What role does communication play in relationships?', 'relationships', 'afternoon', 'communication_style', 'deep'),
('How do you handle jealousy?', 'relationships', 'afternoon', 'emotional_patterns', 'medium'),
('What makes you feel truly seen by someone?', 'relationships', 'evening', 'emotional_patterns', 'deep'),
('How do you navigate disagreements?', 'relationships', 'afternoon', 'resilience', 'medium'),
('What lesson have past relationships taught you?', 'relationships', 'evening', 'life_philosophy', 'deep'),
('How do you balance independence and togetherness?', 'relationships', 'afternoon', 'decision_making', 'deep'),
('What green flag do you look for in people?', 'relationships', 'afternoon', 'social_behavior', 'medium'),
('How do you make new friends?', 'relationships', 'afternoon', 'social_behavior', 'medium'),
('What does unconditional love mean to you?', 'relationships', 'evening', 'core_values', 'deep'),
('How do you keep romance alive?', 'relationships', 'evening', 'creativity', 'medium'),
('What role does vulnerability play in connection?', 'relationships', 'evening', 'emotional_patterns', 'deep'),
('How do you celebrate loved ones?', 'relationships', 'afternoon', 'social_behavior', 'light'),
('What makes a house feel like a home?', 'relationships', 'evening', 'emotional_patterns', 'medium'),
('How do you nurture long-term relationships?', 'relationships', 'afternoon', 'decision_making', 'deep'),
('What does partnership mean to you?', 'relationships', 'afternoon', 'core_values', 'deep'),

-- More Stories & Memories (35 additional)
('What place from childhood holds special meaning?', 'stories', 'evening', 'emotional_patterns', 'medium'),
('Describe a perfect day from your past', 'stories', 'evening', 'core_values', 'medium'),
('What teacher or mentor influenced you most?', 'stories', 'evening', 'social_behavior', 'deep'),
('Tell me about your first job', 'stories', 'afternoon', 'resilience', 'medium'),
('What''s a skill you taught yourself?', 'stories', 'afternoon', 'creativity', 'medium'),
('Describe a time you felt brave', 'stories', 'afternoon', 'resilience', 'medium'),
('What holiday memory stands out?', 'stories', 'evening', 'emotional_patterns', 'light'),
('Tell me about your first friend', 'stories', 'evening', 'social_behavior', 'medium'),
('What''s your favorite family tradition?', 'stories', 'evening', 'core_values', 'medium'),
('Describe a turning point in your life', 'stories', 'evening', 'life_philosophy', 'deep'),
('What childhood fear did you overcome?', 'stories', 'afternoon', 'resilience', 'medium'),
('Tell me about a random act of kindness you witnessed', 'stories', 'afternoon', 'social_behavior', 'medium'),
('What''s the best gift you ever received?', 'stories', 'afternoon', 'emotional_patterns', 'light'),
('Describe your high school experience in three words', 'stories', 'afternoon', 'communication_style', 'light'),
('What memory makes you feel grateful?', 'stories', 'evening', 'emotional_patterns', 'medium'),
('Tell me about meeting someone who became important', 'stories', 'evening', 'social_behavior', 'deep'),
('What achievement are you proudest of?', 'stories', 'evening', 'core_values', 'deep'),
('Describe a moment of unexpected joy', 'stories', 'afternoon', 'emotional_patterns', 'medium'),
('What tradition did you create?', 'stories', 'evening', 'creativity', 'medium'),
('Tell me about a time you helped a stranger', 'stories', 'afternoon', 'social_behavior', 'medium'),
('What vacation memory do you treasure?', 'stories', 'evening', 'emotional_patterns', 'medium'),
('Describe your first major purchase', 'stories', 'afternoon', 'decision_making', 'medium'),
('What concert or event was unforgettable?', 'stories', 'afternoon', 'emotional_patterns', 'medium'),
('Tell me about a time you surprised yourself', 'stories', 'afternoon', 'resilience', 'medium'),
('What birthday stands out in memory?', 'stories', 'evening', 'emotional_patterns', 'light'),
('Describe a moment of perfect peace', 'stories', 'evening', 'emotional_patterns', 'medium'),
('What risk paid off?', 'stories', 'afternoon', 'resilience', 'deep'),
('Tell me about your first love', 'stories', 'evening', 'emotional_patterns', 'deep'),
('What family story gets retold often?', 'stories', 'evening', 'communication_style', 'light'),
('Describe a time you stood up for something', 'stories', 'afternoon', 'core_values', 'deep'),
('What childhood game did you love?', 'stories', 'afternoon', 'creativity', 'light'),
('Tell me about an act of forgiveness', 'stories', 'evening', 'resilience', 'deep'),
('What moment taught you about yourself?', 'stories', 'evening', 'life_philosophy', 'deep'),
('Describe the day you felt most alive', 'stories', 'evening', 'core_values', 'deep'),
('What tradition have you passed down?', 'stories', 'evening', 'social_behavior', 'medium'),

-- More Dreams & Aspirations (30 additional)
('What would you do with unlimited time?', 'dreams', 'afternoon', 'core_values', 'medium'),
('If you could learn any language, which one?', 'dreams', 'afternoon', 'creativity', 'light'),
('What book have you always wanted to write?', 'dreams', 'afternoon', 'creativity', 'medium'),
('Where would you build your dream home?', 'dreams', 'afternoon', 'core_values', 'light'),
('What cause would you dedicate your life to?', 'dreams', 'evening', 'core_values', 'deep'),
('If you could have dinner with anyone, who?', 'dreams', 'afternoon', 'social_behavior', 'light'),
('What hobby do you want to pick up?', 'dreams', 'afternoon', 'creativity', 'light'),
('Describe your ideal retirement', 'dreams', 'afternoon', 'life_philosophy', 'medium'),
('What business would you start?', 'dreams', 'afternoon', 'creativity', 'medium'),
('If you could relive one year, which one?', 'dreams', 'evening', 'emotional_patterns', 'medium'),
('What adventure is on your bucket list?', 'dreams', 'afternoon', 'creativity', 'medium'),
('What superpower would you choose?', 'dreams', 'afternoon', 'creativity', 'light'),
('Where would you volunteer your time?', 'dreams', 'afternoon', 'core_values', 'medium'),
('What would you do if you won the lottery?', 'dreams', 'afternoon', 'decision_making', 'medium'),
('What era would you visit if you had a time machine?', 'dreams', 'afternoon', 'creativity', 'light'),
('What skill would make your life easier?', 'dreams', 'morning', 'decision_making', 'light'),
('Describe your dream vacation', 'dreams', 'afternoon', 'emotional_patterns', 'light'),
('What would you change about your daily life?', 'dreams', 'morning', 'decision_making', 'medium'),
('If you could be famous for something, what?', 'dreams', 'afternoon', 'core_values', 'medium'),
('What project have you been putting off?', 'dreams', 'afternoon', 'resilience', 'medium'),
('Where do you want to be in 5 years?', 'dreams', 'afternoon', 'life_philosophy', 'medium'),
('What experience do you want to give your children?', 'dreams', 'evening', 'core_values', 'deep'),
('What would perfect balance look like in your life?', 'dreams', 'evening', 'life_philosophy', 'deep'),
('What creative pursuit calls to you?', 'dreams', 'afternoon', 'creativity', 'medium'),
('If you could start over, what would you do differently?', 'dreams', 'evening', 'life_philosophy', 'deep'),
('What collaboration would you love to be part of?', 'dreams', 'afternoon', 'social_behavior', 'medium'),
('What would you invent if you could?', 'dreams', 'afternoon', 'creativity', 'medium'),
('Describe your ideal work situation', 'dreams', 'morning', 'core_values', 'medium'),
('What impact do you want your life to have?', 'dreams', 'evening', 'life_philosophy', 'deep'),
('What would make you feel fulfilled?', 'dreams', 'evening', 'core_values', 'deep'),

-- More Challenges & Growth (35 additional)
('What belief about yourself did you outgrow?', 'challenges', 'evening', 'life_philosophy', 'deep'),
('How have you changed in the past decade?', 'challenges', 'evening', 'life_philosophy', 'deep'),
('What mistake taught you compassion?', 'challenges', 'evening', 'resilience', 'deep'),
('When did you last step outside your comfort zone?', 'challenges', 'afternoon', 'resilience', 'medium'),
('What pattern are you working to break?', 'challenges', 'evening', 'life_philosophy', 'deep'),
('How do you respond to criticism?', 'challenges', 'afternoon', 'resilience', 'medium'),
('What insecurity have you overcome?', 'challenges', 'evening', 'resilience', 'deep'),
('How has failure shaped your success?', 'challenges', 'evening', 'resilience', 'deep'),
('What did rock bottom teach you?', 'challenges', 'evening', 'resilience', 'deep'),
('How do you practice self-compassion?', 'challenges', 'afternoon', 'emotional_patterns', 'medium'),
('What limiting belief did you release?', 'challenges', 'evening', 'life_philosophy', 'deep'),
('When did you discover your strength?', 'challenges', 'evening', 'resilience', 'deep'),
('What truth was hard to accept?', 'challenges', 'evening', 'life_philosophy', 'deep'),
('How do you handle setbacks?', 'challenges', 'afternoon', 'resilience', 'medium'),
('What risk are you glad you took?', 'challenges', 'afternoon', 'decision_making', 'deep'),
('How has pain transformed you?', 'challenges', 'evening', 'resilience', 'deep'),
('What grudge did you finally let go of?', 'challenges', 'evening', 'resilience', 'deep'),
('When did you prove yourself wrong?', 'challenges', 'afternoon', 'life_philosophy', 'medium'),
('What challenge made you who you are?', 'challenges', 'evening', 'resilience', 'deep'),
('How do you rebuild after a setback?', 'challenges', 'afternoon', 'resilience', 'medium'),
('What fear holds you back still?', 'challenges', 'evening', 'emotional_patterns', 'deep'),
('How has adversity revealed your values?', 'challenges', 'evening', 'core_values', 'deep'),
('What breakthrough moment changed everything?', 'challenges', 'evening', 'life_philosophy', 'deep'),
('How do you maintain hope in dark times?', 'challenges', 'evening', 'resilience', 'deep'),
('What version of yourself did you leave behind?', 'challenges', 'evening', 'life_philosophy', 'deep'),
('When did you choose courage over comfort?', 'challenges', 'afternoon', 'resilience', 'deep'),
('What regret taught you something valuable?', 'challenges', 'evening', 'life_philosophy', 'deep'),
('How do you measure personal growth?', 'challenges', 'afternoon', 'life_philosophy', 'medium'),
('What challenge are you currently navigating?', 'challenges', 'afternoon', 'resilience', 'medium'),
('How has your resilience surprised you?', 'challenges', 'evening', 'resilience', 'deep'),
('What old wound are you still healing?', 'challenges', 'evening', 'emotional_patterns', 'deep'),
('How do you practice patience?', 'challenges', 'afternoon', 'resilience', 'medium'),
('What sacrifice led to growth?', 'challenges', 'evening', 'resilience', 'deep'),
('How do you stay committed to change?', 'challenges', 'afternoon', 'decision_making', 'deep'),
('What challenge would you face again?', 'challenges', 'evening', 'resilience', 'deep'),

-- More Wisdom & Philosophy (40 additional)
('What does a good life look like to you?', 'wisdom', 'evening', 'life_philosophy', 'deep'),
('How do you define success personally?', 'wisdom', 'evening', 'core_values', 'deep'),
('What role does purpose play in happiness?', 'wisdom', 'evening', 'life_philosophy', 'deep'),
('How do you practice mindfulness?', 'wisdom', 'afternoon', 'emotional_patterns', 'medium'),
('What does freedom mean to you?', 'wisdom', 'evening', 'core_values', 'deep'),
('How do you handle uncertainty?', 'wisdom', 'afternoon', 'resilience', 'deep'),
('What makes something meaningful?', 'wisdom', 'evening', 'life_philosophy', 'deep'),
('How do you cultivate inner peace?', 'wisdom', 'evening', 'emotional_patterns', 'deep'),
('What does it mean to be a good person?', 'wisdom', 'evening', 'core_values', 'deep'),
('How do you stay present?', 'wisdom', 'afternoon', 'emotional_patterns', 'medium'),
('What role does suffering play in wisdom?', 'wisdom', 'evening', 'life_philosophy', 'deep'),
('How do you define personal growth?', 'wisdom', 'afternoon', 'life_philosophy', 'deep'),
('What makes life beautiful to you?', 'wisdom', 'evening', 'emotional_patterns', 'deep'),
('How do you practice acceptance?', 'wisdom', 'evening', 'resilience', 'deep'),
('What does living simply mean?', 'wisdom', 'afternoon', 'life_philosophy', 'deep'),
('How do you find joy in ordinary moments?', 'wisdom', 'morning', 'emotional_patterns', 'medium'),
('What does wisdom look like in action?', 'wisdom', 'evening', 'life_philosophy', 'deep'),
('How do you stay curious?', 'wisdom', 'afternoon', 'creativity', 'medium'),
('What makes time well spent?', 'wisdom', 'evening', 'core_values', 'deep'),
('How do you practice generosity?', 'wisdom', 'afternoon', 'social_behavior', 'medium'),
('What does emotional maturity mean?', 'wisdom', 'evening', 'life_philosophy', 'deep'),
('How do you stay humble?', 'wisdom', 'afternoon', 'core_values', 'deep'),
('What makes you feel connected to humanity?', 'wisdom', 'evening', 'social_behavior', 'deep'),
('How do you honor your values daily?', 'wisdom', 'morning', 'core_values', 'deep'),
('What does it mean to live consciously?', 'wisdom', 'evening', 'life_philosophy', 'deep'),
('How do you practice non-judgment?', 'wisdom', 'afternoon', 'social_behavior', 'deep'),
('What gives your life depth?', 'wisdom', 'evening', 'core_values', 'deep'),
('How do you measure what matters?', 'wisdom', 'evening', 'life_philosophy', 'deep'),
('What does community mean to you?', 'wisdom', 'afternoon', 'social_behavior', 'deep'),
('How do you practice self-awareness?', 'wisdom', 'evening', 'life_philosophy', 'deep'),
('What makes an experience rich?', 'wisdom', 'evening', 'emotional_patterns', 'deep'),
('How do you stay grounded?', 'wisdom', 'morning', 'resilience', 'medium'),
('What role does reflection play in growth?', 'wisdom', 'evening', 'life_philosophy', 'deep'),
('How do you live with integrity?', 'wisdom', 'afternoon', 'core_values', 'deep'),
('What makes life sacred to you?', 'wisdom', 'evening', 'core_values', 'deep'),
('How do you practice radical honesty?', 'wisdom', 'afternoon', 'communication_style', 'deep'),
('What does self-mastery mean?', 'wisdom', 'evening', 'life_philosophy', 'deep'),
('How do you find meaning in routine?', 'wisdom', 'morning', 'life_philosophy', 'medium'),
('What legacy of wisdom do you want to leave?', 'wisdom', 'evening', 'core_values', 'deep'),
('How do you live your truth?', 'wisdom', 'evening', 'core_values', 'deep')

ON CONFLICT DO NOTHING;

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at on new tables
DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_timestamp();

DROP TRIGGER IF EXISTS update_user_daily_progress_updated_at ON user_daily_progress;
CREATE TRIGGER update_user_daily_progress_updated_at
  BEFORE UPDATE ON user_daily_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_timestamp();

-- Activate St. Raphael (free tier) for all users by default
-- This will be done via application logic when user signs up
