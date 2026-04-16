/**
 * Shared CORS configuration for all Edge Functions.
 * Only allows known production and dev origins.
 */
const ALLOWED_ORIGINS = [
  'https://everafterai.net',
  'https://dev--everafterai.netlify.app',
];

export function getCorsHeaders(req?: Request): Record<string, string> {
  const origin = req?.headers.get('Origin') ?? null;
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin)
    ? origin
    : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
    'Vary': 'Origin',
  };
}
