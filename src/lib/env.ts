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
 * Throws descriptive error if validation fails
 */
function validateEnv(): Env {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!url || typeof url !== 'string') {
    throw new Error('Environment validation failed:\nVITE_SUPABASE_URL is required\n\nPlease check your .env file.');
  }

  if (!isValidUrl(url)) {
    throw new Error('Environment validation failed:\nVITE_SUPABASE_URL: Invalid Supabase URL\n\nPlease check your .env file.');
  }

  if (!anonKey || typeof anonKey !== 'string' || anonKey.length === 0) {
    throw new Error('Environment validation failed:\nVITE_SUPABASE_ANON_KEY is required\n\nPlease check your .env file.');
  }

  return {
    VITE_SUPABASE_URL: url,
    VITE_SUPABASE_ANON_KEY: anonKey,
  };
}

export const env = validateEnv();

export const isProduction = import.meta.env.PROD;
export const isDevelopment = import.meta.env.DEV;
