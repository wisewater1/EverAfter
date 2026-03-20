import { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Loader2 } from 'lucide-react';
import { withTimeout } from '../lib/withTimeout';

interface ProtectedRouteProps {
  children: React.ReactNode;
  skipOnboardingCheck?: boolean;
}

export default function ProtectedRoute({ children, skipOnboardingCheck = false }: ProtectedRouteProps) {
  const ONBOARDING_CHECK_TIMEOUT_MS = 2500;
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const [checkingOnboarding, setCheckingOnboarding] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  // Routes that should skip onboarding check
  const onboardingExemptRoutes = ['/onboarding', '/portal/profile'];
  const isExemptRoute = onboardingExemptRoutes.some(route => location.pathname.startsWith(route));

  useEffect(() => {
    if (!user || typeof window === 'undefined') {
      setNeedsOnboarding(false);
      return;
    }

    try {
      const cached = window.sessionStorage.getItem(`everafter_onboarding_required_${user.id}`);
      if (cached === '1') {
        setNeedsOnboarding(true);
      } else if (cached === '0') {
        setNeedsOnboarding(false);
      }
    } catch {
      // Ignore storage failures and fall back to the live check.
    }
  }, [user?.id]);

  useEffect(() => {
    async function checkOnboardingStatus() {
      if (!user || skipOnboardingCheck || isExemptRoute) {
        setCheckingOnboarding(false);
        return;
      }

      setCheckingOnboarding(true);

      try {
        if (!supabase) {
          console.warn('Supabase client not initialized in ProtectedRoute');
          setCheckingOnboarding(false);
          return;
        }

        const { data: profile, error } = await withTimeout(
          supabase
            .from('profiles')
            .select('has_completed_onboarding, onboarding_skipped')
            .eq('id', user.id)
            .single(),
          ONBOARDING_CHECK_TIMEOUT_MS,
          'Timed out while checking onboarding status'
        );

        if (error) {
          console.error('Error checking onboarding status:', error);
          // If profile doesn't exist or error, don't block access
          setCheckingOnboarding(false);
          return;
        }

        // User needs onboarding if they haven't completed it AND haven't skipped it
        const requiresOnboarding = !profile?.has_completed_onboarding && !profile?.onboarding_skipped;
        setNeedsOnboarding(requiresOnboarding);
        try {
          window.sessionStorage.setItem(`everafter_onboarding_required_${user.id}`, requiresOnboarding ? '1' : '0');
        } catch {
          // Ignore storage failures.
        }
      } catch (err) {
        console.error('Error in onboarding check:', err);
      } finally {
        setCheckingOnboarding(false);
      }
    }

    if (!authLoading && user) {
      checkOnboardingStatus();
    } else if (!authLoading) {
      setCheckingOnboarding(false);
    }
  }, [user, authLoading, skipOnboardingCheck, isExemptRoute]);

  useEffect(() => {
    if (!authLoading && checkingOnboarding) {
      const watchdog = window.setTimeout(() => {
        console.warn('ProtectedRoute: Onboarding watchdog released route guard');
        setCheckingOnboarding(false);
      }, ONBOARDING_CHECK_TIMEOUT_MS + 1500);

      return () => clearTimeout(watchdog);
    }
  }, [authLoading, checkingOnboarding]);

  if (authLoading && !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-blue-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (checkingOnboarding && !needsOnboarding) {
    return <>{children}</>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Redirect to onboarding if needed (but not if already on an exempt route)
  if (needsOnboarding && !isExemptRoute) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
