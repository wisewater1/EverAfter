import { API_BASE_URL, isDevelopment, normalizeApiBaseUrl } from './env';
import { BackendCircuitOpenError, isBackendCircuitOpen, isUnreachableError, recordBackendReachable, recordBackendUnreachable } from './backend-health';

const BACKEND_BASE_URL_CANDIDATES = [
  import.meta.env.VITE_API_BASE_URL,
  import.meta.env.VITE_API_FALLBACK_URL,
  import.meta.env.VITE_API_TUNNEL_URL,
  import.meta.env.VITE_RENDER_API_URL,
  import.meta.env.VITE_LOCAL_API_URL,
]
  .map((value) => normalizeApiBaseUrl(String(value || '')))
  .filter(Boolean);

// A cold Render instance can take 30-60s to wake; an interactive request
// cannot wait that long. Fail fast and let the caller's fallback (Supabase,
// local cache, or an honest empty state) take over instead of the user
// staring at a spinner. See src/lib/backend-health.ts for the companion
// circuit breaker that skips this wait entirely on repeat calls.
export const DEFAULT_BACKEND_TIMEOUT_MS = 3500;

class BackendRoutingError extends Error {}

/**
 * A response the backend answered with that will not succeed on retry.
 *
 * Carries the HTTP status so callers can branch on it. Without this the only
 * way to tell a deliberate 501 from a genuine failure was to search the message
 * text for a marker, which couples the caller to how the body happens to be
 * serialised.
 */
class BackendTerminalError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'BackendTerminalError';
    this.status = status;
  }
}

export function isNotImplementedError(error: unknown): boolean {
  return error instanceof BackendTerminalError && error.status === 501;
}

function normalizeErrorMessage(message: string, endpoint: string): string {
  const trimmed = message.trim();
  if (!trimmed) {
    return `Backend request failed for ${endpoint}.`;
  }

  try {
    const parsed = JSON.parse(trimmed) as {
      detail?: unknown;
      error?: unknown;
      message?: unknown;
    };
    const candidate = parsed?.detail ?? parsed?.error ?? parsed?.message;
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim().slice(0, 180).replace(/\s+/g, ' ');
    }
    if (candidate !== undefined && candidate !== null) {
      return JSON.stringify(candidate).slice(0, 180).replace(/\s+/g, ' ');
    }
  } catch {
    // Fall back to the original compact text path.
  }

  const compact = trimmed.slice(0, 180).replace(/\s+/g, ' ');
  if (!compact) {
    return `Backend request failed for ${endpoint}.`;
  }
  return compact;
}

function isBackendEndpoint(endpoint: string): boolean {
  return endpoint.startsWith('/api/v1') || endpoint.startsWith('/governance');
}

export function getBackendCandidateUrls(endpoint: string): string[] {
  const candidates = new Set<string>();

  if (isDevelopment && endpoint.startsWith('/governance')) {
    candidates.add(`http://localhost:8010${endpoint}`);
  }

  if (endpoint.startsWith('/')) {
    candidates.add(endpoint);
  }

  if (API_BASE_URL) {
    candidates.add(`${API_BASE_URL}${endpoint}`);
  }

  for (const baseUrl of BACKEND_BASE_URL_CANDIDATES) {
    candidates.add(`${baseUrl}${endpoint}`);
  }

  if (isDevelopment && isBackendEndpoint(endpoint) && !endpoint.startsWith('/governance')) {
    candidates.add(`http://localhost:8010${endpoint}`);
  }

  return Array.from(candidates);
}

function shouldTryNextCandidate(response: Response, candidateUrl: string, endpoint: string): boolean {
  return (
    isDevelopment &&
    candidateUrl === endpoint &&
    isBackendEndpoint(endpoint) &&
    (response.status === 404 || response.status === 405)
  );
}

async function parseResponseText<T>(response: Response, endpoint: string): Promise<T> {
  const text = await response.text();

  if (!text) {
    return {} as T;
  }

  const compact = text.trim().slice(0, 180).replace(/\s+/g, ' ');
  if (compact.startsWith('<!doctype') || compact.startsWith('<html')) {
    throw new BackendRoutingError(`Backend returned HTML for ${endpoint}. Check API routing.`);
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new BackendTerminalError(`Backend returned invalid JSON for ${endpoint}.`);
  }
}

function createTimedRequestInit(init: RequestInit = {}): { requestInit: RequestInit; clear: () => void } {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), DEFAULT_BACKEND_TIMEOUT_MS);

  return {
    requestInit: {
      ...init,
      signal: init.signal ?? controller.signal,
    },
    clear: () => window.clearTimeout(timeoutId),
  };
}

async function ensureNonHtmlResponse(response: Response, endpoint: string): Promise<void> {
  const contentType = response.headers.get('content-type')?.toLowerCase() || '';
  if (contentType.includes('text/html')) {
    throw new BackendRoutingError(`Backend returned HTML for ${endpoint}. Check API routing.`);
  }
}

export async function requestBackendJson<T>(
  endpoint: string,
  init: RequestInit = {},
  fallbackLabel?: string,
): Promise<T> {
  if (isBackendCircuitOpen()) {
    throw new BackendCircuitOpenError(endpoint);
  }

  let lastError: Error | null = null;
  let sawUnreachable = false;

  for (const candidateUrl of getBackendCandidateUrls(endpoint)) {
    try {
      const { requestInit, clear } = createTimedRequestInit(init);

      let response: Response;
      try {
        response = await fetch(candidateUrl, requestInit);
      } finally {
        clear();
      }

      if (!response.ok) {
        if (shouldTryNextCandidate(response, candidateUrl, endpoint)) {
          lastError = new BackendRoutingError(`Backend route ${endpoint} is not available on the current origin.`);
          continue;
        }

        const text = await response.text();
        const compact = normalizeErrorMessage(text, endpoint);

        if (compact.startsWith('<!doctype') || compact.startsWith('<html')) {
          lastError = new BackendRoutingError(`Backend returned HTML for ${endpoint}. Check API routing.`);
          continue;
        }

        recordBackendReachable();
        throw new BackendTerminalError(compact || `${fallbackLabel || 'Backend request failed'}: ${response.status}`, response.status);
      }

      recordBackendReachable();
      return await parseResponseText<T>(response, endpoint);
    } catch (error) {
      if (error instanceof BackendTerminalError) {
        throw error;
      }

      if (error instanceof BackendRoutingError) {
        lastError = error;
        continue;
      }

      if (error instanceof DOMException && error.name === 'AbortError') {
        lastError = new Error(`Backend request timed out for ${endpoint}.`);
        sawUnreachable = true;
      } else {
        lastError = error instanceof Error
          ? error
          : new Error(fallbackLabel || `Backend request failed for ${endpoint}.`);
        sawUnreachable = sawUnreachable || isUnreachableError(error);
      }

    }
  }

  if (sawUnreachable) {
    recordBackendUnreachable();
  }

  throw lastError || new Error(fallbackLabel || `Backend request failed for ${endpoint}.`);
}

export async function requestBackendResponse(
  endpoint: string,
  init: RequestInit = {},
  fallbackLabel?: string,
): Promise<Response> {
  if (isBackendCircuitOpen()) {
    throw new BackendCircuitOpenError(endpoint);
  }

  let lastError: Error | null = null;
  let sawUnreachable = false;

  for (const candidateUrl of getBackendCandidateUrls(endpoint)) {
    try {
      const { requestInit, clear } = createTimedRequestInit(init);

      let response: Response;
      try {
        response = await fetch(candidateUrl, requestInit);
      } finally {
        clear();
      }

      if (!response.ok) {
        if (shouldTryNextCandidate(response, candidateUrl, endpoint)) {
          lastError = new BackendRoutingError(`Backend route ${endpoint} is not available on the current origin.`);
          continue;
        }

        const text = await response.text();
        const compact = normalizeErrorMessage(text, endpoint);

        if (compact.startsWith('<!doctype') || compact.startsWith('<html')) {
          lastError = new BackendRoutingError(`Backend returned HTML for ${endpoint}. Check API routing.`);
          continue;
        }

        recordBackendReachable();
        throw new BackendTerminalError(compact || `${fallbackLabel || 'Backend request failed'}: ${response.status}`, response.status);
      }

      recordBackendReachable();
      await ensureNonHtmlResponse(response, endpoint);
      return response;
    } catch (error) {
      if (error instanceof BackendTerminalError) {
        throw error;
      }

      if (error instanceof BackendRoutingError) {
        lastError = error;
        continue;
      }

      if (error instanceof DOMException && error.name === 'AbortError') {
        lastError = new Error(`Backend request timed out for ${endpoint}.`);
        sawUnreachable = true;
      } else {
        lastError = error instanceof Error
          ? error
          : new Error(fallbackLabel || `Backend request failed for ${endpoint}.`);
        sawUnreachable = sawUnreachable || isUnreachableError(error);
      }

    }
  }

  if (sawUnreachable) {
    recordBackendUnreachable();
  }

  throw lastError || new Error(fallbackLabel || `Backend request failed for ${endpoint}.`);
}

/**
 * Fire-and-forget wake-up call for the Render backend, meant to be invoked
 * once as early as possible in app bootstrap (see AuthContext.tsx). A free
 * tier instance can take 30-60s to cold-start; pinging it the moment the app
 * loads, rather than waiting for the first real feature request, gives it
 * the maximum possible head start. Never throws and never blocks a caller.
 */
export function warmupBackend(): void {
  if (typeof window === 'undefined' || typeof fetch === 'undefined') {
    return;
  }

  for (const candidateUrl of getBackendCandidateUrls('/health')) {
    fetch(candidateUrl, { method: 'GET' }).catch(() => {
      // Best-effort only; failures here are expected while the instance wakes.
    });
    break; // One candidate is enough to trigger the wake-up.
  }
}
