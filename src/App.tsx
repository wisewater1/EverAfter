import React, { useState } from 'react';
import { Heart, Calendar, Users, Home, Clock, Sparkles } from 'lucide-react';
import LandingPage from './components/LandingPage';
import DailyQuestion from './components/DailyQuestion';
import MemoryTimeline from './components/MemoryTimeline';
import FamilyDashboard from './components/FamilyDashboard';
import Header from './components/Header';

type View = 'landing' | 'today' | 'timeline' | 'family';

function App() {
  const [currentView, setCurrentView] = useState<View>('landing');

  const renderCurrentView = () => {
    switch (currentView) {
      case 'landing':
        return <LandingPage onGetStarted={() => setCurrentView('today')} />;
      case 'today':
        return <DailyQuestion />;
      case 'timeline':
        return <MemoryTimeline />;
      case 'family':
        return <FamilyDashboard />;
      default:
        return <LandingPage onGetStarted={() => setCurrentView('today')} />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      {currentView !== 'landing' && (
        <Header 
          onLogoClick={() => setCurrentView('landing')}
          showBackButton={currentView !== 'today'}
          onBackClick={() => setCurrentView('today')}
        />
      )}
      
      <main className={currentView === 'landing' ? '' : 'pt-16 pb-20'}>
        {renderCurrentView()}
      </main>

      {/* Bottom Navigation - Only show when not on landing page */}
      {currentView !== 'landing' && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 z-50">
          <div className="flex justify-around items-center max-w-md mx-auto">
            <button
              onClick={() => setCurrentView('today')}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all duration-200 ${
                currentView === 'today'
                  ? 'text-purple-600 bg-purple-50'
                  : 'text-gray-500 hover:text-purple-600 hover:bg-purple-50'
              }`}
            >
              <Clock className="w-5 h-5" />
              <span className="text-xs font-medium">Today</span>
            </button>

            <button
              onClick={() => setCurrentView('timeline')}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all duration-200 ${
                currentView === 'timeline'
                  ? 'text-purple-600 bg-purple-50'
                  : 'text-gray-500 hover:text-purple-600 hover:bg-purple-50'
              }`}
            >
              <Calendar className="w-5 h-5" />
              <span className="text-xs font-medium">Timeline</span>
            </button>

            <button
              onClick={() => setCurrentView('family')}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all duration-200 ${
                currentView === 'family'
                  ? 'text-purple-600 bg-purple-50'
                  : 'text-gray-500 hover:text-purple-600 hover:bg-purple-50'
              }`}
            >
              <Users className="w-5 h-5" />
              <span className="text-xs font-medium">Family</span>
            </button>
          </div>
        </nav>
      )}
    </div>
  );
}

export default App;