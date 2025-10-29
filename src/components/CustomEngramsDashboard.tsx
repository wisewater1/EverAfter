import React, { useState, useEffect, useCallback } from 'react';
import { Plus, User, Brain, TrendingUp, Calendar, ArrowRight, Zap, Crown, Sparkles, Loader, MessageCircle, HelpCircle, Clock, Target, AlertCircle, CheckCircle2, Camera, Palette, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import CompactSaintsOverlay from './CompactSaintsOverlay';
// import { updateAIPersonalityProfile } from '../lib/archetypal-ai-helpers'; // Reserved for future use

interface ArchetypalAI {
  id: string;
  name: string;
  description: string;
  total_memories: number;
  training_status: string;
  is_ai_active: boolean;
  ai_readiness_score: number;
  avatar_url?: string;
  archetype?: string;
  created_at: string;
}

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
      const { data, error } = await supabase
        .from('archetypal_ais')
        .select('id, name')
        .eq('user_id', userId)
        .ilike('name', name.trim());

      if (error) throw error;

      setNameExists(data && data.length > 0);
    } catch (error) {
      console.error('Error checking duplicate name:', error);
    } finally {
      setCheckingDuplicate(false);
    }
  }, [userId]);

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

  const createDefaultAIs = useCallback(async () => {
    try {
      await supabase
        .from('archetypal_ais')
        .insert([
          {
            user_id: userId,
            name: 'Dante',
            description: 'A curious and philosophical AI that learns about you through thoughtful questions',
            training_status: 'training'
          },
          {
            user_id: userId,
            name: 'Jamal',
            description: 'An investment attorney AI specializing in financial strategy, legal compliance, and investment planning',
            training_status: 'training'
          }
        ]);
    } catch (error) {
      console.error('Error creating default AIs:', error);
    }
  }, [userId]);

  const loadAIs = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('archetypal_ais')
        .select('id, name, description, total_memories, training_status, is_ai_active, ai_readiness_score, avatar_url, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const aiList = data || [];

      if (aiList.length === 0) {
        await createDefaultAIs();
        const { data: newData } = await supabase
          .from('archetypal_ais')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
        setAIs(newData || []);
      } else {
        setAIs(aiList);
      }
    } catch (error) {
      console.error('Error loading AIs:', error);
    } finally {
      setLoading(false);
    }
  }, [userId, createDefaultAIs]);

  useEffect(() => {
    loadAIs();
  }, [loadAIs]);

  const createAI = async () => {
    if (!validateAIForm()) {
      return;
    }

    setIsCreating(true);
    try {
      const { data, error } = await supabase
        .from('archetypal_ais')
        .insert([{
          user_id: userId,
          name: newAI.name.trim(),
          description: newAI.description.trim() || newAI.description,
          archetype: newAI.archetype || 'custom',
        }])
        .select()
        .single();

      if (error) throw error;

      setAIs([data, ...ais]);
      resetCreateModal();

      setTimeout(() => {
        if (onSelectAI) {
          onSelectAI(data.id);
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
      {/* Compact Saints Overlay - Positioned Above Personality Journey */}
      <div className="relative z-10">
        <CompactSaintsOverlay />
      </div>

      {/* Header Section with Progress Hero */}
      <div className="space-y-6">
        {/* Main Header */}
        <div className="bg-gradient-to-br from-slate-800/40 to-slate-900/40 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-8 shadow-2xl">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 via-teal-500 to-sky-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <Brain className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-white mb-2">Your Personality Journey</h1>
                <p className="text-slate-300 max-w-2xl leading-relaxed text-base">
                  Build AI personalities through daily questions. Each answer shapes their unique character and capabilities.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowOnboarding(true)}
                className="px-4 py-2.5 bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 hover:border-slate-600 text-slate-200 rounded-xl transition-all font-medium flex items-center gap-2 whitespace-nowrap"
                aria-label="How this works"
              >
                <HelpCircle className="w-4 h-4" />
                <span className="hidden sm:inline">How It Works</span>
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all shadow-lg shadow-emerald-500/20 font-medium flex items-center gap-2 whitespace-nowrap"
                aria-label="Create new AI"
              >
                <Plus className="w-4 h-4" />
                Create AI
              </button>
            </div>
          </div>
        </div>

        {/* Progress Overview - Only show if AIs exist */}
        {ais.length > 0 && (
          <div className="bg-gradient-to-br from-emerald-900/20 via-slate-800/40 to-slate-900/40 backdrop-blur-xl rounded-2xl border border-emerald-500/20 p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                  <Target className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Your Progress</h3>
                  <p className="text-sm text-slate-400">Building {ais.length} AI {ais.length === 1 ? 'personality' : 'personalities'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Clock className="w-4 h-4" />
                <span>~5 min per day</span>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
              {ais.map((ai) => (
                <div key={ai.id} className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/50">
                  <div className="text-2xl font-light text-white mb-1">{ai.total_memories}/50</div>
                  <div className="text-xs text-slate-400 mb-2">{ai.name}</div>
                  <div className="w-full bg-slate-800/50 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        ai.ai_readiness_score >= 80
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                          : 'bg-gradient-to-r from-amber-500 to-orange-500'
                      }`}
                      style={{ width: `${ai.ai_readiness_score}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* AIs Grid */}
      {ais.length === 0 ? (
        <div className="bg-gradient-to-br from-slate-800/40 to-slate-900/40 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-16 text-center shadow-2xl">
          <div className="w-20 h-20 bg-slate-800/50 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Brain className="w-10 h-10 text-slate-600" />
          </div>
          <h3 className="text-xl font-medium text-white mb-2">No AIs Yet</h3>
          <p className="text-slate-400 mb-8 max-w-md mx-auto leading-relaxed">
            Start building a digital personality by creating your first AI. Answer daily questions to capture memories and essence.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-sky-600 hover:bg-sky-700 text-white rounded-xl transition-all shadow-lg shadow-sky-500/20 font-medium inline-flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Create Your First AI
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ais.map((ai) => (
            <div
              key={ai.id}
              className="group glass-card p-6 cursor-pointer"
              onClick={() => onSelectAI?.(ai.id)}
            >
              {/* Header */}
              <div className="flex items-start gap-4 mb-6">
                <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20 flex-shrink-0">
                  {ai.avatar_url ? (
                    <img src={ai.avatar_url} alt={ai.name} className="w-full h-full object-cover rounded-xl" />
                  ) : (
                    <User className="w-7 h-7 text-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-semibold text-white mb-2">{ai.name}</h3>
                  <p className="text-sm text-slate-200 leading-relaxed">{ai.description}</p>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Memories</span>
                  </div>
                  <div className="text-2xl font-semibold text-white">{ai.total_memories}<span className="text-base text-slate-400 font-normal">/50</span></div>
                </div>

                <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800/50">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Progress</span>
                  </div>
                  <div className={`text-2xl font-semibold ${ai.ai_readiness_score >= 80 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {ai.ai_readiness_score}%
                  </div>
                </div>
              </div>

              {/* Progress Bar with Milestone */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-white">
                    {ai.total_memories === 0 ? 'Ready to Start' : ai.ai_readiness_score >= 80 ? 'Activation Complete!' : 'Building Personality...'}
                  </span>
                  {ai.total_memories > 0 && ai.ai_readiness_score < 80 && (
                    <span className="text-xs text-emerald-400 font-medium">{50 - ai.total_memories} more to activate</span>
                  )}
                </div>
                <div className="w-full bg-slate-800/50 rounded-full h-3 overflow-hidden relative">
                  <div
                    className={`h-full transition-all duration-500 ${
                      ai.ai_readiness_score >= 80
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                        : 'bg-gradient-to-r from-amber-500 to-orange-500'
                    }`}
                    style={{ width: `${ai.ai_readiness_score}%` }}
                  ></div>
                  {/* Milestone marker at 50% */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 h-full w-0.5 bg-slate-600"></div>
                </div>
                <div className="flex justify-between mt-2 text-xs text-slate-500">
                  <span>Start</span>
                  <span className="text-slate-400">50 memories</span>
                  <span>Activated</span>
                </div>
              </div>

              {/* Fast-Track Upgrade Banner */}
              {!ai.is_ai_active && ai.ai_readiness_score >= 50 && ai.ai_readiness_score < 80 && (
                <div className="mb-4 p-4 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-xl">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-amber-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Zap className="w-4 h-4 text-amber-400" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-amber-300 mb-1">Fast-Track Available!</h4>
                      <p className="text-xs text-slate-400 mb-3">
                        Unlock chat access now at 50% readiness instead of waiting for 80%
                      </p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEngramForUpgrade(ai);
                          setShowFastTrackModal(true);
                        }}
                        className="px-3 py-1.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-lg text-xs font-medium transition-all shadow-lg shadow-amber-500/20 flex items-center gap-1.5"
                      >
                        <Crown className="w-3.5 h-3.5" />
                        Upgrade to Fast-Track
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Footer with prominent CTA */}
              <div className="space-y-3">
                {ai.total_memories === 0 ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectAI?.(ai.id);
                    }}
                    className="w-full px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2 group"
                    aria-label={`Start training ${ai.name}`}
                  >
                    Start Training {ai.name}
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                ) : ai.is_ai_active || ai.ai_readiness_score >= 80 ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectAI?.(ai.id);
                    }}
                    className="w-full px-6 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2"
                    aria-label={`Chat with ${ai.name}`}
                  >
                    <MessageCircle className="w-5 h-5" />
                    Chat with {ai.name}
                  </button>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectAI?.(ai.id);
                    }}
                    className="w-full px-6 py-3.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-amber-500/30 flex items-center justify-center gap-2 group"
                    aria-label={`Continue training ${ai.name}`}
                  >
                    Continue Training ({ai.total_memories}/50)
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                )}
                <div className="flex items-center justify-center gap-2 text-xs">
                  {ai.is_ai_active ? (
                    <>
                      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                      <span className="text-emerald-400 font-medium">Active & Ready</span>
                    </>
                  ) : ai.ai_readiness_score >= 80 ? (
                    <>
                      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                      <span className="text-emerald-400 font-medium">Ready to Activate</span>
                    </>
                  ) : (
                    <>
                      <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></div>
                      <span className="text-amber-300 font-medium">Training: {ai.ai_readiness_score}%</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

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
                    <div className={`flex-1 h-1.5 rounded-full transition-all ${
                      createStep === step ? 'bg-sky-500' :
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
                      className={`w-full bg-slate-900/50 border rounded-xl px-4 py-3 pr-10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-all ${
                        validationErrors.some(e => e.field === 'name') || nameExists
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
                    className={`w-full bg-slate-900/50 border rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-all resize-none ${
                      validationErrors.some(e => e.field === 'description')
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
    </div>
  );
}
