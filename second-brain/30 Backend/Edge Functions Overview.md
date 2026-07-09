---
tags: [backend, edge-functions, supabase, deno, inventory]
updated: 2026-07-02
---

# Edge Functions Overview

Catalog of all 55 Deno edge functions in `supabase/functions/`, the serverless half of the [[Dual Backend System]]. Each function is a folder containing a single `index.ts` served by `Deno.serve()`; shared helpers live in `supabase/functions/_shared/` (see [[Shared Edge Function Utilities]]).

## Inventory

### AI chat and coaching — [[AI Chat Edge Functions]]

| Function | Purpose |
|---|---|
| `raphael-chat` | [[St Raphael]] health-companion chat with safety system prompt (OpenAI gpt-4o-mini) |
| `engram-chat` | [[Custom Engrams]] personality chat with vector-memory retrieval |
| `career-chat` | [[Career Companion]] agent with OpenAI tool calling; dual owner/public-token auth |
| `career-profile-update` | CRUD for career profiles and public chat-token generation |
| `device-troubleshooting-ai` | Device connectivity troubleshooting guidance (gpt-4-turbo-preview) |
| `health-insights-ai` | Statistical trend/anomaly/correlation insights (no LLM call despite the name) |

### Health data sync and analytics — [[Health Data Edge Functions]]

| Function | Purpose |
|---|---|
| `sync-health-now` | User-triggered pull sync from Fitbit/Oura APIs into `health_metrics` |
| `sync-health-data` | Inserts **mock** random metrics for `health_connections` (demo scaffold) |
| `health-sync-processor` | Worker that drains `health_sync_jobs` with retry/backoff |
| `device-backfill` | Queues a backfill row in `sync_jobs` |
| `terra-backfill` | Pulls historical Terra data into `terra_metrics_raw` |
| `glucose-aggregate-cron` | Daily TIR/GMI aggregation into `glucose_daily_agg` |
| `token-refresh` | Refreshes expiring provider OAuth tokens |
| `analytics-aggregator` | Cached per-provider analytics via `analytics_cache` |
| `predictive-health-analytics` | 7-day trend predictions from `health_metrics` (pure statistics) |
| `insights-report` | Periodic KPI report with optional OpenAI narrative |

### Webhooks and streams — [[Webhook Edge Functions]]

| Function | Purpose |
|---|---|
| `webhook-terra` | Terra webhook → HMAC verify → `health_metrics` |
| `terra-webhook` | Parallel Terra webhook → `terra_metrics_raw` / `terra_metrics_normalized` |
| `webhook-fitbit` | Fitbit notification → fetch data → `health_metrics` |
| `webhook-dexcom` | Stub — logs payload, returns `stub_acknowledged` |
| `webhook-oura` | Stub — logs payload, returns `stub_acknowledged` |
| `cgm-dexcom-webhook` | Dexcom EGV push → `glucose_readings` upsert |
| `device-webhook-handler` | Generic device webhook → `metrics_norm` + device-health alerts |
| `device-stream-handler` | Registers realtime streams; ingests stream data points |
| `device-stream` | Server-sent-events stream of connection/alert/webhook changes |

### OAuth and connections — [[OAuth Edge Functions]]

| Function | Purpose |
|---|---|
| `connect-start` | Redirects to provider auth URL (Terra/Fitbit/Oura/Dexcom) |
| `connect-callback` | Exchanges code, upserts `provider_accounts`, returns HTML |
| `health-oauth-initiate` | Registry-driven OAuth start using `health_providers_registry` |
| `health-oauth-callback` | Registry-driven token exchange into `health_connections` |
| `cgm-dexcom-oauth` | Dexcom-specific init+callback (sandbox/production switch) |
| `fhir-smart-auth` | [[SMART on FHIR]] launch/callback/metadata for EHRs |
| `terra-widget` | Generates a Terra widget session URL (no JWT check) |

### Agent and tasks — [[Agent and Task Edge Functions]]

| Function | Purpose |
|---|---|
| `agent` | [[St Raphael]] agent chat with memory + task tools (OpenAI function calling) |
| `agent-cron` | Drains `agent_task_queue`; execution steps are **simulated** |
| `manage-agent-tasks` | REST-style CRUD on `agent_tasks` per saint |
| `task-create` | Creates `engram_ai_tasks` rows after engram ownership check |
| `marketplace-template-run` | Runs purchased [[Marketplace and Creator Dashboard|marketplace]] AI templates |

### Vault — [[Vault Edge Functions]]

| Function | Purpose |
|---|---|
| `vault-export` | Consent-gated export with SHA-256 watermark + receipt |
| `vault-integrity-check` | Recomputes item hashes against audit log |
| `vault-scheduler` | Delivers/unlocks scheduled [[Legacy Vault]] items |

### Payments — [[Payment Edge Functions]]

| Function | Purpose |
|---|---|
| `stripe-checkout` | Creates Stripe customer + Checkout session |
| `stripe-webhook` | Signature-verified event sync into `subscriptions`, activates Saints |

### 365-day training and knowledge — [[Shared Edge Function Utilities]]

| Function | Purpose |
|---|---|
| `daily-progress` | Calls `get_or_create_user_progress` RPC |
| `get-daily-question` | Next [[365-Day Personality Training]] question + streak |
| `submit-daily-response` | Stores response, memory row, and embedding |
| `generate-embeddings` | Embeds text into engram/family-member embedding tables |
| `generate-personality-profile` | Builds personality profile from answered questions (gpt-4o-mini) |
| `knowledge-ingest` | Ingests content into the [[Knowledge Base System]] |
| `knowledge-query` | Text/vector/structured search over knowledge base |

### Ops and diagnostics — [[Shared Edge Function Utilities]]

| Function | Purpose |
|---|---|
| `safety-monitor` | Row-count delta detector guarding health tables against data loss |
| `send-admin-notification` | Formats admin emails; **only logs**, no mail provider wired |
| `connection-rotation` | [[Connection Rotation]] queue processing / failover sync |
| `cgm-manual-upload` | Dexcom CSV upload → `glucose_readings` |
| `terra-test` | Sends mock Terra payloads for integration testing |
| `test-key` | Diagnostics for Supabase/OpenAI configuration |

## Shared Conventions

- **CORS**: every function hand-rolls the same permissive headers (`Access-Control-Allow-Origin: *`) and answers `OPTIONS` preflight with 200. `stripe-checkout` uses 204.
- **Auth** comes in three flavors (see [[Authentication and JWT Flow]]):
  1. Anon-key client with forwarded JWT (`raphael-chat`, `task-create`) — [[Row Level Security]] enforced.
  2. Service-role client + `auth.getUser(token)` (`engram-chat`, `manage-agent-tasks`) — identity checked, RLS bypassed.
  3. No auth at all (`terra-widget`, `vault-*`, `device-backfill`, webhooks) — webhooks rely on [[Webhook Signature Verification]] instead.
- **Error shape**: newer functions return `{ code, message, hint? }` (e.g. `AUTH_MISSING`, `CONFIG_MISSING`, `OPENAI_ERROR`); older ones return plain `{ error }`. `EDGE_FUNCTIONS_SETUP.md` documents the code table.
- **Imports**: `npm:@supabase/supabase-js@2.x` or `jsr:@supabase/supabase-js@2`; no bundler, each function is self-contained plus `_shared/`.

> [!warning] CLAUDE.md says the deployed secret for `raphael-chat` is `GROQ_API_KEY`, but no function in `supabase/functions/` references Groq — every LLM call targets `api.openai.com` and reads `OPENAI_API_KEY`. If only `GROQ_API_KEY` is set in production, all AI functions fail with `CONFIG_MISSING`. Trust the code.

## Deploy

```bash
supabase login
supabase link --project-ref sncvecvgxwkkxnxbvglv   # per CLAUDE.md
supabase functions deploy raphael-chat              # one function
supabase functions deploy                           # everything
supabase secrets set OPENAI_API_KEY=sk-...          # secrets, never in code
supabase functions serve                            # local testing
```

Smoke tests: `USER_JWT='token' ./scripts/smoke-test.sh` (see [[Testing Strategy]]). `supabase/config.toml` only configures the **local** stack (ports, Postgres 17, auth defaults) — it contains no per-function settings and no cron schedules, so "cron" functions (`glucose-aggregate-cron`, `agent-cron`, `vault-scheduler`) must be scheduled externally (pg_cron / dashboard scheduler).

## Key Files

- `supabase/functions/` — 55 function folders, one `index.ts` each
- `supabase/functions/_shared/` — connectors, glucose math, logger, validation, cache
- `supabase/config.toml` — local dev stack config only
- `EDGE_FUNCTIONS_SETUP.md` — deploy, secrets, smoke-test, error-code reference
- `scripts/` — smoke-test scripts run against deployed functions

## Related

- [[Backend MOC]] — hub for all server-side notes
- [[Dual Backend System]] — when to use edge functions vs the [[Express Server]]
- [[Shared Edge Function Utilities]] — the `_shared/` helpers most functions import
- [[Authentication and JWT Flow]] — the auth patterns above in detail
- [[Secrets Management]] — where `OPENAI_API_KEY` and provider secrets live
- [[Deployment]] — Netlify frontend + Supabase functions deploy pipeline
- [[Common Gotchas]] — several trace back to functions flagged here
