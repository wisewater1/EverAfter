import type { Session } from '@supabase/supabase-js';

import { supabase } from './supabase';
import { readDemoAuthState } from './demo-auth';

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

function readPersistedSession(): Session | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const demoState = readDemoAuthState();
  if (demoState.session?.access_token) {
    return demoState.session;
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
        return candidateSession as Session;
      }
    } catch {
      // Ignore malformed auth snapshots and continue searching.
    }
  }

  return null;
}

export async function getAuthSession(): Promise<Session | null> {
  if (supabase) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        return session;
      }
    } catch {
      // Fall back to the warm auth snapshot below.
    }
  }

  return readPersistedSession();
}

export async function getAccessToken(): Promise<string | null> {
  const session = await getAuthSession();
  return session?.access_token || null;
}

export async function buildAccessTokenHeaders(extraHeaders: HeadersInit = {}): Promise<HeadersInit> {
  const token = await getAccessToken();
  return token
    ? { ...extraHeaders, Authorization: `Bearer ${token}` }
    : extraHeaders;
}

export function isAuthFailureMessage(message: string | null | undefined): boolean {
  const normalized = (message || '').toLowerCase();
  return (
    normalized.includes('not authenticated') ||
    normalized.includes('invalid authorization') ||
    normalized.includes('authentication failed') ||
    normalized.includes('www-authenticate') ||
    normalized.includes('401')
  );
}
