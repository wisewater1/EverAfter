/*
  # Create Family Moments System

  1. New Tables
    - `family_moments`
      - Stores text, image, and video moments for family members
      - Links to family_members and users
      - Supports tags and categorization

  2. Security
    - Enable RLS on family_moments table
    - Users can only access their own family moments
    - Policies for CRUD operations

  3. Storage
    - Create storage bucket for family moment media files
*/

-- Create family_moments table
CREATE TABLE IF NOT EXISTS family_moments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  family_member_id uuid REFERENCES family_members(id) ON DELETE CASCADE NOT NULL,

  title text NOT NULL,
  description text,
  moment_type text NOT NULL CHECK (moment_type IN ('text', 'image', 'video', 'audio')),

  media_url text,
  media_thumbnail_url text,
  media_duration integer,

  tags text[] DEFAULT ARRAY[]::text[],
  location text,
  moment_date date,

  is_favorite boolean DEFAULT false,
  view_count integer DEFAULT 0,

  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_family_moments_user_id ON family_moments(user_id);
CREATE INDEX IF NOT EXISTS idx_family_moments_family_member_id ON family_moments(family_member_id);
CREATE INDEX IF NOT EXISTS idx_family_moments_moment_type ON family_moments(moment_type);
CREATE INDEX IF NOT EXISTS idx_family_moments_created_at ON family_moments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_family_moments_tags ON family_moments USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_family_moments_is_favorite ON family_moments(is_favorite) WHERE is_favorite = true;

-- Enable RLS
ALTER TABLE family_moments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own family moments"
  ON family_moments
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create family moments"
  ON family_moments
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own family moments"
  ON family_moments
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own family moments"
  ON family_moments
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_family_moments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_family_moments_updated_at_trigger ON family_moments;
CREATE TRIGGER update_family_moments_updated_at_trigger
  BEFORE UPDATE ON family_moments
  FOR EACH ROW
  EXECUTE FUNCTION update_family_moments_updated_at();

-- Create storage bucket for family moments (if not exists)
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('family-moments', 'family-moments', false)
  ON CONFLICT (id) DO NOTHING;
END $$;

-- Storage policies for family moments
CREATE POLICY "Users can upload family moment files"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'family-moments' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can view own family moment files"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'family-moments' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update own family moment files"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'family-moments' AND
    (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'family-moments' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own family moment files"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'family-moments' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Add family_member_id to engrams if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'engrams' AND column_name = 'family_member_id'
  ) THEN
    ALTER TABLE engrams ADD COLUMN family_member_id uuid REFERENCES family_members(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_engrams_family_member_id ON engrams(family_member_id);
  END IF;
END $$;
