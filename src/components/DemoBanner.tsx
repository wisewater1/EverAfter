import { useState } from 'react';
import { Sparkles, LogOut, Loader } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

/**
 * Persistent demo-mode indicator, rendered app-wide (App.tsx) whenever the
 * demo session is active. Two jobs:
 *  1. Honesty: every screen in demo shows realistic sample data (vitals,
 *     security findings, finances). This pill makes sure no viewer can
 *     mistake it for live data, on any route, on any screen size.
 *  2. Exit: demo used to be exitable only from the Dashboard header; this
 *     gives every route an exit that tears the demo session down cleanly.
 *
 * Positioning: bottom-left, above the fixed SaintsNavigation bar (z-40,
 * bottom-0) and below toasts (z-[9999]).
 */
export default function DemoBanner() {
  const { isDemoMode, signOut } = useAuth();
  const [exiting, setExiting] = useState(false);

  if (!isDemoMode) return null;

  const handleExit = async () => {
    if (exiting) return;
    setExiting(true);
    try {
      await signOut();
    } catch {
      // The demo session lives in localStorage; even if signOut throws we
      // still hard-reload below, which clears the interceptor for real.
    }
    // Hard navigation (not SPA nav) so the fetch interceptor, axios adapter,
    // and any mounted mock-fed state are fully torn down.
    window.location.replace('/');
  };

  return (
    <div
      role="status"
      aria-label="Demo mode is active. All data shown is sample data."
      className="fixed bottom-20 left-3 z-50 flex items-center gap-2 rounded-full border border-amber-400/40 bg-slate-950/90 py-1.5 pl-3 pr-1.5 shadow-lg shadow-amber-950/40 backdrop-blur-sm"
    >
      <Sparkles className="h-3.5 w-3.5 shrink-0 text-amber-300" aria-hidden="true" />
      <span className="text-xs font-medium tracking-wide text-amber-200">Demo — sample data</span>
      <button
        type="button"
        onClick={handleExit}
        disabled={exiting}
        className="flex min-h-8 items-center gap-1 rounded-full bg-amber-400/90 px-2.5 py-1 text-xs font-semibold text-slate-900 transition-colors hover:bg-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:opacity-60"
      >
        {exiting ? (
          <Loader className="h-3 w-3 animate-spin" aria-hidden="true" />
        ) : (
          <LogOut className="h-3 w-3" aria-hidden="true" />
        )}
        Exit
      </button>
    </div>
  );
}
