import { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, RefreshCcw, Home } from 'lucide-react';
import ErrorBoundary from './ErrorBoundary';

/**
 * Localized, recoverable fallback for a crashed route. Unlike the app-root
 * ErrorBoundary (full-screen, terminal), this keeps the user in the app: any
 * navigation remounts the boundary (see the pathname key below), so a crash on
 * one page never strands the whole SPA.
 */
function RouteErrorFallback() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900/50 sm:backdrop-blur-xl border border-red-800/50 rounded-2xl shadow-2xl p-8">
        <div className="flex flex-col items-center text-center space-y-6">
          <div className="w-16 h-16 bg-red-950/50 rounded-full flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-white">This page hit a snag</h1>
            <p className="text-slate-400 text-sm">
              Something on this screen failed to load. The rest of the app is fine —
              head back and try again.
            </p>
          </div>
          <div className="flex gap-3 w-full">
            <button
              onClick={() => window.location.reload()}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl transition-all flex items-center justify-center gap-2 text-sm font-medium shadow-lg"
            >
              <RefreshCcw className="w-4 h-4" />
              Reload
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-all flex items-center justify-center gap-2 text-sm font-medium border border-slate-700"
            >
              <Home className="w-4 h-4" />
              Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Wraps the routed view in an ErrorBoundary keyed by pathname. The key is the
 * mechanism that isolates failures: when the path changes the boundary
 * remounts fresh (hasError reset), so navigating away from a crashed route
 * auto-recovers — no full reload, no app-wide blank screen.
 */
export default function RouteErrorBoundary({ children }: { children: ReactNode }) {
  const location = useLocation();
  return (
    <ErrorBoundary key={location.pathname} fallback={<RouteErrorFallback />}>
      {children}
    </ErrorBoundary>
  );
}
