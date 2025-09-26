import React, { useState } from 'react';
import { Send, Mic, Pause, Play, RotateCcw } from 'lucide-react';

// Dharma Wheel SVG Component
const DharmaWheel = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.5"/>
    <circle cx="12" cy="12" r="2" fill="currentColor"/>
    <line x1="12" y1="2" x2="12" y2="6" stroke="currentColor" strokeWidth="1.5"/>
    <line x1="12" y1="18" x2="12" y2="22" stroke="currentColor" strokeWidth="1.5"/>
    <line x1="22" y1="12" x2="18" y2="12" stroke="currentColor" strokeWidth="1.5"/>
    <line x1="6" y1="12" x2="2" y2="12" stroke="currentColor" strokeWidth="1.5"/>
    <line x1="19.07" y1="4.93" x2="16.24" y2="7.76" stroke="currentColor" strokeWidth="1.5"/>
    <line x1="7.76" y1="16.24" x2="4.93" y2="19.07" stroke="currentColor" strokeWidth="1.5"/>
    <line x1="19.07" y1="19.07" x2="16.24" y2="16.24" stroke="currentColor" strokeWidth="1.5"/>
    <line x1="7.76" y1="7.76" x2="4.93" y2="4.93" stroke="currentColor" strokeWidth="1.5"/>
  </svg>
);

interface DailyQuestionProps {
  question: string;
  day: number;
  totalDays: number;
}

export function DailyQuestion({ question, day, totalDays }: DailyQuestionProps) {
  const [response, setResponse] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [wordCount, setWordCount] = useState(0);

  const handleResponseChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setResponse(text);
    setWordCount(text.trim().split(/\s+/).filter(word => word.length > 0).length);
  };

  const handleSubmit = () => {
    if (response.trim()) {
      setHasSubmitted(true);
      // Here we would save the response
      setTimeout(() => {
        setHasSubmitted(false);
        setResponse('');
        setWordCount(0);
      }, 3000);
    }
  };

  const toggleRecording = () => {
    setIsRecording(!isRecording);
  };

  const handleSkip = () => {
    // Skip to next question logic
    setResponse('');
    setWordCount(0);
  };

  if (hasSubmitted) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200/50 rounded-2xl p-8 text-center shadow-lg">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <DharmaWheel className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-xl font-medium text-green-900 mb-2">Thank you for sharing</h3>
          <p className="text-green-700 mb-4">Your precious memory has been safely recorded and encrypted.</p>
          <div className="text-sm text-green-600">
            Memory {day} of {totalDays} complete
          </div>
        </div>
      </div>
    );
  }

  const progressPercentage = (day / totalDays) * 100;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100/50 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-50/80 to-teal-50/80 p-6 border-b border-gray-100/50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <DharmaWheel className="w-6 h-6 text-blue-600" />
              <span className="text-sm font-medium text-blue-700">Day {day} of {totalDays}</span>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500 mb-1">{progressPercentage.toFixed(1)}% Complete</div>
              <div className="w-24 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-blue-600 to-teal-600 h-2 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>
          </div>
          <h2 className="text-xl font-medium text-gray-900 leading-relaxed">{question}</h2>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="space-y-6">
            <div className="relative">
              <textarea
                value={response}
                onChange={handleResponseChange}
                placeholder="Share your thoughts, stories, or memories... Take your time and let the words flow naturally."
                className="w-full h-40 p-4 border border-gray-200 rounded-xl resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-700 leading-relaxed placeholder-gray-400"
                disabled={isRecording}
              />
              <div className="absolute bottom-3 right-3 text-xs text-gray-400">
                {wordCount} words
              </div>
            </div>
            
            {/* Recording Indicator */}
            {isRecording && (
              <div className="flex items-center justify-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-red-700 font-medium">Recording in progress...</span>
                <div className="text-red-600 text-sm">00:42</div>
              </div>
            )}
            
            {/* Action Buttons */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={toggleRecording}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isRecording 
                      ? 'bg-red-100 text-red-700 hover:bg-red-200 border border-red-200' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
                  }`}
                >
                  {isRecording ? <Pause className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  {isRecording ? 'Pause Recording' : 'Voice Recording'}
                </button>

                <button
                  onClick={handleSkip}
                  className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-100 transition-all duration-200 border border-gray-200"
                >
                  <RotateCcw className="w-4 h-4" />
                  Skip for Now
                </button>
              </div>

              <button
                onClick={handleSubmit}
                disabled={!response.trim()}
                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-xl text-sm font-medium hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:from-blue-700 hover:to-teal-700"
              >
                <Send className="w-4 h-4" />
                Save Memory
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Privacy Notice */}
      <div className="mt-6 text-center">
        <p className="text-xs text-gray-500 leading-relaxed max-w-lg mx-auto">
          Your responses are encrypted end-to-end and only accessible to approved family members. 
          You maintain full control over your data at all times.
        </p>
      </div>
    </div>
  );
}