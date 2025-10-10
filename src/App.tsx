import React, { useState } from 'react';
import Header from './components/Header';
import LandingPage from './components/LandingPage';
import FamilyDashboard from './components/dashboard/FamilyDashboard';
import { useAuth } from './hooks/useAuth';
import { isSupabaseConfigured } from './lib/supabase';

type View = 'landing' | 'dashboard';

const DEFAULT_VIEW: View = isSupabaseConfigured() ? 'dashboard' : 'landing';

export default function App(): JSX.Element {
  const [view, setView] = useState<View>(DEFAULT_VIEW);
  const { user, loading: authLoading, isConfigured } = useAuth();
  const showDashboard = view === 'dashboard';

  const handleLogoClick = () => setView('dashboard');
  const handleBackClick = () => setView('landing');

  return (
    <div className="min-h-screen bg-slate-50">
      {showDashboard && (
        <Header
          onLogoClick={handleLogoClick}
          showBackButton
          onBackClick={handleBackClick}
        />
      )}

      <main className={showDashboard ? 'pt-20' : ''}>
        {showDashboard ? (
          authLoading && isConfigured ? (
            <div className="flex min-h-[60vh] items-center justify-center">
              <p className="text-sm font-medium text-slate-600">Loading your family workspace…</p>
            </div>
          ) : (
            <FamilyDashboard userId={user?.id ?? undefined} />
          )
        ) : (
          <LandingPage onGetStarted={() => setView('dashboard')} />
        )}
      </main>
    </div>
  );
}
