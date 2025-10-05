import React, { useState } from 'react';
import { Header } from './components/Header';
import { LandingPage } from './components/LandingPage';
import { DailyQuestion } from './components/DailyQuestion';
import FamilyDashboard from './components/FamilyDashboard';
import { MemoryTimeline } from './components/MemoryTimeline';
import { getQuestionByDay, getRandomQuestion } from './data/questions';

type AppState = 'landing' | 'daily-question' | 'family-dashboard' | 'memory-timeline';

function App() {
  const [currentView, setCurrentView] = useState<AppState>('landing');
  const [currentDay, setCurrentDay] = useState(127);
  const [currentUser] = useState({
    name: 'Sarah Chen',
    role: 'family' as const
  });

  const currentQuestion = getQuestionByDay(currentDay)?.question || getRandomQuestion().question;

  const handleGetStarted = () => {
    setCurrentView('daily-question');
  };

  const renderContent = () => {
    switch (currentView) {
      case 'landing':
        return <LandingPage onGetStarted={handleGetStarted} />;
      case 'daily-question':
        return (
          <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/30 py-16">
            <DailyQuestion 
              question={currentQuestion}
              day={currentDay}
              totalDays={365}
              onDayChange={setCurrentDay}
            />
          </div>
        );
      case 'family-dashboard':
        return (
          <div className="min-h-screen">
            <FamilyDashboard />
          </div>
        );
      case 'memory-timeline':
        return (
          <div className="min-h-screen bg-gray-50/50">
            <MemoryTimeline />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/30">
      {currentView !== 'landing' && (
        <Header currentUser={currentUser} />
      )}
      
      {renderContent()}

      {/* Navigation Menu for Demo */}
      {currentView !== 'landing' && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-200/50 px-2 py-2">
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentView('daily-question')}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  currentView === 'daily-question'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                Daily Question
              </button>
              <button
                onClick={() => setCurrentView('memory-timeline')}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  currentView === 'memory-timeline'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                Memory Timeline
              </button>
              <button
                onClick={() => setCurrentView('family-dashboard')}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  currentView === 'family-dashboard'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                Family Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;