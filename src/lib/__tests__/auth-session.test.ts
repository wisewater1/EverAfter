import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../supabase', () => ({
  supabase: null,
}));

describe('auth-session', () => {
  beforeEach(() => {
    vi.resetModules();
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.resetModules();
    window.localStorage.clear();
  });

  it('uses the demo session token when demo auth is enabled', async () => {
    window.localStorage.setItem('everafter_demo_auth', '1');

    const { buildAccessTokenHeaders, getAccessToken } = await import('../auth-session');

    await expect(getAccessToken()).resolves.toBe('demo-show-token');
    await expect(
      buildAccessTokenHeaders({
        'Bypass-Tunnel-Reminder': 'true',
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        Authorization: 'Bearer demo-show-token',
        'Bypass-Tunnel-Reminder': 'true',
      }),
    );
  });
});
