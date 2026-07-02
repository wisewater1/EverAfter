import { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Loader2 } from 'lucide-react';
import { withTimeout } from '../lib/withTimeout';
import { getOnboardingStatus } from '../lib/onboardingApi';
import { getRouteGate, getRuntimeReadiness, type RuntimeRouteGate } from '../lib/runtime-readiness';
import FeatureBlockedState from './FeatureBlockedState';

interface ProtectedRouteProps {
  children: React.ReactNode;
  skipOnboardingCheck?: boolean;
  /**
   * When true, the authenticated user must also be a platform admin
   * (present in the `platform_admins` allowlist, verified via the
   * `is_platform_admin` RPC). Non-admins are shown a blocked state.
   * This is a UX guard only — the database RPCs are independently
   * gated server-side, which is the real enforcement boundary.
   */
  requireAdmin?: boolean;
}

function hasHardRouteBlocker(routeGate: RuntimeRouteGate | null | undefined): boolean {
  if (!routeGate?.blocking) {
    return false;
  }

  return routeGate.deps.some((dep) => dep === 'auth.session' || dep === 'frontend.supabase');
}

export default function ProtectedRoute({ children, skipOnboardingCheck = false, requireAdmin = false }: ProtectedRouteProps) {
  const ONBOARDING_CHECK_TIMEOUT_MS = 2500;
  const { user, loading: authLoading, isDemoMode } = useAuth();
  const location = useLocation();
  const [checkingOnboarding, setCheckingOnboarding] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [routeGate, setRouteGate] = useState<RuntimeRouteGate | null>(null);
  const [routeGateLoading, setRouteGateLoading] = useState(false);
  const routeHasHardBlocker = hasHardRouteBlocker(routeGate);
  // null = not yet checked, true/false = resolved admin status
  const [isAdmin, setIsAdmin] = useState<boolean | null>(requireAdmin ? null : true);

  useEffect(() => {
    let cancelled = false;
    if (!requireAdmin) {
      setIsAdmin(true);
      return;
    }
    if (!user || isDemoMode) {
      setIsAdmin(false);
      return;
    }
    setIsAdmin(null);
    (async () => {
      try {
        const { data, error } = await withTimeout(
          supabase.rpc('is_platform_admin'),
          ONBOARDING_CHECK_TIMEOUT_MS,
          'Timed out while checking admin status'
        );
        if (!cancelled) setIsAdmin(!error && data === true);
      } catch {
        if (!cancelled) setIsAdmin(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [requireAdmin, user?.id, isDemoMode]);

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
      <div className="min-h-[100dvh] bg-gradient-to-br from-gray-900 via-gray-800 to-blue-900 flex items-center justify-center">
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
      <div className="min-h-[100dvh] bg-gradient-to-br from-gray-900 via-gray-800 to-blue-900 flex items-center justify-center">
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

  if (requireAdmin && isAdmin === null) {
    return (
      <div className="min-h-[100dvh] bg-gradient-to-br from-gray-900 via-gray-800 to-blue-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  if (requireAdmin && !isAdmin) {
    return (
      <FeatureBlockedState
        title="Admin access required"
        reason="This page is restricted to platform administrators."
        detail={`Route: ${location.pathname}`}
      />
    );
  }

  return <>{children}</>;
}
