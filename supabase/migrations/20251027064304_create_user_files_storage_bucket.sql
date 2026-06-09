/*
  # Create User Files Storage Bucket

  1. Storage Bucket
    - Create `user-files` bucket for storing user-generated files
    - Set appropriate size limits and MIME type restrictions
    - Private bucket (not publicly accessible)

  2. Configuration
    - Max file size: 50MB
    - Allowed types: HTML, PDF, Images, JSON, CSV, Office docs
    
  Note: Storage policies must be configured via Supabase Dashboard
  as they require special permissions on storage.objects table.
*/

-- Create the storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'user-files',
  'user-files',
  false,
  52428800, -- 50MB in bytes
  ARRAY[
    'text/html',
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/gif',
    'image/webp',
    'application/json',
    'text/csv',
    'text/plain',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY[
    'text/html',
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/gif',
    'image/webp',
    'application/json',
    'text/csv',
    'text/plain',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];
