import React, { useState, useEffect, useCallback } from 'react';
import { Brain, Sparkles, Loader, Target, AlertCircle, CheckCircle2, X, Crown, Zap } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { apiClient } from '../lib/api-client';
import type { EngramResponse } from '../types/database.types';
import CompactSaintsOverlay from './CompactSaintsOverlay';
import EngramTrainingWizard from './personality/EngramTrainingWizard';

type ArchetypalAI = EngramResponse;

interface AIArchetype {
  id: string;
  name: string;
  description: string;
  icon: string;
  suggestedName: string;
  defaultDescription: string;
}

interface ValidationError {
  field: string;
  message: string;
}

interface CustomEngramsDashboardProps {
  userId: string;
  onSelectAI?: (aiId: string) => void;
}

export default function CustomEngramsDashboard({ userId, onSelectAI }: CustomEngramsDashboardProps) {
  const [ais, setAIs] = useState<ArchetypalAI[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newAI, setNewAI] = useState({
    name: '',
    description: '',
    archetype: '',
  });
  const [showFastTrackModal, setShowFastTrackModal] = useState(false);
  const [selectedEngramForUpgrade, setSelectedEngramForUpgrade] = useState<ArchetypalAI | null>(null);
  const [purchasingFastTrack, setPurchasingFastTrack] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);
  const [nameExists, setNameExists] = useState(false);
  const [createStep, setCreateStep] = useState<'archetype' | 'details' | 'confirm'>('archetype');
  const [selectedArchetype, setSelectedArchetype] = useState<AIArchetype | null>(null);
  const [trainingAI, setTrainingAI] = useState<ArchetypalAI | null>(null);

  const aiArchetypes: AIArchetype[] = [
    {
      id: 'companion',
      name: 'The Companion',
      description: 'Empathetic friend for daily conversations and emotional support',
      icon: '💝',
      suggestedName: 'Luna',
      defaultDescription: 'A warm and supportive AI companion for daily check-ins and emotional wellness',
    },
    {
      id: 'creative',
      name: 'The Creative',
      description: 'Artistic soul for creative projects and imagination',
      icon: '🎨',
      suggestedName: 'Aurora',
      defaultDescription: 'A creative AI partner for artistic exploration, writing, and imaginative thinking',
    },
    {
      id: 'mentor',
      name: 'The Mentor',
      description: 'Wise teacher for personal growth and skill development',
      icon: '📚',
      suggestedName: 'Athena',
      defaultDescription: 'A knowledgeable mentor AI focused on learning, growth, and skill mastery',
    },
    {
      id: 'custom',
      name: 'Custom AI',
      description: 'Build a unique personality from scratch',
      icon: '✨',
      suggestedName: '',
      defaultDescription: 'My personal AI created from my memories and experiences',
    },
  ];

  const CHARACTER_LIMITS = {
    name: { min: 2, max: 50 },
    description: { min: 10, max: 500 },
  };

  // Onboarding modal is now click-triggered only via "How It Works" button
  // No auto-trigger on page load

  const dismissOnboarding = () => {
    localStorage.setItem('archetypal_ai_onboarding_seen', 'true');
    setShowOnboarding(false);
  };

  const validateAIName = (name: string): ValidationError | null => {
    if (!name.trim()) {
      return { field: 'name', message: 'AI name is required' };
    }
    if (name.length < CHARACTER_LIMITS.name.min) {
      return { field: 'name', message: `Name must be at least ${CHARACTER_LIMITS.name.min} characters` };
    }
    if (name.length > CHARACTER_LIMITS.name.max) {
      return { field: 'name', message: `Name must be less than ${CHARACTER_LIMITS.name.max} characters` };
    }
    if (!/^[a-zA-Z0-9\s\-']+$/.test(name)) {
      return { field: 'name', message: 'Name can only contain letters, numbers, spaces, hyphens, and apostrophes' };
    }
    return null;
  };

  const validateDescription = (description: string): ValidationError | null => {
    if (description && description.length < CHARACTER_LIMITS.description.min) {
      return { field: 'description', message: `Description must be at least ${CHARACTER_LIMITS.description.min} characters` };
    }
    if (description && description.length > CHARACTER_LIMITS.description.max) {
      return { field: 'description', message: `Description must be less than ${CHARACTER_LIMITS.description.max} characters` };
    }
    return null;
  };

  const checkDuplicateName = useCallback(async (name: string) => {
    if (!name.trim() || name.length < CHARACTER_LIMITS.name.min) {
      setNameExists(false);
      return;
    }

    setCheckingDuplicate(true);
    try {
      const exists = await apiClient.checkEngramNameExists(name.trim());
      setNameExists(exists);
    } catch (error) {
      console.error('Error checking duplicate name:', error);
    } finally {
      setCheckingDuplicate(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (newAI.name) {
        checkDuplicateName(newAI.name);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [newAI.name, checkDuplicateName]);

  const validateAIForm = (): boolean => {
    const errors: ValidationError[] = [];

    const nameError = validateAIName(newAI.name);
    if (nameError) errors.push(nameError);

    const descError = validateDescription(newAI.description);
    if (descError) errors.push(descError);

    if (nameExists) {
      errors.push({ field: 'name', message: 'An AI with this name already exists' });
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleArchetypeSelect = (archetype: AIArchetype) => {
    setSelectedArchetype(archetype);
    setNewAI({
      name: archetype.suggestedName,
      description: archetype.defaultDescription,
      archetype: archetype.id,
    });
    setCreateStep('details');
  };

  const resetCreateModal = () => {
    setShowCreateModal(false);
    setCreateStep('archetype');
    setSelectedArchetype(null);
    setNewAI({ name: '', description: '', archetype: '' });
    setValidationErrors([]);
    setNameExists(false);
  };

  const loadAIs = useCallback(async () => {
    try {
      const data = await apiClient.getEngrams();
      setAIs(data || []);
    } catch (error) {
      console.error('Error loading AIs:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadAIs();
  }, [loadAIs]);

  const createAI = async () => {
    if (!validateAIForm()) {
      return;
    }

    setIsCreating(true);
    try {
      const newEngram = await apiClient.createEngram({
        user_id: userId,
        name: newAI.name.trim(),
        description: newAI.description.trim() || newAI.description,
        archetype: newAI.archetype || 'custom',
        relationship: 'custom',
        engram_type: 'custom',
      });

      setAIs([newEngram, ...ais]);
      resetCreateModal();

      setTimeout(() => {
        if (onSelectAI) {
          onSelectAI(newEngram.id);
        }
      }, 300);
    } catch (error) {
      console.error('Error creating AI:', error);
      setValidationErrors([{
        field: 'general',
        message: 'Failed to create AI. Please try again or contact support if the problem persists.'
      }]);
    } finally {
      setIsCreating(false);
    }
  };

  // Utility functions for status display (reserved for future use)
  // const getStatusColor = (status: string) => {
  //   if (status === 'ready') return 'text-emerald-400';
  //   if (status === 'training') return 'text-amber-400';
  //   return 'text-slate-400';
  // };

  // const getStatusBgColor = (status: string) => {
  //   if (status === 'ready') return 'bg-emerald-500/10 border-emerald-500/20';
  //   if (status === 'training') return 'bg-amber-500/10 border-amber-500/20';
  //   return 'bg-slate-500/10 border-slate-500/20';
  // };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-slate-700 border-t-emerald-500 rounded-full animate-spin"></div>
          <p className="text-sm text-slate-500">Loading Archetypal AIs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="relative z-10">
        <CompactSaintsOverlay />
      </div>

      {/* Enhanced Create Modal with Multi-Step Wizard */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/50 p-6 sm:p-8 max-w-3xl w-full my-8">
            {/* Header with Progress */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-sky-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-sky-500/20">
                    <Brain className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-light text-white">Create New AI</h3>
                    <p className="text-sm text-slate-400">
                      {createStep === 'archetype' && 'Choose a personality type'}
                      {createStep === 'details' && 'Customize your AI'}
                      {createStep === 'confirm' && 'Review and create'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={resetCreateModal}
                  className="text-slate-400 hover:text-white transition-colors"
                  aria-label="Close modal"
                >
                  <span className="text-2xl">&times;</span>
                </button>
              </div>

              {/* Progress Indicator */}
              <div className="flex items-center gap-2">
                {['archetype', 'details', 'confirm'].map((step, index) => (
                  <React.Fragment key={step}>
                    <div className={`flex-1 h-1.5 rounded-full transition-all ${createStep === step ? 'bg-sky-500' :
                      ['archetype', 'details', 'confirm'].indexOf(createStep) > index ? 'bg-emerald-500' : 'bg-slate-700'
                      }`}></div>
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Step 1: Archetype Selection */}
            {createStep === 'archetype' && (
              <div className="space-y-4">
                <h4 className="text-lg font-medium text-white mb-4">Select AI Archetype</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-h-96 overflow-y-auto pr-2">
                  {aiArchetypes.map((archetype) => (
                    <button
                      key={archetype.id}
                      onClick={() => handleArchetypeSelect(archetype)}
                      className="group text-left glass-card p-6 hover:scale-[1.02] transition-all"
                    >
                      <div className="flex items-start gap-4">
                        <div className="text-4xl flex-shrink-0">{archetype.icon}</div>
                        <div className="flex-1 min-w-0">
                          <h5 className="text-base font-medium text-white mb-1 group-hover:text-sky-400 transition-colors">
                            {archetype.name}
                          </h5>
                          <p className="text-sm text-slate-400 leading-relaxed">
                            {archetype.description}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2: Details Form */}
            {createStep === 'details' && (
              <div className="space-y-6">
                {selectedArchetype && (
                  <div className="flex items-center gap-3 p-4 bg-slate-900/50 border border-slate-700/50 rounded-xl">
                    <div className="text-3xl">{selectedArchetype.icon}</div>
                    <div>
                      <p className="text-sm text-slate-400">Selected Archetype</p>
                      <p className="text-base font-medium text-white">{selectedArchetype.name}</p>
                    </div>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-slate-300">AI Name *</label>
                    <span className="text-xs text-slate-500">
                      {newAI.name.length}/{CHARACTER_LIMITS.name.max}
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={newAI.name}
                      onChange={(e) => setNewAI({ ...newAI, name: e.target.value })}
                      placeholder="e.g., Dante, Luna, Aurora"
                      maxLength={CHARACTER_LIMITS.name.max}
                      className={`w-full bg-slate-900/50 border rounded-xl px-4 py-3 pr-10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-all ${validationErrors.some(e => e.field === 'name') || nameExists
                        ? 'border-rose-500/50 focus:border-rose-500 focus:ring-rose-500/20'
                        : 'border-slate-700 hover:border-slate-600 focus:border-sky-500 focus:ring-sky-500/20'
                        }`}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {checkingDuplicate ? (
                        <Loader className="w-5 h-5 text-slate-400 animate-spin" />
                      ) : nameExists ? (
                        <AlertCircle className="w-5 h-5 text-rose-400" />
                      ) : newAI.name.length >= CHARACTER_LIMITS.name.min && !nameExists ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      ) : null}
                    </div>
                  </div>
                  {nameExists && (
                    <p className="mt-2 text-sm text-rose-400 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      An AI with this name already exists
                    </p>
                  )}
                  {validationErrors.filter(e => e.field === 'name').map((error, idx) => (
                    <p key={idx} className="mt-2 text-sm text-rose-400 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      {error.message}
                    </p>
                  ))}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-slate-300">Description (Optional)</label>
                    <span className="text-xs text-slate-500">
                      {newAI.description.length}/{CHARACTER_LIMITS.description.max}
                    </span>
                  </div>
                  <textarea
                    value={newAI.description}
                    onChange={(e) => setNewAI({ ...newAI, description: e.target.value })}
                    placeholder="Brief description of this AI personality..."
                    rows={4}
                    maxLength={CHARACTER_LIMITS.description.max}
                    className={`w-full bg-slate-900/50 border rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-all resize-none ${validationErrors.some(e => e.field === 'description')
                      ? 'border-rose-500/50 focus:border-rose-500 focus:ring-rose-500/20'
                      : 'border-slate-700 hover:border-slate-600 focus:border-sky-500 focus:ring-sky-500/20'
                      }`}
                  />
                  {validationErrors.filter(e => e.field === 'description').map((error, idx) => (
                    <p key={idx} className="mt-2 text-sm text-rose-400 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      {error.message}
                    </p>
                  ))}
                </div>

                {validationErrors.filter(e => e.field === 'general').map((error, idx) => (
                  <div key={idx} className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                    <p className="text-sm text-rose-400 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      {error.message}
                    </p>
                  </div>
                ))}

                <div className="flex gap-3 mt-8">
                  <button
                    onClick={() => setCreateStep('archetype')}
                    className="flex-1 px-6 py-3 bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 hover:border-slate-600 text-slate-300 hover:text-white rounded-xl transition-all font-medium"
                  >
                    Back
                  </button>
                  <button
                    onClick={createAI}
                    disabled={isCreating || nameExists || checkingDuplicate}
                    className="flex-1 px-6 py-3 bg-sky-600 hover:bg-sky-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-xl transition-all shadow-lg shadow-sky-500/20 font-medium flex items-center justify-center gap-2"
                  >
                    {isCreating ? (
                      <>
                        <Loader className="w-5 h-5 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5" />
                        Create AI
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Onboarding Modal - Mobile Optimized */}
      {showOnboarding && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto">
          <div className="bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-emerald-500/30 p-4 sm:p-6 md:p-8 max-w-2xl w-full my-4 relative">
            {/* Close Button - Top Right */}
            <button
              onClick={dismissOnboarding}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 w-10 h-10 flex items-center justify-center rounded-lg bg-slate-800/50 hover:bg-slate-700/70 border border-slate-600/30 hover:border-slate-500/50 text-slate-400 hover:text-white transition-all shadow-lg group z-10"
              aria-label="Close welcome modal"
            >
              <X className="w-5 h-5 group-hover:scale-110 transition-transform" />
            </button>

            <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8 pr-12">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20 flex-shrink-0">
                <Brain className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
              </div>
              <div>
                <h3 className="text-xl sm:text-2xl font-semibold text-white mb-1">Welcome to Archetypal AIs!</h3>
                <p className="text-xs sm:text-sm text-emerald-400 font-medium">Build AI personalities through daily questions</p>
              </div>
            </div>

            <div className="space-y-4 sm:space-y-6 mb-6 sm:mb-8">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="w-9 h-9 sm:w-10 sm:h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-base sm:text-lg font-bold text-emerald-400">1</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-base sm:text-lg font-semibold text-white mb-1 sm:mb-2">Choose Your AI</h4>
                  <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                    Select from different AI personalities tailored to your needs.
                    You can train multiple AIs, each with their own unique focus.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 sm:gap-4">
                <div className="w-9 h-9 sm:w-10 sm:h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-base sm:text-lg font-bold text-emerald-400">2</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-base sm:text-lg font-semibold text-white mb-1 sm:mb-2">Answer Daily Questions</h4>
                  <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                    Each answer becomes a "memory" that shapes their personality. Answer 50 questions to build a complete personality profile.
                    <span className="block mt-1.5 sm:mt-2 text-emerald-400 font-medium text-sm">Takes just ~5 minutes per day</span>
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 sm:gap-4">
                <div className="w-9 h-9 sm:w-10 sm:h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-base sm:text-lg font-bold text-emerald-400">3</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-base sm:text-lg font-semibold text-white mb-1 sm:mb-2">Activate & Chat</h4>
                  <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                    After 50 memories, your AI activates and you can start conversations! They'll remember everything you've shared
                    and respond in a way that reflects your unique personality and values.
                  </p>
                </div>
              </div>

              <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                <div className="flex items-start gap-2.5 sm:gap-3">
                  <Target className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <h5 className="text-xs sm:text-sm font-semibold text-amber-300 mb-1">Your 50-Day Journey</h5>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Most users complete activation in 6-8 weeks. You can go at your own pace—there's no rush!
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={dismissOnboarding}
              className="w-full px-5 sm:px-6 py-3 sm:py-3.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl transition-all shadow-lg shadow-emerald-500/20 font-semibold text-sm sm:text-base"
            >
              Get Started
            </button>
          </div>
        </div>
      )}

      {/* Fast-Track Upgrade Modal */}
      {showFastTrackModal && selectedEngramForUpgrade && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-amber-500/30 p-8 max-w-lg w-full">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20">
                <Zap className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-light text-white mb-1">Fast-Track Activation</h3>
                <p className="text-sm text-amber-400 font-medium">Unlock Early Access</p>
              </div>
            </div>

            <div className="mb-6 p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
              <h4 className="text-sm font-medium text-amber-300 mb-2">Your Engram</h4>
              <p className="text-white font-medium">{selectedEngramForUpgrade.name}</p>
              <p className="text-xs text-slate-400 mt-1">Current readiness: {selectedEngramForUpgrade.ai_readiness_score}%</p>
            </div>

            <div className="space-y-4 mb-6">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 bg-emerald-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Sparkles className="w-3 h-3 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Instant Chat Access</p>
                  <p className="text-xs text-slate-400">Start conversations immediately at 50% readiness</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 bg-emerald-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Sparkles className="w-3 h-3 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Premium Question Categories</p>
                  <p className="text-xs text-slate-400">Access relationship coaching, career mentoring, and more</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 bg-emerald-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Sparkles className="w-3 h-3 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Audio & Video Uploads</p>
                  <p className="text-xs text-slate-400">Add multimedia memories with AI-generated reflections</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 bg-emerald-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Sparkles className="w-3 h-3 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Priority AI Responses</p>
                  <p className="text-xs text-slate-400">Get faster, more detailed AI interactions</p>
                </div>
              </div>
            </div>

            <div className="mb-6 p-6 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-xl text-center">
              <div className="text-sm text-slate-400 mb-1">Engram Premium</div>
              <div className="text-4xl font-light text-white mb-1">$14.99</div>
              <div className="text-xs text-slate-500">per month · cancel anytime</div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowFastTrackModal(false);
                  setSelectedEngramForUpgrade(null);
                }}
                disabled={purchasingFastTrack}
                className="flex-1 px-6 py-3 bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 hover:border-slate-600 text-slate-300 hover:text-white rounded-xl transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Maybe Later
              </button>
              <button
                onClick={async () => {
                  setPurchasingFastTrack(true);
                  try {
                    const { data, error } = await supabase.functions.invoke('stripe-checkout', {
                      body: {
                        type: 'engram_premium',
                        engram_id: selectedEngramForUpgrade.id,
                        price_id: 'price_engram_premium_monthly',
                        success_url: `${window.location.origin}/dashboard?upgrade=success`,
                        cancel_url: `${window.location.origin}/dashboard?upgrade=cancelled`,
                      },
                    });

                    if (error) throw error;
                    if (data?.url) {
                      window.location.href = data.url;
                    }
                  } catch (err) {
                    console.error('Upgrade error:', err);
                    alert('Failed to start upgrade. Please try again.');
                  } finally {
                    setPurchasingFastTrack(false);
                  }
                }}
                disabled={purchasingFastTrack}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-all shadow-lg shadow-amber-500/20 font-medium flex items-center justify-center gap-2"
              >
                {purchasingFastTrack ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Crown className="w-5 h-5" />
                    Upgrade Now
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Training Wizard Modal */}
      {trainingAI && (
        <EngramTrainingWizard
          ai={trainingAI}
          userId={userId}
          onClose={() => setTrainingAI(null)}
          onMemorySaved={(updatedAI) => {
            setAIs(prev => prev.map(a => a.id === updatedAI.id ? { ...a, ...updatedAI } : a));
          }}
        />
      )}
    </div>
  );
}
