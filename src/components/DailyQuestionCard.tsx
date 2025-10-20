import React, { useState, useEffect } from 'react';
import { MessageCircle, Send, Mic, SkipForward, Calendar, Sparkles, User, ChevronRight, TrendingUp } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Engram {
  id: string;
  name: string;
  relationship: string;
  engram_type: 'family_member' | 'custom';
  total_questions_answered: number;
  ai_readiness_score: number;
  avatar_url?: string;
}

interface DailyQuestion {
  question_text: string;
  question_category: string;
  day_number: number;
  already_answered_today: boolean;
}

interface EngramProgress {
  current_day: number;
  total_responses: number;
  streak_days: number;
}

interface DailyQuestionCardProps {
  userId: string;
  preselectedEngramId?: string;
}

export default function DailyQuestionCard({ userId, preselectedEngramId }: DailyQuestionCardProps) {
  const [engrams, setEngrams] = useState<Engram[]>([]);
  const [selectedEngram, setSelectedEngram] = useState<Engram | null>(null);
  const [engramProgress, setEngramProgress] = useState<EngramProgress | null>(null);
  const [question, setQuestion] = useState<DailyQuestion | null>(null);
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    loadEngrams();
  }, [userId]);

  useEffect(() => {
    if (preselectedEngramId && engrams.length > 0) {
      const engram = engrams.find(e => e.id === preselectedEngramId);
      if (engram) {
        setSelectedEngram(engram);
        loadQuestionForEngram(preselectedEngramId);
      }
    }
  }, [preselectedEngramId, engrams]);

  const loadEngrams = async () => {
    try {
      const { data, error } = await supabase
        .from('engrams')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEngrams(data || []);

      if (data && data.length > 0 && !preselectedEngramId) {
        const firstEngram = data[0];
        setSelectedEngram(firstEngram);
        loadQuestionForEngram(firstEngram.id);
      }
    } catch (error) {
      console.error('Error loading engrams:', error);
    }
  };

  const loadQuestionForEngram = async (engramId: string) => {
    setLoading(true);
    try {
      const { data: progressData } = await supabase
        .from('engram_progress')
        .select('*')
        .eq('engram_id', engramId)
        .maybeSingle();

      if (progressData) {
        setEngramProgress(progressData);
      }

      const { data, error } = await supabase
        .rpc('get_daily_question_for_engram', { target_engram_id: engramId });

      if (error) throw error;

      if (data && data.length > 0) {
        setQuestion(data[0]);
      }
    } catch (error) {
      console.error('Error loading question:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEngramSelect = (engram: Engram) => {
    setSelectedEngram(engram);
    setResponse('');
    setQuestion(null);
    setShowSuccess(false);
    loadQuestionForEngram(engram.id);
  };

  const handleSubmit = async () => {
    if (!selectedEngram || !question || !response.trim()) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('engram_daily_responses')
        .insert([{
          engram_id: selectedEngram.id,
          user_id: userId,
          question_text: question.question_text,
          response_text: response,
          question_category: question.question_category,
          day_number: question.day_number,
        }]);

      if (error) throw error;

      setShowSuccess(true);
      setResponse('');

      setTimeout(() => {
        loadQuestionForEngram(selectedEngram.id);
        setShowSuccess(false);
      }, 2000);

      loadEngrams();
    } catch (error) {
      console.error('Error submitting response:', error);
      alert('Failed to save your response. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      values: 'bg-blue-900/30 text-blue-400 border-blue-500/30',
      memories: 'bg-purple-900/30 text-purple-400 border-purple-500/30',
      habits: 'bg-green-900/30 text-green-400 border-green-500/30',
      preferences: 'bg-yellow-900/30 text-yellow-400 border-yellow-500/30',
      beliefs: 'bg-indigo-900/30 text-indigo-400 border-indigo-500/30',
      communication_style: 'bg-pink-900/30 text-pink-400 border-pink-500/30',
      humor: 'bg-orange-900/30 text-orange-400 border-orange-500/30',
      relationships: 'bg-teal-900/30 text-teal-400 border-teal-500/30',
      goals: 'bg-cyan-900/30 text-cyan-400 border-cyan-500/30',
      experiences: 'bg-red-900/30 text-red-400 border-red-500/30',
    };
    return colors[category] || 'bg-gray-900/30 text-gray-400 border-gray-500/30';
  };

  if (engrams.length === 0) {
    return (
      <div className="bg-gradient-to-br from-gray-800 via-gray-800 to-blue-900/20 rounded-2xl shadow-2xl border border-gray-700/50 p-12 backdrop-blur-sm text-center">
        <MessageCircle className="w-16 h-16 text-gray-600 mx-auto mb-4" />
        <h3 className="text-2xl font-light text-white mb-3">No Engrams Yet</h3>
        <p className="text-gray-400 mb-6 max-w-md mx-auto">
          Create your first engram to start answering daily questions and building a digital personality.
        </p>
      </div>
    );
  }

  if (showSuccess) {
    return (
      <div className="bg-gradient-to-br from-green-900/20 via-gray-800 to-gray-800 rounded-2xl shadow-2xl border border-green-500/50 p-12 backdrop-blur-sm text-center">
        <div className="w-20 h-20 bg-gradient-to-br from-green-600 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl">
          <Sparkles className="w-10 h-10 text-white animate-pulse" />
        </div>
        <h3 className="text-3xl font-light text-white mb-3">Memory Saved!</h3>
        <p className="text-gray-300 text-lg">
          Your response has been added to <span className="text-green-400 font-medium">{selectedEngram?.name}</span>'s personality
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Engram Selector */}
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl shadow-xl border border-gray-700/50 p-6 backdrop-blur-sm">
        <div className="flex items-center gap-3 mb-4">
          <User className="w-5 h-5 text-blue-400" />
          <h3 className="text-lg font-medium text-white">Building Personality For:</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {engrams.map((engram) => (
            <button
              key={engram.id}
              onClick={() => handleEngramSelect(engram)}
              className={`p-4 rounded-xl border-2 transition-all text-left ${
                selectedEngram?.id === engram.id
                  ? 'bg-blue-600/20 border-blue-500 shadow-lg shadow-blue-500/20'
                  : 'bg-gray-900/50 border-gray-700 hover:border-gray-600'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-teal-600 rounded-lg flex items-center justify-center shadow-lg flex-shrink-0">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-white truncate">{engram.name}</div>
                  <div className="text-xs text-gray-400">{engram.relationship}</div>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">{engram.total_questions_answered} answers</span>
                <span className={`font-medium ${
                  engram.ai_readiness_score >= 80 ? 'text-green-400' :
                  engram.ai_readiness_score >= 50 ? 'text-yellow-400' : 'text-gray-400'
                }`}>
                  {engram.ai_readiness_score}% ready
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Progress Bar */}
      {engramProgress && (
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl shadow-xl border border-gray-700/50 p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-teal-400" />
              <div>
                <div className="text-lg font-medium text-white">
                  Day {engramProgress.current_day} of 365
                </div>
                <div className="text-sm text-gray-400">
                  {engramProgress.streak_days} day streak • {engramProgress.total_responses} total responses
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-light text-white">
                {Math.round((engramProgress.current_day / 365) * 100)}%
              </div>
              <div className="text-xs text-gray-400">Complete</div>
            </div>
          </div>
          <div className="w-full bg-gray-900 rounded-full h-3 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-600 via-teal-500 to-green-500 rounded-full transition-all duration-500"
              style={{ width: `${(engramProgress.current_day / 365) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Question Card */}
      {loading ? (
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl shadow-2xl border border-gray-700/50 p-12 backdrop-blur-sm text-center">
          <div className="text-gray-400">Loading today's question...</div>
        </div>
      ) : question ? (
        <div className="bg-gradient-to-br from-gray-800 via-gray-800 to-blue-900/20 rounded-2xl shadow-2xl border border-gray-700/50 backdrop-blur-sm overflow-hidden">
          {/* Question Header */}
          <div className="p-8 pb-6">
            <div className="flex items-center justify-between mb-6">
              <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border ${getCategoryColor(question.question_category)}`}>
                <Sparkles className="w-4 h-4" />
                {question.question_category.replace('_', ' ')}
              </span>
              {engramProgress && (
                <div className="text-sm text-gray-400">
                  Question {engramProgress.total_responses + 1}
                </div>
              )}
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-teal-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-light text-white leading-relaxed">
                  {question.question_text}
                </h3>
                <p className="text-sm text-gray-400 mt-2">
                  Share your thoughts about <span className="text-blue-400 font-medium">{selectedEngram?.name}</span>
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
              className="w-full bg-gray-900/70 border border-gray-700 rounded-xl px-6 py-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all resize-none leading-relaxed"
            />

            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-3">
                <button className="p-3 bg-gray-900/70 border border-gray-700 rounded-lg hover:bg-gray-800 transition-all text-gray-400 hover:text-white">
                  <Mic className="w-5 h-5" />
                </button>
                <span className="text-sm text-gray-500">
                  {response.length} characters
                </span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => loadQuestionForEngram(selectedEngram!.id)}
                  className="px-5 py-3 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-all font-medium flex items-center gap-2"
                >
                  <SkipForward className="w-4 h-4" />
                  Skip for Now
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!response.trim() || submitting}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-blue-500/25 font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Saving...' : (
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
          <div className="px-8 py-4 bg-gray-900/50 border-t border-gray-700/50">
            <p className="text-xs text-gray-500 text-center leading-relaxed">
              Your responses are encrypted and secure. You maintain full control over your data at all times.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl shadow-2xl border border-gray-700/50 p-12 backdrop-blur-sm text-center">
          <Calendar className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-2xl font-light text-white mb-3">All Caught Up!</h3>
          <p className="text-gray-400">
            You've answered today's question for {selectedEngram?.name}. Come back tomorrow for more!
          </p>
        </div>
      )}
    </div>
  );
}
