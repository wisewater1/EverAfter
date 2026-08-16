---
tags: [operations, gotchas, rls, security, conventions]
updated: 2026-08-16
---

# Common Gotchas

The traps that repeatedly bite people working on this codebase, each verified against the code this session. Most exist because three live backends coexist with two undeployed legacy stacks ([[Dual Backend System]]) and because Postgres defaults are permissive.

## The legacy `server/` stack is NOT deployed

`server/` + `agents/` (Express/Prisma/BullMQ) has no entry in `render.yaml`, `netlify.toml`, or any deploy config, and does not type-check standalone. `npm run dev:server` / `dev:worker` start it locally only. Terra webhooks actually run through the `webhook-terra` edge function (signature-verified), not [[Express Server]]. The same applies to `health-api/` (separate Node/Prisma service, broken, undeployed). Do not build new features on either; owner decision on fix-vs-remove is pending per `CURRENT_STATE.md`.

## Supabase client vs Prisma — never in the same file

Edge functions (Deno) use the Supabase JS client; the legacy `server/` stack uses `@prisma/client` against `prisma/schema.prisma` (verified: `server/index.ts`, `server/api/raphael.ts` import Prisma). They are different runtimes talking to different schemas — the [[Prisma Schema]] is not the production Supabase schema. Corollary: `npm run migrate` is a **Prisma** command; production [[Migrations|migrations]] ship via `supabase db push` ([[Commands Cheatsheet]]).

## Postgres grants EXECUTE on new functions to PUBLIC

Creating a SQL function in a migration makes it callable by `anon` and `authenticated` through PostgREST by default. This caused a real hole: after the household-oversight migration was applied, ten `fn_oversight_*` helpers were reachable by `anon`, two of them exploitable SECURITY DEFINER (one leaked grant rows past [[Row Level Security|RLS]] given any household id, the other injected alerts). The fix pattern is now in the migrations themselves:

- `supabase/migrations/20260723090000_household_financial_oversight.sql:1199` — loop revoking `all on function ... from public, anon, authenticated` over every helper
- `supabase/migrations/20260815170000_schedule_oversight_daily_cron.sql:29` — same for `fn_oversight_daily()`
- `supabase/migrations/20260702000000_lock_down_privileged_rpcs.sql` — earlier lockdown of admin RPCs

> [!warning] Every migration that adds a function must end with an explicit `revoke all on function ... from public, anon, authenticated` — and verify the result against the live database rather than assume it.

## RLS: use `(select auth.uid())`, not bare `auth.uid()`

Wrapping the call in a subselect lets the planner evaluate it once and use indexes; bare `auth.uid()` re-evaluates per row. The hardening migration `supabase/migrations/20260712130000_rls_policy_hardening.sql` uses the idiom throughout (e.g. lines 84, 121, 128). Follow it in every new policy.

## Forward the user JWT from edge functions

When an edge function creates a Supabase client to act **as the caller**, it must forward the incoming `Authorization` header so RLS applies — see `supabase/functions/_shared/http.ts:102` and `supabase/functions/_shared/connectors.ts:22`, both passing `{ global: { headers: { Authorization: authHeader } } }`. A client built from the service-role key bypasses RLS entirely; only use it deliberately ([[Authentication and JWT Flow]]).

## Edge secrets live in the Supabase dashboard, not `.env`

Functions read config via `Deno.env.get()`; values are set in Dashboard → Settings → Edge Functions → Secrets or `supabase secrets set` — never in repo `.env` files. `.env` only feeds the frontend `VITE_*` build and the legacy local server. See [[Environment Variables]] for the full inventory and [[Secrets Management]] for the Groq-vs-OpenAI key discrepancy.

## Glucose: always store mg/dL

All glucose is converted to mg/dL before storage (`mmol/L × 18.0182`), preserving the original unit in metadata. Verified conversion sites: `supabase/functions/_shared/glucose.ts:34`, `src/lib/health-mappers.ts`, `src/lib/health-data-transformer.ts`, `src/lib/connectors/registry.ts`. See [[Health Data Normalization]].

## Webhook idempotency via unique constraints

Providers redeliver webhooks; ingestion must dedupe with database constraints plus upserts, not application logic ([[Webhook Ingestion Pipeline]]):

- `glucose_readings`: `UNIQUE (user_id, engram_id, ts, src)` — `supabase/migrations/20251025120000_create_glucose_metabolic_system.sql:67`
- `health_metrics`: `UNIQUE (user_id, provider, metric_type, metric_name, timestamp)` — `supabase/migrations/20251029120000_create_terra_integration_system.sql:113`
- `provider_accounts`: `UNIQUE (user_id, provider)` — `supabase/migrations/20251025110000_create_health_connectors_system.sql:66`

> [!note] `CLAUDE.md` states the canonical tuple as `(user_id, provider, external_id, ts)` — that is the principle, not a literal constraint; the actual columns differ per table as above. Check the table's migration before assuming.

## Routes gated by `VITE_ENABLE_NON_CORE_ROUTES`

When the flag is unset — which it is in production — `src/App.tsx` redirects every non-core route to the dashboard. Any surface linking into one of those routes must derive its state from `nonCoreRoutesEnabled` in `src/lib/routeAvailability.ts:7`, or it shows a control that silently bounces the user (this actually happened with [[Legacy Vault]] cards; fixed by deriving card state from the same flag). Playwright sets the flag `true` to test those routes ([[Testing Strategy]]).

## Two error-response shapes coexist in edge functions

New/edited functions must return `{code, message, hint}`; the legacy majority still return `{error: message}` via `supabase/functions/_shared/connectors.ts`. Never assume either shape when consuming a function — read it. Migrating a legacy function means updating its callers' error handling in the same change ([[Shared Edge Function Utilities]]).

## Key Files

- `CURRENT_STATE.md` — dated ground truth these gotchas were checked against
- `supabase/functions/_shared/http.ts` — JWT validation + forwarding helper
- `supabase/functions/_shared/glucose.ts` — mg/dL conversion
- `supabase/migrations/20260712130000_rls_policy_hardening.sql` — the `(select auth.uid())` idiom in practice
- `supabase/migrations/20260723090000_household_financial_oversight.sql` — the EXECUTE-revoke pattern
- `src/lib/routeAvailability.ts` — the non-core route flag derivation point
- `prisma/schema.prisma` — legacy-stack schema, not the production database

## Related

- [[Operations MOC]] — hub for all operations notes
- [[Commands Cheatsheet]] — which commands belong to which stack
- [[Environment Variables]] — the `VITE_` prefix and secret-location traps in detail
- [[Row Level Security]] — the policy model these idioms protect
- [[Webhook Signature Verification]] — the other half of safe webhook ingestion
- [[Dual Backend System]] — why live and legacy stacks coexist at all
- [[Deployment]] — what is actually deployed where
