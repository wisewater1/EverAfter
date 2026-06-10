/**
 * Environment Variable Validation
 * Ensures all required environment variables are present and valid
 */

interface Env {
  VITE_SUPABASE_URL: string;
  VITE_SUPABASE_ANON_KEY: string;
}

/**
 * Validates URL format
 */
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates and returns typed environment variables
 * In production, we log warnings instead of throwing to prevent blank screens
 */
function validateEnv(): Env {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const isProd = import.meta.env.PROD;

  const missingVars = [];
  if (!url) missingVars.push('VITE_SUPABASE_URL');
  if (!anonKey) missingVars.push('VITE_SUPABASE_ANON_KEY');

  if (missingVars.length > 0) {
    const msg = `Environment validation failed: Missing ${missingVars.join(', ')}. Runtime-gated features will remain unavailable until configuration is complete.`;
    if (isProd) {
      console.error(msg);
    } else {
      console.warn(msg);
    }
  }

  if (url && !isValidUrl(url)) {
    console.error('Invalid VITE_SUPABASE_URL format');
  }

  return {
    VITE_SUPABASE_URL: url || '',
    VITE_SUPABASE_ANON_KEY: anonKey || '',
  };
}

export const env = validateEnv();

export const isProduction = import.meta.env.PROD;
export const isDevelopment = import.meta.env.DEV;

function isLocalhostUrl(url: string): boolean {
  return /https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(url);
}

export function normalizeApiBaseUrl(value: string): string {
  const normalized = String(value || '').trim().replace(/\/$/, '');
  if (!normalized) {
    return '';
  }

  if (!isDevelopment && isLocalhostUrl(normalized)) {
    console.warn('Ignoring localhost API base URL in production build; falling back to same-origin API routes.');
    return '';
  }

  return normalized;
}

// In local Vite dev, prefer the relative proxy paths exposed on :5000.
// In production, ignore localhost values so deployed bundles never call a visitor's machine.
const configuredApiBaseUrl = isDevelopment ? '' : (import.meta.env.VITE_API_BASE_URL || '');
const configuredHealthApiBaseUrl = import.meta.env.VITE_HEALTH_API_BASE_URL || '';

export const API_BASE_URL = normalizeApiBaseUrl(configuredApiBaseUrl);
export const HEALTH_API_BASE_URL = normalizeApiBaseUrl(configuredHealthApiBaseUrl);

export function buildApiUrl(path: string): string {
  if (!path) {
    return API_BASE_URL;
  }

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

export function buildHealthApiUrl(path: string): string {
  if (!path) {
    return HEALTH_API_BASE_URL;
  }

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${HEALTH_API_BASE_URL}${normalizedPath}`;
}
