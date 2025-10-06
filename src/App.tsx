import React, { useState, useEffect } from 'react';
import LandingPage from './components/LandingPage';
import DailyQuestion from './components/DailyQuestion';
import MemoryTimeline from './components/MemoryTimeline';
import FamilyDashboard from './components/FamilyDashboard';
import MemorialEnvironment from './components/MemorialEnvironment';
import Header from './components/Header';
import { useAuth } from './hooks/useAuth';

type View = 'landing' | 'question' | 'timeline' | 'dashboard' | 'memorial' | 'environment';

export default function App() {
  const [currentView, setCurrentView] = useState<View>('landing');
  const [currentDay, setCurrentDay] = useState(1);
  const { user, loading } = useAuth();

  // Initialize the day counter
  useEffect(() => {
    const storedDay = localStorage.getItem('currentDay');
    if (storedDay) {
      setCurrentDay(parseInt(storedDay, 10));
    }
  }, []);

  // Update day when it changes
  const incrementDay = () => {
    const newDay = currentDay + 1;
    setCurrentDay(newDay);
    localStorage.setItem('currentDay', newDay.toString());
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show landing page if not authenticated
  if (!user && currentView === 'landing') {
    return <LandingPage onGetStarted={() => setCurrentView('question')} />;
  }

  // Main application interface
  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        currentView={currentView}
        onNavigate={setCurrentView}
        currentDay={currentDay}
      />

      {currentView === 'question' && (
        <DailyQuestion
          day={currentDay}
          onComplete={() => {
            incrementDay();
            setCurrentView('timeline');
          }}
          onViewTimeline={() => setCurrentView('timeline')}
        />
      )}

      {currentView === 'timeline' && (
        <MemoryTimeline
          onAnswerToday={() => setCurrentView('question')}
        />
      )}

      {currentView === 'dashboard' && (
        <FamilyDashboard />
      )}

      {currentView === 'memorial' && (
        <MemorialEnvironment
          onClose={() => setCurrentView('dashboard')}
        />
      )}

      {currentView === 'environment' && (
        <MemorialEnvironment
          onClose={() => setCurrentView('dashboard')}
        />
      )}
    </div>
  );
}
