import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useConnections } from '../contexts/ConnectionsContext';
import { Brain, LogOut, Settings, MessageCircle, Users, Calendar, Bot, Heart, Activity, ShoppingCart, Sparkles, Link2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import FamilyEngrams from '../components/FamilyEngrams';
import CustomEngramsDashboard from '../components/CustomEngramsDashboard';
import RaphaelHealthInterface from '../components/RaphaelHealthInterface';
import UnifiedActivityCenter from '../components/UnifiedActivityCenter';
import UnifiedFamilyInterface from '../components/UnifiedFamilyInterface';
import UnifiedChatInterface from '../components/UnifiedChatInterface';
import SaintsNavigation from '../components/SaintsNavigation';

interface ArchetypalAI {
  id: string;
  name: string;
  is_ai_active: boolean;
}

export default function Dashboard() {
  const { user, signOut, loading } = useAuth();
  const { openConnectionsPanel, getActiveConnectionsCount } = useConnections();
  const navigate = useNavigate();
  const [selectedView, setSelectedView] = useState<'family' | 'activities' | 'engrams' | 'chat'>('family');
  const [selectedAIId, setSelectedAIId] = useState<string | null>(null);
  const [archetypalAIs, setArchetypalAIs] = useState<ArchetypalAI[]>([]);

  const activeConnectionsCount = getActiveConnectionsCount();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const handleSelectAI = (aiId: string) => {
    setSelectedAIId(aiId);
    setSelectedView('family');
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
    { id: 'family', label: 'Family', icon: Users },
    { id: 'activities', label: 'Activities', icon: Activity },
    { id: 'engrams', label: 'Engrams', icon: Bot },
    { id: 'chat', label: 'Chat', icon: MessageCircle },
  ];

  const handleNavigateToLegacy = () => {
    navigate('/legacy-vault');
  };

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col">
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
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/legacy-vault')}
                className="relative px-4 py-2 bg-slate-900/40 backdrop-blur-xl border border-purple-500/30 hover:border-purple-400/50 text-white rounded-xl transition-all flex items-center gap-2 text-sm font-medium shadow-lg shadow-purple-500/10 hover:shadow-purple-500/30 hover:bg-slate-900/60 group overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 to-pink-600/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <Heart className="w-4 h-4 relative z-10 text-purple-400 group-hover:text-purple-300" />
                <span className="hidden sm:inline relative z-10">Legacy Vault</span>
              </button>
              <button
                onClick={() => openConnectionsPanel()}
                className="relative px-4 py-2 bg-slate-900/40 backdrop-blur-xl border border-cyan-500/30 hover:border-cyan-400/50 text-white rounded-xl transition-all flex items-center gap-2 text-sm font-medium shadow-lg shadow-cyan-500/10 hover:shadow-cyan-500/30 hover:bg-slate-900/60 group overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-teal-600/10 to-cyan-600/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <Link2 className="w-4 h-4 relative z-10 text-cyan-400 group-hover:text-cyan-300" />
                <span className="hidden sm:inline relative z-10">Connections</span>
                {activeConnectionsCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 text-white text-xs rounded-full flex items-center justify-center font-bold z-20 shadow-lg shadow-emerald-500/50">
                    {activeConnectionsCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => navigate('/marketplace')}
                className="relative px-4 py-2 bg-slate-900/40 backdrop-blur-xl border border-amber-500/30 hover:border-amber-400/50 text-white rounded-xl transition-all flex items-center gap-2 text-sm font-medium shadow-lg shadow-amber-500/10 hover:shadow-amber-500/30 hover:bg-slate-900/60 group overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-amber-600/10 to-orange-600/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <ShoppingCart className="w-4 h-4 relative z-10 text-amber-400 group-hover:text-amber-300" />
                <span className="hidden sm:inline relative z-10">Marketplace</span>
              </button>
              <button
                onClick={handleSignOut}
                className="relative px-4 py-2 bg-slate-900/40 backdrop-blur-xl border border-slate-600/30 hover:border-slate-500/50 text-slate-300 hover:text-white rounded-xl transition-all flex items-center gap-2 text-sm font-medium shadow-lg shadow-slate-900/20 hover:shadow-slate-700/30 hover:bg-slate-900/60 group overflow-hidden"
              >
                <div className="absolute inset-0 bg-slate-800/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <LogOut className="w-4 h-4 relative z-10" />
                <span className="hidden sm:inline relative z-10">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation - Minimalistic & Responsive */}
      <nav className="sticky top-[73px] z-40 bg-black/40 backdrop-blur-xl border-b border-slate-800/30 shadow-lg shadow-black/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Mobile & Tablet: Horizontal Scroll */}
          <div className="lg:hidden flex gap-0 overflow-x-auto overflow-y-hidden scrollbar-hide -mx-4 px-4 snap-x snap-mandatory">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = selectedView === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => setSelectedView(item.id as any)}
                  aria-label={item.label}
                  aria-current={isActive ? 'page' : undefined}
                  className={`group relative flex-shrink-0 snap-start px-4 sm:px-5 py-4 transition-all duration-200 ${
                    isActive ? 'text-white' : 'text-slate-500 hover:text-slate-300 active:text-slate-200'
                  }`}
                  style={{ minWidth: '80px', touchAction: 'manipulation' }}
                >
                  <div className="flex flex-col items-center gap-1.5">
                    <div className={`relative transition-all duration-200 ${isActive ? 'scale-110' : 'scale-100 group-hover:scale-105 group-active:scale-95'}`}>
                      <Icon
                        className={`w-5 h-5 transition-colors duration-200 ${
                          isActive ? 'text-emerald-400' : 'text-slate-500 group-hover:text-slate-400'
                        }`}
                        strokeWidth={isActive ? 2.5 : 2}
                      />
                      {isActive && (
                        <div className="absolute -inset-1 bg-emerald-400/10 rounded-lg blur-sm"></div>
                      )}
                    </div>
                    <span className={`text-xs font-medium transition-all duration-200 ${
                      isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-400'
                    }`}>
                      {item.label}
                    </span>
                  </div>
                  {isActive && (
                    <div
                      className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent transition-all duration-300"
                      style={{ width: '60%' }}
                    ></div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Desktop: Full Width Navigation */}
          <div className="hidden lg:flex items-center justify-center gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = selectedView === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => setSelectedView(item.id as any)}
                  aria-label={item.label}
                  aria-current={isActive ? 'page' : undefined}
                  className={`group relative px-6 py-3.5 rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'text-white bg-slate-800/40'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/20 active:bg-slate-800/30'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon
                      className={`w-4.5 h-4.5 transition-all duration-200 ${
                        isActive ? 'text-emerald-400' : 'text-slate-500 group-hover:text-slate-400'
                      }`}
                      strokeWidth={isActive ? 2.5 : 2}
                    />
                    <span className={`text-sm font-medium transition-colors duration-200 ${
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                    }`}>
                      {item.label}
                    </span>
                  </div>
                  {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-500 rounded-t-full"></div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Mobile Scroll Indicator */}
        <div className="lg:hidden">
          <div className="flex justify-center py-1">
            <div className="flex gap-1">
              {navItems.map((item) => (
                <div
                  key={item.id}
                  className={`h-0.5 rounded-full transition-all duration-300 ${
                    selectedView === item.id
                      ? 'w-4 bg-emerald-400'
                      : 'w-1 bg-slate-700'
                  }`}
                ></div>
              ))}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-48 safe-bottom w-full">
        <div className="space-y-8">
          {selectedView === 'family' && (
            <>
              <FamilyEngrams />
              <UnifiedFamilyInterface userId={user.id} onNavigateToLegacy={handleNavigateToLegacy} preselectedAIId={selectedAIId || undefined} />
              {/* Additional spacing for longer scrolling */}
              <div className="h-[60vh]"></div>
            </>
          )}
          {selectedView === 'activities' && (
            <>
              <UnifiedActivityCenter />
              <div className="h-[60vh]"></div>
            </>
          )}
          {selectedView === 'engrams' && (
            <>
              <CustomEngramsDashboard userId={user.id} onSelectAI={handleSelectAI} />
              <div className="h-[60vh]"></div>
            </>
          )}
          {selectedView === 'chat' && (
            <>
              <UnifiedChatInterface />
              <div className="h-[60vh]"></div>
            </>
          )}
        </div>

        {/* Scroll sentinel for testing */}
        <div id="scroll-end" className="h-1 w-1 opacity-0 pointer-events-none" aria-hidden="true"></div>
      </main>

      {/* Saints Navigation - Fixed Bottom */}
      <SaintsNavigation />
    </div>
  );
}
