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
      <header className="bg-gray-900/50 backdrop-blur-sm border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-600 to-teal-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <Brain className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base sm:text-xl font-medium text-white truncate">EverAfter AI</h1>
                <p className="text-[10px] sm:text-xs text-gray-400 truncate">{user?.email || 'Loading...'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={handleSignOut}
                className="px-2 sm:px-4 py-1.5 sm:py-2 bg-red-600/20 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-600/30 transition-all flex items-center gap-1 sm:gap-2 text-xs sm:text-sm"
              >
                <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-gray-900/30 backdrop-blur-sm border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-3 sm:px-4">
          <div className="flex gap-0.5 sm:gap-1 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => setSelectedView('saints')}
              className={`px-3 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-medium transition-all whitespace-nowrap flex items-center gap-1 sm:gap-2 ${
                selectedView === 'saints'
                  ? 'text-white border-b-2 border-blue-500'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              <Heart className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">Saints AI</span>
            </button>
            <button
              onClick={() => setSelectedView('engrams')}
              className={`px-3 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-medium transition-all whitespace-nowrap flex items-center gap-1 sm:gap-2 ${
                selectedView === 'engrams'
                  ? 'text-white border-b-2 border-blue-500'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">Engrams</span>
            </button>
            <button
              onClick={() => setSelectedView('questions')}
              className={`px-3 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-medium transition-all whitespace-nowrap flex items-center gap-1 sm:gap-2 ${
                selectedView === 'questions'
                  ? 'text-white border-b-2 border-blue-500'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">Questions</span>
            </button>
            <button
              onClick={() => setSelectedView('chat')}
              className={`px-3 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-medium transition-all whitespace-nowrap flex items-center gap-1 sm:gap-2 ${
                selectedView === 'chat'
                  ? 'text-white border-b-2 border-blue-500'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              <MessageCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">Chat</span>
            </button>
            <button
              onClick={() => setSelectedView('tasks')}
              className={`px-3 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-medium transition-all whitespace-nowrap flex items-center gap-1 sm:gap-2 ${
                selectedView === 'tasks'
                  ? 'text-white border-b-2 border-blue-500'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">Tasks</span>
            </button>
            <button
              onClick={() => setSelectedView('family')}
              className={`px-3 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-medium transition-all whitespace-nowrap flex items-center gap-1 sm:gap-2 ${
                selectedView === 'family'
                  ? 'text-white border-b-2 border-blue-500'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">Family</span>
            </button>
            <button
              onClick={() => setSelectedView('health')}
              className={`px-3 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-medium transition-all whitespace-nowrap flex items-center gap-1 sm:gap-2 ${
                selectedView === 'health'
                  ? 'text-white border-b-2 border-blue-500'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">Health</span>
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
