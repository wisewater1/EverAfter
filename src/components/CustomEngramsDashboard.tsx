import React, { useState, useEffect, useCallback } from 'react';
import { Brain, Sparkles, Loader, Target, AlertCircle, CheckCircle2, X, Crown, Zap } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { apiClient } from '../lib/api-client';
import type { EngramResponse } from '../types/database.types';
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

  const activeAIcount = ais.filter((ai) => ai.is_ai_active).length;
  const trainingCount = ais.filter((ai) => !ai.is_ai_active).length;
  const averageReadiness = ais.length
    ? Math.round(ais.reduce((sum, ai) => sum + (ai.ai_readiness_score || 0), 0) / ais.length)
    : 0;
  const totalAnswers = ais.reduce((sum, ai) => sum + (ai.total_questions_answered || 0), 0);

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
    <div className="space-y-5">
      <section className="glass-card p-5 sm:p-6">
        <div className="flex flex-col gap-4 border-b border-slate-800/60 pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/25 to-cyan-500/20 shadow-[0_0_24px_rgba(16,185,129,0.15)]">
                <Brain className="h-5 w-5 text-emerald-300" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white sm:text-xl">Engram Training Center</h3>
                <p className="text-sm text-slate-400">
                  Train, activate, and review your custom engrams without leaving the dashboard.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-200">
                {activeAIcount} active
              </span>
              <span className="rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1 text-xs font-medium text-sky-200">
                {trainingCount} training
              </span>
              <span className="rounded-full border border-violet-400/20 bg-violet-400/10 px-3 py-1 text-xs font-medium text-violet-200">
                {totalAnswers} answers logged
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setShowCreateModal(true)}
              className="ea-btn relative z-10"
            >
              <span className="relative z-10 flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Create Engram
              </span>
            </button>
            <button
              onClick={() => setShowOnboarding(true)}
              className="rounded-xl border border-slate-700/70 bg-slate-900/70 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-slate-600 hover:bg-slate-800/80 hover:text-white"
            >
              How it works
            </button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-800/70 bg-slate-900/65 p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Total Engrams</div>
            <div className="mt-2 text-2xl font-semibold text-white">{ais.length}</div>
          </div>
          <div className="rounded-2xl border border-slate-800/70 bg-slate-900/65 p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Average Readiness</div>
            <div className="mt-2 text-2xl font-semibold text-cyan-300">{averageReadiness}%</div>
          </div>
          <div className="rounded-2xl border border-slate-800/70 bg-slate-900/65 p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Ready To Chat</div>
            <div className="mt-2 text-2xl font-semibold text-emerald-300">{activeAIcount}</div>
          </div>
          <div className="rounded-2xl border border-slate-800/70 bg-slate-900/65 p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Memories Logged</div>
            <div className="mt-2 text-2xl font-semibold text-violet-300">{totalAnswers}</div>
          </div>
        </div>

        {ais.length === 0 ? (
          <div className="mt-5 rounded-3xl border border-dashed border-slate-700/60 bg-slate-950/45 px-6 py-12 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900/70 ring-1 ring-slate-800/70">
              <Brain className="h-8 w-8 text-slate-500" />
            </div>
            <h4 className="mt-5 text-xl font-semibold text-white">No custom engrams yet</h4>
            <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Create the first engram to start memory training, reach readiness milestones, and unlock
              saint-guided conversations from a real training history instead of an empty shell.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                onClick={() => setShowCreateModal(true)}
                className="ea-btn relative z-10"
              >
                <span className="relative z-10 flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Create your first engram
                </span>
              </button>
              <button
                onClick={() => setShowOnboarding(true)}
                className="rounded-xl border border-slate-700/70 bg-slate-900/70 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-slate-600 hover:bg-slate-800/80 hover:text-white"
              >
                View training guide
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {ais.map((ai) => {
              const readiness = Math.max(0, Math.min(100, ai.ai_readiness_score || 0));
              const isReady = ai.is_ai_active || readiness >= 50;
              const readinessTone = isReady
                ? 'from-emerald-400 to-cyan-400'
                : readiness >= 25
                  ? 'from-amber-400 to-orange-400'
                  : 'from-rose-400 to-pink-400';

              return (
                <div
                  key={ai.id}
                  className="rounded-3xl border border-slate-800/70 bg-slate-950/40 p-5 shadow-[0_18px_40px_rgba(2,6,23,0.24)]"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-lg font-semibold text-white">{ai.name}</h4>
                        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                          isReady
                            ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200'
                            : 'border-amber-400/20 bg-amber-400/10 text-amber-200'
                        }`}>
                          {isReady ? 'Ready' : 'Training'}
                        </span>
                        {ai.engram_type && (
                          <span className="rounded-full border border-slate-700/70 bg-slate-900/70 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-slate-400">
                            {ai.engram_type}
                          </span>
                        )}
                      </div>
                      <p className="text-sm leading-6 text-slate-400">
                        {ai.description || 'No description yet. Open the training flow to add identity, memories, and context.'}
                      </p>
                    </div>

                    <div className="min-w-[120px] rounded-2xl border border-slate-800/70 bg-slate-900/70 px-4 py-3">
                      <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Readiness</div>
                      <div className="mt-2 flex items-end gap-2">
                        <span className="text-2xl font-semibold text-white">{readiness}%</span>
                        <span className="pb-1 text-xs text-slate-400">{ai.total_questions_answered || 0} answers</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="h-2 overflow-hidden rounded-full bg-slate-900/80">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${readinessTone} transition-all`}
                        style={{ width: `${Math.max(readiness, 4)}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-2xl border border-slate-800/70 bg-slate-900/55 p-3">
                      <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Status</div>
                      <div className="mt-2 text-sm font-medium text-white">{ai.training_status || (isReady ? 'active' : 'in_progress')}</div>
                    </div>
                    <div className="rounded-2xl border border-slate-800/70 bg-slate-900/55 p-3">
                      <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Relationship</div>
                      <div className="mt-2 text-sm font-medium text-white">{ai.relationship || 'custom'}</div>
                    </div>
                    <div className="rounded-2xl border border-slate-800/70 bg-slate-900/55 p-3">
                      <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Archetype</div>
                      <div className="mt-2 text-sm font-medium text-white">{ai.archetype || 'custom'}</div>
                    </div>
                    <div className="rounded-2xl border border-slate-800/70 bg-slate-900/55 p-3">
                      <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Created</div>
                      <div className="mt-2 text-sm font-medium text-white">{new Date(ai.created_at).toLocaleDateString()}</div>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      onClick={() => setTrainingAI(ai)}
                      className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-2.5 text-sm font-medium text-cyan-100 transition hover:border-cyan-300/35 hover:bg-cyan-400/15"
                    >
                      Continue training
                    </button>
                    <button
                      onClick={() => onSelectAI?.(ai.id)}
                      className="rounded-xl border border-slate-700/70 bg-slate-900/70 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-slate-600 hover:bg-slate-800/80 hover:text-white"
                    >
                      Open engram
                    </button>
                    {!ai.is_ai_active && (
                      <button
                        onClick={() => {
                          setSelectedEngramForUpgrade(ai);
                          setShowFastTrackModal(true);
                        }}
                        className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-2.5 text-sm font-medium text-amber-100 transition hover:border-amber-300/35 hover:bg-amber-400/15"
                      >
                        Fast-track
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

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
