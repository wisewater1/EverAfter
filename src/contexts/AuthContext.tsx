import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';

export interface ErrorNotificationHook {
  showError: (message: string, severity?: 'critical' | 'warning' | 'info') => void;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  setErrorNotifier: (notifier: ErrorNotificationHook) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorNotifier, setErrorNotifier] = useState<ErrorNotificationHook | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string) => {
    try {
      console.log('[AuthContext] Starting signup for:', email);
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

      console.log('[AuthContext] Signup successful:', {
        hasUser: !!data?.user,
        hasSession: !!data?.session,
        userId: data?.user?.id
      });

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
    try {
      console.log('[AuthContext] Starting sign in for:', email);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        logger.critical('Sign in failed', error);
        errorNotifier?.showError(
          error.message || 'Unable to sign in. Please check your credentials.',
          'critical'
        );
        return { error };
      }

      console.log('[AuthContext] Sign in successful:', {
        hasUser: !!data?.user,
        hasSession: !!data?.session,
        userId: data?.user?.id
      });

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
    const { error } = await supabase.auth.signOut();
    if (error) {
      logger.error('Sign out failed', error);
      errorNotifier?.showError('Failed to sign out. Please try again.', 'warning');
    }
    return { error };
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      logger.error('Password reset failed', error);
      errorNotifier?.showError('Failed to send password reset email. Please try again.', 'warning');
    }
    return { error };
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
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
