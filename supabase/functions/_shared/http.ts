// Shared HTTP helpers: origin-aware CORS + caller authentication.
//
// Replaces the previous wildcard `Access-Control-Allow-Origin: *` that every
// Edge Function used. We reflect the request Origin only when it is on an
// explicit allowlist (production domains, Netlify deploy previews, and local
// dev). Non-allowlisted origins receive no ACAO header, so browsers block the
// cross-origin response.

import { createClient, SupabaseClient } from 'jsr:@supabase/supabase-js@2';

const STATIC_ALLOWED_ORIGINS = new Set<string>([
  'https://everafterai.net',
  'https://www.everafterai.net',
  'https://dev--everafterai.netlify.app',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
]);

// Netlify deploy previews: https://<deploy-context>--everafterai.netlify.app
const NETLIFY_PREVIEW_RE = /^https:\/\/[a-z0-9-]+--everafterai\.netlify\.app$/;

// Additional origins can be supplied via a comma-separated secret without a
// code change (e.g. a custom marketing domain).
function extraAllowedOrigins(): string[] {
  const raw = Deno.env.get('ALLOWED_ORIGINS') ?? '';
  return raw
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
}

export function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  if (STATIC_ALLOWED_ORIGINS.has(origin)) return true;
  if (NETLIFY_PREVIEW_RE.test(origin)) return true;
  return extraAllowedOrigins().includes(origin);
}

const BASE_CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type, Authorization, X-Client-Info, Apikey, apikey, x-cron-secret',
  Vary: 'Origin',
};

/**
 * CORS headers scoped to the request's Origin. Only echoes the Origin when it
 * is on the allowlist. Falls back to the primary production domain when the
 * request has no Origin (e.g. server-to-server / curl) so preflight stays sane.
 */
export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin');
  const allowOrigin = isAllowedOrigin(origin)
    ? (origin as string)
    : 'https://everafterai.net';
  return { ...BASE_CORS_HEADERS, 'Access-Control-Allow-Origin': allowOrigin };
}

export function corsPreflight(req: Request): Response {
  return new Response(null, { status: 204, headers: corsHeaders(req) });
}

export function jsonResponse(req: Request, data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
  });
}

export function errorResponse(req: Request, message: string, status = 400): Response {
  return jsonResponse(req, { error: message }, status);
}

/** Service-role client (bypasses RLS). Use only for genuinely internal paths. */
export function serviceClient(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );
}

export interface AuthedUser {
  id: string;
  email: string | null;
}

/**
 * Validate the caller's Supabase JWT from the Authorization header and return
 * the authenticated user. Throws on missing/invalid token. Callers MUST derive
 * the acting user_id from the returned user — never from the request body.
 */
export async function requireUser(req: Request): Promise<AuthedUser> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
    throw new AuthError('Missing bearer token', 401);
  }

  const client = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data, error } = await client.auth.getUser();
  if (error || !data?.user) {
    throw new AuthError('Invalid or expired token', 401);
  }
  return { id: data.user.id, email: data.user.email ?? null };
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.name = 'AuthError';
    this.status = status;
  }
}

/**
 * Shared-secret guard for cron/internal functions invoked by pg_cron or other
 * schedulers. Requires the `x-cron-secret` header to match the CRON_SECRET
 * env var. If CRON_SECRET is unset, the guard FAILS CLOSED (rejects), so a
 * misconfigured deploy can't leave an internal endpoint wide open.
 */
export function requireCronSecret(req: Request): void {
  const expected = Deno.env.get('CRON_SECRET');
  const provided = req.headers.get('x-cron-secret');
  if (!expected || !provided || provided !== expected) {
    throw new AuthError('Forbidden', 403);
  }
}
