/**
 * Tracks whether the Render backend has recently failed to respond, so a
 * single cold-start or outage doesn't force every feature on a page (or
 * every subsequent page visited in the same tab) to separately pay the full
 * request timeout before falling back. Once a timeout or network failure is
 * recorded, callers skip the network attempt entirely for a cooldown window
 * and go straight to their existing fallback path.
 *
 * Deliberately does NOT open on ordinary HTTP error responses (401, 404,
 * 500 with a JSON body, etc.) — those mean the backend is reachable and
 * answering, just rejecting this one request. Only genuine unreachability
 * (timeout, network-level failure) means the backend itself is unavailable.
 */

const STORAGE_KEY = 'everafter_backend_circuit_until';
const COOLDOWN_MS = 45_000;

// In-memory fallback for environments without sessionStorage (SSR, tests).
let memoryUntil = 0;

function readUntil(): number {
  if (typeof window === 'undefined' || typeof window.sessionStorage === 'undefined') {
    return memoryUntil;
  }
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    return raw ? Number(raw) || 0 : 0;
  } catch {
    return memoryUntil;
  }
}

function writeUntil(value: number): void {
  memoryUntil = value;
  if (typeof window === 'undefined' || typeof window.sessionStorage === 'undefined') {
    return;
  }
  try {
    if (value > 0) {
      window.sessionStorage.setItem(STORAGE_KEY, String(value));
    } else {
      window.sessionStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Ignore storage failures; the in-memory value still applies this session.
  }
}

export function isBackendCircuitOpen(): boolean {
  return Date.now() < readUntil();
}

export function recordBackendUnreachable(): void {
  writeUntil(Date.now() + COOLDOWN_MS);
}

export function recordBackendReachable(): void {
  if (readUntil() !== 0) {
    writeUntil(0);
  }
}

export class BackendCircuitOpenError extends Error {
  constructor(endpoint: string) {
    super(`Skipping ${endpoint}: the backend was unreachable moments ago.`);
    this.name = 'BackendCircuitOpenError';
  }
}

/** True for the class of failures that mean "the backend itself is unreachable", not "it answered with an error". */
export function isUnreachableError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return true;
  }
  if (error instanceof TypeError) {
    // Browsers throw a bare TypeError ("Failed to fetch" / "Load failed") for
    // DNS failures, connection refused, and CORS-blocked network errors.
    return true;
  }
  if (error instanceof Error) {
    return /timed out|timeout/i.test(error.message);
  }
  return false;
}
