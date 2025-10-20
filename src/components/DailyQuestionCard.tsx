import React, { useState } from 'react';
import { Calendar, Send } from 'lucide-react';

interface DailyQuestionCardProps {
  currentDay: number;
  onSubmit: (questionId: string, response: string) => Promise<void>;
}

export default function DailyQuestionCard({ currentDay, onSubmit }: DailyQuestionCardProps) {
  const [response, setResponse] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!response.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit('daily-question-id', response);
      setResponse('');
    } catch (error) {
      console.error('Error submitting response:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-slate-800 rounded-xl shadow-lg border border-slate-700 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
          <Calendar className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-medium text-white">Daily Question</h3>
          <p className="text-sm text-slate-400">Day {currentDay} of 365</p>
        </div>
      </div>

      <p className="text-white mb-4">
        What's something that made you smile today?
      </p>

      <textarea
        value={response}
        onChange={(e) => setResponse(e.target.value)}
        placeholder="Share your thoughts..."
        rows={4}
        className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
      />

      <button
        onClick={handleSubmit}
        disabled={!response.trim() || isSubmitting}
        className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        <Send className="w-5 h-5" />
        {isSubmitting ? 'Submitting...' : 'Submit Response'}
      </button>
    </div>
  );
}
