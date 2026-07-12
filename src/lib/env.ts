/**
 * Environment Variable Validation
 * Zod-schema validation of the client environment. Failures are logged
 * (error in prod, warn in dev) rather than thrown, so a misconfigured
 * deploy degrades to runtime-gated features instead of a blank screen.
 */
import { z } from 'zod';

const envSchema = z.object({
  VITE_SUPABASE_URL: z
    .string()
    .min(1, 'VITE_SUPABASE_URL is required')
    .url('VITE_SUPABASE_URL must be a valid URL'),
  VITE_SUPABASE_ANON_KEY: z
    .string()
    .min(1, 'VITE_SUPABASE_ANON_KEY is required')
    .regex(/^(sb_publishable_|eyJ)/, 'VITE_SUPABASE_ANON_KEY must be a Supabase publishable key or JWT'),
});

type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const raw = {
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL ?? '',
    VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
  };

  const result = envSchema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues.map((i) => i.message).join('; ');
    const msg = `Environment validation failed: ${issues}. Runtime-gated features will remain unavailable until configuration is complete.`;
    if (import.meta.env.PROD) {
      console.error(msg);
    } else {
      console.warn(msg);
    }
    // Degrade gracefully with the raw (possibly empty) values.
    return raw;
  }

  return result.data;
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
