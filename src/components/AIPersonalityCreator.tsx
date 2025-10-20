import React, { useState } from 'react';
import { Brain, Sparkles, ChevronRight, ChevronLeft, Check, User } from 'lucide-react';
import { aiTrainingQuestions } from '../data/aiTrainingQuestions';
import { supabase } from '../lib/supabase';

interface AIPersonalityCreatorProps {
  userId: string;
  onComplete: (aiId: string) => void;
  onCancel: () => void;
}

interface TrainingResponse {
  questionId: string;
  question: string;
  answer: string;
  category: string;
}

export default function AIPersonalityCreator({ userId, onComplete, onCancel }: AIPersonalityCreatorProps) {
  const [step, setStep] = useState<'name' | 'training' | 'review'>('name');
  const [aiName, setAiName] = useState('');
  const [aiDescription, setAiDescription] = useState('');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState<TrainingResponse[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const currentQuestion = aiTrainingQuestions[currentQuestionIndex];
  const totalQuestions = aiTrainingQuestions.length;
  const progress = ((currentQuestionIndex + 1) / totalQuestions) * 100;

  const handleNameSubmit = () => {
    if (aiName.trim()) {
      setStep('training');
    }
  };

  const handleAnswerSubmit = () => {
    if (currentAnswer.trim()) {
      const newResponse: TrainingResponse = {
        questionId: currentQuestion.id,
        question: currentQuestion.question,
        answer: currentAnswer,
        category: currentQuestion.category
      };

      setResponses([...responses, newResponse]);
      setCurrentAnswer('');

      if (currentQuestionIndex < totalQuestions - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
      } else {
        setStep('review');
      }
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      const previousResponse = responses[currentQuestionIndex - 1];
      setCurrentAnswer(previousResponse?.answer || '');
      setResponses(responses.slice(0, -1));
    }
  };

  const handleSkip = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      setStep('review');
    }
  };

  const handleCreateAI = async () => {
    setIsCreating(true);
    try {
      const personalityTraits = responses.reduce((acc, response) => {
        if (!acc[response.category]) {
          acc[response.category] = [];
        }
        acc[response.category].push({
          question: response.question,
          answer: response.answer
        });
        return acc;
      }, {} as Record<string, Array<{ question: string; answer: string }>>);

      const { data: aiData, error: aiError } = await supabase
        .from('archetypal_ais')
        .insert({
          user_id: userId,
          name: aiName,
          description: aiDescription || `My personal AI created from my memories and experiences`,
          personality_traits: personalityTraits,
          total_memories: responses.length,
          training_status: responses.length >= 10 ? 'ready' : 'training'
        })
        .select()
        .single();

      if (aiError) throw aiError;

      onComplete(aiData.id);
    } catch (error) {
      console.error('Error creating AI:', error);
      alert('Failed to create AI personality. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-3xl">
        {step === 'name' && (
          <div className="bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 p-8">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
                <Brain className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-light text-white">Create Your AI Personality</h2>
                <p className="text-slate-400 mt-1">Build an AI that thinks and responds like you</p>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  AI Name
                </label>
                <input
                  type="text"
                  value={aiName}
                  onChange={(e) => setAiName(e.target.value)}
                  placeholder="e.g., My Digital Self, Dad's AI, Grandma's Memory"
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Description (optional)
                </label>
                <textarea
                  value={aiDescription}
                  onChange={(e) => setAiDescription(e.target.value)}
                  placeholder="Briefly describe the purpose of this AI..."
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="bg-blue-900/30 border border-blue-700/50 rounded-lg p-4">
                <p className="text-sm text-blue-200">
                  You'll answer {totalQuestions} questions to train your AI. The more detailed your answers,
                  the more accurately the AI will reflect your personality and communication style.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={onCancel}
                  className="px-6 py-3 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleNameSubmit}
                  disabled={!aiName.trim()}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  Begin Training
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 'training' && (
          <div className="bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 p-8">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-400">
                  Question {currentQuestionIndex + 1} of {totalQuestions}
                </span>
                <span className="text-sm text-slate-400">
                  {Math.round(progress)}% Complete
                </span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div className="mb-8">
              <div className="inline-block px-3 py-1 bg-blue-900/30 border border-blue-700/50 rounded-full text-xs text-blue-300 mb-4">
                {currentQuestion.category.charAt(0).toUpperCase() + currentQuestion.category.slice(1)}
              </div>
              <h3 className="text-2xl font-light text-white mb-2">
                {currentQuestion.question}
              </h3>
              <p className="text-sm text-slate-400">{currentQuestion.purpose}</p>
            </div>

            <div className="space-y-4">
              <textarea
                value={currentAnswer}
                onChange={(e) => setCurrentAnswer(e.target.value)}
                placeholder="Share your thoughts in detail..."
                rows={6}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />

              <div className="flex items-center gap-3">
                <button
                  onClick={handlePrevious}
                  disabled={currentQuestionIndex === 0}
                  className="px-4 py-3 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <ChevronLeft className="w-5 h-5" />
                  Previous
                </button>
                <button
                  onClick={handleSkip}
                  className="px-4 py-3 text-slate-400 hover:text-slate-300 transition-colors"
                >
                  Skip
                </button>
                <button
                  onClick={handleAnswerSubmit}
                  disabled={!currentAnswer.trim()}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {currentQuestionIndex === totalQuestions - 1 ? 'Finish' : 'Next'}
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 'review' && (
          <div className="bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 p-8">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center">
                <Check className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-light text-white">Training Complete!</h2>
                <p className="text-slate-400 mt-1">Review your AI personality</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-slate-700/50 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <User className="w-6 h-6 text-blue-400" />
                  <div>
                    <h3 className="text-xl font-medium text-white">{aiName}</h3>
                    <p className="text-sm text-slate-400">{aiDescription || 'My personal AI'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="bg-slate-800 rounded-lg p-4">
                    <div className="text-3xl font-light text-white mb-1">{responses.length}</div>
                    <div className="text-sm text-slate-400">Questions Answered</div>
                  </div>
                  <div className="bg-slate-800 rounded-lg p-4">
                    <div className="text-3xl font-light text-white mb-1">
                      {responses.length >= 10 ? 'Ready' : 'Training'}
                    </div>
                    <div className="text-sm text-slate-400">Status</div>
                  </div>
                </div>
              </div>

              <div className="bg-blue-900/30 border border-blue-700/50 rounded-lg p-4">
                <p className="text-sm text-blue-200">
                  {responses.length >= 10
                    ? "Your AI is ready to interact! It will respond based on the personality traits you've provided."
                    : "Consider answering more questions to improve your AI's accuracy and personality depth."}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setStep('training');
                    setCurrentQuestionIndex(0);
                  }}
                  className="px-6 py-3 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors"
                >
                  Answer More Questions
                </button>
                <button
                  onClick={handleCreateAI}
                  disabled={isCreating}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isCreating ? (
                    <>
                      <Sparkles className="w-5 h-5 animate-spin" />
                      Creating AI...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Create AI Personality
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
