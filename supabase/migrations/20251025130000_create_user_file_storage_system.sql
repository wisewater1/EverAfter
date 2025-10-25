/*
  # User File Storage System

  1. New Tables
    - `user_files`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `file_name` (text) - Original filename
      - `file_path` (text) - Storage path in bucket
      - `file_size` (bigint) - File size in bytes
      - `file_type` (text) - MIME type
      - `category` (text) - health_report, document, image, other
      - `description` (text, optional)
      - `storage_bucket` (text) - Bucket name
      - `is_public` (boolean) - Public access flag
      - `metadata` (jsonb) - Additional metadata
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `user_files`
    - Users can only access their own files
    - Files are organized by user email prefix

  3. Indexes
    - user_id for fast user file lookups
    - category for filtering by type
    - created_at for sorting
*/

-- Create user_files table
CREATE TABLE IF NOT EXISTS user_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  file_name text NOT NULL,
  file_path text NOT NULL UNIQUE,
  file_size bigint NOT NULL,
  file_type text NOT NULL,
  category text NOT NULL DEFAULT 'other',
  description text,
  storage_bucket text NOT NULL DEFAULT 'user-files',
  is_public boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_files ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_files_user_id ON user_files(user_id);
CREATE INDEX IF NOT EXISTS idx_user_files_category ON user_files(category);
CREATE INDEX IF NOT EXISTS idx_user_files_created_at ON user_files(created_at DESC);

-- RLS Policies
CREATE POLICY "Users can view own files"
  ON user_files
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own files"
  ON user_files
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own files"
  ON user_files
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own files"
  ON user_files
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Public file access (for files marked as public)
CREATE POLICY "Anyone can view public files"
  ON user_files
  FOR SELECT
  TO anon, authenticated
  USING (is_public = true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_files_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER user_files_updated_at
  BEFORE UPDATE ON user_files
  FOR EACH ROW
  EXECUTE FUNCTION update_user_files_updated_at();

-- Function to get user's storage usage
CREATE OR REPLACE FUNCTION get_user_storage_usage(p_user_id uuid)
RETURNS TABLE (
  total_files bigint,
  total_size_bytes bigint,
  total_size_mb numeric,
  by_category jsonb
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::bigint as total_files,
    COALESCE(SUM(file_size), 0)::bigint as total_size_bytes,
    ROUND((COALESCE(SUM(file_size), 0) / 1024.0 / 1024.0)::numeric, 2) as total_size_mb,
    jsonb_object_agg(
      category,
      jsonb_build_object(
        'count', cat_count,
        'size_bytes', cat_size,
        'size_mb', ROUND((cat_size / 1024.0 / 1024.0)::numeric, 2)
      )
    ) as by_category
  FROM (
    SELECT
      category,
      COUNT(*)::bigint as cat_count,
      COALESCE(SUM(file_size), 0)::bigint as cat_size
    FROM user_files
    WHERE user_id = p_user_id
    GROUP BY category
  ) categories;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_user_storage_usage(uuid) TO authenticated;

COMMENT ON TABLE user_files IS 'Stores metadata for user-uploaded files in Supabase Storage';
COMMENT ON FUNCTION get_user_storage_usage IS 'Returns storage usage statistics for a user';
