import type { Session, User } from '@supabase/supabase-js';

const DEMO_AUTH_KEY = 'everafter_demo_auth';

function buildDemoUser(): User {
  return {
    id: '00000000-0000-4000-8000-000000000001',
    app_metadata: { provider: 'demo', providers: ['demo'] },
    user_metadata: { full_name: 'Demo Presenter' },
    aud: 'authenticated',
    created_at: new Date().toISOString(),
    email: 'demo@everafter.ai',
    role: 'authenticated',
  } as User;
}

function generateSessionToken(prefix: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `${prefix}-${timestamp}-${random}`;
}

function buildDemoSession(): Session {
  const user = buildDemoUser();
  return {
    access_token: generateSessionToken('demo-at'),
    refresh_token: generateSessionToken('demo-rt'),
    expires_in: 60 * 60 * 24,
    expires_at: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
    token_type: 'bearer',
    user,
  } as Session;
}

export function isDemoAuthEnabled(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    return window.localStorage.getItem(DEMO_AUTH_KEY) === '1';
  } catch {
    return false;
  }
}

export function enableDemoAuth(): { user: User; session: Session } {
  const user = buildDemoUser();
  const session = buildDemoSession();

  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(DEMO_AUTH_KEY, '1');
    } catch {
      // Ignore storage failures and still return the in-memory demo session.
    }
  }

  return { user, session };
}

export function clearDemoAuth(): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.removeItem(DEMO_AUTH_KEY);
  } catch {
    // Ignore storage failures.
  }
}

export function readDemoAuthState(): { user: User | null; session: Session | null } {
  if (!isDemoAuthEnabled()) {
    return { user: null, session: null };
  }

  return {
    user: buildDemoUser(),
    session: buildDemoSession(),
  };
}
