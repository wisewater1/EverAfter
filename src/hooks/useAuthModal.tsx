import { useState, useCallback } from 'react';

interface AuthIntent {
  action: string;
  data?: any;
  redirectUrl?: string;
}

export function useAuthModal() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authTab, setAuthTab] = useState<'signin' | 'signup'>('signin');
  const [contextMessage, setContextMessage] = useState<string>('');
  const [authIntent, setAuthIntent] = useState<AuthIntent | null>(null);

  const openAuthModal = useCallback((options?: {
    tab?: 'signin' | 'signup';
    message?: string;
    intent?: AuthIntent;
  }) => {
    setAuthTab(options?.tab || 'signin');
    setContextMessage(options?.message || '');
    setAuthIntent(options?.intent || null);

    if (options?.intent) {
      sessionStorage.setItem('auth_intent', JSON.stringify(options.intent));
    }

    setIsAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
    setContextMessage('');
  }, []);

  const clearAuthIntent = useCallback(() => {
    setAuthIntent(null);
    sessionStorage.removeItem('auth_intent');
  }, []);

  const getAuthIntent = useCallback((): AuthIntent | null => {
    if (authIntent) return authIntent;

    const stored = sessionStorage.getItem('auth_intent');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return null;
      }
    }
    return null;
  }, [authIntent]);

  return {
    isAuthModalOpen,
    authTab,
    contextMessage,
    openAuthModal,
    closeAuthModal,
    authIntent: getAuthIntent(),
    clearAuthIntent,
  };
}
