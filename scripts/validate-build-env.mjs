const isProductionBuild =
  process.env.CONTEXT === 'production' ||
  process.env.NODE_ENV === 'production' ||
  process.env.NETLIFY === 'true';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const apiBaseUrl = process.env.VITE_API_BASE_URL || '';

const failures = [];

function isMasked(value) {
  return value.includes('*');
}

function isLocalhostUrl(value) {
  return /https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(value);
}

if (!supabaseUrl) {
  failures.push('Missing VITE_SUPABASE_URL');
}

if (!supabaseAnonKey) {
  failures.push('Missing VITE_SUPABASE_ANON_KEY');
} else {
  if (isMasked(supabaseAnonKey)) {
    failures.push('VITE_SUPABASE_ANON_KEY is masked/censored instead of the real key');
  }

  if (!/^sb_publishable_|^eyJ/.test(supabaseAnonKey)) {
    failures.push('VITE_SUPABASE_ANON_KEY does not look like a valid Supabase publishable key');
  }
}

if (isProductionBuild) {
  if (!apiBaseUrl) {
    failures.push('Missing VITE_API_BASE_URL for production build');
  } else if (isMasked(apiBaseUrl)) {
    failures.push('VITE_API_BASE_URL is masked/censored instead of the real URL');
  } else if (isLocalhostUrl(apiBaseUrl)) {
    failures.push('VITE_API_BASE_URL points to localhost during a production build');
  }
}

if (failures.length > 0) {
  console.error('\nBuild environment validation failed:\n');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  console.error('\nRefusing to build with invalid production configuration.\n');
  process.exit(1);
}

console.log('Build environment validation passed.');
