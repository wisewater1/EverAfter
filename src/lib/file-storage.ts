import { supabase } from './supabase';

export interface FileUploadOptions {
  category?: 'health_report' | 'document' | 'image' | 'other';
  description?: string;
  isPublic?: boolean;
  metadata?: Record<string, any>;
}

export interface UserFile {
  id: string;
  user_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  category: string;
  description?: string;
  storage_bucket: string;
  is_public: boolean;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

/**
 * Get user's email prefix for organizing files
 */
async function getUserEmailPrefix(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) throw new Error('User not authenticated');

  // Use first part of email as prefix (e.g., "user" from "user@example.com")
  const emailPrefix = user.email.split('@')[0].replace(/[^a-z0-9]/gi, '-').toLowerCase();
  return `${emailPrefix}-${user.id.slice(0, 8)}`;
}

/**
 * Upload a file to user's private storage bucket
 */
export async function uploadFile(
  file: File,
  options: FileUploadOptions = {}
): Promise<{ file: UserFile; publicUrl?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Generate unique file path with user's email prefix
    const userPrefix = await getUserEmailPrefix();
    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-z0-9.-]/gi, '_');
    const filePath = `${userPrefix}/${options.category || 'other'}/${timestamp}-${sanitizedFileName}`;

    // Upload file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('user-files')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) throw uploadError;

    // Save file metadata to database
    const { data: fileData, error: dbError } = await supabase
      .from('user_files')
      .insert({
        user_id: user.id,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        file_type: file.type,
        category: options.category || 'other',
        description: options.description,
        storage_bucket: 'user-files',
        is_public: options.isPublic || false,
        metadata: options.metadata || {},
      })
      .select()
      .single();

    if (dbError) {
      // Clean up uploaded file if database insert fails
      await supabase.storage.from('user-files').remove([filePath]);
      throw dbError;
    }

    // Get public URL if file is public
    let publicUrl: string | undefined;
    if (options.isPublic) {
      const { data: urlData } = supabase.storage
        .from('user-files')
        .getPublicUrl(filePath);
      publicUrl = urlData.publicUrl;
    }

    return { file: fileData as UserFile, publicUrl };
  } catch (error) {
    console.error('File upload error:', error);
    throw error;
  }
}

/**
 * Download a file by ID
 */
export async function downloadFile(fileId: string): Promise<Blob> {
  try {
    // Get file metadata
    const { data: fileData, error: dbError } = await supabase
      .from('user_files')
      .select('*')
      .eq('id', fileId)
      .single();

    if (dbError) throw dbError;

    // Download file from storage
    const { data: blob, error: downloadError } = await supabase.storage
      .from(fileData.storage_bucket)
      .download(fileData.file_path);

    if (downloadError) throw downloadError;

    return blob;
  } catch (error) {
    console.error('File download error:', error);
    throw error;
  }
}

/**
 * Get download URL for a file
 */
export async function getFileUrl(fileId: string, expiresIn: number = 3600): Promise<string> {
  try {
    const { data: fileData, error: dbError } = await supabase
      .from('user_files')
      .select('*')
      .eq('id', fileId)
      .single();

    if (dbError) throw dbError;

    // If public, return public URL
    if (fileData.is_public) {
      const { data: urlData } = supabase.storage
        .from(fileData.storage_bucket)
        .getPublicUrl(fileData.file_path);
      return urlData.publicUrl;
    }

    // Otherwise return signed URL
    const { data: signedData, error: signError } = await supabase.storage
      .from(fileData.storage_bucket)
      .createSignedUrl(fileData.file_path, expiresIn);

    if (signError) throw signError;

    return signedData.signedUrl;
  } catch (error) {
    console.error('Get file URL error:', error);
    throw error;
  }
}

/**
 * Delete a file
 */
export async function deleteFile(fileId: string): Promise<void> {
  try {
    // Get file metadata
    const { data: fileData, error: dbError } = await supabase
      .from('user_files')
      .select('*')
      .eq('id', fileId)
      .single();

    if (dbError) throw dbError;

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from(fileData.storage_bucket)
      .remove([fileData.file_path]);

    if (storageError) console.error('Storage deletion error:', storageError);

    // Delete from database
    const { error: deleteError } = await supabase
      .from('user_files')
      .delete()
      .eq('id', fileId);

    if (deleteError) throw deleteError;
  } catch (error) {
    console.error('File deletion error:', error);
    throw error;
  }
}

/**
 * List all files for current user
 */
export async function listUserFiles(
  category?: string
): Promise<UserFile[]> {
  try {
    let query = supabase
      .from('user_files')
      .select('*')
      .order('created_at', { ascending: false });

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data as UserFile[];
  } catch (error) {
    console.error('List files error:', error);
    throw error;
  }
}

/**
 * Get user's storage statistics
 */
export async function getUserStorageStats(): Promise<{
  total_files: number;
  total_size_bytes: number;
  total_size_mb: number;
  by_category: Record<string, { count: number; size_bytes: number; size_mb: number }>;
}> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase.rpc('get_user_storage_usage', {
      p_user_id: user.id,
    });

    if (error) throw error;

    return data[0] || { total_files: 0, total_size_bytes: 0, total_size_mb: 0, by_category: {} };
  } catch (error) {
    console.error('Get storage stats error:', error);
    throw error;
  }
}

/**
 * Format file size to human-readable string
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Get file icon based on type
 */
export function getFileIcon(fileType: string): string {
  if (fileType.startsWith('image/')) return '🖼️';
  if (fileType.startsWith('video/')) return '🎥';
  if (fileType.startsWith('audio/')) return '🎵';
  if (fileType.includes('pdf')) return '📄';
  if (fileType.includes('document') || fileType.includes('word')) return '📝';
  if (fileType.includes('spreadsheet') || fileType.includes('excel')) return '📊';
  if (fileType.includes('presentation') || fileType.includes('powerpoint')) return '📽️';
  if (fileType.includes('zip') || fileType.includes('rar')) return '🗜️';
  return '📎';
}
