import { API_BASE_URL, isDevelopment } from './env';

const EXPLICIT_API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

function normalizeErrorMessage(message: string, endpoint: string): string {
  const compact = message.trim().slice(0, 180).replace(/\s+/g, ' ');
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

  if (EXPLICIT_API_BASE_URL) {
    candidates.add(`${EXPLICIT_API_BASE_URL}${endpoint}`);
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
    throw new Error(`Backend returned HTML for ${endpoint}. Check API routing.`);
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Backend returned invalid JSON for ${endpoint}.`);
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
      const response = await fetch(candidateUrl, init);

      if (!response.ok) {
        const text = await response.text();
        const compact = normalizeErrorMessage(text, endpoint);

        if (compact.startsWith('<!doctype') || compact.startsWith('<html')) {
          lastError = new Error(`Backend returned HTML for ${endpoint}. Check API routing.`);
          continue;
        }

        throw new Error(compact || `${fallbackLabel || 'Backend request failed'}: ${response.status}`);
      }

      return await parseResponseText<T>(response, endpoint);
    } catch (error) {
      lastError = error instanceof Error
        ? error
        : new Error(fallbackLabel || `Backend request failed for ${endpoint}.`);

      if (!isDevelopment && candidateUrl === endpoint) {
        continue;
      }
    }
  }

  throw lastError || new Error(fallbackLabel || `Backend request failed for ${endpoint}.`);
}
