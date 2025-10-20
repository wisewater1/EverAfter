import React, { useState, useEffect } from 'react';
import { MessageCircle, Send, Mic, SkipForward, Calendar, Sparkles, User, ChevronRight, TrendingUp } from 'lucide-react';
import { supabase } from '../lib/supabase';

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
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    loadAIs();
  }, [userId]);

  useEffect(() => {
    if (preselectedAIId && ais.length > 0) {
      const ai = ais.find(a => a.id === preselectedAIId);
      if (ai) {
        setSelectedAI(ai);
        loadQuestion();
      }
    }
  }, [preselectedAIId, ais]);

  const loadAIs = async () => {
    try {
      const { data, error } = await supabase
        .from('archetypal_ais')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAIs(data || []);

      if (data && data.length > 0 && !preselectedAIId) {
        const firstAI = data[0];
        setSelectedAI(firstAI);
        loadQuestion();
      }
    } catch (error) {
      console.error('Error loading AIs:', error);
    }
  };

  const loadQuestion = async () => {
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
        .from('questions')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (questionData) {
        setQuestion({
          question_text: questionData.question_text,
          question_category: questionData.category,
          day_number: progressData?.current_day || 1,
          already_answered_today: false
        });
      }
    } catch (error) {
      console.error('Error loading question:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAISelect = (ai: ArchetypalAI) => {
    setSelectedAI(ai);
    setResponse('');
    setQuestion(null);
    setShowSuccess(false);
    loadQuestion();
  };

  const handleSubmit = async () => {
    if (!selectedAI || !question || !response.trim()) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('daily_question_responses')
        .insert([{
          user_id: userId,
          question_text: question.question_text,
          response_text: response,
          day_number: question.day_number,
        }]);

      if (error) throw error;

      setShowSuccess(true);
      setResponse('');

      setTimeout(() => {
        loadQuestion();
        setShowSuccess(false);
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

  if (ais.length === 0) {
    return (
      <div className="bg-gradient-to-br from-gray-800 via-gray-800 to-blue-900/20 rounded-2xl shadow-2xl border border-gray-700/50 p-12 backdrop-blur-sm text-center">
        <MessageCircle className="w-16 h-16 text-gray-600 mx-auto mb-4" />
        <h3 className="text-2xl font-light text-white mb-3">No AI Created Yet</h3>
        <p className="text-gray-400 mb-6 max-w-md mx-auto">
          Create your first archetypal AI to start answering daily questions and building a digital personality.
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
          Your response has been added to <span className="text-green-400 font-medium">{selectedAI?.name}</span>'s personality
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* AI Selector */}
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl shadow-xl border border-gray-700/50 p-6 backdrop-blur-sm">
        <div className="flex items-center gap-3 mb-4">
          <User className="w-5 h-5 text-blue-400" />
          <h3 className="text-lg font-medium text-white">Building Personality For:</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {ais.map((ai) => (
            <button
              key={ai.id}
              onClick={() => handleAISelect(ai)}
              className={`p-4 rounded-xl border-2 transition-all text-left ${
                selectedAI?.id === ai.id
                  ? 'bg-blue-600/20 border-blue-500 shadow-lg shadow-blue-500/20'
                  : 'bg-gray-900/50 border-gray-700 hover:border-gray-600'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-teal-600 rounded-lg flex items-center justify-center shadow-lg flex-shrink-0">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-white truncate">{ai.name}</div>
                  <div className="text-xs text-gray-400">{ai.description}</div>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">{ai.total_memories} memories</span>
                <span className={`font-medium ${
                  ai.training_status === 'ready' ? 'text-green-400' :
                  ai.training_status === 'training' ? 'text-yellow-400' : 'text-gray-400'
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
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl shadow-xl border border-gray-700/50 p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-teal-400" />
              <div>
                <div className="text-lg font-medium text-white">
                  Day {userProgress.current_day} of 365
                </div>
                <div className="text-sm text-gray-400">
                  {userProgress.streak_days} day streak • {userProgress.total_responses} total responses
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-light text-white">
                {Math.round((userProgress.current_day / 365) * 100)}%
              </div>
              <div className="text-xs text-gray-400">Complete</div>
            </div>
          </div>
          <div className="w-full bg-gray-900 rounded-full h-3 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-600 via-teal-500 to-green-500 rounded-full transition-all duration-500"
              style={{ width: `${(userProgress.current_day / 365) * 100}%` }}
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
              {userProgress && (
                <div className="text-sm text-gray-400">
                  Question {userProgress.total_responses + 1}
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
                  onClick={() => loadQuestion()}
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
            You've answered today's question. Come back tomorrow for more!
          </p>
        </div>
      )}
    </div>
  );
}
