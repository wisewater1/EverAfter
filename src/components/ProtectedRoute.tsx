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

// A type predicate rather than a plain boolean, so that a true result narrows
// routeGate to non-null at the call site. The blocked branch below reads
// routeGate.reason, which was only safe by assumption before.
function hasHardRouteBlocker(routeGate: RuntimeRouteGate | null | undefined): routeGate is RuntimeRouteGate {
  if (!routeGate?.blocking) {
    return false;
  }

  return routeGate.deps.some((dep) => dep === 'auth.session' || dep === 'frontend.supabase');
}

export default function ProtectedRoute({ children, skipOnboardingCheck = false, requireAdmin = false }: ProtectedRouteProps) {
  const ONBOARDING_CHECK_TIMEOUT_MS = 2500;
  const ROUTE_GATE_TIMEOUT_MS = 3000;
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
  const onboardingExemptRoutes = ['/onboarding', '/portal/profile', '/settings'];
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
        // Readiness is an enhancement layer (it can block a specific route
        // when a dependency is genuinely down), not an auth gate. A cold or
        // unreachable backend must never be allowed to hold up navigation,
        // so this races against a short timeout and fails open.
        const readiness = await withTimeout(
          getRuntimeReadiness(),
          ROUTE_GATE_TIMEOUT_MS,
          'Timed out while loading runtime readiness',
        );
        if (!cancelled) {
          setRouteGate(getRouteGate(readiness, location.pathname));
        }
      } catch (error) {
        console.warn('ProtectedRoute: failed to load route readiness, assuming open', error);
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
        // A failed check (cold backend, timeout, network blip) must not leave
        // a stale cached "needs onboarding" value in charge - that traps an
        // already-onboarded user in a redirect loop back to /onboarding on
        // every refresh until a live check happens to succeed. Fail open,
        // the same way the route-readiness gate above does: an onboarding
        // check we can't complete should never block navigation.
        console.warn('Onboarding check failed, not blocking navigation:', err);
        setNeedsOnboarding(false);
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

  // While the route gate resolves, keep the page mounted and rendering
  // instead of unmounting it behind a spinner. That previous behavior reset
  // every page's local state on each visit, doubled data loading, caused a
  // visible flash, and silently destroyed query-param deep links (a page
  // would consume and clear a param like ?tab= before the remount, so the
  // remounted copy never saw it). A confirmed hard blocker still replaces
  // the page below, once the (now time-boxed) readiness check resolves.
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
