import React, { useState, useEffect } from 'react';
import { Send, BookOpen, Clock, Sparkles } from 'lucide-react';
import { getCurrentTimeQuestion, getTimeGreeting, getPersonalityAspectDescription } from '../data/questions';
import type { Question } from '../data/questions';

interface DailyQuestionCardProps {
  onSubmit?: (questionId: string, response: string) => Promise<void>;
  onSkip?: () => void;
  currentDay: number;
}

export default function DailyQuestionCard({ onSubmit, onSkip, currentDay }: DailyQuestionCardProps) {
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [response, setResponse] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const question = getCurrentTimeQuestion(currentDay);
    setCurrentQuestion(question);
    setGreeting(getTimeGreeting());
  }, [currentDay]);

  const handleSubmit = async () => {
    if (!currentQuestion || !response.trim()) return;

    setIsSubmitting(true);
    try {
      if (onSubmit) {
        await onSubmit(currentQuestion.id, response);
      }
      setResponse('');
    } catch (error) {
      console.error('Error submitting response:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkipClick = () => {
    setResponse('');
    if (onSkip) {
      onSkip();
    }
  };

  if (!currentQuestion) {
    return null;
  }

  const difficultyColors = {
    light: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    deep: 'bg-purple-100 text-purple-800'
  };

  return (
    <div className="bg-gradient-to-br from-purple-900 to-blue-900 rounded-xl shadow-2xl p-8 border border-purple-700/50">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-700/50 rounded-xl flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-purple-300" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white">{greeting}</h3>
              <p className="text-sm text-purple-300">Day {currentDay} of 365</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${difficultyColors[currentQuestion.difficulty]}`}>
              {currentQuestion.difficulty}
            </span>
            <div className="flex items-center gap-1 px-3 py-1 bg-purple-700/30 rounded-full">
              <Clock className="w-3 h-3 text-purple-300" />
              <span className="text-xs text-purple-300">{currentQuestion.timeOfDay}</span>
            </div>
          </div>
        </div>

        <div className="p-4 bg-purple-800/30 rounded-lg border border-purple-600/30 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-purple-300" />
            <span className="text-xs text-purple-300 uppercase tracking-wide">
              {getPersonalityAspectDescription(currentQuestion.personalityAspect)}
            </span>
          </div>
          <p className="text-lg text-white leading-relaxed">
            {currentQuestion.question}
          </p>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-purple-200 mb-2">
            Your Response
          </label>
          <textarea
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            placeholder="Share your thoughts, memories, or stories..."
            className="w-full px-4 py-3 bg-purple-800/30 border border-purple-600/50 rounded-lg text-white placeholder-purple-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 resize-none transition-all"
            rows={6}
            disabled={isSubmitting}
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-purple-300">
              {response.length} characters
            </span>
            {response.length > 50 && (
              <span className="text-xs text-green-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Great detail!
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSkipClick}
            disabled={isSubmitting}
            className="px-4 py-2 text-purple-300 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Skip for now
          </button>

          <button
            onClick={handleSubmit}
            disabled={!response.trim() || isSubmitting}
            className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-purple-500/50 transform hover:scale-105 transition-all duration-200"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Saving Memory...
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
  );
}
