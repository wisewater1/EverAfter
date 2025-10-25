import React, { useState, useEffect, useCallback } from 'react';
import { Plus, User, Brain, TrendingUp, Calendar, Target, Zap, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ArchetypalAI {
  id: string;
  name: string;
  description: string;
  total_memories: number;
  training_status: string;
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
        .select('*')
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
      {/* Header Section */}
      <div className="bg-gradient-to-br from-slate-800/40 to-slate-900/40 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-8 shadow-2xl">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-sky-500 via-blue-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-sky-500/20">
              <Brain className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-light tracking-tight text-white mb-2">Archetypal AIs</h1>
              <p className="text-slate-400 max-w-2xl leading-relaxed">
                Create AI personalities by answering daily questions. Build their memories and essence to power autonomous AI agents.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl transition-all shadow-lg shadow-sky-500/20 font-medium flex items-center gap-2 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Create AI
          </button>
        </div>
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
                <div className="w-14 h-14 bg-gradient-to-br from-sky-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-sky-500/20 flex-shrink-0">
                  {ai.avatar_url ? (
                    <img src={ai.avatar_url} alt={ai.name} className="w-full h-full object-cover rounded-xl" />
                  ) : (
                    <User className="w-7 h-7 text-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-medium text-white mb-1">{ai.name}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed line-clamp-2">{ai.description}</p>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-4 h-4 text-sky-400" />
                    <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Memories</span>
                  </div>
                  <div className="text-2xl font-light text-white">{ai.total_memories}</div>
                </div>

                <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800/50">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Status</span>
                  </div>
                  <div className={`text-2xl font-light capitalize ${getStatusColor(ai.training_status)}`}>
                    {ai.training_status}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-700/50">
                <div className="flex items-center gap-2">
                  {ai.training_status === 'ready' ? (
                    <>
                      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                      <span className="text-sm text-emerald-400 font-medium">Ready</span>
                    </>
                  ) : (
                    <>
                      <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></div>
                      <span className="text-sm text-slate-400 capitalize">{ai.training_status}</span>
                    </>
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectAI?.(ai.id);
                  }}
                  className="text-sm text-sky-400 hover:text-sky-300 font-medium transition-colors flex items-center gap-1 group-hover:gap-2 duration-200"
                >
                  Answer Questions
                  <ArrowRight className="w-4 h-4" />
                </button>
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
    </div>
  );
}
