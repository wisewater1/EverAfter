import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const originalEnv = { ...import.meta.env };

describe('backend-request', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    Object.defineProperty(import.meta, 'env', {
      value: {
        ...originalEnv,
        DEV: false,
        PROD: true,
        VITE_API_BASE_URL: 'https://api.example.com',
        VITE_API_FALLBACK_URL: '',
        VITE_API_TUNNEL_URL: '',
        VITE_RENDER_API_URL: '',
        VITE_LOCAL_API_URL: '',
      },
      writable: true,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    Object.defineProperty(import.meta, 'env', {
      value: originalEnv,
      writable: true,
    });
  });

  it('surfaces the first real backend error instead of probing fallbacks', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      new Response('Internal Server Error', {
        status: 500,
        headers: { 'content-type': 'text/plain' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const { requestBackendJson } = await import('../backend-request');

    await expect(requestBackendJson('/api/v1/joseph/voice/profiles/gp2')).rejects.toThrow('Internal Server Error');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/joseph/voice/profiles/gp2',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it('unwraps JSON error payloads to the backend detail message', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({ detail: 'Not authenticated' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const { requestBackendJson } = await import('../backend-request');

    await expect(requestBackendJson('/api/v1/finance/wisegold/wallet')).rejects.toThrow('Not authenticated');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('falls through when the same-origin candidate returns HTML', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response('<!doctype html><html></html>', {
          status: 200,
          headers: { 'content-type': 'text/html' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );
    vi.stubGlobal('fetch', fetchMock);

    const { requestBackendJson } = await import('../backend-request');

    await expect(requestBackendJson('/api/v1/health/summary')).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const secondCall = fetchMock.mock.calls[1];
    expect(secondCall?.[0]).not.toBe('/api/v1/health/summary');
    expect(String(secondCall?.[0])).toContain('/api/v1/health/summary');
    expect(secondCall?.[1]).toEqual(expect.objectContaining({ signal: expect.any(AbortSignal) }));
  });
});
