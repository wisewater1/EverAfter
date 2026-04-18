import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import { withTimeout } from '../lib/withTimeout';
import { attemptAuthConfigRecovery, isInvalidApiKeyError } from '../lib/auth-config-recovery';
import { clearDemoAuth, enableDemoAuth, isDemoAuthEnabled, readDemoAuthState } from '../lib/demo-auth';
import { initDemoInterceptor, removeDemoInterceptor } from '../lib/demo/demo-data-provider';

export interface ErrorNotificationHook {
  showError: (message: string, severity?: 'critical' | 'warning' | 'info') => void;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isDemoMode: boolean;
  signUp: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  startDemoMode: () => void;
  setErrorNotifier: (notifier: ErrorNotificationHook) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_BOOT_TIMEOUT_MS = 3000;
const AUTH_SNAPSHOT_KEY = 'everafter_auth_snapshot';

function deriveSupabaseStorageKey(): string | null {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) return null;

  try {
    const host = new URL(supabaseUrl).hostname;
    const projectRef = host.split('.')[0];
    return projectRef ? `sb-${projectRef}-auth-token` : null;
  } catch {
    return null;
  }
}

function readWarmAuthState(): { session: Session | null; user: User | null } {
  if (typeof window === 'undefined') {
    return { session: null, user: null };
  }

  const storageKeys = [AUTH_SNAPSHOT_KEY, deriveSupabaseStorageKey()].filter(Boolean) as string[];

  for (const key of storageKeys) {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;

      const parsed = JSON.parse(raw);
      const candidateSession = parsed?.currentSession ?? parsed?.session ?? parsed;
      const accessToken = candidateSession?.access_token;
      const user = candidateSession?.user;

      if (accessToken && user?.id) {
        return {
          session: candidateSession as Session,
          user: user as User,
        };
      }
    } catch {
      // Ignore invalid persisted auth snapshots.
    }
  }

  return { session: null, user: null };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const demoAuthState = readDemoAuthState();
  const warmAuthState = demoAuthState.user ? demoAuthState : readWarmAuthState();
  const [user, setUser] = useState<User | null>(warmAuthState.user);
  const [session, setSession] = useState<Session | null>(warmAuthState.session);
  const [loading, setLoading] = useState(!warmAuthState.user);
  const [isDemoMode, setIsDemoMode] = useState(Boolean(demoAuthState.user));
  const [errorNotifier, setErrorNotifier] = useState<ErrorNotificationHook | null>(null);

  useEffect(() => {
    console.log('AuthContext: Initializing...', { hasSupabase: !!supabase });
    if (isDemoAuthEnabled()) {
      const demoState = readDemoAuthState();
      setSession(demoState.session);
      setUser(demoState.user);
      setIsDemoMode(true);
      setLoading(false);
      return;
    }

    if (!supabase) {
      console.warn('AuthContext: Supabase client is null');
      setLoading(false);
      return;
    }

    const persistSnapshot = (nextSession: Session | null) => {
      if (typeof window === 'undefined') return;

      try {
        if (nextSession?.access_token && nextSession.user?.id) {
          window.localStorage.setItem(AUTH_SNAPSHOT_KEY, JSON.stringify({ session: nextSession }));
        } else {
          window.localStorage.removeItem(AUTH_SNAPSHOT_KEY);
        }
      } catch {
        // Ignore storage failures.
      }
    };

    const initAuth = async () => {
      try {
        const { data: { session }, error } = await withTimeout(
          supabase.auth.getSession(),
          AUTH_BOOT_TIMEOUT_MS,
          'Timed out while restoring the current session'
        );
        if (error) throw error;

        console.log('AuthContext: Session retrieved', { hasSession: !!session });
        setSession(session);
        setUser(session?.user ?? null);
        setIsDemoMode(false);
        removeDemoInterceptor();
        persistSnapshot(session);
      } catch (err) {
        console.error('AuthContext: Session retrieval crash', err);
        const message = err instanceof Error ? err.message : String(err);

        if (isInvalidApiKeyError(message)) {
          if (attemptAuthConfigRecovery(window.location.pathname)) {
            return;
          }
        }

        // Don't swallow the error, trigger the global overlay if possible
        if (window.onerror) {
          window.onerror(`Auth Initialization Failed: ${err}`, 'AuthContext.tsx', 0, 0, err as Error);
        }
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    const loadingWatchdog = window.setTimeout(() => {
      console.warn('AuthContext: Loading watchdog released auth spinner');
      setLoading(false);
    }, AUTH_BOOT_TIMEOUT_MS + 2000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      console.log('AuthContext: Auth state changed', { event: _event, hasSession: !!session });
      setSession(session);
      setUser(session?.user ?? null);
      setIsDemoMode(false);
      persistSnapshot(session);
      setLoading(false);
    });

    return () => {
      clearTimeout(loadingWatchdog);
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string) => {
    clearDemoAuth();
    setIsDemoMode(false);
    if (!supabase) return { error: { message: 'Supabase client not initialized', name: 'ConfigError', status: 500 } as AuthError };
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: {
            display_name: email.split('@')[0]
          }
        }
      });

      if (error) {
        logger.critical('Signup failed', error);
        errorNotifier?.showError(
          error.message || 'Unable to create account. Please try again.',
          'critical'
        );
        return { error };
      }


      // Supabase now auto-confirms emails in some configurations
      // If we have both user and session, auth is complete
      if (data?.user && data?.session) {
        setSession(data.session);
        setUser(data.user);
      }

      return { error: null };
    } catch (err) {
      logger.critical('Signup exception', err);
      const errorMsg = err instanceof Error ? err.message : 'Signup failed';
      errorNotifier?.showError(errorMsg, 'critical');
      return {
        error: {
          message: errorMsg,
          name: 'SignupError',
          status: 500
        } as AuthError
      };
    }
  };

  const signIn = async (email: string, password: string) => {
    clearDemoAuth();
    setIsDemoMode(false);
    if (!supabase) return { error: { message: 'Supabase client not initialized', name: 'ConfigError', status: 500 } as AuthError };
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
        options: { // Added explicit options to match some client versions if needed, or remove if not
        }
      });

      if (error) {
        logger.critical('Sign in failed', error);
        errorNotifier?.showError(
          error.message || 'Unable to sign in. Please check your credentials.',
          'critical'
        );
        return { error };
      }


      // Manually update state to ensure immediate update
      if (data?.user && data?.session) {
        setSession(data.session);
        setUser(data.user);
      }

      return { error: null };
    } catch (err) {
      logger.critical('Sign in exception', err);
      const errorMsg = err instanceof Error ? err.message : 'Sign in failed';
      errorNotifier?.showError(errorMsg, 'critical');
      return {
        error: {
          message: errorMsg,
          name: 'SignInError',
          status: 500
        } as AuthError
      };
    }
  };

  const signOut = async () => {
    clearDemoAuth();
    setIsDemoMode(false);
    if (isDemoMode) {
      setSession(null);
      setUser(null);
      return { error: null };
    }

    if (!supabase) return { error: { message: 'Supabase client not initialized', name: 'ConfigError', status: 500 } as AuthError };
    const { error } = await supabase.auth.signOut();
    if (error) {
      logger.error('Sign out failed', error);
      errorNotifier?.showError('Failed to sign out. Please try again.', 'warning');
    }
    return { error };
  };

  const resetPassword = async (email: string) => {
    if (!supabase) return { error: { message: 'Supabase client not initialized', name: 'ConfigError', status: 500 } as AuthError };
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      logger.error('Password reset failed', error);
      errorNotifier?.showError('Failed to send password reset email. Please try again.', 'warning');
    }
    return { error };
  };

  const startDemoMode = () => {
    const demoState = enableDemoAuth();
    initDemoInterceptor();
    setSession(demoState.session);
    setUser(demoState.user);
    setIsDemoMode(true);
    setLoading(false);
  };

  const value = {
    user,
    session,
    loading,
    isDemoMode,
    signUp,
    signIn,
    signOut,
    resetPassword,
    startDemoMode,
    setErrorNotifier,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
