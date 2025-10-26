import React, { useState, useEffect, useCallback } from 'react';
import { Plus, User, Brain, TrendingUp, Calendar, ArrowRight, Zap, Crown, Sparkles, Loader, MessageCircle, HelpCircle, Clock, Target } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { updateAIPersonalityProfile } from '../lib/archetypal-ai-helpers';

interface ArchetypalAI {
  id: string;
  name: string;
  description: string;
  total_memories: number;
  training_status: string;
  is_ai_active: boolean;
  ai_readiness_score: number;
  avatar_url?: string;
  created_at: string;
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
  });
  const [showFastTrackModal, setShowFastTrackModal] = useState(false);
  const [selectedEngramForUpgrade, setSelectedEngramForUpgrade] = useState<ArchetypalAI | null>(null);
  const [purchasingFastTrack, setPurchasingFastTrack] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem('archetypal_ai_onboarding_seen');
    if (!hasSeenOnboarding && !loading) {
      setShowOnboarding(true);
    }
  }, [loading]);

  const dismissOnboarding = () => {
    localStorage.setItem('archetypal_ai_onboarding_seen', 'true');
    setShowOnboarding(false);
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
    if (!newAI.name) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('archetypal_ais')
        .insert([{
          user_id: userId,
          name: newAI.name,
          description: newAI.description,
        }])
        .select()
        .single();

      if (error) throw error;

      setAIs([data, ...ais]);
      setShowCreateModal(false);
      setNewAI({ name: '', description: '' });
    } catch (error) {
      console.error('Error creating AI:', error);
      alert('Failed to create AI. Please try again.');
    }
  };

  const getStatusColor = (status: string) => {
    if (status === 'ready') return 'text-emerald-400';
    if (status === 'training') return 'text-amber-400';
    return 'text-slate-400';
  };

  const getStatusBgColor = (status: string) => {
    if (status === 'ready') return 'bg-emerald-500/10 border-emerald-500/20';
    if (status === 'training') return 'bg-amber-500/10 border-amber-500/20';
    return 'bg-slate-500/10 border-slate-500/20';
  };

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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {ais.map((ai) => (
            <div
              key={ai.id}
              className="group bg-gradient-to-br from-slate-800/40 to-slate-900/40 backdrop-blur-xl rounded-2xl border border-slate-700/50 hover:border-slate-600/50 p-6 shadow-xl transition-all duration-300 cursor-pointer"
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

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/50 p-8 max-w-lg w-full">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-gradient-to-br from-sky-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-sky-500/20">
                <Plus className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-2xl font-light text-white">Create New AI</h3>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-3">Name *</label>
                <input
                  type="text"
                  value={newAI.name}
                  onChange={(e) => setNewAI({ ...newAI, name: e.target.value })}
                  placeholder="e.g., My Digital Self, Personal Assistant"
                  className="w-full bg-slate-900/50 border border-slate-700 hover:border-slate-600 focus:border-sky-500 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-3">Description (Optional)</label>
                <textarea
                  value={newAI.description}
                  onChange={(e) => setNewAI({ ...newAI, description: e.target.value })}
                  placeholder="Brief description of this AI personality..."
                  rows={4}
                  className="w-full bg-slate-900/50 border border-slate-700 hover:border-slate-600 focus:border-sky-500 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition-all resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-6 py-3 bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 hover:border-slate-600 text-slate-300 hover:text-white rounded-xl transition-all font-medium"
              >
                Cancel
              </button>
              <button
                onClick={createAI}
                className="flex-1 px-6 py-3 bg-sky-600 hover:bg-sky-700 text-white rounded-xl transition-all shadow-lg shadow-sky-500/20 font-medium"
              >
                Create AI
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Onboarding Modal */}
      {showOnboarding && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-emerald-500/30 p-8 max-w-2xl w-full">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <Brain className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-semibold text-white mb-1">Welcome to Archetypal AIs!</h3>
                <p className="text-sm text-emerald-400 font-medium">Build AI personalities through daily questions</p>
              </div>
            </div>

            <div className="space-y-6 mb-8">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-lg font-bold text-emerald-400">1</span>
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-white mb-2">Choose Your AI</h4>
                  <p className="text-slate-300 leading-relaxed">
                    Select between different AI personalities like Dante (philosophical guide) or Jamal (financial advisor).
                    You can train multiple AIs based on your needs.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-lg font-bold text-emerald-400">2</span>
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-white mb-2">Answer Daily Questions</h4>
                  <p className="text-slate-300 leading-relaxed">
                    Each answer becomes a "memory" that shapes their personality. Answer 50 questions to build a complete personality profile.
                    <span className="block mt-2 text-emerald-400 font-medium">Takes just ~5 minutes per day</span>
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-lg font-bold text-emerald-400">3</span>
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-white mb-2">Activate & Chat</h4>
                  <p className="text-slate-300 leading-relaxed">
                    After 50 memories, your AI activates and you can start conversations! They'll remember everything you've shared
                    and respond in a way that reflects your unique personality and values.
                  </p>
                </div>
              </div>

              <div className="mt-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                <div className="flex items-start gap-3">
                  <Target className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h5 className="text-sm font-semibold text-amber-300 mb-1">Your 50-Day Journey</h5>
                    <p className="text-xs text-slate-300">
                      Most users complete activation in 6-8 weeks. You can go at your own pace—there's no rush!
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={dismissOnboarding}
              className="w-full px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all shadow-lg shadow-emerald-500/20 font-semibold"
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
