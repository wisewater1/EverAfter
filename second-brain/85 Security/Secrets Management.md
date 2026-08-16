---
tags: [security, secrets, env-vars, netlify, render]
updated: 2026-08-16
---

# Secrets Management

Secrets live in three provider-side stores — Supabase Function Secrets, Netlify build environment, and Render environment variables — and never in the repo: `.gitignore` blocks every `.env` variant and Netlify's secret scanner fails the build if a real key reaches the bundle. This is a public repo, and it has leaked credentials before, so the guardrails here are load-bearing. For the variable-by-variable catalog see [[Environment Variables]]; this note is about *where secrets are stored and how they are protected*.

## The Three Stores

**1. Supabase Function Secrets** — for everything edge functions read via `Deno.env.get()`. Set in Dashboard → Settings → Edge Functions → Secrets or `supabase secrets set KEY=value`; never in `.env` files. `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are injected by the platform automatically. Secrets the functions actually read (verified by grepping `Deno.env.get` across `supabase/functions/`): `OPENAI_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID_PRO`, `STRIPE_PRICE_ID_ENTERPRISE`, `TERRA_WEBHOOK_SECRET`, `TERRA_API_KEY`, `TERRA_DEV_ID`, `TERRA_CLIENT_ID`/`SECRET`, `DEXCOM_CLIENT_ID`/`SECRET`/`WEBHOOK_SECRET`/`REDIRECT_URL`/`ENVIRONMENT`, `FITBIT_CLIENT_ID`/`SECRET`/`SUBSCRIBER_VERIFICATION_CODE`, `OURA_CLIENT_ID`/`SECRET`, `SMART_CLIENT_ID`, `CRON_SECRET`, `APP_URL`/`APP_BASE_URL`, `ALLOWED_ORIGINS`, `ADMIN_EMAIL`.

**2. Netlify build environment** — only for `VITE_*` values that are *meant* to be public, since Vite bakes them into the shipped JS bundle. In production that is exactly `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (the anon key is publishable; [[Row Level Security]] is the real protection). `netlify.toml:10` keeps Netlify's secret scanning **on** and allowlists only those two via `SECRETS_SCAN_OMIT_KEYS` — anything else that looks like a key in the bundle fails the deploy.

**3. Render environment** — for the FastAPI backend, the Elohim worker, and the voice sidecar. `render.yaml` declares every secret with `sync: false`, meaning the value is entered in the Render dashboard, not committed: `DATABASE_URL`, the Supabase trio plus `SUPABASE_JWT_SECRET` (required or the backend rejects all Supabase tokens — `render.yaml:40-43`), `JWT_SECRET_KEY`, `BANK_CONNECTOR_SECRET` (a dedicated Fernet key for encrypting Plaid bank tokens at rest — explicitly *not* the JWT secret reused), `OPENAI_API_KEY`, `TERRA_*`, `SMTP_*`, `PLAID_CLIENT_ID`/`PLAID_SECRET`, `WISEGOLD_ORACLE_API_KEY`, `ELEVENLABS_API_KEY` (voice sidecar), and the build-time-only `ELOHIM_REPO_TOKEN`. See [[Deployment]] for the service topology.

## Special Cases

- **Stripe price IDs are secrets by design.** `supabase/functions/stripe-webhook/index.ts:127-133` builds its price→plan map from `STRIPE_PRICE_ID_PRO`/`STRIPE_PRICE_ID_ENTERPRISE` so production price IDs never live in code; an unmapped price grants **nothing** (it used to silently grant `pro`). Per `CURRENT_STATE.md`, setting these two to the real price IDs is still an open owner action — see [[Payments and Subscriptions]].
- **BYOK user keys live in the database, not in secrets.** `supabase/functions/_shared/user-api-keys.ts` resolves the caller's own OpenAI/Groq key from the RLS-protected `user_provider_credentials` table (with an explicit `eq('user_id', …)` filter as belt-and-braces) before falling back to the shared server secret. [[AI Chat Edge Functions]] all route key lookup through this helper.
- **`CRON_SECRET`** gates scheduler-triggered functions (`glucose-aggregate-cron` accepts the service-role key or `CRON_SECRET`), so cron invocations need no user JWT. The pg_cron oversight job avoids HTTP entirely — `CURRENT_STATE.md` notes it calls the SQL function directly precisely so no service-role key has to be stored inside the database.
- **Error hygiene**: `docs/archive/SECURITY.md:59-67` requires errors never to include full API keys. The `test-key` function, which echoed an OpenAI key prefix with no auth, was deleted in PR #120.

> [!warning] Docs disagree about the chat key
> `CLAUDE.md` says `GROQ_API_KEY` is the secret set for `raphael-chat`, but the code reads `OPENAI_API_KEY` (`supabase/functions/raphael-chat/index.ts:92`, via `resolveApiKey`). Trust the code: the shared-secret fallback for [[St Raphael]] chat is the OpenAI key. Groq appears only as a BYOK provider option.

## Repo-Side Protections (`.gitignore`)

`.gitignore` encodes the leak history in its comments — each rule marks an incident class:

- **All env files**: `.env`, `.env.*`, `**/.env*` are ignored; only `*.env.example` templates are tracked ("PUBLIC REPO: never commit real env files").
- **Debug/dump artifacts** (`build_error.txt`, `live_debug.js`, `prisma_out.txt`, …): ignored because they "leaked DB hostnames/paths before".
- **Credential/session notes** (`conversation.md`, `LOGIN_CREDENTIALS.md`): ignored because they "leaked a live access token before".

## Leak History and Open Actions

PR #120 (2026-07-22) redacted a live `sbp_` Supabase CLI access token and a live demo-account password from `FABLE_FINALIZATION_PROMPT.md` at HEAD, and its commit message records what redaction cannot do: **rotate the token and password at the provider, and purge both from git history** (filter-repo/BFG) — flagged as human-action-required because the repo is intended to be public and old commits still contain the strings. The incident-response runbook in `docs/archive/SECURITY.md:189-207` covers rotation mechanics (`supabase secrets set` + redeploy, notify users within 72h under GDPR).

> [!tip] Adding a new secret, in order
> 1. Decide the layer: read by an edge function → Supabase Secrets; by the Python backend → Render dashboard + a `sync: false` entry in `render.yaml`; by the browser → it is not a secret, and only `VITE_*` publishable values qualify.
> 2. Add a placeholder to `.env.example` so local dev knows it exists.
> 3. Never `VITE_`-prefix a private value — the prefix ships it in the public bundle. The cautionary tale is `src/lib/terra-config.ts`, which reads `TERRA_API_KEY`/`TERRA_WEBHOOK_SECRET` from `import.meta.env` without the prefix: Vite never exposes them, so the (orphaned) [[Terra Client Library]] UI path always reports them missing. Do not "fix" it by adding `VITE_`.

## Key Files

- `netlify.toml` — secret-scanning allowlist (`SECRETS_SCAN_OMIT_KEYS`) restricted to the two publishable Supabase values.
- `render.yaml` — every Render secret declared `sync: false`; `BANK_CONNECTOR_SECRET` and `SUPABASE_JWT_SECRET` requirements documented inline.
- `.gitignore` — env-file blanket ban plus incident-derived ignore rules.
- `.env.example` — the canonical local template (placeholders only).
- `supabase/functions/_shared/user-api-keys.ts` — BYOK resolution: user key from `user_provider_credentials`, else shared secret.
- `supabase/functions/stripe-webhook/index.ts` — price IDs consumed as secrets, unmapped prices grant nothing.
- `docs/archive/SECURITY.md` — rotation and incident-response runbook (archived location).

## Related

- [[Environment Variables]] — the full variable catalog this note deliberately does not repeat.
- [[Security Overview]] — API-key exposure is threat 4 in the threat model.
- [[Deployment]] — which dashboard each store is configured in.
- [[Webhook Signature Verification]] — the webhook secrets these stores feed.
- [[Payments and Subscriptions]] — why the Stripe price-ID secrets are load-bearing for entitlements.
- [[Edge Functions Overview]] — the consumers of the Supabase secret store.
