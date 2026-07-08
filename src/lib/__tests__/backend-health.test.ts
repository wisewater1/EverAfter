import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('backend-health circuit breaker', () => {
  beforeEach(() => {
    vi.resetModules();
    window.sessionStorage.removeItem('everafter_backend_circuit_until');
  });

  afterEach(() => {
    window.sessionStorage.removeItem('everafter_backend_circuit_until');
  });

  it('is closed until a failure is recorded', async () => {
    const { isBackendCircuitOpen } = await import('../backend-health');
    expect(isBackendCircuitOpen()).toBe(false);
  });

  it('opens after recordBackendUnreachable and persists across a module reload', async () => {
    const { isBackendCircuitOpen, recordBackendUnreachable } = await import('../backend-health');
    recordBackendUnreachable();
    expect(isBackendCircuitOpen()).toBe(true);

    // Simulate a fresh import (e.g. a different module in the same page load)
    // reading the same sessionStorage-backed state.
    vi.resetModules();
    const reloaded = await import('../backend-health');
    expect(reloaded.isBackendCircuitOpen()).toBe(true);
  });

  it('closes immediately on recordBackendReachable', async () => {
    const { isBackendCircuitOpen, recordBackendUnreachable, recordBackendReachable } = await import('../backend-health');
    recordBackendUnreachable();
    expect(isBackendCircuitOpen()).toBe(true);
    recordBackendReachable();
    expect(isBackendCircuitOpen()).toBe(false);
  });

  it('classifies AbortError and TypeError as unreachable, not a generic Error', async () => {
    const { isUnreachableError } = await import('../backend-health');
    expect(isUnreachableError(new DOMException('aborted', 'AbortError'))).toBe(true);
    expect(isUnreachableError(new TypeError('Failed to fetch'))).toBe(true);
    expect(isUnreachableError(new Error('request timed out for /x'))).toBe(true);
    expect(isUnreachableError(new Error('Not authenticated'))).toBe(false);
    expect(isUnreachableError(new Error('Internal Server Error: 500'))).toBe(false);
  });
});

describe('requestBackendJson respects the circuit breaker', () => {
  const originalEnv = { ...import.meta.env };

  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    window.sessionStorage.removeItem('everafter_backend_circuit_until');
    Object.defineProperty(import.meta, 'env', {
      value: {
        ...originalEnv,
        DEV: false,
        PROD: true,
        // Deliberately a single same-origin candidate: exercising the
        // multi-candidate fallback loop isn't this test's concern, and
        // adding more candidates just multiplies how many timeout cycles
        // the timeout-based test below has to advance through.
        VITE_API_BASE_URL: '',
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
    window.sessionStorage.removeItem('everafter_backend_circuit_until');
    Object.defineProperty(import.meta, 'env', {
      value: originalEnv,
      writable: true,
    });
  });

  it('skips the network call entirely once the circuit is open', async () => {
    const { recordBackendUnreachable } = await import('../backend-health');
    recordBackendUnreachable();

    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const { requestBackendJson } = await import('../backend-request');

    await expect(requestBackendJson('/api/v1/health/summary')).rejects.toThrow(/unreachable/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('opens the circuit when a request times out, so the next call fails fast', async () => {
    // Simulates what the fetch promise resolves to once
    // createTimedRequestInit's AbortController actually fires: an AbortError
    // DOMException. Faking the real setTimeout/AbortController wiring here
    // would just be testing the browser's own timer implementation.
    // Rejects on every call, not just once: requestBackendJson tries every
    // candidate base URL it's configured with (there can legitimately be
    // more than one), and each one needs to see the same failure.
    const fetchMock = vi.fn().mockRejectedValue(new DOMException('The operation was aborted.', 'AbortError'));
    vi.stubGlobal('fetch', fetchMock);

    const { requestBackendJson } = await import('../backend-request');
    const { isBackendCircuitOpen } = await import('../backend-health');

    await expect(requestBackendJson('/api/v1/health/summary')).rejects.toThrow(/timed out/i);
    expect(isBackendCircuitOpen()).toBe(true);

    // A second call right after should fail instantly without touching fetch again.
    fetchMock.mockClear();
    await expect(requestBackendJson('/api/v1/health/summary')).rejects.toThrow(/unreachable/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
