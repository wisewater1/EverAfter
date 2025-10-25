import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Brain, LogOut, LogIn, Settings, MessageCircle, Users, Calendar, Bot, Heart, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import CustomEngramsDashboard from '../components/CustomEngramsDashboard';
import DailyQuestionCard from '../components/DailyQuestionCard';
import EngramChat from '../components/EngramChat';
import RaphaelHealthInterface from '../components/RaphaelHealthInterface';
import EngramTaskManager from '../components/EngramTaskManager';
import SaintsDashboard from '../components/SaintsDashboard';
import FamilyMembers from '../components/FamilyMembers';

export default function Dashboard() {
  const { user, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const [selectedView, setSelectedView] = useState<'saints' | 'engrams' | 'questions' | 'chat' | 'tasks' | 'family' | 'health'>('saints');
  const [selectedAIId, setSelectedAIId] = useState<string | null>(null);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const handleSelectAI = (aiId: string) => {
    setSelectedAIId(aiId);
    setSelectedView('questions');
  };

  // Show loading state while auth is initializing
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-blue-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    navigate('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-blue-900">
      {/* Header */}
      <header className="bg-gray-950/80 backdrop-blur-xl border-b border-gray-800/50">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-11 h-11 bg-gradient-to-br from-blue-500 via-teal-500 to-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <Brain className="w-6 h-6 text-white" />
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-gray-950"></div>
              </div>
              <div>
                <h1 className="text-xl font-semibold text-white tracking-tight">EverAfter AI</h1>
                <p className="text-sm text-gray-400 mt-0.5">{user?.email || 'Loading...'}</p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="px-5 py-2.5 bg-gray-800/50 hover:bg-gray-800 text-gray-300 hover:text-white border border-gray-700/50 rounded-xl transition-all duration-200 flex items-center gap-2 text-sm font-medium group"
            >
              <LogOut className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-gray-950/50 backdrop-blur-xl border-b border-gray-800/30">
        <div className="max-w-7xl mx-auto px-6 sm:px-8">
          <div className="flex gap-1 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => setSelectedView('saints')}
              className={`px-5 py-4 text-sm font-medium transition-all whitespace-nowrap flex items-center gap-2 relative ${
                selectedView === 'saints'
                  ? 'text-white'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Heart className="w-4 h-4" />
              <span>Saints AI</span>
              {selectedView === 'saints' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-emerald-500"></div>
              )}
            </button>
            <button
              onClick={() => setSelectedView('engrams')}
              className={`px-5 py-4 text-sm font-medium transition-all whitespace-nowrap flex items-center gap-2 relative ${
                selectedView === 'engrams'
                  ? 'text-white'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Bot className="w-4 h-4" />
              <span>Engrams</span>
              {selectedView === 'engrams' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-emerald-500"></div>
              )}
            </button>
            <button
              onClick={() => setSelectedView('questions')}
              className={`px-5 py-4 text-sm font-medium transition-all whitespace-nowrap flex items-center gap-2 relative ${
                selectedView === 'questions'
                  ? 'text-white'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Questions</span>
              {selectedView === 'questions' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-emerald-500"></div>
              )}
            </button>
            <button
              onClick={() => setSelectedView('chat')}
              className={`px-5 py-4 text-sm font-medium transition-all whitespace-nowrap flex items-center gap-2 relative ${
                selectedView === 'chat'
                  ? 'text-white'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <MessageCircle className="w-4 h-4" />
              <span>Chat</span>
              {selectedView === 'chat' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-emerald-500"></div>
              )}
            </button>
            <button
              onClick={() => setSelectedView('tasks')}
              className={`px-5 py-4 text-sm font-medium transition-all whitespace-nowrap flex items-center gap-2 relative ${
                selectedView === 'tasks'
                  ? 'text-white'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Tasks</span>
              {selectedView === 'tasks' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-emerald-500"></div>
              )}
            </button>
            <button
              onClick={() => setSelectedView('family')}
              className={`px-5 py-4 text-sm font-medium transition-all whitespace-nowrap flex items-center gap-2 relative ${
                selectedView === 'family'
                  ? 'text-white'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Family</span>
              {selectedView === 'family' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-emerald-500"></div>
              )}
            </button>
            <button
              onClick={() => setSelectedView('health')}
              className={`px-5 py-4 text-sm font-medium transition-all whitespace-nowrap flex items-center gap-2 relative ${
                selectedView === 'health'
                  ? 'text-white'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Health</span>
              {selectedView === 'health' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-emerald-500"></div>
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
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
          <EngramChat engrams={[]} userId={user.id} />
        )}
        {selectedView === 'tasks' && (
          <EngramTaskManager engrams={[]} userId={user.id} />
        )}
        {selectedView === 'family' && (
          <FamilyMembers userId={user.id} />
        )}
        {selectedView === 'health' && (
          <RaphaelHealthInterface />
        )}
      </main>
    </div>
  );
}
