---
tags: [operations, env-vars, configuration, secrets]
updated: 2026-07-02
---

# Environment Variables

Every configuration value the platform reads, grouped by layer: frontend `VITE_*` build-time vars, Supabase edge function secrets, the Express/Node `.env`, the `health-api/` service, and the Render Python backend. `.env.example` is the canonical local template. Where the *storage* of secrets is the question, see [[Secrets Management]].

## Frontend (`VITE_*`, baked into the bundle)

Read via `import.meta.env` at build time. Set in `.env` locally and in the Netlify dashboard for builds ([[Deployment]]); `netlify.toml` allowlists the two publishable values for secret scanning.

| Variable | Purpose |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL for the JS client (most-used var in `src/`) |
| `VITE_SUPABASE_ANON_KEY` | Publishable anon key; RLS does the real protection |
| `VITE_API_BASE_URL` | FastAPI app backend base URL (local default `http://localhost:8010`) |
| `VITE_HEALTH_API_BASE_URL` | `health-api/` provider-integration backend (local default `:4000`) |
| `VITE_HEALTH_API_URL` | Alternate health-api URL read by `src/components/ComprehensiveHealthConnectors.tsx` |
| `VITE_RENDER_API_URL` / `VITE_LOCAL_API_URL` / `VITE_API_URL` / `VITE_API_TUNNEL_URL` / `VITE_API_FALLBACK_URL` | Backend endpoint candidates tried by `src/lib/backend-request.ts` |
| `VITE_ENABLE_NON_CORE_ROUTES` | Feature flag exposing non-core routes (Playwright e2e sets it `true`) |
| `VITE_DEV_MODE`, `VITE_MOCK_TERRA_DATA`, `VITE_ALLOW_DEV_MOCKS` | Dev/demo toggles for mock data paths |

> [!warning] Anything prefixed `VITE_` ships in the public JS bundle — never put a private key behind that prefix. Conversely, `src/lib/terra-config.ts` reads `import.meta.env.TERRA_API_KEY` / `TERRA_DEV_ID` / `TERRA_WEBHOOK_SECRET` **without** the prefix, which Vite never exposes: `validateTerraConfig()` therefore always reports them missing in the browser. Dead code, but it documents an intent to put Terra secrets client-side that must not be "fixed" by adding `VITE_`.

## Supabase Edge Function Secrets

Read via `Deno.env.get()`. Set in Dashboard → Settings → Edge Functions → Secrets or `supabase secrets set KEY=value` — **not** in `.env` files. `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically by the platform.

| Secret | Used by |
|---|---|
| `OPENAI_API_KEY` | All AI functions (`raphael-chat`, `agent`, `engram-chat`, `generate-embeddings`, …) — see [[AI Chat Edge Functions]] |
| `APP_URL` / `APP_BASE_URL` / `BASE_URL` | OAuth redirect and link building (naming is inconsistent across functions) |
| `TERRA_DEV_ID`, `TERRA_API_KEY`, `TERRA_WEBHOOK_SECRET`, `TERRA_CLIENT_ID`, `TERRA_CLIENT_SECRET` | [[Terra Integration]] widget, backfill, webhook HMAC |
| `DEXCOM_CLIENT_ID`, `DEXCOM_CLIENT_SECRET`, `DEXCOM_REDIRECT_URL`, `DEXCOM_ENVIRONMENT`, `DEXCOM_WEBHOOK_SECRET` | [[Dexcom CGM]] OAuth (sandbox/production switch) and webhook |
| `FITBIT_CLIENT_ID`, `FITBIT_CLIENT_SECRET`, `FITBIT_SUBSCRIBER_VERIFICATION_CODE` | [[Fitbit Integration]] OAuth + subscriber verification |
| `OURA_CLIENT_ID`, `OURA_CLIENT_SECRET` | [[Oura Integration]] OAuth |
| `SMART_CLIENT_ID` | [[SMART on FHIR]] EHR launch |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | [[Payment Edge Functions]] checkout + signature verification |
| `ADMIN_EMAIL` | `send-admin-notification` recipient |

> [!warning] `CLAUDE.md` says the only secret currently set is `GROQ_API_KEY`, but no deployed function reads it — they read `OPENAI_API_KEY`. Verify the real secret list in the dashboard before debugging "CONFIG_MISSING" errors.

## Express Server `.env` (`server/`)

Read via `process.env`; loaded from the repo-root `.env` for `npm run dev:server` / `dev:worker`.

| Variable | Purpose |
|---|---|
| `PORT` | Express listen port (default `3001` in `server/index.ts:35`) |
| `DATABASE_URL` | Postgres for the [[Prisma Schema]] client |
| `REDIS_URL` | Redis for the [[BullMQ Scheduler]] (default `redis://localhost:6379`) |
| `TERRA_API_KEY`, `TERRA_DEV_ID`, `TERRA_WEBHOOK_SECRET` | [[Terra Client Library]] auth + webhook HMAC |
| `BASE_URL` | Public HTTPS base for OAuth callbacks |
| `BRIDGE_SHARED_SECRET` | Signed shared secret for Apple Health / Health Connect mobile bridges (`server/api/connections/bridges.ts`) |
| `MOCK_PROVIDERS` | `1` = mock provider responses for demos |
| `NODE_ENV` | Standard environment switch |

## health-api Service (`health-api/`)

Separate Express service with its own Prisma client; the widest provider surface.

- Core: `PORT`, `DATABASE_URL`, `REDIS_URL`, `BASE_URL`, `CORS_ORIGIN`, `JWT_SECRET`, `ENCRYPTION_KEY` (token encryption at rest, `health-api/src/utils/crypto.ts`), `LOG_LEVEL`, `ENABLE_SWAGGER_UI`, `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX_REQUESTS`.
- Provider OAuth pairs: `DEXCOM_`, `FITBIT_`, `OURA_`, `WHOOP_`, `WITHINGS_`, `POLAR_`, `STRAVA_`, `GOOGLE_FIT_`, `ABBOTT_` (`*_CLIENT_ID`/`*_CLIENT_SECRET`), `GARMIN_CONSUMER_KEY`/`_SECRET`, plus `TERRA_*` again.
- Mobile bridges: `APPLE_HEALTH_BRIDGE_SECRET`, `HEALTH_CONNECT_BRIDGE_SECRET`.

## Render Python Backend (`render.yaml` + `.env.example`)

`everafter-api` needs `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET` (required — without it every Supabase token is rejected), `SUPABASE_JWT_ISSUER`/`_AUDIENCE`, `JWT_SECRET_KEY`, `OPENAI_API_KEY`, `TERRA_*`, Plaid vars (`PLAID_CLIENT_ID`, `PLAID_SECRET`, `PLAID_ENV`, …), `BANK_CONNECTOR_SECRET` (Fernet key for bank tokens — never reuse the JWT secret), `SMTP_SERVER`/`_USERNAME`/`_PASSWORD`, `WISEGOLD_ORACLE_API_KEY`, `VOICE_AI_BASE_URL`, `ELEVENLABS_API_KEY`, and demo-auth flags (`ALLOW_PRESENTATION_DEMO_AUTH`, `DEMO_AUTH_TOKEN` — forced `false` in production).

## Key Files

- `.env.example` — canonical template covering frontend, server, and Python backend vars
- `scripts/validate-build-env.mjs` — rejects builds with missing/masked frontend vars
- `netlify.toml` — `SECRETS_SCAN_OMIT_KEYS` allowlist for the two publishable values
- `render.yaml` — full env var manifest for the three Render services
- `src/lib/terra-config.ts` — the non-`VITE_` Terra var trap described above
- `server/index.ts` — Express port default
- `health-api/src/config/providers.ts` — provider client ID/secret wiring

## Related

- [[Secrets Management]] — storage and rotation policy for the sensitive subset
- [[Deployment]] — which platform each layer's vars are set on
- [[Common Gotchas]] — the Groq/OpenAI and `VITE_` prefix traps
- [[Dual Backend System]] — why four layers of configuration exist
- [[Health OAuth Flow]] — consumer of most provider client IDs/secrets
- [[Operations MOC]] — hub for operations notes
