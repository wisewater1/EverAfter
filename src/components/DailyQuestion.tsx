import React, { useState, useEffect } from 'react';
import { Clock, Heart, Send, Sparkles, Calendar, User } from 'lucide-react';
import { getCurrentTimeQuestion, getTimeGreeting, getPersonalityAspectDescription } from '../data/questions';

const DailyQuestion: React.FC = () => {
  const [response, setResponse] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(getCurrentTimeQuestion(1));
  const [greeting, setGreeting] = useState(getTimeGreeting());

  useEffect(() => {
    const updateQuestion = () => {
      const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
      setCurrentQuestion(getCurrentTimeQuestion(dayOfYear));
      setGreeting(getTimeGreeting());
    };

    updateQuestion();
    const interval = setInterval(updateQuestion, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  const handleSubmit = () => {
    if (response.trim()) {
      setIsSubmitted(true);
      // Here you would typically save to a database
      setTimeout(() => {
        setIsSubmitted(false);
        setResponse('');
      }, 3000);
    }
  };

  const getTimeIcon = () => {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) return '🌅';
    if (hour >= 12 && hour < 17) return '☀️';
    if (hour >= 17 && hour < 21) return '🌅';
    return '🌙';
  };

  const getTimeColor = () => {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) return 'from-orange-400 to-yellow-400';
    if (hour >= 12 && hour < 17) return 'from-blue-400 to-cyan-400';
    if (hour >= 17 && hour < 21) return 'from-orange-500 to-pink-500';
    return 'from-indigo-500 to-purple-600';
  };

  if (isSubmitted) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="text-center py-12">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Heart className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Thank You!</h2>
          <p className="text-gray-600 mb-6">
            Your response has been saved to your digital legacy. Every answer helps paint a more complete picture of who you are.
          </p>
          <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-6">
            <p className="text-sm text-gray-600 italic">
              "{response}"
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      {/* Time-based Header */}
      <div className={`bg-gradient-to-r ${getTimeColor()} rounded-2xl p-6 text-white text-center`}>
        <div className="text-4xl mb-2">{getTimeIcon()}</div>
        <h1 className="text-2xl font-bold mb-2">{greeting}!</h1>
        <p className="text-white/90">Time for your daily reflection</p>
      </div>

      {/* Question Card */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Today's Question</h2>
              <p className="text-sm text-gray-500 capitalize">{currentQuestion.timeOfDay} • {currentQuestion.category}</p>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 mb-4">
            <h3 className="text-xl font-medium text-gray-900 leading-relaxed">
              {currentQuestion.question}
            </h3>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-500">
            <User className="w-4 h-4" />
            <span>{getPersonalityAspectDescription(currentQuestion.personalityAspect)}</span>
          </div>
        </div>

        {/* Response Area */}
        <div className="p-6">
          <textarea
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            placeholder="Share your thoughts... Take your time to reflect deeply."
            className="w-full h-32 p-4 border border-gray-200 rounded-xl resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
          />
          
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-gray-500">
              {response.length} characters
            </div>
            
            <button
              onClick={handleSubmit}
              disabled={!response.trim()}
              className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transform hover:scale-105 transition-all duration-200"
            >
              <Send className="w-4 h-4" />
              Save Memory
            </button>
          </div>
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-700">Today's Progress</span>
          <span className="text-sm text-gray-500">1 of 4 questions</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 h-2 rounded-full w-1/4 transition-all duration-300"></div>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Complete all daily questions to unlock special insights about your personality patterns.
        </p>
      </div>

      {/* Tips */}
      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl p-6 border border-yellow-200">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-4 h-4 text-yellow-600" />
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Reflection Tip</h4>
            <p className="text-sm text-gray-700">
              There are no right or wrong answers. Be authentic and honest - your future family will treasure your genuine thoughts and feelings.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DailyQuestion;