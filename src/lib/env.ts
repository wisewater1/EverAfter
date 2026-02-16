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
    const msg = `Environment validation failed: Missing ${missingVars.join(', ')}. App will load in limited mode.`;
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
