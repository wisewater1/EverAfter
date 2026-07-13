# File Storage Setup Guide

## Overview

EverAfter now includes a complete file storage system that allows users to securely upload, manage, and download files. Files are organized by user email and stored in Supabase Storage with full RLS security.

---

## 🔧 Setup Instructions

### 1. Apply Database Migration

The file storage system requires a database migration. Run this in your Supabase SQL Editor:

```bash
# The migration file is located at:
supabase/migrations/20251025130000_create_user_file_storage_system.sql
```

This creates:
- `user_files` table with full RLS policies
- Storage usage tracking function
- Automatic timestamp updates
- Comprehensive indexing

### 2. Create Supabase Storage Bucket

In your Supabase Dashboard:

1. Go to **Storage** section
2. Click **"New bucket"**
3. Create a bucket named: `user-files`
4. Set **Public bucket**: `false` (private by default)
5. Click **Save**

### 3. Configure Storage Policies

After creating the bucket, set up RLS policies:

```sql
-- Policy: Users can upload files to their own folder
CREATE POLICY "Users can upload to own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'user-files' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can view their own files
CREATE POLICY "Users can view own files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'user-files' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can update their own files
CREATE POLICY "Users can update own files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'user-files' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can delete their own files
CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'user-files' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

---

## 📁 File Organization

Files are automatically organized using this structure:

```
user-files/
  └── {email-prefix}-{user-id-prefix}/
      ├── health_report/
      │   ├── {timestamp}-report.html
      │   └── {timestamp}-report.pdf
      ├── document/
      │   ├── {timestamp}-document.pdf
      │   └── {timestamp}-lab-results.pdf
      ├── image/
      │   ├── {timestamp}-photo.jpg
      │   └── {timestamp}-scan.png
      └── other/
          └── {timestamp}-file.txt
```

Example: `john-doe-a1b2c3d4/health_report/1730000000000-weekly-report.html`

---

## ✨ Features

### 1. File Manager Component

Located at: `src/components/FileManager.tsx`

Features:
- Upload multiple files
- Download files
- Delete files
- Search files by name
- Filter by category
- View storage statistics
- Beautiful minimalistic UI

### 2. Enhanced Health Report Generator

Located at: `src/components/HealthReportGenerator.tsx`

New Features:
- **Save to Cloud** toggle
- Automatically saves reports to user's file storage
- Beautiful redesigned UI with gradients
- Improved button interactions
- Real-time upload status

### 3. File Storage Utilities

Located at: `src/lib/file-storage.ts`

Functions:
```typescript
// Upload a file
uploadFile(file: File, options?: FileUploadOptions)

// Download a file
downloadFile(fileId: string): Promise<Blob>

// Get file URL (signed or public)
getFileUrl(fileId: string, expiresIn?: number): Promise<string>

// Delete a file
deleteFile(fileId: string): Promise<void>

// List user's files
listUserFiles(category?: string): Promise<UserFile[]>

// Get storage statistics
getUserStorageStats(): Promise<StorageStats>

// Helper functions
formatFileSize(bytes: number): string
getFileIcon(fileType: string): string
```

---

## 🎨 UI Components

### FileManager

Beautiful, minimalistic file manager with:
- **Storage stats card** - Shows total usage and file count
- **Category breakdown** - Stats by file type
- **Upload button** - Drag & drop or click to upload
- **Search bar** - Real-time file search
- **Category filters** - All, Health Reports, Documents, Images, Other
- **File cards** - With download and delete actions
- **Success/Error notifications** - Clear user feedback

### Health Report Generator

Enhanced UI with:
- **Gradient backgrounds** - Modern glassmorphism
- **Icon containers** - Color-coded by type
- **Hover animations** - Scale and shadow effects
- **Toggle switch** - Save to cloud option
- **Large action button** - Clear call-to-action

---

## 🔐 Security

### Row-Level Security (RLS)

All tables have comprehensive RLS policies:
- Users can only access their own files
- Files are organized by user ID
- Automatic user_id assignment

### Storage Security

- Private bucket by default
- User-specific folder structure
- Signed URLs for temporary access
- Optional public URLs for sharing

### File Path Security

Files are stored with sanitized names:
- Special characters removed
- Timestamps added for uniqueness
- User prefix for organization

---

## 📊 Database Schema

### user_files Table

```sql
CREATE TABLE user_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
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
```

### Storage Function

```sql
-- Get user's storage usage with breakdown by category
SELECT * FROM get_user_storage_usage(auth.uid());
```

Returns:
```json
{
  "total_files": 10,
  "total_size_bytes": 5242880,
  "total_size_mb": 5.00,
  "by_category": {
    "health_report": { "count": 3, "size_bytes": 1048576, "size_mb": 1.00 },
    "document": { "count": 5, "size_bytes": 3145728, "size_mb": 3.00 },
    "image": { "count": 2, "size_bytes": 1048576, "size_mb": 1.00 }
  }
}
```

---

## 🚀 Usage Examples

### Upload a File

```typescript
import { uploadFile } from '../lib/file-storage';

const file = event.target.files[0];
const { file: uploadedFile, publicUrl } = await uploadFile(file, {
  category: 'health_report',
  description: 'Weekly health report',
  isPublic: false,
});
```

### Download a File

```typescript
import { downloadFile } from '../lib/file-storage';

const blob = await downloadFile(fileId);
const url = URL.createObjectURL(blob);
// Create download link
const a = document.createElement('a');
a.href = url;
a.download = fileName;
a.click();
```

### List Files

```typescript
import { listUserFiles } from '../lib/file-storage';

// Get all files
const allFiles = await listUserFiles();

// Get only health reports
const reports = await listUserFiles('health_report');
```

### Get Storage Stats

```typescript
import { getUserStorageStats } from '../lib/file-storage';

const stats = await getUserStorageStats();
console.log(`Total: ${stats.total_size_mb} MB`);
console.log(`Files: ${stats.total_files}`);
```

---

## 📱 Accessing File Manager

Users can access the File Manager from:

1. **Health Dashboard** → Click "My Files" tab
2. **Navigation** → Direct link to file management

---

## 🎯 File Categories

| Category | Description | Icon |
|----------|-------------|------|
| `health_report` | Generated health reports | 📄 |
| `document` | Documents, PDFs, text files | 📝 |
| `image` | Photos, scans, images | 🖼️ |
| `other` | Any other file type | 📎 |

---

## 🔧 Configuration

### Environment Variables

No additional environment variables needed! The system uses your existing Supabase configuration:

```env
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Storage Limits

Configure in Supabase Dashboard → Storage → Settings:

- File size limit (default: 50 MB)
- Total storage quota (default: 1 GB free tier)

---

## 🐛 Troubleshooting

### Files Not Uploading

1. **Check bucket exists**: Ensure `user-files` bucket is created
2. **Check RLS policies**: Verify storage policies are set
3. **Check file size**: Ensure file is under size limit
4. **Check permissions**: User must be authenticated

### Files Not Showing

1. **Check database**: Verify `user_files` table exists
2. **Check RLS**: Ensure RLS policies allow SELECT
3. **Check user_id**: Verify user is authenticated
4. **Check category filter**: Try "All Files" filter

### Storage Errors

1. **Check migration**: Ensure migration was applied
2. **Check function**: Verify `get_user_storage_usage` exists
3. **Check indexes**: Ensure all indexes were created

---

## 📖 Documentation

- **File Organization**: `FILE_ORGANIZATION.md`
- **Project Status**: `PROJECT_STATUS.md`
- **Quick Reference**: `QUICK_REFERENCE.md`

---

## ✅ Checklist

Before deploying:

- [ ] Database migration applied
- [ ] Storage bucket created (`user-files`)
- [ ] Storage RLS policies configured
- [ ] Test file upload
- [ ] Test file download
- [ ] Test file deletion
- [ ] Test storage stats
- [ ] Test in production

---

**File Storage System Status**: ✅ Complete & Production Ready

Last Updated: October 25, 2025
