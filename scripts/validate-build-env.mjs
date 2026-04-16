import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import dotenv from 'dotenv';

const mode = process.env.MODE || process.env.NODE_ENV || 'production';
const envFiles = [
  '.env',
  '.env.local',
  `.env.${mode}`,
  `.env.${mode}.local`,
];

for (const envFile of envFiles) {
  const path = resolve(process.cwd(), envFile);
  if (existsSync(path)) {
    dotenv.config({ path, override: false });
  }
}

const isProductionBuild =
  process.env.CONTEXT === 'production' ||
  process.env.NODE_ENV === 'production' ||
  process.env.NETLIFY === 'true';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const apiBaseUrl = process.env.VITE_API_BASE_URL || '';

const failures = [];
const warnings = [];

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

if (isProductionBuild && apiBaseUrl) {
  if (isMasked(apiBaseUrl)) {
    warnings.push('Ignoring masked VITE_API_BASE_URL during production build; frontend will use same-origin API routes.');
  } else if (isLocalhostUrl(apiBaseUrl)) {
    warnings.push('Ignoring localhost VITE_API_BASE_URL during production build; frontend will use same-origin API routes.');
  }
}

if (failures.length > 0) {
  if (isProductionBuild) {
    console.error('\nBuild environment validation failed:\n');
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    console.error('\nRefusing to build with invalid production configuration.\n');
    process.exit(1);
  } else {
    console.warn('\nBuild environment warnings (non-production build):\n');
    for (const failure of failures) {
      console.warn(`- ${failure}`);
    }
    console.warn('\nContinuing with incomplete configuration for non-production build.\n');
  }
}

if (warnings.length > 0) {
  console.warn('\nBuild environment warnings:\n');
  for (const warning of warnings) {
    console.warn(`- ${warning}`);
  }
  console.warn('');
}

console.log('Build environment validation passed.');
