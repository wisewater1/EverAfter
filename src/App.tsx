import React, { useState } from 'react';
import { Heart, Calendar, Users, Home, Clock, Sparkles } from 'lucide-react';
import LandingPage from './components/LandingPage';
import DailyQuestion from './components/DailyQuestion';
import MemoryTimeline from './components/MemoryTimeline';
import FamilyDashboard from './components/FamilyDashboard';

function App() {
  const [currentView, setCurrentView] = useState<'landing' | 'today' | 'timeline' | 'family'>('landing');

  if (currentView === 'landing') {
    return <LandingPage onGetStarted={() => setCurrentView('today')} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      {/* Main Content */}
      <div className="pb-20">
        {currentView === 'today' && <DailyQuestion />}
        {currentView === 'timeline' && <MemoryTimeline />}
        {currentView === 'family' && <FamilyDashboard />}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-gray-200/50 px-4 py-2 z-50">
        <div className="flex justify-around items-center max-w-md mx-auto">
          {/* Today Tab */}
          <button
            onClick={() => setCurrentView('today')}
            className={`flex flex-col items-center p-3 rounded-xl transition-all duration-300 ${
              currentView === 'today'
                ? 'bg-purple-100/80 text-purple-700 shadow-lg shadow-purple-500/25'
                : 'text-gray-500 hover:bg-gray-100/50'
            }`}
          >
            <div className="relative">
              <Heart className="w-6 h-6" />
              {currentView === 'today' && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-purple-500 rounded-full animate-pulse" />
              )}
            </div>
            <span className="text-xs font-medium mt-1">Today</span>
          </button>

          {/* Timeline Tab */}
          <button
            onClick={() => setCurrentView('timeline')}
            className={`flex flex-col items-center p-3 rounded-xl transition-all duration-300 ${
              currentView === 'timeline'
                ? 'bg-blue-100/80 text-blue-700 shadow-lg shadow-blue-500/25'
                : 'text-gray-500 hover:bg-gray-100/50'
            }`}
          >
            <div className="relative">
              <Clock className="w-6 h-6" />
              {currentView === 'timeline' && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
              )}
            </div>
            <span className="text-xs font-medium mt-1">Timeline</span>
          </button>

          {/* Family Tab */}
          <button
            onClick={() => setCurrentView('family')}
            className={`flex flex-col items-center p-3 rounded-xl transition-all duration-300 ${
              currentView === 'family'
                ? 'bg-green-100/80 text-green-700 shadow-lg shadow-green-500/25'
                : 'text-gray-500 hover:bg-gray-100/50'
            }`}
          >
            <div className="relative">
              <Users className="w-6 h-6" />
              {currentView === 'family' && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
              )}
            </div>
            <span className="text-xs font-medium mt-1">Family</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;