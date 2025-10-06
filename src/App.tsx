import React, { useState } from 'react';
import { Heart, Calendar, Users, Home, Clock, Sparkles } from 'lucide-react';
import LandingPage from './components/LandingPage';
import DailyQuestion from './components/DailyQuestion';
import MemoryTimeline from './components/MemoryTimeline';
import FamilyDashboard from './components/FamilyDashboard';

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

  const showBottomNav = currentView !== 'landing';

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
      {renderCurrentView()}
      
      {showBottomNav && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 safe-area-pb">
          <div className="flex justify-around items-center max-w-md mx-auto">
            <button
              onClick={() => setCurrentView('today')}
              className={`flex flex-col items-center p-3 rounded-lg transition-all duration-200 ${
                currentView === 'today'
                  ? 'bg-purple-100 text-purple-600'
                  : 'text-gray-500 hover:text-purple-600 hover:bg-purple-50'
              }`}
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center mb-1 ${
                currentView === 'today' ? 'bg-purple-500' : 'bg-gray-300'
              }`}>
                <Heart className={`w-4 h-4 ${
                  currentView === 'today' ? 'text-white' : 'text-gray-600'
                }`} />
              </div>
              <span className="text-xs font-medium">Today</span>
            </button>

            <button
              onClick={() => setCurrentView('timeline')}
              className={`flex flex-col items-center p-3 rounded-lg transition-all duration-200 ${
                currentView === 'timeline'
                  ? 'bg-blue-100 text-blue-600'
                  : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50'
              }`}
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center mb-1 ${
                currentView === 'timeline' ? 'bg-blue-500' : 'bg-gray-300'
              }`}>
                <Clock className={`w-4 h-4 ${
                  currentView === 'timeline' ? 'text-white' : 'text-gray-600'
                }`} />
              </div>
              <span className="text-xs font-medium">Timeline</span>
            </button>

            <button
              onClick={() => setCurrentView('family')}
              className={`flex flex-col items-center p-3 rounded-lg transition-all duration-200 ${
                currentView === 'family'
                  ? 'bg-green-100 text-green-600'
                  : 'text-gray-500 hover:text-green-600 hover:bg-green-50'
              }`}
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center mb-1 ${
                currentView === 'family' ? 'bg-green-500' : 'bg-gray-300'
              }`}>
                <Users className={`w-4 h-4 ${
                  currentView === 'family' ? 'text-white' : 'text-gray-600'
                }`} />
              </div>
              <span className="text-xs font-medium">Family</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;