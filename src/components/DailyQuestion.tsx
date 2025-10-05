import React, { useState, useEffect } from 'react';
import { Send, Mic, Pause, Play, RotateCcw, ChevronLeft, ChevronRight, Calendar, Clock, Sun, Sunset, Moon, Stars } from 'lucide-react';
import { getQuestionsForDay, getCurrentTimeQuestion, getTimeGreeting, getPersonalityAspectDescription, Question } from '../data/questions';

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
  day: number;
  totalDays: number;
  onDayChange: (newDay: number) => void;
  onSaveResponse: (response: any) => void;
}

export function DailyQuestion({ day, totalDays, onDayChange, onSaveResponse }: DailyQuestionProps) {
  const [response, setResponse] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [showDayPicker, setShowDayPicker] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<'current' | 'morning' | 'afternoon' | 'evening' | 'night'>('current');
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);

  // Get questions for the current day
  const dailyQuestions = getQuestionsForDay(day);
  const timeBasedQuestion = getCurrentTimeQuestion(day);

  useEffect(() => {
    if (selectedTimeSlot === 'current') {
      setCurrentQuestion(timeBasedQuestion);
    } else {
      const timeIndex = {
        'morning': 0,
        'afternoon': 1,
        'evening': 2,
        'night': 3
      }[selectedTimeSlot];
      setCurrentQuestion(dailyQuestions.questions[timeIndex!]);
    }
    setResponse('');
    setWordCount(0);
  }, [day, selectedTimeSlot]);

  const handleResponseChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setResponse(text);
    setWordCount(text.trim().split(/\s+/).filter(word => word.length > 0).length);
  };

  const handleSubmit = async () => {
    if (response.trim() && currentQuestion) {
      setIsSaving(true);
      
      const responseData = {
        day,
        questionId: currentQuestion.id,
        question: currentQuestion.question,
        response: response.trim(),
        timeOfDay: currentQuestion.timeOfDay,
        personalityAspect: currentQuestion.personalityAspect,
        category: currentQuestion.category,
        difficulty: currentQuestion.difficulty,
        timestamp: new Date().toISOString(),
        type: isRecording ? 'voice' : 'text',
        wordCount
      };

      // Simulate save delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      onSaveResponse(responseData);
      setIsSaving(false);
      setHasSubmitted(true);
      
      setTimeout(() => {
        setHasSubmitted(false);
        setResponse('');
        setWordCount(0);
        // Auto-advance to next time slot or next day
        advanceToNextQuestion();
      }, 3000);
    }
  };

  const advanceToNextQuestion = () => {
    const currentHour = new Date().getHours();
    const timeSlots = ['morning', 'afternoon', 'evening', 'night'];
    const currentTimeSlot = selectedTimeSlot === 'current' ? 
      (currentHour >= 6 && currentHour < 12 ? 'morning' :
       currentHour >= 12 && currentHour < 17 ? 'afternoon' :
       currentHour >= 17 && currentHour < 21 ? 'evening' : 'night') :
      selectedTimeSlot;
    
    const currentIndex = timeSlots.indexOf(currentTimeSlot);
    
    if (currentIndex < timeSlots.length - 1) {
      // Move to next time slot
      setSelectedTimeSlot(timeSlots[currentIndex + 1] as any);
    } else {
      // Move to next day, morning
      const nextDay = day < totalDays ? day + 1 : 1;
      onDayChange(nextDay);
      setSelectedTimeSlot('morning');
    }
  };

  const toggleRecording = () => {
    setIsRecording(!isRecording);
  };

  const handleSkip = () => {
    advanceToNextQuestion();
  };

  const handlePreviousDay = () => {
    const prevDay = day > 1 ? day - 1 : totalDays;
    onDayChange(prevDay);
    setResponse('');
    setWordCount(0);
  };

  const handleNextDay = () => {
    const nextDay = day < totalDays ? day + 1 : 1;
    onDayChange(nextDay);
    setResponse('');
    setWordCount(0);
  };

  const handleDaySelect = (selectedDay: number) => {
    onDayChange(selectedDay);
    setResponse('');
    setWordCount(0);
    setShowDayPicker(false);
  };

  const getTimeIcon = (timeOfDay: string) => {
    switch (timeOfDay) {
      case 'morning': return Sun;
      case 'afternoon': return Sun;
      case 'evening': return Sunset;
      case 'night': return Moon;
      default: return Clock;
    }
  };

  const getTimeColor = (timeOfDay: string) => {
    switch (timeOfDay) {
      case 'morning': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'afternoon': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'evening': return 'text-purple-600 bg-purple-50 border-purple-200';
      case 'night': return 'text-indigo-600 bg-indigo-50 border-indigo-200';
      default: return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  if (hasSubmitted) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200/50 rounded-2xl p-8 text-center shadow-lg">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <DharmaWheel className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-xl font-medium text-green-900 mb-2">Memory Preserved</h3>
          <p className="text-green-700 mb-4">Your precious memory has been safely recorded and encrypted.</p>
          <div className="text-sm text-green-600">
            {currentQuestion && (
              <>
                <div className="mb-2">
                  {currentQuestion.timeOfDay.charAt(0).toUpperCase() + currentQuestion.timeOfDay.slice(1)} reflection complete
                </div>
                <div className="text-xs opacity-75">
                  {getPersonalityAspectDescription(currentQuestion.personalityAspect)}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return <div className="max-w-2xl mx-auto text-center">Loading question...</div>;
  }

  const progressPercentage = (day / totalDays) * 100;
  const TimeIcon = getTimeIcon(currentQuestion.timeOfDay);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100/50 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-50/80 to-teal-50/80 p-6 border-b border-gray-100/50">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <DharmaWheel className="w-6 h-6 text-blue-600" />
              <div>
                <span className="text-sm font-medium text-blue-700">Day {day} of {totalDays}</span>
                <div className="text-xs text-gray-500 mt-0.5">{getTimeGreeting()}</div>
              </div>
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

          {/* Time Slot Selector */}
          <div className="mb-6">
            <div className="text-xs font-medium text-gray-600 mb-3 uppercase tracking-wide">Question Time</div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setSelectedTimeSlot('current')}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200 border ${
                  selectedTimeSlot === 'current'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white/80 text-gray-600 border-gray-200 hover:bg-white hover:text-gray-800'
                }`}
              >
                <Clock className="w-3 h-3" />
                Current Time
              </button>
              
              {dailyQuestions.questions.map((q, index) => {
                const timeSlot = ['morning', 'afternoon', 'evening', 'night'][index];
                const Icon = getTimeIcon(q.timeOfDay);
                return (
                  <button
                    key={q.id}
                    onClick={() => setSelectedTimeSlot(timeSlot as any)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200 border ${
                      selectedTimeSlot === timeSlot
                        ? getTimeColor(q.timeOfDay).replace('text-', 'bg-').replace('bg-', 'bg-').replace('-600', '-600 text-white border-').replace('bg-', '').replace(' text-white border-', ' text-white border-').replace('50 border-', '600 border-').replace('200', '600')
                        : `bg-white/80 border-gray-200 hover:bg-white hover:text-gray-800 ${getTimeColor(q.timeOfDay).split(' ')[0]}`
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    {q.timeOfDay.charAt(0).toUpperCase() + q.timeOfDay.slice(1)}
                  </button>
                );
              })}
            </div>
          </div>
          
          {/* Day Navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={handlePreviousDay}
              className="flex items-center gap-2 px-3 py-2 bg-white/80 text-gray-600 rounded-xl text-sm font-medium hover:bg-white hover:text-gray-800 transition-all duration-200 border border-gray-200/50 shadow-sm"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous Day
            </button>
            
            <div className="relative">
              <button
                onClick={() => setShowDayPicker(!showDayPicker)}
                className="flex items-center gap-2 px-4 py-2 bg-white/80 text-gray-700 rounded-xl text-sm font-medium hover:bg-white hover:text-gray-800 transition-all duration-200 border border-gray-200/50 shadow-sm"
              >
                <Calendar className="w-4 h-4" />
                Jump to Day
              </button>
              
              {showDayPicker && (
                <div className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2 bg-white rounded-xl shadow-xl border border-gray-200/50 p-4 z-10 w-80">
                  <div className="mb-3">
                    <label className="block text-xs font-medium text-gray-700 mb-2">Select Day (1-{totalDays})</label>
                    <input
                      type="number"
                      min="1"
                      max={totalDays}
                      defaultValue={day}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const value = parseInt((e.target as HTMLInputElement).value);
                          if (value >= 1 && value <= totalDays) {
                            handleDaySelect(value);
                          }
                        }
                      }}
                    />
                  </div>
                  
                  <div className="grid grid-cols-5 gap-1 max-h-32 overflow-y-auto">
                    {Array.from({ length: Math.min(50, totalDays) }, (_, i) => i + 1).map((dayNum) => (
                      <button
                        key={dayNum}
                        onClick={() => handleDaySelect(dayNum)}
                        className={`px-2 py-1 text-xs rounded transition-all duration-200 ${
                          dayNum === day
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {dayNum}
                      </button>
                    ))}
                  </div>
                  
                  {totalDays > 50 && (
                    <div className="mt-2 pt-2 border-t border-gray-100">
                      <p className="text-xs text-gray-500 text-center">
                        Use the input field above to jump to any day (1-{totalDays})
                      </p>
                    </div>
                  )}
                  
                  <button
                    onClick={() => setShowDayPicker(false)}
                    className="w-full mt-3 px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-200 transition-colors"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
            
            <button
              onClick={handleNextDay}
              className="flex items-center gap-2 px-3 py-2 bg-white/80 text-gray-600 rounded-xl text-sm font-medium hover:bg-white hover:text-gray-800 transition-all duration-200 border border-gray-200/50 shadow-sm"
            >
              Next Day
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Question Header */}
          <div className="flex items-start gap-3 mb-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${getTimeColor(currentQuestion.timeOfDay)}`}>
              <TimeIcon className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-medium text-gray-900 leading-relaxed mb-2">{currentQuestion.question}</h2>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span className={`px-2 py-1 rounded-full border ${getTimeColor(currentQuestion.timeOfDay)}`}>
                  {currentQuestion.timeOfDay.charAt(0).toUpperCase() + currentQuestion.timeOfDay.slice(1)} Reflection
                </span>
                <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full border border-gray-200">
                  {currentQuestion.category.charAt(0).toUpperCase() + currentQuestion.category.slice(1)}
                </span>
                <span className={`px-2 py-1 rounded-full border ${
                  currentQuestion.difficulty === 'light' ? 'bg-green-50 text-green-700 border-green-200' :
                  currentQuestion.difficulty === 'medium' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                  'bg-red-50 text-red-700 border-red-200'
                }`}>
                  {currentQuestion.difficulty.charAt(0).toUpperCase() + currentQuestion.difficulty.slice(1)}
                </span>
              </div>
              <div className="mt-2 text-xs text-gray-500 italic">
                {getPersonalityAspectDescription(currentQuestion.personalityAspect)}
              </div>
            </div>
          </div>
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
                disabled={!response.trim() || isSaving}
                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-xl text-sm font-medium hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:from-blue-700 hover:to-teal-700"
              >
                {isSaving ? (
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