import React, { useState, useEffect } from 'react';
import { Calendar, Send, CheckCircle, TrendingUp, Flame, Loader, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface DailyQuestionCardProps {
  userId: string;
}

interface DailyQuestion {
  id: string;
  text: string;
  category: string;
}

interface Progress {
  currentDay: number;
  totalResponses: number;
  streakDays: number;
  alreadyAnswered: boolean;
}

export default function DailyQuestionCard({ userId }: DailyQuestionCardProps) {
  const [question, setQuestion] = useState<DailyQuestion | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDailyQuestion();
  }, [userId]);

  const loadDailyQuestion = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-daily-question`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to load daily question');
      }

      const data = await response.json();
      setQuestion(data.question);
      setProgress(data.progress);
      setHasSubmitted(data.progress.alreadyAnswered);
    } catch (error) {
      console.error('Error loading daily question:', error);
      setError('Failed to load daily question. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!response.trim() || !question) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      const submitResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/submit-daily-response`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            questionId: question.id,
            questionText: question.text,
            responseText: response,
          }),
        }
      );

      if (!submitResponse.ok) {
        const errorData = await submitResponse.json();
        throw new Error(errorData.error || 'Failed to submit response');
      }

      setResponse('');
      setHasSubmitted(true);

      if (progress) {
        setProgress({
          ...progress,
          totalResponses: progress.totalResponses + 1,
          streakDays: progress.streakDays + 1,
          alreadyAnswered: true,
        });
      }
    } catch (error: any) {
      console.error('Error submitting response:', error);
      setError(error.message || 'Failed to submit response. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSubmit();
    }
  };

  if (isLoading) {
    return (
      <div className="bg-gradient-to-br from-gray-800 via-gray-800 to-blue-900/20 rounded-2xl shadow-2xl border border-gray-700/50 p-8 backdrop-blur-sm">
        <div className="flex items-center justify-center py-12">
          <Loader className="w-8 h-8 text-blue-400 animate-spin" />
        </div>
      </div>
    );
  }

  if (error && !question) {
    return (
      <div className="bg-gradient-to-br from-gray-800 via-gray-800 to-red-900/20 rounded-2xl shadow-2xl border border-red-700/50 p-8 backdrop-blur-sm">
        <p className="text-red-400 text-center">{error}</p>
        <button
          onClick={loadDailyQuestion}
          className="mt-4 w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-gray-800 via-gray-800 to-blue-900/20 rounded-2xl shadow-2xl border border-gray-700/50 p-8 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl blur-lg opacity-50"></div>
            <div className="relative w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <Calendar className="w-6 h-6 text-white" />
            </div>
          </div>
          <div>
            <h3 className="text-xl font-medium text-white">Daily Question</h3>
            <p className="text-sm text-gray-400">Day {progress?.currentDay || 1} of 365</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/30">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-blue-400" />
            <div className="text-lg font-light text-white">{progress?.totalResponses || 0}</div>
          </div>
          <div className="text-xs text-gray-500">Responses</div>
        </div>
        <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/30">
          <div className="flex items-center gap-2 mb-1">
            <Flame className="w-4 h-4 text-orange-400" />
            <div className="text-lg font-light text-white">{progress?.streakDays || 0}</div>
          </div>
          <div className="text-xs text-gray-500">Day Streak</div>
        </div>
        <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/30">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <div className="text-lg font-light text-white">{Math.round(((progress?.currentDay || 1) / 365) * 100)}%</div>
          </div>
          <div className="text-xs text-gray-500">Complete</div>
        </div>
      </div>

      <div className="mb-6">
        <div className="inline-block px-3 py-1 bg-blue-900/30 border border-blue-700/50 rounded-full text-xs font-medium text-blue-300 mb-3">
          {question?.category || 'Daily'}
        </div>
        <p className="text-lg text-white leading-relaxed">
          {question?.text || 'Loading question...'}
        </p>
      </div>

      {hasSubmitted ? (
        <div className="bg-emerald-900/30 border border-emerald-700/50 rounded-xl p-6 text-center">
          <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
          <h4 className="text-lg font-medium text-white mb-2">Response Submitted!</h4>
          <p className="text-sm text-emerald-200 mb-4">
            Thank you for sharing your thoughts today. Come back tomorrow for the next question!
          </p>
          <div className="text-xs text-emerald-300/70">
            Your response has been saved and will help build your digital legacy.
          </div>
        </div>
      ) : (
        <>
          <div className="mb-4">
            <textarea
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Share your thoughts... (Press Ctrl+Enter to submit)"
              rows={6}
              disabled={isSubmitting}
              className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 transition-all resize-none"
            />
            <div className="flex items-center justify-between mt-2">
              <div className="text-xs text-gray-500">
                {response.length} characters
              </div>
              <div className="text-xs text-gray-500">
                Ctrl+Enter to submit
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-700/50 rounded-lg text-sm text-red-200">
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={!response.trim() || isSubmitting}
            className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg hover:shadow-blue-500/25"
          >
            {isSubmitting ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                <span className="font-medium">Submitting...</span>
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                <span className="font-medium">Submit Response</span>
              </>
            )}
          </button>
        </>
      )}
    </div>
  );
}
