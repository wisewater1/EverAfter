import React, { useState, useEffect } from 'react';
import { Brain, Plus, MessageCircle, Trash2, Sparkles, User, Zap, Activity, TrendingUp } from 'lucide-react';
import { supabase } from '../lib/supabase';
import CustomEngramCreator from './CustomEngramCreator';
import EngramChat from './EngramChat';

interface CustomEngramsDashboardProps {
  userId: string;
}

interface CustomEngram {
  id: string;
  name: string;
  description: string;
  personality_traits: Record<string, any>;
  total_memories: number;
  training_status: 'untrained' | 'training' | 'ready';
  created_at: string;
}

export default function CustomEngramsDashboard({ userId }: CustomEngramsDashboardProps) {
  const [view, setView] = useState<'list' | 'create' | 'chat'>('list');
  const [customEngrams, setCustomEngrams] = useState<CustomEngram[]>([]);
  const [selectedEngram, setSelectedEngram] = useState<CustomEngram | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCustomEngrams();
  }, [userId]);

  const loadCustomEngrams = async () => {
    try {
      const { data, error } = await supabase
        .from('archetypal_ais')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCustomEngrams(data || []);
    } catch (error) {
      console.error('Error loading custom engrams:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateComplete = () => {
    loadCustomEngrams();
    setView('list');
  };

  const handleDeleteEngram = async (engramId: string) => {
    if (!confirm('Are you sure you want to delete this Custom Engram? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('archetypal_ais')
        .delete()
        .eq('id', engramId);

      if (error) throw error;
      loadCustomEngrams();
    } catch (error) {
      console.error('Error deleting engram:', error);
      alert('Failed to delete Custom Engram. Please try again.');
    }
  };

  const handleChatWithEngram = (engram: CustomEngram) => {
    setSelectedEngram(engram);
    setView('chat');
  };

  if (view === 'create') {
    return (
      <CustomEngramCreator
        userId={userId}
        onComplete={handleCreateComplete}
        onCancel={() => setView('list')}
      />
    );
  }

  if (view === 'chat' && selectedEngram) {
    return (
      <EngramChat
        engramId={selectedEngram.id}
        engramName={selectedEngram.name}
        userId={userId}
        onBack={() => {
          setView('list');
          setSelectedEngram(null);
        }}
      />
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready':
        return 'from-emerald-500 to-green-600';
      case 'training':
        return 'from-amber-500 to-orange-600';
      default:
        return 'from-slate-500 to-gray-600';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ready':
        return 'bg-emerald-900/30 text-emerald-400 border-emerald-700/50';
      case 'training':
        return 'bg-amber-900/30 text-amber-400 border-amber-700/50';
      default:
        return 'bg-slate-700 text-slate-400 border-slate-600';
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="bg-gradient-to-br from-gray-800 via-gray-800 to-blue-900/20 rounded-2xl shadow-2xl border border-gray-700/50 p-8 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-5">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl blur-xl opacity-50"></div>
              <div className="relative w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl">
                <Brain className="w-8 h-8 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-light text-white mb-1">Custom Engrams</h1>
              <p className="text-gray-400">Create autonomous AI versions based on real people</p>
            </div>
          </div>
          <button
            onClick={() => setView('create')}
            className="group relative px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all flex items-center gap-2 shadow-lg hover:shadow-blue-500/25"
          >
            <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
            <span className="font-medium">Create New Engram</span>
          </button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="bg-gradient-to-br from-blue-900/30 to-blue-800/20 rounded-xl p-5 border border-blue-700/30">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-blue-600/20 rounded-lg flex items-center justify-center">
                <Brain className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <div className="text-2xl font-light text-white">{customEngrams.length}</div>
                <div className="text-sm text-blue-300">Total Engrams</div>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-emerald-900/30 to-emerald-800/20 rounded-xl p-5 border border-emerald-700/30">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-emerald-600/20 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <div className="text-2xl font-light text-white">
                  {customEngrams.filter(e => e.training_status === 'ready').length}
                </div>
                <div className="text-sm text-emerald-300">Active & Ready</div>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-purple-900/30 to-purple-800/20 rounded-xl p-5 border border-purple-700/30">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-purple-600/20 rounded-lg flex items-center justify-center">
                <Activity className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <div className="text-2xl font-light text-white">
                  {customEngrams.reduce((sum, e) => sum + e.total_memories, 0)}
                </div>
                <div className="text-sm text-purple-300">Training Responses</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Engrams List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="relative">
            <div className="absolute inset-0 bg-blue-500 rounded-full blur-2xl opacity-20 animate-pulse"></div>
            <Sparkles className="relative w-10 h-10 text-blue-400 animate-spin" />
          </div>
        </div>
      ) : customEngrams.length === 0 ? (
        <div className="bg-gradient-to-br from-gray-800 via-gray-800 to-blue-900/20 rounded-2xl border border-gray-700/50 p-16 text-center backdrop-blur-sm">
          <div className="relative inline-block mb-6">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl blur-2xl opacity-30"></div>
            <div className="relative w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl flex items-center justify-center">
              <Brain className="w-12 h-12 text-white" />
            </div>
          </div>
          <h3 className="text-3xl font-light text-white mb-4">No Custom Engrams Yet</h3>
          <p className="text-gray-400 mb-8 max-w-lg mx-auto leading-relaxed">
            Create your first Custom Engram by training an AI on personality traits, communication style,
            and unique characteristics. Build digital versions of yourself or family members that can
            interact authentically.
          </p>
          <button
            onClick={() => setView('create')}
            className="group relative px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all inline-flex items-center gap-3 shadow-lg hover:shadow-blue-500/25"
          >
            <Plus className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" />
            <span className="font-medium text-lg">Create Your First Engram</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {customEngrams.map((engram) => (
            <div
              key={engram.id}
              className="group bg-gradient-to-br from-gray-800 via-gray-800 to-gray-900 rounded-2xl border border-gray-700/50 p-6 hover:border-blue-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/10"
            >
              <div className="flex items-start justify-between mb-5">
                <div className="flex items-center gap-4 flex-1">
                  <div className={`relative w-14 h-14 bg-gradient-to-br ${getStatusColor(engram.training_status)} rounded-xl flex items-center justify-center shadow-lg`}>
                    <User className="w-7 h-7 text-white" />
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-gray-800 animate-pulse"></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-medium text-white truncate group-hover:text-blue-400 transition-colors">
                      {engram.name}
                    </h3>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border mt-1 ${getStatusBadge(engram.training_status)}`}>
                      <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse"></div>
                      {engram.training_status.charAt(0).toUpperCase() + engram.training_status.slice(1)}
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-sm text-gray-400 mb-5 line-clamp-2 leading-relaxed">
                {engram.description}
              </p>

              <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="bg-gray-900/50 rounded-xl p-3 border border-gray-700/30">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
                    <div className="text-xl font-light text-white">{engram.total_memories}</div>
                  </div>
                  <div className="text-xs text-gray-500">Training Data</div>
                </div>
                <div className="bg-gray-900/50 rounded-xl p-3 border border-gray-700/30">
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    <div className="text-xl font-light text-white">
                      {Object.keys(engram.personality_traits || {}).length}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">Trait Groups</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleChatWithEngram(engram)}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all flex items-center justify-center gap-2 text-sm font-medium shadow-lg hover:shadow-blue-500/25"
                >
                  <MessageCircle className="w-4 h-4" />
                  Interact
                </button>
                <button
                  onClick={() => handleDeleteEngram(engram.id)}
                  className="px-3 py-2.5 bg-gray-700/50 text-gray-400 rounded-lg hover:bg-red-900/30 hover:text-red-400 hover:border-red-500/30 transition-all border border-gray-600/30"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Information Panel */}
      <div className="bg-gradient-to-br from-blue-900/20 via-purple-900/20 to-blue-900/20 border border-blue-700/30 rounded-2xl p-8 backdrop-blur-sm">
        <div className="flex items-start gap-5">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-medium text-white mb-3">About Custom Engrams</h3>
            <p className="text-blue-200 mb-4 leading-relaxed">
              Custom Engrams are autonomous AI entities trained on personality traits, communication patterns,
              and personal characteristics. They provide an interactive way to preserve and experience unique
              personalities through natural conversation.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-blue-300 mb-2">Training Process:</h4>
                <ul className="text-sm text-blue-200/80 space-y-1.5">
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 flex-shrink-0"></div>
                    <span>Answer 20 questions across 6 personality categories</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 flex-shrink-0"></div>
                    <span>Provide detailed responses to capture nuances</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 flex-shrink-0"></div>
                    <span>AI becomes ready after 10+ quality responses</span>
                  </li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-blue-300 mb-2">Capabilities:</h4>
                <ul className="text-sm text-blue-200/80 space-y-1.5">
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5 flex-shrink-0"></div>
                    <span>Context-aware responses based on training</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5 flex-shrink-0"></div>
                    <span>Natural conversation mimicking speech patterns</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5 flex-shrink-0"></div>
                    <span>Preserves unique personality characteristics</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
