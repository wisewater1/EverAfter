import React, { useState, useEffect } from 'react';
import { Brain, Plus, MessageCircle, Trash2, Sparkles, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import AIPersonalityCreator from './AIPersonalityCreator';
import AIChat from './AIChat';

interface AIPersonalityDashboardProps {
  userId: string;
}

interface AIPersonality {
  id: string;
  name: string;
  description: string;
  personality_traits: Record<string, any>;
  total_memories: number;
  training_status: 'untrained' | 'training' | 'ready';
  created_at: string;
}

export default function AIPersonalityDashboard({ userId }: AIPersonalityDashboardProps) {
  const [view, setView] = useState<'list' | 'create' | 'chat'>('list');
  const [aiPersonalities, setAiPersonalities] = useState<AIPersonality[]>([]);
  const [selectedAI, setSelectedAI] = useState<AIPersonality | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAIPersonalities();
  }, [userId]);

  const loadAIPersonalities = async () => {
    try {
      const { data, error } = await supabase
        .from('archetypal_ais')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAiPersonalities(data || []);
    } catch (error) {
      console.error('Error loading AI personalities:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateComplete = () => {
    loadAIPersonalities();
    setView('list');
  };

  const handleDeleteAI = async (aiId: string) => {
    if (!confirm('Are you sure you want to delete this AI personality? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('archetypal_ais')
        .delete()
        .eq('id', aiId);

      if (error) throw error;
      loadAIPersonalities();
    } catch (error) {
      console.error('Error deleting AI:', error);
      alert('Failed to delete AI personality. Please try again.');
    }
  };

  const handleChatWithAI = (ai: AIPersonality) => {
    setSelectedAI(ai);
    setView('chat');
  };

  if (view === 'create') {
    return (
      <AIPersonalityCreator
        userId={userId}
        onComplete={handleCreateComplete}
        onCancel={() => setView('list')}
      />
    );
  }

  if (view === 'chat' && selectedAI) {
    return (
      <AIChat
        aiId={selectedAI.id}
        aiName={selectedAI.name}
        userId={userId}
        onBack={() => {
          setView('list');
          setSelectedAI(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-light text-white">AI Personalities</h2>
            <p className="text-slate-400 mt-1">Create and interact with AI versions based on real people</p>
          </div>
        </div>
        <button
          onClick={() => setView('create')}
          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Create New AI
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Sparkles className="w-8 h-8 text-blue-400 animate-spin" />
        </div>
      ) : aiPersonalities.length === 0 ? (
        <div className="bg-slate-800 rounded-2xl border border-slate-700 p-12 text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Brain className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-2xl font-light text-white mb-3">No AI Personalities Yet</h3>
          <p className="text-slate-400 mb-6 max-w-md mx-auto">
            Create your first AI personality by answering questions about yourself or a family member.
            The AI will learn to respond in their unique style.
          </p>
          <button
            onClick={() => setView('create')}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all inline-flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Create Your First AI
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {aiPersonalities.map((ai) => (
            <div
              key={ai.id}
              className="bg-slate-800 rounded-xl border border-slate-700 p-6 hover:border-blue-500 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-white">{ai.name}</h3>
                    <span
                      className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                        ai.training_status === 'ready'
                          ? 'bg-green-900/30 text-green-400'
                          : ai.training_status === 'training'
                          ? 'bg-yellow-900/30 text-yellow-400'
                          : 'bg-slate-700 text-slate-400'
                      }`}
                    >
                      {ai.training_status.charAt(0).toUpperCase() + ai.training_status.slice(1)}
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-sm text-slate-400 mb-4 line-clamp-2">{ai.description}</p>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-slate-700/50 rounded-lg p-3">
                  <div className="text-xl font-light text-white">{ai.total_memories}</div>
                  <div className="text-xs text-slate-400">Memories</div>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-3">
                  <div className="text-xl font-light text-white">
                    {Object.keys(ai.personality_traits || {}).length}
                  </div>
                  <div className="text-xs text-slate-400">Traits</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleChatWithAI(ai)}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 text-sm"
                >
                  <MessageCircle className="w-4 h-4" />
                  Chat
                </button>
                <button
                  onClick={() => handleDeleteAI(ai.id)}
                  className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-red-900/30 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-blue-900/30 border border-blue-700/50 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-white mb-2">How AI Personalities Work</h3>
            <p className="text-sm text-blue-200 mb-3">
              Each AI personality learns from the answers you provide during the training process.
              The more detailed your responses, the more accurately the AI will capture the unique
              communication style and personality traits of the person it represents.
            </p>
            <ul className="text-sm text-blue-200 space-y-1">
              <li>• Answer 20 training questions to create a personality profile</li>
              <li>• The AI uses your responses to generate contextual replies</li>
              <li>• Chat with the AI to experience their unique perspective</li>
              <li>• Perfect for preserving family member personalities and memories</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
