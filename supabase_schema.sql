-- EverAfter Database Schema for Supabase

-- Users table (extends Supabase auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  timezone TEXT DEFAULT 'America/New_York',
  language TEXT DEFAULT 'en',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Memories table
CREATE TABLE public.memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  question_id TEXT NOT NULL,
  question_text TEXT NOT NULL,
  response TEXT NOT NULL,
  response_type TEXT CHECK (response_type IN ('text', 'voice', 'video')) DEFAULT 'text',
  category TEXT NOT NULL,
  personality_aspect TEXT,
  difficulty TEXT,
  time_of_day TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Family members table
CREATE TABLE public.family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  invited_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT CHECK (role IN ('primary', 'family', 'friend')) DEFAULT 'family',
  status TEXT CHECK (status IN ('active', 'pending', 'inactive')) DEFAULT 'pending',
  permissions JSONB DEFAULT '[]'::jsonb,
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  last_active TIMESTAMP WITH TIME ZONE
);

-- Saints AI table
CREATE TABLE public.saints_ai (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  saint_id TEXT NOT NULL,
  saint_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT false,
  tier TEXT CHECK (tier IN ('classic', 'premium')) DEFAULT 'classic',
  activated_at TIMESTAMP WITH TIME ZONE,
  deactivated_at TIMESTAMP WITH TIME ZONE,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Saint activities table
CREATE TABLE public.saint_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  saint_id TEXT NOT NULL,
  action TEXT NOT NULL,
  description TEXT,
  category TEXT,
  impact TEXT CHECK (impact IN ('high', 'medium', 'low')),
  status TEXT CHECK (status IN ('completed', 'in_progress', 'scheduled')) DEFAULT 'completed',
  details TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User settings table
CREATE TABLE public.user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  daily_question_frequency TEXT DEFAULT 'once-per-day',
  preferred_time TIME DEFAULT '19:00',
  memory_categories JSONB DEFAULT '["Stories", "Values", "Humor", "Daily Life", "Wisdom", "Family History"]'::jsonb,
  notification_preferences JSONB DEFAULT '{"email": true, "sms": false, "push": true, "digest": true}'::jsonb,
  privacy_settings JSONB DEFAULT '{"profile_visible": true, "memories_visible": false, "family_visible": true}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Projection settings table
CREATE TABLE public.projection_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  location TEXT,
  geofence_radius INTEGER DEFAULT 50,
  environment_theme TEXT DEFAULT 'Garden',
  ambient_audio TEXT DEFAULT 'Gentle Nature',
  lighting TEXT DEFAULT 'Warm Sunset',
  weather_effects BOOLEAN DEFAULT true,
  auto_activation BOOLEAN DEFAULT true,
  manual_override BOOLEAN DEFAULT true,
  activation_delay INTEGER DEFAULT 3,
  session_duration TEXT DEFAULT '15 minutes',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saints_ai ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saint_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projection_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for memories
CREATE POLICY "Users can view their own memories" ON public.memories
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own memories" ON public.memories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own memories" ON public.memories
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own memories" ON public.memories
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for family_members
CREATE POLICY "Users can view their family members" ON public.family_members
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() = invited_user_id);

CREATE POLICY "Users can manage their family members" ON public.family_members
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for saints_ai
CREATE POLICY "Users can view their Saints AI" ON public.saints_ai
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their Saints AI" ON public.saints_ai
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for saint_activities
CREATE POLICY "Users can view their Saint activities" ON public.saint_activities
  FOR SELECT USING (auth.uid() = user_id);

-- RLS Policies for user_settings
CREATE POLICY "Users can view their settings" ON public.user_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their settings" ON public.user_settings
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for projection_settings
CREATE POLICY "Users can view their projection settings" ON public.projection_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their projection settings" ON public.projection_settings
  FOR ALL USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_memories_user_id ON public.memories(user_id);
CREATE INDEX idx_memories_created_at ON public.memories(created_at DESC);
CREATE INDEX idx_family_members_user_id ON public.family_members(user_id);
CREATE INDEX idx_saints_ai_user_id ON public.saints_ai(user_id);
CREATE INDEX idx_saint_activities_user_id ON public.saint_activities(user_id);
CREATE INDEX idx_saint_activities_created_at ON public.saint_activities(created_at DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to automatically update updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_memories_updated_at BEFORE UPDATE ON public.memories
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON public.user_settings
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_projection_settings_updated_at BEFORE UPDATE ON public.projection_settings
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
