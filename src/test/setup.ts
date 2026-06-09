import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

// jsdom 27 under vitest 4 / Node 22 does not expose Web Storage on window (the
// origin is opaque, and Node's experimental localStorage is gated behind a flag),
// so window.localStorage is undefined and any test that touches it throws.
// Provide a minimal, spec-compatible localStorage/sessionStorage.
function createStorage(): Storage {
  let store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear() {
      store = new Map();
    },
    getItem(key: string) {
      return store.has(key) ? (store.get(key) as string) : null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(String(key), String(value));
    },
  } as Storage;
}

for (const name of ['localStorage', 'sessionStorage'] as const) {
  if ((globalThis as Record<string, unknown>)[name] == null) {
    Object.defineProperty(globalThis, name, {
      value: createStorage(),
      configurable: true,
      writable: true,
    });
  }
  if (typeof window !== 'undefined' && (window as Record<string, unknown>)[name] == null) {
    Object.defineProperty(window, name, {
      value: (globalThis as Record<string, unknown>)[name],
      configurable: true,
      writable: true,
    });
  }
}

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock environment variables for tests
Object.defineProperty(import.meta, 'env', {
  value: {
    VITE_SUPABASE_URL: 'https://test.supabase.co',
    VITE_SUPABASE_ANON_KEY: 'test-anon-key',
    MODE: 'test',
    DEV: false,
    PROD: false,
  },
  writable: true,
});
