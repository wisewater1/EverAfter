import React, { useState, useRef } from 'react';
import { Upload, X, File, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { uploadFile, formatFileSize } from '../lib/file-storage';

interface FileUploadZoneProps {
    onUploadComplete: (fileUrl: string, fileName: string) => void;
    category?: 'document' | 'image' | 'other';
    label?: string;
    id?: string;
}

export default function FileUploadZone({ onUploadComplete, category = 'document', label, id }: FileUploadZoneProps) {
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [uploadedFile, setUploadedFile] = useState<{ name: string; size: number } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        setError(null);
        try {
            const { file: dbFile } = await uploadFile(file, { category });
            setUploadedFile({ name: dbFile.file_name, size: dbFile.file_size });
            onUploadComplete(dbFile.file_path, dbFile.file_name);
        } catch (err) {
            console.error('Upload failed:', err);
            setError('Upload failed. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    const clearFile = () => {
        setUploadedFile(null);
        setError(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <div className="space-y-2" id={id}>
            {label && <label className="block text-sm font-medium text-slate-400 mb-1">{label}</label>}

            {!uploadedFile ? (
                <div
                    onClick={() => !uploading && fileInputRef.current?.click()}
                    className={`relative group cursor-pointer border-2 border-dashed rounded-xl p-6 transition-all ${uploading ? 'bg-white/5 border-white/10 cursor-not-allowed' : 'bg-white/5 border-white/10 hover:border-teal-500/50 hover:bg-teal-500/5'
                        }`}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        onChange={handleFileChange}
                        disabled={uploading}
                        className="hidden"
                    />

                    <div className="flex flex-col items-center justify-center gap-2">
                        {uploading ? (
                            <Loader2 className="w-8 h-8 text-teal-400 animate-spin" />
                        ) : (
                            <Upload className="w-8 h-8 text-slate-500 group-hover:text-teal-400 transition-colors" />
                        )}
                        <div className="text-center">
                            <p className="text-sm font-medium text-white">
                                {uploading ? 'Uploading...' : 'Click to upload attachment'}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                                PDF, Images, or Documents (Max 50MB)
                            </p>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-teal-500/10 border border-teal-500/20">
                    <div className="w-10 h-10 rounded-lg bg-teal-500/20 flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5 text-teal-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{uploadedFile.name}</p>
                        <p className="text-xs text-slate-500">{formatFileSize(uploadedFile.size)}</p>
                    </div>
                    <button
                        onClick={clearFile}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <X className="w-4 h-4 text-slate-400" />
                    </button>
                </div>
            )}

            {error && (
                <div className="flex items-center gap-2 text-xs text-red-400 mt-1">
                    <AlertCircle className="w-3 h-3" />
                    <span>{error}</span>
                </div>
            )}
        </div>
    );
}
