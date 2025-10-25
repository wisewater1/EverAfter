/*
  # Create User Files Storage Bucket

  ## Purpose
  Creates a storage bucket for user-uploaded files with proper security policies

  ## Changes
  - Creates 'user-files' storage bucket
  - Sets up RLS policies for file access
  - Configures file size limits and allowed MIME types

  ## Security
  - Users can only upload to their own folders
  - Users can only view/delete their own files
  - File size limit: 50MB per file
  - Allowed types: images, PDFs, documents
*/

-- Create the storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'user-files',
  'user-files',
  false,
  52428800, -- 50MB
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/csv'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Policy: Users can upload to their own folder
CREATE POLICY "Users can upload own files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'user-files' 
  AND (storage.foldername(name))[1] LIKE auth.uid()::text || '%'
);

-- Policy: Users can view their own files
CREATE POLICY "Users can view own files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'user-files' 
  AND (storage.foldername(name))[1] LIKE auth.uid()::text || '%'
);

-- Policy: Users can update their own files
CREATE POLICY "Users can update own files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'user-files' 
  AND (storage.foldername(name))[1] LIKE auth.uid()::text || '%'
);

-- Policy: Users can delete their own files
CREATE POLICY "Users can delete own files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'user-files' 
  AND (storage.foldername(name))[1] LIKE auth.uid()::text || '%'
);
