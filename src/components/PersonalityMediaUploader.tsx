import React, { useState, useEffect, useRef } from 'react';
import { Upload, Image, Video, Mic, File, X, Play, Pause, Trash2, Tag, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface MediaFile {
  id: string;
  media_type: 'photo' | 'video' | 'voice' | 'document';
  file_path: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  duration?: number;
  thumbnail_path?: string;
  caption?: string;
  tags?: string[];
  created_at: string;
}

interface PersonalityMediaUploaderProps {
  familyMemberId?: string;
  userId: string;
  onMediaAdded?: () => void;
}

export default function PersonalityMediaUploader({ familyMemberId, userId, onMediaAdded }: PersonalityMediaUploaderProps) {
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [caption, setCaption] = useState('');
  const [tags, setTags] = useState('');
  const [selectedType, setSelectedType] = useState<'photo' | 'video' | 'voice' | 'document'>('photo');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    loadMedia();
  }, [familyMemberId, userId]);

  const loadMedia = async () => {
    let query = supabase
      .from('personality_media')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (familyMemberId) {
      query = query.eq('family_member_id', familyMemberId);
    }

    const { data } = await query;
    if (data) setMediaFiles(data);
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        await uploadFile(file);
      }
      setCaption('');
      setTags('');
      await loadMedia();
      onMediaAdded?.();
    } catch (error) {
      console.error('Error uploading files:', error);
      alert('Failed to upload files. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const uploadFile = async (file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('personality-media')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const mediaType = getMediaType(file.type);
    const duration = file.type.startsWith('audio/') || file.type.startsWith('video/')
      ? await getMediaDuration(file)
      : undefined;

    const { error: dbError } = await supabase
      .from('personality_media')
      .insert({
        family_member_id: familyMemberId || null,
        user_id: userId,
        media_type: mediaType,
        file_path: filePath,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        duration,
        caption: caption || null,
        tags: tags ? tags.split(',').map(t => t.trim()) : []
      });

    if (dbError) throw dbError;
  };

  const getMediaType = (mimeType: string): 'photo' | 'video' | 'voice' | 'document' => {
    if (mimeType.startsWith('image/')) return 'photo';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'voice';
    return 'document';
  };

  const getMediaDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const media = document.createElement(file.type.startsWith('video/') ? 'video' : 'audio');
      media.preload = 'metadata';
      media.onloadedmetadata = () => {
        resolve(Math.round(media.duration));
        URL.revokeObjectURL(media.src);
      };
      media.src = URL.createObjectURL(file);
    });
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const file = new File([audioBlob], `recording-${Date.now()}.webm`, { type: 'audio/webm' });

        setUploading(true);
        try {
          await uploadFile(file);
          await loadMedia();
          onMediaAdded?.();
        } catch (error) {
          console.error('Error uploading recording:', error);
          alert('Failed to upload recording. Please try again.');
        } finally {
          setUploading(false);
        }

        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Failed to access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const deleteMedia = async (mediaId: string, filePath: string) => {
    if (!confirm('Are you sure you want to delete this media?')) return;

    try {
      await supabase.storage.from('personality-media').remove([filePath]);
      await supabase.from('personality_media').delete().eq('id', mediaId);
      await loadMedia();
    } catch (error) {
      console.error('Error deleting media:', error);
      alert('Failed to delete media. Please try again.');
    }
  };

  const getMediaUrl = (filePath: string) => {
    const { data } = supabase.storage.from('personality-media').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* Upload Controls */}
      <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Upload className="w-5 h-5 text-cyan-400" />
          Add Personality Media
        </h3>

        {/* Media Type Selector */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {[
            { type: 'photo' as const, icon: Image, label: 'Photos' },
            { type: 'video' as const, icon: Video, label: 'Videos' },
            { type: 'voice' as const, icon: Mic, label: 'Voice' },
            { type: 'document' as const, icon: File, label: 'Documents' }
          ].map(({ type, icon: Icon, label }) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`p-4 rounded-xl border-2 transition-all duration-200 flex flex-col items-center gap-2 ${
                selectedType === type
                  ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400'
                  : 'border-slate-700/50 bg-slate-900/20 text-slate-400 hover:border-slate-600 hover:bg-slate-800/30'
              }`}
            >
              <Icon className="w-6 h-6" />
              <span className="text-sm font-medium">{label}</span>
            </button>
          ))}
        </div>

        {/* Caption & Tags */}
        <div className="space-y-3 mb-4">
          <input
            type="text"
            placeholder="Add a caption (optional)"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-colors"
          />
          <div className="relative">
            <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Add tags (comma-separated)"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-colors"
            />
          </div>
        </div>

        {/* Upload Buttons */}
        <div className="flex flex-wrap gap-3">
          {selectedType === 'voice' ? (
            <button
              onClick={recording ? stopRecording : startRecording}
              disabled={uploading}
              className={`px-6 py-3 rounded-xl font-medium flex items-center gap-2 transition-all duration-200 ${
                recording
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {recording ? (
                <>
                  <Pause className="w-4 h-4" />
                  Stop Recording
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4" />
                  Start Recording
                </>
              )}
            </button>
          ) : (
            <>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={
                  selectedType === 'photo' ? 'image/*' :
                  selectedType === 'video' ? 'video/*' :
                  selectedType === 'document' ? '.pdf,application/pdf' :
                  '*'
                }
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white rounded-xl font-medium flex items-center gap-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Upload className="w-4 h-4" />
                {uploading ? 'Uploading...' : `Upload ${selectedType === 'photo' ? 'Photos' : selectedType === 'video' ? 'Videos' : 'Documents'}`}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Media Gallery */}
      {mediaFiles.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-400" />
            Uploaded Media ({mediaFiles.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {mediaFiles.map((media) => (
              <div key={media.id} className="bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 rounded-xl overflow-hidden group">
                {/* Media Preview */}
                <div className="relative aspect-video bg-slate-800/50 flex items-center justify-center">
                  {media.media_type === 'photo' && (
                    <img
                      src={getMediaUrl(media.file_path)}
                      alt={media.file_name}
                      className="w-full h-full object-cover"
                    />
                  )}
                  {media.media_type === 'video' && (
                    <div className="relative w-full h-full">
                      <video
                        src={getMediaUrl(media.file_path)}
                        className="w-full h-full object-cover"
                      />
                      <Play className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 text-white opacity-80" />
                    </div>
                  )}
                  {media.media_type === 'voice' && (
                    <div className="flex flex-col items-center gap-2">
                      <Mic className="w-12 h-12 text-cyan-400" />
                      {media.duration && (
                        <span className="text-sm text-slate-400">{formatDuration(media.duration)}</span>
                      )}
                    </div>
                  )}
                  {media.media_type === 'document' && (
                    <File className="w-12 h-12 text-slate-400" />
                  )}

                  {/* Delete Button */}
                  <button
                    onClick={() => deleteMedia(media.id, media.file_path)}
                    className="absolute top-2 right-2 p-2 bg-red-500/80 hover:bg-red-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Media Info */}
                <div className="p-4 space-y-2">
                  <p className="text-sm font-medium text-white truncate">{media.file_name}</p>
                  {media.caption && (
                    <p className="text-sm text-slate-400">{media.caption}</p>
                  )}
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>{formatFileSize(media.file_size)}</span>
                    <span>{new Date(media.created_at).toLocaleDateString()}</span>
                  </div>
                  {media.tags && media.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {media.tags.map((tag, idx) => (
                        <span key={idx} className="px-2 py-1 bg-cyan-500/10 text-cyan-400 text-xs rounded-full">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
