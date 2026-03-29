import { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { withTimeout } from '../lib/withTimeout';
import { getOnboardingStatus } from '../lib/onboardingApi';
import { getRouteGate, getRuntimeReadiness, type RuntimeRouteGate } from '../lib/runtime-readiness';
import FeatureBlockedState from './FeatureBlockedState';

interface ProtectedRouteProps {
  children: React.ReactNode;
  skipOnboardingCheck?: boolean;
}

function hasHardRouteBlocker(routeGate: RuntimeRouteGate | null | undefined): boolean {
  if (!routeGate?.blocking) {
    return false;
  }

  return routeGate.deps.some((dep) => dep === 'auth.session' || dep === 'frontend.supabase');
}

export default function ProtectedRoute({ children, skipOnboardingCheck = false }: ProtectedRouteProps) {
  const ONBOARDING_CHECK_TIMEOUT_MS = 2500;
  const { user, loading: authLoading, isDemoMode } = useAuth();
  const location = useLocation();
  const [checkingOnboarding, setCheckingOnboarding] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [routeGate, setRouteGate] = useState<RuntimeRouteGate | null>(null);
  const [routeGateLoading, setRouteGateLoading] = useState(false);
  const routeHasHardBlocker = hasHardRouteBlocker(routeGate);

  // Routes that should skip onboarding check
  const onboardingExemptRoutes = ['/onboarding', '/portal/profile'];
  const isExemptRoute = onboardingExemptRoutes.some(route => location.pathname.startsWith(route));

  useEffect(() => {
    if (!user || isDemoMode || typeof window === 'undefined') {
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
  }, [user?.id, isDemoMode]);

  useEffect(() => {
    let cancelled = false;

    async function loadRouteGate() {
      if (!user) {
        setRouteGate(null);
        setRouteGateLoading(false);
        return;
      }

      setRouteGateLoading(true);
      try {
        const readiness = await getRuntimeReadiness();
        if (!cancelled) {
          setRouteGate(getRouteGate(readiness, location.pathname));
        }
      } catch (error) {
        console.warn('ProtectedRoute: failed to load route readiness', error);
        if (!cancelled) {
          setRouteGate(null);
        }
      } finally {
        if (!cancelled) {
          setRouteGateLoading(false);
        }
      }
    }

    if (!authLoading && user) {
      void loadRouteGate();
    } else if (!authLoading) {
      setRouteGate(null);
      setRouteGateLoading(false);
    }

    return () => {
      cancelled = true;
    };
  }, [authLoading, location.pathname, user]);

  useEffect(() => {
    async function checkOnboardingStatus() {
      if (!user || isDemoMode || skipOnboardingCheck || isExemptRoute || routeGateLoading || routeHasHardBlocker) {
        setNeedsOnboarding(false);
        setCheckingOnboarding(false);
        return;
      }

      setCheckingOnboarding(true);

      try {
        const bundle = await withTimeout(
          getOnboardingStatus(),
          ONBOARDING_CHECK_TIMEOUT_MS,
          'Timed out while checking onboarding status'
        );

        const profile = bundle?.profile || null;
        const status = bundle?.onboarding_status || null;

        // User needs onboarding if they haven't completed it AND haven't skipped it
        const requiresOnboarding = !profile?.has_completed_onboarding && !profile?.onboarding_skipped && !status?.onboarding_complete;
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
  }, [user, authLoading, isDemoMode, skipOnboardingCheck, isExemptRoute, routeHasHardBlocker, routeGateLoading]);

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

  if (routeGateLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-blue-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Checking runtime dependencies...</p>
        </div>
      </div>
    );
  }

  if (routeHasHardBlocker) {
    return (
      <FeatureBlockedState
        title="This route is unavailable"
        reason={routeGate.reason || 'This route is blocked until its runtime dependencies recover.'}
        detail={`Route: ${location.pathname}`}
      />
    );
  }

  // Redirect to onboarding if needed (but not if already on an exempt route)
  if (needsOnboarding && !isExemptRoute) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
