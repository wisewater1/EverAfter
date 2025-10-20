import React, { useState } from 'react';
import { Brain, Sparkles, ChevronRight, ChevronLeft, Check, User, Zap } from 'lucide-react';
import { aiTrainingQuestions } from '../data/aiTrainingQuestions';
import { supabase } from '../lib/supabase';

interface CustomEngramCreatorProps {
  userId: string;
  onComplete: (engramId: string) => void;
  onCancel: () => void;
}

interface TrainingResponse {
  questionId: string;
  question: string;
  answer: string;
  category: string;
}

export default function CustomEngramCreator({ userId, onComplete, onCancel }: CustomEngramCreatorProps) {
  const [step, setStep] = useState<'name' | 'training' | 'review'>('name');
  const [engramName, setEngramName] = useState('');
  const [engramDescription, setEngramDescription] = useState('');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState<TrainingResponse[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const currentQuestion = aiTrainingQuestions[currentQuestionIndex];
  const totalQuestions = aiTrainingQuestions.length;
  const progress = ((currentQuestionIndex + 1) / totalQuestions) * 100;

  const handleNameSubmit = () => {
    if (engramName.trim()) {
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

  const handleCreateEngram = async () => {
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

      const { data: engramData, error: engramError } = await supabase
        .from('archetypal_ais')
        .insert({
          user_id: userId,
          name: engramName,
          description: engramDescription || `Custom Engram created from personality training`,
          personality_traits: personalityTraits,
          total_memories: responses.length,
          training_status: responses.length >= 10 ? 'ready' : 'training'
        })
        .select()
        .single();

      if (engramError) throw engramError;

      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        const embedPromises = responses.map(async (response) => {
          try {
            const embeddingText = `Question: ${response.question}\nAnswer: ${response.answer}`;
            const embeddingResponse = await fetch(
              `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-embeddings`,
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${session.access_token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  text: embeddingText,
                  engramId: engramData.id,
                  type: 'engram_memory',
                  metadata: {
                    category: response.category,
                    question: response.question,
                  },
                }),
              }
            );

            if (!embeddingResponse.ok) {
              console.error('Failed to generate embedding for response');
            }
          } catch (error) {
            console.error('Error generating embedding:', error);
          }
        });

        await Promise.allSettled(embedPromises);
      }

      onComplete(engramData.id);
    } catch (error) {
      console.error('Error creating engram:', error);
      alert('Failed to create Custom Engram. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-3xl">
        {step === 'name' && (
          <div className="bg-gradient-to-br from-gray-800 via-gray-800 to-blue-900/20 rounded-2xl shadow-2xl border border-gray-700/50 p-8 backdrop-blur-sm">
            <div className="flex items-center gap-4 mb-8">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl blur-xl opacity-50"></div>
                <div className="relative w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl">
                  <Brain className="w-8 h-8 text-white" />
                </div>
              </div>
              <div>
                <h2 className="text-3xl font-light text-white">Create Custom Engram</h2>
                <p className="text-gray-400 mt-1">Train an autonomous AI on personality traits</p>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Engram Name
                </label>
                <input
                  type="text"
                  value={engramName}
                  onChange={(e) => setEngramName(e.target.value)}
                  placeholder="e.g., Dad's Engram, Grandma Sarah, My Digital Twin"
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description <span className="text-gray-500 text-xs">(optional)</span>
                </label>
                <textarea
                  value={engramDescription}
                  onChange={(e) => setEngramDescription(e.target.value)}
                  placeholder="Brief description of this engram's purpose or the person it represents..."
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              <div className="bg-blue-900/30 border border-blue-700/50 rounded-xl p-5 backdrop-blur-sm">
                <div className="flex items-start gap-3">
                  <Zap className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-blue-300 mb-1">Training Process</h4>
                    <p className="text-sm text-blue-200 leading-relaxed">
                      You'll answer {totalQuestions} questions to train your engram. The more detailed your answers,
                      the more accurately the engram will capture personality and communication style.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={onCancel}
                  className="px-6 py-3 bg-gray-700/50 text-gray-300 rounded-lg hover:bg-gray-600/50 transition-all border border-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={handleNameSubmit}
                  disabled={!engramName.trim()}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg hover:shadow-blue-500/25"
                >
                  <span className="font-medium">Begin Training</span>
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 'training' && (
          <div className="bg-gradient-to-br from-gray-800 via-gray-800 to-blue-900/20 rounded-2xl shadow-2xl border border-gray-700/50 p-8 backdrop-blur-sm">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-300">
                  Question {currentQuestionIndex + 1} of {totalQuestions}
                </span>
                <span className="text-sm font-medium text-blue-400">
                  {Math.round(progress)}% Complete
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-500 via-purple-500 to-blue-600 h-2.5 rounded-full transition-all duration-500 ease-out relative"
                  style={{ width: `${progress}%` }}
                >
                  <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                </div>
              </div>
            </div>

            <div className="mb-8">
              <div className="inline-block px-3 py-1.5 bg-blue-900/30 border border-blue-700/50 rounded-full text-xs font-medium text-blue-300 mb-4">
                {currentQuestion.category.charAt(0).toUpperCase() + currentQuestion.category.slice(1)}
              </div>
              <h3 className="text-2xl font-light text-white mb-3 leading-relaxed">
                {currentQuestion.question}
              </h3>
              <p className="text-sm text-gray-400 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-gray-500" />
                {currentQuestion.purpose}
              </p>
            </div>

            <div className="space-y-4">
              <textarea
                value={currentAnswer}
                onChange={(e) => setCurrentAnswer(e.target.value)}
                placeholder="Share detailed thoughts to help train the engram..."
                rows={7}
                className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                autoFocus
              />

              <div className="flex items-center gap-3">
                <button
                  onClick={handlePrevious}
                  disabled={currentQuestionIndex === 0}
                  className="px-4 py-3 bg-gray-700/50 text-gray-300 rounded-lg hover:bg-gray-600/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 border border-gray-600"
                >
                  <ChevronLeft className="w-5 h-5" />
                  Previous
                </button>
                <button
                  onClick={handleSkip}
                  className="px-4 py-3 text-gray-400 hover:text-gray-300 transition-colors"
                >
                  Skip
                </button>
                <button
                  onClick={handleAnswerSubmit}
                  disabled={!currentAnswer.trim()}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg hover:shadow-blue-500/25"
                >
                  <span className="font-medium">{currentQuestionIndex === totalQuestions - 1 ? 'Finish' : 'Next'}</span>
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 'review' && (
          <div className="bg-gradient-to-br from-gray-800 via-gray-800 to-emerald-900/20 rounded-2xl shadow-2xl border border-gray-700/50 p-8 backdrop-blur-sm">
            <div className="flex items-center gap-4 mb-8">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl blur-xl opacity-50"></div>
                <div className="relative w-16 h-16 bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl flex items-center justify-center shadow-2xl">
                  <Check className="w-8 h-8 text-white" />
                </div>
              </div>
              <div>
                <h2 className="text-3xl font-light text-white">Training Complete!</h2>
                <p className="text-gray-400 mt-1">Review your Custom Engram</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-gray-700/30 rounded-xl p-6 border border-gray-600/50">
                <div className="flex items-center gap-4 mb-5">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                    <User className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-medium text-white">{engramName}</h3>
                    <p className="text-sm text-gray-400 mt-0.5">{engramDescription || 'Custom Engram'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
                    <div className="text-3xl font-light text-white mb-1">{responses.length}</div>
                    <div className="text-sm text-gray-400">Training Responses</div>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
                    <div className="text-3xl font-light text-white mb-1">
                      {responses.length >= 10 ? (
                        <span className="text-emerald-400">Ready</span>
                      ) : (
                        <span className="text-amber-400">Training</span>
                      )}
                    </div>
                    <div className="text-sm text-gray-400">Status</div>
                  </div>
                </div>
              </div>

              <div className={`${responses.length >= 10 ? 'bg-emerald-900/30 border-emerald-700/50' : 'bg-amber-900/30 border-amber-700/50'} border rounded-xl p-5`}>
                <div className="flex items-start gap-3">
                  <Sparkles className={`w-5 h-5 ${responses.length >= 10 ? 'text-emerald-400' : 'text-amber-400'} flex-shrink-0 mt-0.5`} />
                  <p className={`text-sm ${responses.length >= 10 ? 'text-emerald-200' : 'text-amber-200'} leading-relaxed`}>
                    {responses.length >= 10
                      ? "Your Custom Engram is ready! It will respond based on the personality traits and communication patterns you've trained it with."
                      : "Consider answering more questions to improve your engram's accuracy and personality depth. More detailed training leads to better responses."}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setStep('training');
                    setCurrentQuestionIndex(responses.length);
                  }}
                  className="px-6 py-3 bg-gray-700/50 text-gray-300 rounded-lg hover:bg-gray-600/50 transition-all border border-gray-600"
                >
                  Add More Training
                </button>
                <button
                  onClick={handleCreateEngram}
                  disabled={isCreating}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-lg hover:from-emerald-700 hover:to-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg hover:shadow-emerald-500/25"
                >
                  {isCreating ? (
                    <>
                      <Sparkles className="w-5 h-5 animate-spin" />
                      <span className="font-medium">Creating Engram...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      <span className="font-medium">Create Engram</span>
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
