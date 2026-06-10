/*
  # User Portal System - Comprehensive User Connection Platform

  1. New Tables
    - `user_profiles`
      - Extended user information beyond auth.users
      - Location, interests, skills, bio, avatar
      - Verification status and privacy settings

    - `user_connections`
      - Friend/connection requests and acceptances
      - Bi-directional relationships
      - Connection status tracking

    - `user_messages`
      - Direct messaging between users
      - Read status and timestamps
      - Message threading support

    - `admin_notifications`
      - All new user registrations logged
      - Email notification queue for Raphael
      - Read/unread status

    - `user_activity_log`
      - Track user actions for admin dashboard
      - Login history, profile updates, connections

  2. Security
    - Enable RLS on all tables
    - Users can only view/edit their own data
    - Admin can view all data
    - Public profiles viewable by authenticated users

  3. Triggers
    - Auto-create profile on user signup
    - Send notification to admin on new registration
    - Update activity log on key actions
*/

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  display_name TEXT,
  phone_number TEXT,
  location TEXT,
  country TEXT,
  interests TEXT[] DEFAULT ARRAY[]::TEXT[],
  skills TEXT[] DEFAULT ARRAY[]::TEXT[],
  bio TEXT,
  avatar_url TEXT,
  website TEXT,
  linkedin_url TEXT,
  twitter_url TEXT,
  is_verified BOOLEAN DEFAULT false,
  email_verified BOOLEAN DEFAULT false,
  profile_visibility TEXT CHECK (profile_visibility IN ('public', 'connections', 'private')) DEFAULT 'public',
  allow_messages BOOLEAN DEFAULT true,
  allow_connection_requests BOOLEAN DEFAULT true,
  last_active_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create user_connections table
CREATE TABLE IF NOT EXISTS user_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  addressee_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT CHECK (status IN ('pending', 'accepted', 'rejected', 'blocked')) DEFAULT 'pending',
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(requester_id, addressee_id),
  CHECK (requester_id != addressee_id)
);

-- Create user_messages table
CREATE TABLE IF NOT EXISTS user_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  recipient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  subject TEXT,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  parent_message_id UUID REFERENCES user_messages(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create admin_notifications table
CREATE TABLE IF NOT EXISTS admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_type TEXT CHECK (notification_type IN ('new_user', 'new_connection', 'user_report', 'system_alert')) NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  is_read BOOLEAN DEFAULT false,
  is_emailed BOOLEAN DEFAULT false,
  emailed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create user_activity_log table
CREATE TABLE IF NOT EXISTS user_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  activity_type TEXT CHECK (activity_type IN ('login', 'logout', 'profile_update', 'connection_request', 'connection_accept', 'message_sent', 'password_change')) NOT NULL,
  description TEXT,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles

-- Users can view public profiles and their own profile
CREATE POLICY "Users can view public profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (
    profile_visibility = 'public'
    OR user_id = auth.uid()
    OR (
      profile_visibility = 'connections'
      AND EXISTS (
        SELECT 1 FROM user_connections
        WHERE (requester_id = auth.uid() AND addressee_id = user_profiles.user_id AND status = 'accepted')
        OR (addressee_id = auth.uid() AND requester_id = user_profiles.user_id AND status = 'accepted')
      )
    )
  );

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for user_connections

-- Users can view their own connections
CREATE POLICY "Users can view own connections"
  ON user_connections FOR SELECT
  TO authenticated
  USING (
    auth.uid() = requester_id
    OR auth.uid() = addressee_id
  );

-- Users can create connection requests
CREATE POLICY "Users can create connection requests"
  ON user_connections FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = requester_id);

-- Users can update connections where they are addressee (accept/reject)
CREATE POLICY "Users can update received connections"
  ON user_connections FOR UPDATE
  TO authenticated
  USING (auth.uid() = addressee_id)
  WITH CHECK (auth.uid() = addressee_id);

-- Users can delete their own connection requests
CREATE POLICY "Users can delete own connection requests"
  ON user_connections FOR DELETE
  TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- RLS Policies for user_messages

-- Users can view messages they sent or received
CREATE POLICY "Users can view own messages"
  ON user_messages FOR SELECT
  TO authenticated
  USING (
    auth.uid() = sender_id
    OR auth.uid() = recipient_id
  );

-- Users can send messages
CREATE POLICY "Users can send messages"
  ON user_messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = sender_id);

-- Users can update messages they received (mark as read)
CREATE POLICY "Users can update received messages"
  ON user_messages FOR UPDATE
  TO authenticated
  USING (auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = recipient_id);

-- RLS Policies for admin_notifications

-- Only admin can view notifications
CREATE POLICY "Admin can view all notifications"
  ON admin_notifications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.display_name = 'Raphael Admin'
    )
  );

-- System can insert notifications
CREATE POLICY "System can insert notifications"
  ON admin_notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Admin can update notifications
CREATE POLICY "Admin can update notifications"
  ON admin_notifications FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.display_name = 'Raphael Admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.display_name = 'Raphael Admin'
    )
  );

-- RLS Policies for user_activity_log

-- Users can view their own activity
CREATE POLICY "Users can view own activity"
  ON user_activity_log FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- System can insert activity
CREATE POLICY "System can insert activity"
  ON user_activity_log FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Admin can view all activity
CREATE POLICY "Admin can view all activity"
  ON user_activity_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.display_name = 'Raphael Admin'
    )
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_display_name ON user_profiles(display_name);
CREATE INDEX IF NOT EXISTS idx_user_profiles_location ON user_profiles(location);
CREATE INDEX IF NOT EXISTS idx_user_profiles_visibility ON user_profiles(profile_visibility);
CREATE INDEX IF NOT EXISTS idx_user_connections_requester ON user_connections(requester_id);
CREATE INDEX IF NOT EXISTS idx_user_connections_addressee ON user_connections(addressee_id);
CREATE INDEX IF NOT EXISTS idx_user_connections_status ON user_connections(status);
CREATE INDEX IF NOT EXISTS idx_user_messages_sender ON user_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_user_messages_recipient ON user_messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_user_messages_read ON user_messages(is_read);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_type ON admin_notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_read ON admin_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_user_activity_log_user ON user_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_log_type ON user_activity_log(activity_type);

-- Function to create user profile on signup
CREATE OR REPLACE FUNCTION create_user_profile_on_signup()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (user_id, full_name, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS create_user_profile_trigger ON auth.users;
CREATE TRIGGER create_user_profile_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_profile_on_signup();

-- Function to notify admin of new user registration
CREATE OR REPLACE FUNCTION notify_admin_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_email TEXT;
BEGIN
  SELECT email INTO user_email FROM auth.users WHERE id = NEW.user_id;

  INSERT INTO admin_notifications (
    notification_type,
    user_id,
    title,
    message,
    metadata
  ) VALUES (
    'new_user',
    NEW.user_id,
    'New User Registration',
    'New user ' || NEW.full_name || ' (' || user_email || ') has registered.',
    jsonb_build_object(
      'user_id', NEW.user_id,
      'email', user_email,
      'full_name', NEW.full_name,
      'location', NEW.location,
      'interests', NEW.interests,
      'skills', NEW.skills
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to notify admin on profile creation
DROP TRIGGER IF EXISTS notify_admin_new_user_trigger ON user_profiles;
CREATE TRIGGER notify_admin_new_user_trigger
  AFTER INSERT ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION notify_admin_new_user();

-- Function to update last_active_at
CREATE OR REPLACE FUNCTION update_user_last_active()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE user_profiles
  SET last_active_at = now()
  WHERE user_id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update last active on activity log
DROP TRIGGER IF EXISTS update_last_active_trigger ON user_activity_log;
CREATE TRIGGER update_last_active_trigger
  AFTER INSERT ON user_activity_log
  FOR EACH ROW
  EXECUTE FUNCTION update_user_last_active();

-- Function for admin to export all users
CREATE OR REPLACE FUNCTION get_all_users_for_admin()
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  full_name TEXT,
  phone_number TEXT,
  location TEXT,
  interests TEXT[],
  skills TEXT[],
  created_at TIMESTAMPTZ,
  last_active_at TIMESTAMPTZ,
  connection_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    up.user_id,
    au.email,
    up.full_name,
    up.phone_number,
    up.location,
    up.interests,
    up.skills,
    up.created_at,
    up.last_active_at,
    (
      SELECT COUNT(*)
      FROM user_connections uc
      WHERE (uc.requester_id = up.user_id OR uc.addressee_id = up.user_id)
      AND uc.status = 'accepted'
    ) as connection_count
  FROM user_profiles up
  JOIN auth.users au ON au.id = up.user_id
  ORDER BY up.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
