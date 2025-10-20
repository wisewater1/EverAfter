import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Brain, LogOut, CreditCard, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import CustomEngramsDashboard from '../components/CustomEngramsDashboard';
import DailyQuestionCard from '../components/DailyQuestionCard';
import EngramChat from '../components/EngramChat';
import RaphaelAgentMode from '../components/RaphaelAgentMode';
import EngramTaskManager from '../components/EngramTaskManager';

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [selectedView, setSelectedView] = useState<'ais' | 'questions' | 'chat' | 'tasks' | 'agent'>('ais');
  const [selectedAIId, setSelectedAIId] = useState<string | null>(null);
  const [showAgentMode, setShowAgentMode] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const handleSelectAI = (aiId: string) => {
    setSelectedAIId(aiId);
    setSelectedView('questions');
  };

  if (!user) {
    return null;
  }

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
                onClick={() => navigate('/settings')}
                className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-all flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                Settings
              </button>
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
          <div className="flex gap-1">
            {[
              { id: 'ais', label: 'My AIs' },
              { id: 'questions', label: 'Daily Questions' },
              { id: 'chat', label: 'Chat' },
              { id: 'tasks', label: 'Tasks' },
              { id: 'agent', label: 'Health Agent' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedView(tab.id as any)}
                className={`px-6 py-3 text-sm font-medium transition-all ${
                  selectedView === tab.id
                    ? 'text-white border-b-2 border-blue-500'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {selectedView === 'ais' && (
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
        {selectedView === 'agent' && (
          <div>
            <button
              onClick={() => setShowAgentMode(true)}
              className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg font-medium"
            >
              Open Health Agent
            </button>
          </div>
        )}
      </main>

      {/* Agent Mode Modal */}
      {showAgentMode && (
        <RaphaelAgentMode
          userId={user.id}
          engramId={selectedAIId || ''}
          onClose={() => setShowAgentMode(false)}
        />
      )}
    </div>
  );
}
