import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  Upload,
  File,
  Download,
  Trash2,
  FolderOpen,
  Search,
  Filter,
  X,
  FileText,
  Image,
  Loader,
  Check,
  AlertCircle,
  HardDrive,
} from 'lucide-react';
import {
  uploadFile,
  listUserFiles,
  downloadFile,
  deleteFile,
  getFileUrl,
  getUserStorageStats,
  formatFileSize,
  getFileIcon,
  type UserFile,
} from '../lib/file-storage';

export default function FileManager() {
  const { user } = useAuth();
  const [files, setFiles] = useState<UserFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [storageStats, setStorageStats] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadFiles();
      loadStorageStats();
    }
  }, [user, selectedCategory]);

  async function loadFiles() {
    try {
      setLoading(true);
      const category = selectedCategory === 'all' ? undefined : selectedCategory;
      const data = await listUserFiles(category);
      setFiles(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadStorageStats() {
    try {
      const stats = await getUserStorageStats();
      setStorageStats(stats);
    } catch (err: any) {
      console.error('Failed to load storage stats:', err);
    }
  }

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const uploadedFiles = event.target.files;
    if (!uploadedFiles || uploadedFiles.length === 0) return;

    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      for (const file of Array.from(uploadedFiles)) {
        await uploadFile(file, {
          category: selectedCategory === 'all' ? 'other' : selectedCategory as any,
          description: `Uploaded on ${new Date().toLocaleDateString()}`,
        });
      }

      setSuccess(`Successfully uploaded ${uploadedFiles.length} file(s)`);
      await loadFiles();
      await loadStorageStats();

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  }

  async function handleDownload(file: UserFile) {
    try {
      const blob = await downloadFile(file.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleDelete(file: UserFile) {
    if (!confirm(`Delete "${file.file_name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await deleteFile(file.id);
      setSuccess('File deleted successfully');
      await loadFiles();
      await loadStorageStats();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  }

  const filteredFiles = files.filter((file) =>
    file.file_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const categories = [
    { id: 'all', name: 'All Files', icon: FolderOpen },
    { id: 'health_report', name: 'Health Reports', icon: FileText },
    { id: 'document', name: 'Documents', icon: File },
    { id: 'image', name: 'Images', icon: Image },
    { id: 'other', name: 'Other', icon: FolderOpen },
  ];

  return (
    <div className="space-y-6">
      {/* Header with Storage Stats */}
      <div className="bg-gradient-to-r from-blue-900/20 to-cyan-900/20 rounded-2xl p-6 border border-blue-500/20">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
              <HardDrive className="w-7 h-7 text-blue-400" />
              My Files
            </h2>
            <p className="text-blue-200 text-sm">
              Securely store and manage your health documents
            </p>
          </div>

          {storageStats && (
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <div className="text-xs text-gray-400 mb-1">Storage Used</div>
              <div className="text-2xl font-bold text-white">
                {storageStats.total_size_mb} MB
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {storageStats.total_files} file{storageStats.total_files !== 1 ? 's' : ''}
              </div>
            </div>
          )}
        </div>

        {/* Category Stats */}
        {storageStats?.by_category && Object.keys(storageStats.by_category).length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(storageStats.by_category).map(([category, stats]: [string, any]) => (
              <div key={category} className="bg-white/5 backdrop-blur-sm rounded-lg p-3 border border-white/10">
                <div className="text-xs text-gray-400 mb-1 capitalize">
                  {category.replace('_', ' ')}
                </div>
                <div className="text-lg font-bold text-blue-300">{stats.count}</div>
                <div className="text-xs text-gray-500">{stats.size_mb} MB</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="bg-green-900/20 border border-green-500/30 rounded-xl p-4 flex items-start gap-3">
          <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
          <p className="text-green-300">{success}</p>
          <button onClick={() => setSuccess(null)} className="ml-auto">
            <X className="w-5 h-5 text-green-400 hover:text-green-300" />
          </button>
        </div>
      )}

      {error && (
        <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-red-300">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="w-5 h-5 text-red-400 hover:text-red-300" />
          </button>
        </div>
      )}

      {/* Upload & Controls */}
      <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Upload Button */}
          <label className="flex-1 cursor-pointer">
            <input
              type="file"
              multiple
              onChange={handleFileUpload}
              disabled={uploading}
              className="hidden"
            />
            <div className="h-full px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-all disabled:opacity-50">
              {uploading ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  Upload Files
                </>
              )}
            </div>
          </label>

          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search files..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>
        </div>

        {/* Category Filter */}
        <div className="mt-4 flex flex-wrap gap-2">
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                  selectedCategory === category.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {category.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Files Grid */}
      {loading ? (
        <div className="text-center py-12">
          <Loader className="w-8 h-8 animate-spin mx-auto mb-3 text-blue-400" />
          <p className="text-gray-400">Loading files...</p>
        </div>
      ) : filteredFiles.length === 0 ? (
        <div className="bg-gray-800/30 rounded-xl p-12 text-center border border-gray-700/50">
          <FolderOpen className="w-16 h-16 mx-auto mb-4 text-gray-600" />
          <h3 className="text-xl font-semibold text-gray-400 mb-2">No files found</h3>
          <p className="text-gray-500 mb-6">
            {searchTerm
              ? 'Try adjusting your search'
              : 'Upload your first file to get started'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFiles.map((file) => (
            <div
              key={file.id}
              className="bg-gray-800/50 rounded-xl p-5 border border-gray-700/50 hover:border-gray-600/50 transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="text-4xl">{getFileIcon(file.file_type)}</div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDownload(file)}
                    className="p-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 rounded-lg transition-all"
                    title="Download"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(file)}
                    className="p-2 bg-red-600/20 hover:bg-red-600/30 text-red-300 rounded-lg transition-all"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <h3 className="text-white font-medium mb-2 truncate" title={file.file_name}>
                {file.file_name}
              </h3>

              <div className="space-y-1 text-xs text-gray-400">
                <div className="flex justify-between">
                  <span>Size:</span>
                  <span className="text-gray-300">{formatFileSize(file.file_size)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Category:</span>
                  <span className="text-gray-300 capitalize">
                    {file.category.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Uploaded:</span>
                  <span className="text-gray-300">
                    {new Date(file.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {file.description && (
                <p className="mt-3 text-xs text-gray-500 line-clamp-2">{file.description}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
