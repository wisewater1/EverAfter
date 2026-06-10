import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCcw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900/50 backdrop-blur-xl border border-red-800/50 rounded-2xl shadow-2xl p-8">
            <div className="flex flex-col items-center text-center space-y-6">
              <div className="w-16 h-16 bg-red-950/50 rounded-full flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-red-400" />
              </div>

              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-white">Something Went Wrong</h1>
                <p className="text-slate-400 text-sm">
                  A critical error occurred and the application cannot continue. Please try refreshing the page.
                </p>
              </div>

              {this.state.error && (
                <div className="w-full bg-slate-950/50 border border-slate-800 rounded-lg p-4 text-left">
                  <p className="text-xs font-mono text-red-400 break-all">
                    {this.state.error.message}
                  </p>
                </div>
              )}

              <div className="flex gap-3 w-full">
                <button
                  onClick={this.handleReset}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl transition-all flex items-center justify-center gap-2 text-sm font-medium shadow-lg"
                >
                  <RefreshCcw className="w-4 h-4" />
                  Try Again
                </button>
                <button
                  onClick={this.handleGoHome}
                  className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-all flex items-center justify-center gap-2 text-sm font-medium border border-slate-700"
                >
                  <Home className="w-4 h-4" />
                  Go Home
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
