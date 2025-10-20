import React, { useState, useEffect } from 'react';
import { Plus, User, Brain, Sparkles, TrendingUp, Calendar, Target, Zap } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Engram {
  id: string;
  name: string;
  relationship: string;
  engram_type: 'family_member' | 'custom';
  description: string;
  total_questions_answered: number;
  ai_readiness_score: number;
  is_ai_active: boolean;
  avatar_url?: string;
  created_at: string;
}

interface EngramProgress {
  current_day: number;
  total_responses: number;
  streak_days: number;
  last_response_date: string;
}

interface CustomEngramsDashboardProps {
  userId: string;
  onSelectEngram?: (engramId: string) => void;
}

export default function CustomEngramsDashboard({ userId, onSelectEngram }: CustomEngramsDashboardProps) {
  const [engrams, setEngrams] = useState<Engram[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newEngram, setNewEngram] = useState({
    name: '',
    relationship: '',
    engram_type: 'custom' as 'family_member' | 'custom',
    description: '',
  });

  useEffect(() => {
    loadEngrams();
  }, [userId]);

  const loadEngrams = async () => {
    try {
      const { data, error } = await supabase
        .from('engrams')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEngrams(data || []);
    } catch (error) {
      console.error('Error loading engrams:', error);
    } finally {
      setLoading(false);
    }
  };

  const createEngram = async () => {
    if (!newEngram.name || !newEngram.relationship) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('engrams')
        .insert([{
          user_id: userId,
          name: newEngram.name,
          relationship: newEngram.relationship,
          engram_type: newEngram.engram_type,
          description: newEngram.description,
        }])
        .select()
        .single();

      if (error) throw error;

      setEngrams([data, ...engrams]);
      setShowCreateModal(false);
      setNewEngram({ name: '', relationship: '', engram_type: 'custom', description: '' });
    } catch (error) {
      console.error('Error creating engram:', error);
      alert('Failed to create engram. Please try again.');
    }
  };

  const getReadinessColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 50) return 'text-yellow-400';
    return 'text-gray-400';
  };

  const getReadinessLabel = (score: number) => {
    if (score >= 80) return 'Ready';
    if (score >= 50) return 'In Progress';
    return 'Getting Started';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-gray-400">Loading engrams...</div>
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
              <h2 className="text-3xl font-light text-white">Custom Engrams</h2>
            </div>
            <p className="text-gray-400 leading-relaxed max-w-2xl">
              Create digital representations of loved ones by answering daily questions.
              Build their personality, memories, and essence to eventually power autonomous AI agents.
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-blue-500/25 font-medium flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Create Engram
          </button>
        </div>
      </div>

      {/* Engrams Grid */}
      {engrams.length === 0 ? (
        <div className="bg-gray-800 rounded-2xl shadow-lg border border-gray-700/50 p-12 text-center">
          <Brain className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-light text-white mb-2">No Engrams Yet</h3>
          <p className="text-gray-400 mb-6 max-w-md mx-auto">
            Start building a digital legacy by creating your first engram. Answer daily questions to capture personality, memories, and essence.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg font-medium inline-flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Create Your First Engram
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {engrams.map((engram) => (
            <div
              key={engram.id}
              className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl shadow-xl border border-gray-700/50 p-6 backdrop-blur-sm hover:border-blue-500/50 transition-all duration-300 cursor-pointer group"
              onClick={() => onSelectEngram?.(engram.id)}
            >
              {/* Avatar and Header */}
              <div className="flex items-start gap-4 mb-4">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-teal-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                  {engram.avatar_url ? (
                    <img src={engram.avatar_url} alt={engram.name} className="w-full h-full object-cover rounded-xl" />
                  ) : (
                    <User className="w-7 h-7 text-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-medium text-white truncate">{engram.name}</h3>
                  <p className="text-sm text-gray-400">{engram.relationship}</p>
                  <span className={`inline-flex items-center gap-1 mt-1 text-xs px-2 py-0.5 rounded-full ${
                    engram.engram_type === 'family_member'
                      ? 'bg-green-900/30 text-green-400 border border-green-500/30'
                      : 'bg-blue-900/30 text-blue-400 border border-blue-500/30'
                  }`}>
                    {engram.engram_type === 'family_member' ? 'Family' : 'Custom'}
                  </span>
                </div>
              </div>

              {/* Description */}
              {engram.description && (
                <p className="text-sm text-gray-400 mb-4 line-clamp-2">{engram.description}</p>
              )}

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/30">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="w-4 h-4 text-blue-400" />
                    <span className="text-xs text-gray-400">Questions</span>
                  </div>
                  <div className="text-xl font-light text-white">{engram.total_questions_answered}</div>
                </div>
                <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/30">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="w-4 h-4 text-teal-400" />
                    <span className="text-xs text-gray-400">Readiness</span>
                  </div>
                  <div className={`text-xl font-light ${getReadinessColor(engram.ai_readiness_score)}`}>
                    {engram.ai_readiness_score}%
                  </div>
                </div>
              </div>

              {/* AI Status */}
              <div className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg border border-gray-700/30">
                <div className="flex items-center gap-2">
                  {engram.is_ai_active ? (
                    <>
                      <Zap className="w-4 h-4 text-green-400" />
                      <span className="text-sm text-green-400 font-medium">AI Active</span>
                    </>
                  ) : (
                    <>
                      <Target className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-400">{getReadinessLabel(engram.ai_readiness_score)}</span>
                    </>
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectEngram?.(engram.id);
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
              <h3 className="text-2xl font-light text-white">Create New Engram</h3>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Name *</label>
                <input
                  type="text"
                  value={newEngram.name}
                  onChange={(e) => setNewEngram({ ...newEngram, name: e.target.value })}
                  placeholder="e.g., Grandma Rose, Uncle John"
                  className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Relationship *</label>
                <input
                  type="text"
                  value={newEngram.relationship}
                  onChange={(e) => setNewEngram({ ...newEngram, relationship: e.target.value })}
                  placeholder="e.g., Grandmother, Friend, Mentor"
                  className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Type</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setNewEngram({ ...newEngram, engram_type: 'family_member' })}
                    className={`py-3 px-4 rounded-lg border transition-all ${
                      newEngram.engram_type === 'family_member'
                        ? 'bg-green-600/20 border-green-500 text-green-400'
                        : 'bg-gray-900/50 border-gray-700 text-gray-400 hover:border-gray-600'
                    }`}
                  >
                    Family Member
                  </button>
                  <button
                    onClick={() => setNewEngram({ ...newEngram, engram_type: 'custom' })}
                    className={`py-3 px-4 rounded-lg border transition-all ${
                      newEngram.engram_type === 'custom'
                        ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                        : 'bg-gray-900/50 border-gray-700 text-gray-400 hover:border-gray-600'
                    }`}
                  >
                    Custom AI
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Description (Optional)</label>
                <textarea
                  value={newEngram.description}
                  onChange={(e) => setNewEngram({ ...newEngram, description: e.target.value })}
                  placeholder="Brief description of this person or AI..."
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
                onClick={createEngram}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg font-medium"
              >
                Create Engram
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
