/*
  # Add Personality Media System

  1. New Tables
    - `personality_media`
      - `id` (uuid, primary key)
      - `family_member_id` (uuid, references family_members)
      - `user_id` (uuid, references auth.users)
      - `media_type` (text) - 'photo', 'video', 'voice', 'document'
      - `file_path` (text) - Path in storage bucket
      - `file_name` (text) - Original filename
      - `file_size` (bigint) - Size in bytes
      - `mime_type` (text) - MIME type
      - `duration` (integer) - For audio/video in seconds
      - `thumbnail_path` (text) - Optional thumbnail for videos
      - `caption` (text) - Optional description
      - `tags` (text[]) - Optional tags for categorization
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `personality_media` table
    - Add policies for authenticated users to manage their own media

  3. Indexes
    - Index on family_member_id for fast lookups
    - Index on user_id for user-specific queries
    - Index on media_type for filtering
*/

-- Create personality_media table
CREATE TABLE IF NOT EXISTS personality_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_member_id uuid REFERENCES family_members(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  media_type text NOT NULL CHECK (media_type IN ('photo', 'video', 'voice', 'document')),
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_size bigint NOT NULL DEFAULT 0,
  mime_type text NOT NULL,
  duration integer,
  thumbnail_path text,
  caption text,
  tags text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_personality_media_family_member ON personality_media(family_member_id);
CREATE INDEX IF NOT EXISTS idx_personality_media_user ON personality_media(user_id);
CREATE INDEX IF NOT EXISTS idx_personality_media_type ON personality_media(media_type);
CREATE INDEX IF NOT EXISTS idx_personality_media_created ON personality_media(created_at DESC);

-- Enable RLS
ALTER TABLE personality_media ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own personality media"
  ON personality_media
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own personality media"
  ON personality_media
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own personality media"
  ON personality_media
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own personality media"
  ON personality_media
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create storage bucket for personality media if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'personality-media',
  'personality-media',
  false,
  104857600, -- 100MB limit
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'audio/mpeg',
    'audio/wav',
    'audio/webm',
    'audio/ogg',
    'application/pdf'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for personality-media bucket
CREATE POLICY "Users can upload their own personality media"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'personality-media' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can view their own personality media"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'personality-media' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update their own personality media"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'personality-media' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete their own personality media"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'personality-media' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_personality_media_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS set_personality_media_updated_at ON personality_media;
CREATE TRIGGER set_personality_media_updated_at
  BEFORE UPDATE ON personality_media
  FOR EACH ROW
  EXECUTE FUNCTION update_personality_media_updated_at();
