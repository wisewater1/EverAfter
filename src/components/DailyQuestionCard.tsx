import React, { useState, useEffect, useCallback } from 'react';
import { MessageCircle, Send, Mic, SkipForward, Calendar, Sparkles, User, Upload, X, FileText, Image as ImageIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { uploadFile, formatFileSize, getFileIcon } from '../lib/file-storage';

interface ArchetypalAI {
  id: string;
  name: string;
  description: string;
  total_memories: number;
  training_status: string;
  avatar_url?: string;
}

interface DailyQuestion {
  question_text: string;
  question_category: string;
  day_number: number;
  already_answered_today: boolean;
}

interface UserProgress {
  current_day: number;
  total_responses: number;
  streak_days: number;
}

interface DailyQuestionCardProps {
  userId: string;
  preselectedAIId?: string;
}

export default function DailyQuestionCard({ userId, preselectedAIId }: DailyQuestionCardProps) {
  const [ais, setAIs] = useState<ArchetypalAI[]>([]);
  const [selectedAI, setSelectedAI] = useState<ArchetypalAI | null>(null);
  const [userProgress, setUserProgress] = useState<UserProgress | null>(null);
  const [question, setQuestion] = useState<DailyQuestion | null>(null);
  const [response, setResponse] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const loadQuestion = useCallback(async () => {
    if (!selectedAI) return;

    setLoading(true);
    try {
      const { data: progressData } = await supabase
        .from('user_daily_progress')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (progressData) {
        setUserProgress(progressData);
      }

      const { data: questionData, error } = await supabase
        .from('daily_questions')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error loading question:', error);
      }

      if (questionData) {
        setQuestion({
          question_text: questionData.question_text,
          question_category: questionData.category || 'general',
          day_number: progressData?.current_day || 1,
          already_answered_today: false
        });
      } else {
        setQuestion({
          question_text: "What's the first thing that brings you joy when you wake up?",
          question_category: 'values',
          day_number: progressData?.current_day || 1,
          already_answered_today: false
        });
      }
    } catch (error) {
      console.error('Error loading question:', error);
    } finally {
      setLoading(false);
    }
  }, [userId, selectedAI]);

  const loadAIs = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('archetypal_ais')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAIs(data || []);

      if (data && data.length > 0) {
        if (preselectedAIId) {
          const selectedFromProps = data.find(ai => ai.id === preselectedAIId);
          if (selectedFromProps) {
            setSelectedAI(selectedFromProps);
          } else {
            setSelectedAI(data[0]);
          }
        } else if (!selectedAI) {
          setSelectedAI(data[0]);
        }
      }
    } catch (error) {
      console.error('Error loading AIs:', error);
    }
  }, [userId, preselectedAIId, selectedAI]);

  useEffect(() => {
    loadAIs();
  }, [loadAIs]);

  useEffect(() => {
    if (selectedAI) {
      loadQuestion();
    }
  }, [selectedAI, loadQuestion]);

  const handleAISelect = (ai: ArchetypalAI) => {
    setSelectedAI(ai);
    setResponse('');
    setAttachedFiles([]);
    setQuestion(null);
    setShowSuccess(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setAttachedFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!selectedAI || !question || !response.trim()) return;

    setSubmitting(true);
    setUploadProgress(0);

    try {
      const uploadedFileIds: string[] = [];

      if (attachedFiles.length > 0) {
        for (let i = 0; i < attachedFiles.length; i++) {
          const file = attachedFiles[i];
          const { file: uploadedFile } = await uploadFile(file, {
            category: 'document',
            description: `Attachment for question response on day ${question.day_number}`,
            metadata: {
              ai_id: selectedAI.id,
              question_text: question.question_text,
              day_number: question.day_number
            }
          });
          uploadedFileIds.push(uploadedFile.id);
          setUploadProgress(((i + 1) / attachedFiles.length) * 50);
        }
      }

      const { error } = await supabase
        .from('daily_question_responses')
        .insert([{
          user_id: userId,
          ai_id: selectedAI.id,
          question_text: question.question_text,
          response_text: response,
          day_number: question.day_number,
          question_category: question.question_category,
          attachment_file_ids: uploadedFileIds.length > 0 ? uploadedFileIds : null,
        }]);

      if (error) throw error;

      setUploadProgress(100);
      setShowSuccess(true);
      setResponse('');
      setAttachedFiles([]);

      setTimeout(() => {
        loadQuestion();
        setShowSuccess(false);
        setUploadProgress(0);
      }, 2000);

      loadAIs();
    } catch (error) {
      console.error('Error submitting response:', error);
      alert('Failed to save your response. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      values: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
      memories: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      habits: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      preferences: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      beliefs: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
      communication_style: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
      humor: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
      relationships: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
      goals: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
      experiences: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
      general: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    };
    return colors[category] || 'bg-slate-500/10 text-slate-400 border-slate-500/20';
  };

  if (ais.length === 0) {
    return (
      <div className="bg-gradient-to-br from-slate-800/40 to-slate-900/40 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/50 p-16 text-center">
        <div className="w-20 h-20 bg-slate-800/50 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <MessageCircle className="w-10 h-10 text-slate-600" />
        </div>
        <h3 className="text-2xl font-medium text-white mb-3">No AI Created Yet</h3>
        <p className="text-slate-400 mb-6 max-w-md mx-auto leading-relaxed">
          Create your first archetypal AI to start answering daily questions and building a digital personality.
        </p>
      </div>
    );
  }

  if (showSuccess) {
    return (
      <div className="bg-gradient-to-br from-emerald-900/20 via-slate-800/40 to-slate-900/40 backdrop-blur-xl rounded-2xl shadow-2xl border border-emerald-500/30 p-16 text-center">
        <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/20">
          <Sparkles className="w-10 h-10 text-white animate-pulse" />
        </div>
        <h3 className="text-3xl font-light text-white mb-3">Memory Saved!</h3>
        <p className="text-slate-300 text-lg">
          Your response has been added to <span className="text-emerald-400 font-medium">{selectedAI?.name}</span>'s personality
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* AI Selector */}
      <div className="bg-gradient-to-br from-slate-800/40 to-slate-900/40 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-700/50 p-6">
        <div className="flex items-center gap-3 mb-5">
          <User className="w-5 h-5 text-sky-400" />
          <h3 className="text-lg font-medium text-white">Building Personality For:</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {ais.map((ai) => (
            <button
              key={ai.id}
              onClick={() => handleAISelect(ai)}
              className={`p-5 rounded-xl border-2 transition-all text-left ${
                selectedAI?.id === ai.id
                  ? 'bg-sky-500/10 border-sky-500 shadow-lg shadow-sky-500/10'
                  : 'bg-slate-900/50 border-slate-700/50 hover:border-slate-600'
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-gradient-to-br from-sky-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-sky-500/20 flex-shrink-0">
                  <User className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-white mb-0.5">{ai.name}</div>
                  <div className="text-xs text-slate-400 line-clamp-1">{ai.description}</div>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-700/50">
                <span className="text-slate-400">{ai.total_memories} memories</span>
                <span className={`font-medium px-2 py-0.5 rounded ${
                  ai.training_status === 'ready' ? 'bg-emerald-500/10 text-emerald-400' :
                  ai.training_status === 'training' ? 'bg-amber-500/10 text-amber-400' : 'bg-slate-500/10 text-slate-400'
                }`}>
                  {ai.training_status}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Progress Bar */}
      {userProgress && (
        <div className="bg-gradient-to-br from-slate-800/40 to-slate-900/40 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-700/50 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-teal-400" />
              <div>
                <div className="text-lg font-medium text-white">
                  Day {userProgress.current_day} of 365
                </div>
                <div className="text-sm text-slate-400">
                  {userProgress.streak_days} day streak • {userProgress.total_responses} total responses
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-light text-white">
                {Math.round((userProgress.current_day / 365) * 100)}%
              </div>
              <div className="text-xs text-slate-400">Complete</div>
            </div>
          </div>
          <div className="w-full bg-slate-900 rounded-full h-3 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-sky-500 via-teal-500 to-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${(userProgress.current_day / 365) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Question Card */}
      {loading ? (
        <div className="bg-gradient-to-br from-slate-800/40 to-slate-900/40 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/50 p-16 text-center">
          <div className="w-8 h-8 border-2 border-slate-700 border-t-sky-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Loading today's question...</p>
        </div>
      ) : question ? (
        <div className="bg-gradient-to-br from-slate-800/40 via-slate-800/40 to-slate-900/40 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/50 overflow-hidden">
          {/* Question Header */}
          <div className="p-8 pb-6">
            <div className="flex items-center justify-between mb-6">
              <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium border ${getCategoryColor(question.question_category)}`}>
                <Sparkles className="w-4 h-4" />
                {question.question_category.replace('_', ' ')}
              </span>
              {userProgress && (
                <div className="text-sm text-slate-400">
                  Question {userProgress.total_responses + 1}
                </div>
              )}
            </div>

            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-sky-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-sky-500/20 flex-shrink-0">
                <MessageCircle className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-light text-white leading-relaxed mb-2">
                  {question.question_text}
                </h3>
                <p className="text-sm text-slate-400">
                  Share your thoughts and memories
                </p>
              </div>
            </div>
          </div>

          {/* Response Area */}
          <div className="px-8 pb-8">
            <textarea
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              placeholder="Share your thoughts, stories, or memories... Take your time and let the words flow naturally."
              rows={6}
              className="w-full bg-slate-900/70 border border-slate-700 hover:border-slate-600 focus:border-sky-500 rounded-xl px-5 py-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition-all resize-none leading-relaxed"
            />

            {/* Attached Files */}
            {attachedFiles.length > 0 && (
              <div className="mt-4 space-y-2">
                {attachedFiles.map((file, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-slate-900/50 border border-slate-700/50 rounded-lg">
                    <div className="text-2xl">{file.type.startsWith('image/') ? '🖼️' : '📎'}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white truncate">{file.name}</div>
                      <div className="text-xs text-slate-400">{formatFileSize(file.size)}</div>
                    </div>
                    <button
                      onClick={() => removeFile(index)}
                      className="p-1 text-slate-400 hover:text-red-400 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Upload Progress */}
            {uploadProgress > 0 && uploadProgress < 100 && (
              <div className="mt-4">
                <div className="flex items-center justify-between text-sm text-slate-400 mb-2">
                  <span>Uploading files...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-sky-500 transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-3">
                <label className="p-3 bg-slate-900/70 border border-slate-700 hover:border-slate-600 rounded-lg transition-all text-slate-400 hover:text-white cursor-pointer">
                  <Upload className="w-5 h-5" />
                  <input
                    type="file"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                    accept="image/*,.pdf,.doc,.docx,.txt"
                  />
                </label>
                <span className="text-sm text-slate-500">
                  {response.length} characters
                </span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setResponse('');
                    setAttachedFiles([]);
                    loadQuestion();
                  }}
                  className="px-5 py-3 bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 hover:border-slate-600 text-slate-300 hover:text-white rounded-xl transition-all font-medium flex items-center gap-2"
                >
                  <SkipForward className="w-4 h-4" />
                  Skip for Now
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!response.trim() || submitting}
                  className="px-6 py-3 bg-sky-600 hover:bg-sky-700 text-white rounded-xl transition-all shadow-lg shadow-sky-500/20 font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Save Memory
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Info Footer */}
          <div className="px-8 py-4 bg-slate-900/50 border-t border-slate-700/50">
            <p className="text-xs text-slate-500 text-center leading-relaxed">
              Your responses are encrypted and secure. You maintain full control over your data at all times.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-br from-slate-800/40 to-slate-900/40 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/50 p-16 text-center">
          <div className="w-20 h-20 bg-slate-800/50 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Calendar className="w-10 h-10 text-slate-600" />
          </div>
          <h3 className="text-2xl font-medium text-white mb-3">All Caught Up!</h3>
          <p className="text-slate-400 leading-relaxed">
            You've answered today's question. Come back tomorrow for more!
          </p>
        </div>
      )}
    </div>
  );
}
