import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Brain, LogOut, CreditCard, Settings, MessageCircle, Users, Calendar, Bot, Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import CustomEngramsDashboard from '../components/CustomEngramsDashboard';
import DailyQuestionCard from '../components/DailyQuestionCard';
import EngramChat from '../components/EngramChat';
import RaphaelAgentMode from '../components/RaphaelAgentMode';
import EngramTaskManager from '../components/EngramTaskManager';
import SaintsDashboard from '../components/SaintsDashboard';
import FamilyMembers from '../components/FamilyMembers';

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [selectedView, setSelectedView] = useState<'saints' | 'engrams' | 'questions' | 'chat' | 'tasks' | 'family'>('saints');
  const [selectedAIId, setSelectedAIId] = useState<string | null>(null);
  const [showRaphaelAgent, setShowRaphaelAgent] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const handleSelectAI = (aiId: string) => {
    setSelectedAIId(aiId);
    setSelectedView('questions');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-blue-900">
      {/* Header */}
      <header className="bg-gray-900/50 backdrop-blur-sm border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-teal-600 rounded-lg flex items-center justify-center">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-medium text-white">EverAfter AI</h1>
                <p className="text-xs text-gray-400">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/pricing')}
                className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-all flex items-center gap-2"
              >
                <CreditCard className="w-4 h-4" />
                Billing
              </button>
              <button
                onClick={handleSignOut}
                className="px-4 py-2 bg-red-600/20 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-600/30 transition-all flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-gray-900/30 backdrop-blur-sm border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto">
            <button
              onClick={() => setSelectedView('saints')}
              className={`px-6 py-3 text-sm font-medium transition-all whitespace-nowrap flex items-center gap-2 ${
                selectedView === 'saints'
                  ? 'text-white border-b-2 border-blue-500'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              <Heart className="w-4 h-4" />
              Saints AI
            </button>
            <button
              onClick={() => setSelectedView('engrams')}
              className={`px-6 py-3 text-sm font-medium transition-all whitespace-nowrap flex items-center gap-2 ${
                selectedView === 'engrams'
                  ? 'text-white border-b-2 border-blue-500'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              <Bot className="w-4 h-4" />
              Custom Engrams
            </button>
            <button
              onClick={() => setSelectedView('questions')}
              className={`px-6 py-3 text-sm font-medium transition-all whitespace-nowrap flex items-center gap-2 ${
                selectedView === 'questions'
                  ? 'text-white border-b-2 border-blue-500'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              <Calendar className="w-4 h-4" />
              Daily Questions
            </button>
            <button
              onClick={() => setSelectedView('chat')}
              className={`px-6 py-3 text-sm font-medium transition-all whitespace-nowrap flex items-center gap-2 ${
                selectedView === 'chat'
                  ? 'text-white border-b-2 border-blue-500'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              <MessageCircle className="w-4 h-4" />
              Chat
            </button>
            <button
              onClick={() => setSelectedView('tasks')}
              className={`px-6 py-3 text-sm font-medium transition-all whitespace-nowrap flex items-center gap-2 ${
                selectedView === 'tasks'
                  ? 'text-white border-b-2 border-blue-500'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              <Settings className="w-4 h-4" />
              Tasks
            </button>
            <button
              onClick={() => setSelectedView('family')}
              className={`px-6 py-3 text-sm font-medium transition-all whitespace-nowrap flex items-center gap-2 ${
                selectedView === 'family'
                  ? 'text-white border-b-2 border-blue-500'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              <Users className="w-4 h-4" />
              Family Members
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {selectedView === 'saints' && (
          <SaintsDashboard onOpenRaphaelAgent={() => setShowRaphaelAgent(true)} />
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
      </main>

      {/* Raphael Agent Mode Modal */}
      {showRaphaelAgent && (
        <RaphaelAgentMode
          userId={user.id}
          engramId={selectedAIId || ''}
          onClose={() => setShowRaphaelAgent(false)}
        />
      )}
    </div>
  );
}
