import React, { useState, useEffect } from 'react';
import { Plus, User, Brain, Sparkles, TrendingUp, Calendar, Target, Zap } from 'lucide-react';
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

  useEffect(() => {
    loadAIs();
  }, [userId]);

  const loadAIs = async () => {
    try {
      const { data, error } = await supabase
        .from('archetypal_ais')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAIs(data || []);
    } catch (error) {
      console.error('Error loading AIs:', error);
    } finally {
      setLoading(false);
    }
  };

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
    if (status === 'ready') return 'text-green-400';
    if (status === 'training') return 'text-yellow-400';
    return 'text-gray-400';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-gray-400">Loading AIs...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-gray-800 via-gray-800 to-blue-900/20 rounded-2xl shadow-2xl border border-gray-700/50 p-8 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-3xl font-light text-white">Archetypal AIs</h2>
            </div>
            <p className="text-gray-400 leading-relaxed max-w-2xl">
              Create AI personalities by answering daily questions.
              Build their memories and essence to power autonomous AI agents.
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-blue-500/25 font-medium flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Create AI
          </button>
        </div>
      </div>

      {/* AIs Grid */}
      {ais.length === 0 ? (
        <div className="bg-gray-800 rounded-2xl shadow-lg border border-gray-700/50 p-12 text-center">
          <Brain className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-light text-white mb-2">No AIs Yet</h3>
          <p className="text-gray-400 mb-6 max-w-md mx-auto">
            Start building a digital personality by creating your first AI. Answer daily questions to capture memories and essence.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg font-medium inline-flex items-center gap-2"
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
              className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl shadow-xl border border-gray-700/50 p-6 backdrop-blur-sm hover:border-blue-500/50 transition-all duration-300 cursor-pointer group"
              onClick={() => onSelectAI?.(ai.id)}
            >
              {/* Avatar and Header */}
              <div className="flex items-start gap-4 mb-4">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-teal-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                  {ai.avatar_url ? (
                    <img src={ai.avatar_url} alt={ai.name} className="w-full h-full object-cover rounded-xl" />
                  ) : (
                    <User className="w-7 h-7 text-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-medium text-white truncate">{ai.name}</h3>
                  <p className="text-sm text-gray-400 line-clamp-2">{ai.description}</p>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/30">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="w-4 h-4 text-blue-400" />
                    <span className="text-xs text-gray-400">Memories</span>
                  </div>
                  <div className="text-xl font-light text-white">{ai.total_memories}</div>
                </div>
                <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/30">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="w-4 h-4 text-teal-400" />
                    <span className="text-xs text-gray-400">Status</span>
                  </div>
                  <div className={`text-xl font-light capitalize ${getStatusColor(ai.training_status)}`}>
                    {ai.training_status}
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg border border-gray-700/30">
                <div className="flex items-center gap-2">
                  {ai.training_status === 'ready' ? (
                    <>
                      <Zap className="w-4 h-4 text-green-400" />
                      <span className="text-sm text-green-400 font-medium">Ready</span>
                    </>
                  ) : (
                    <>
                      <Target className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-400 capitalize">{ai.training_status}</span>
                    </>
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectAI?.(ai.id);
                  }}
                  className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors"
                >
                  Answer Questions →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl shadow-2xl border border-gray-700/50 p-8 max-w-lg w-full">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-teal-600 rounded-xl flex items-center justify-center">
                <Plus className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-2xl font-light text-white">Create New AI</h3>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Name *</label>
                <input
                  type="text"
                  value={newAI.name}
                  onChange={(e) => setNewAI({ ...newAI, name: e.target.value })}
                  placeholder="e.g., My Digital Self, Personal Assistant"
                  className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Description (Optional)</label>
                <textarea
                  value={newAI.description}
                  onChange={(e) => setNewAI({ ...newAI, description: e.target.value })}
                  placeholder="Brief description of this AI personality..."
                  rows={3}
                  className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-6 py-3 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-all font-medium"
              >
                Cancel
              </button>
              <button
                onClick={createAI}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg font-medium"
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
