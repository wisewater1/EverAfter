import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Brain, LogOut, Settings, MessageCircle, Users, Calendar, Bot, Heart, Activity, ShoppingCart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import CustomEngramsDashboard from '../components/CustomEngramsDashboard';
import DailyQuestionCard from '../components/DailyQuestionCard';
import EngramChat from '../components/EngramChat';
import RaphaelHealthInterface from '../components/RaphaelHealthInterface';
import EngramTaskManager from '../components/EngramTaskManager';
import SaintsDashboard from '../components/SaintsDashboard';
import FamilyMembers from '../components/FamilyMembers';

interface ArchetypalAI {
  id: string;
  name: string;
  is_ai_active: boolean;
}

export default function Dashboard() {
  const { user, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const [selectedView, setSelectedView] = useState<'saints' | 'engrams' | 'questions' | 'chat' | 'tasks' | 'family' | 'health'>('saints');
  const [selectedAIId, setSelectedAIId] = useState<string | null>(null);
  const [archetypalAIs, setArchetypalAIs] = useState<ArchetypalAI[]>([]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const handleSelectAI = (aiId: string) => {
    setSelectedAIId(aiId);
    setSelectedView('questions');
  };

  const loadArchetypalAIs = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('archetypal_ais')
        .select('id, name, is_ai_active')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading archetypal AIs:', error);
        return;
      }

      setArchetypalAIs(data || []);
    } catch (error) {
      console.error('Error loading archetypal AIs:', error);
    }
  }, [user?.id]);

  useEffect(() => {
    loadArchetypalAIs();
  }, [loadArchetypalAIs]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-slate-700 border-t-emerald-500 rounded-full animate-spin"></div>
          <p className="text-slate-400 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    navigate('/login');
    return null;
  }

  const navItems = [
    { id: 'saints', label: 'Saints AI', icon: Heart },
    { id: 'engrams', label: 'Engrams', icon: Bot },
    { id: 'questions', label: 'Questions', icon: Calendar },
    { id: 'chat', label: 'Chat', icon: MessageCircle },
    { id: 'tasks', label: 'Tasks', icon: Settings },
    { id: 'family', label: 'Family', icon: Users },
    { id: 'health', label: 'Health', icon: Activity },
  ];

  const handleNavigateToLegacy = () => {
    navigate('/digital-legacy');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-2xl border-b border-slate-800/50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 via-teal-500 to-sky-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <Brain className="w-5 h-5 text-white" />
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-slate-950"></div>
              </div>
              <div>
                <h1 className="text-lg font-medium text-white tracking-tight">EverAfter AI</h1>
                <p className="text-xs text-slate-500">{user?.email || 'Loading...'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/marketplace')}
                className="px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-xl transition-all flex items-center gap-2 text-sm font-medium shadow-lg shadow-amber-500/20"
              >
                <ShoppingCart className="w-4 h-4" />
                <span className="hidden sm:inline">Marketplace</span>
              </button>
              <button
                onClick={handleSignOut}
                className="px-4 py-2 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600 text-slate-300 hover:text-white rounded-xl transition-all flex items-center gap-2 text-sm font-medium"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="sticky top-[73px] z-40 bg-slate-950/60 backdrop-blur-2xl border-b border-slate-800/30">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex gap-1 overflow-x-auto scrollbar-hide">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = selectedView === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => setSelectedView(item.id as any)}
                  className={`group relative px-4 py-3.5 text-sm font-medium transition-all whitespace-nowrap flex items-center gap-2 ${
                    isActive
                      ? 'text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Icon className={`w-4 h-4 transition-colors ${isActive ? 'text-emerald-400' : 'text-slate-500 group-hover:text-slate-400'}`} />
                  <span>{item.label}</span>
                  {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500"></div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {selectedView === 'saints' && (
          <SaintsDashboard
            onOpenHealthMonitor={() => setSelectedView('health')}
          />
        )}
        {selectedView === 'engrams' && (
          <CustomEngramsDashboard userId={user.id} onSelectAI={handleSelectAI} />
        )}
        {selectedView === 'questions' && (
          <DailyQuestionCard userId={user.id} preselectedAIId={selectedAIId || undefined} />
        )}
        {selectedView === 'chat' && (
          <EngramChat engrams={archetypalAIs} userId={user.id} />
        )}
        {selectedView === 'tasks' && (
          <EngramTaskManager engrams={archetypalAIs} userId={user.id} />
        )}
        {selectedView === 'family' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-2xl p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                    <Heart className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-white mb-1">Digital Legacy</h3>
                    <p className="text-sm text-slate-400">Preserve memories and messages for future generations</p>
                  </div>
                </div>
                <button
                  onClick={handleNavigateToLegacy}
                  className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl transition-all shadow-lg shadow-purple-500/20 font-medium whitespace-nowrap"
                >
                  Open Legacy Vault
                </button>
              </div>
            </div>
            <FamilyMembers userId={user.id} />
          </div>
        )}
        {selectedView === 'health' && (
          <RaphaelHealthInterface />
        )}
      </main>
    </div>
  );
}
