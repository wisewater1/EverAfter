import { API_BASE_URL, isDevelopment, normalizeApiBaseUrl } from './env';

const BACKEND_BASE_URL_CANDIDATES = [
  import.meta.env.VITE_API_BASE_URL,
  import.meta.env.VITE_API_FALLBACK_URL,
  import.meta.env.VITE_API_TUNNEL_URL,
  import.meta.env.VITE_RENDER_API_URL,
  import.meta.env.VITE_LOCAL_API_URL,
]
  .map((value) => normalizeApiBaseUrl(String(value || '')))
  .filter(Boolean);
const DEFAULT_BACKEND_TIMEOUT_MS = 8000;

class BackendRoutingError extends Error {}
class BackendTerminalError extends Error {}

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

export function getBackendCandidateUrls(endpoint: string): string[] {
  const candidates = new Set<string>();

  if (endpoint.startsWith('/')) {
    candidates.add(endpoint);
  }

  if (API_BASE_URL) {
    candidates.add(`${API_BASE_URL}${endpoint}`);
  }

  for (const baseUrl of BACKEND_BASE_URL_CANDIDATES) {
    candidates.add(`${baseUrl}${endpoint}`);
  }

  if (isDevelopment && endpoint.startsWith('/api/v1')) {
    candidates.add(`http://localhost:8010${endpoint}`);
  }

  return Array.from(candidates);
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
  let lastError: Error | null = null;

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
        const text = await response.text();
        const compact = normalizeErrorMessage(text, endpoint);

        if (compact.startsWith('<!doctype') || compact.startsWith('<html')) {
          lastError = new BackendRoutingError(`Backend returned HTML for ${endpoint}. Check API routing.`);
          continue;
        }

        throw new BackendTerminalError(compact || `${fallbackLabel || 'Backend request failed'}: ${response.status}`);
      }

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
      } else {
        lastError = error instanceof Error
          ? error
          : new Error(fallbackLabel || `Backend request failed for ${endpoint}.`);
      }

    }
  }

  throw lastError || new Error(fallbackLabel || `Backend request failed for ${endpoint}.`);
}

export async function requestBackendResponse(
  endpoint: string,
  init: RequestInit = {},
  fallbackLabel?: string,
): Promise<Response> {
  let lastError: Error | null = null;

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
        const text = await response.text();
        const compact = normalizeErrorMessage(text, endpoint);

        if (compact.startsWith('<!doctype') || compact.startsWith('<html')) {
          lastError = new BackendRoutingError(`Backend returned HTML for ${endpoint}. Check API routing.`);
          continue;
        }

        throw new BackendTerminalError(compact || `${fallbackLabel || 'Backend request failed'}: ${response.status}`);
      }

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
      } else {
        lastError = error instanceof Error
          ? error
          : new Error(fallbackLabel || `Backend request failed for ${endpoint}.`);
      }

    }
  }

  throw lastError || new Error(fallbackLabel || `Backend request failed for ${endpoint}.`);
}
