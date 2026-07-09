---
tags: [backend, edge-functions, shared-utilities, embeddings, diagnostics]
updated: 2026-07-02
---

# Shared Edge Function Utilities

The `supabase/functions/_shared/` helper modules that newer edge functions import, plus the thirteen "everything else" functions: 365-day training endpoints, embedding generators, the knowledge base pair, and ops/diagnostic utilities.

## The `_shared/` Modules

| Module | Exports | Notes |
|---|---|---|
| `connectors.ts` | `getCorsHeaders`, `supabaseFromRequest` (anon key + forwarded JWT), `serviceSupabase`, `jsonResponse`/`errorResponse`, `verifyTerraSignature`, `verifyFitbitSignature`, `generateDedupKey`, `ingestMetric`, `getUserIdFromExternalId`, `getProviderConfig`, `exchangeCodeForTokens` | The workhorse. `ingestMetric` dedups within a ±5-minute window (same value ±0.1 within 1 minute), range-validates per metric (glucose 40–400, HR 30–220, ...), stamps `quality_score`/`is_anomaly`, and logs violations to `data_quality_issues`. |
| `glucose.ts` | `toMgDl` (mmol/L × 18.0182), `upsertGlucoseReading` (conflict `user_id,engram_id,ts,src`), `upsertLabResult`, `insertMetabolicEvent`, `getOrCreateRaphaelEngram`, `verifyDexcomSignature`, `parseDexcomCsv`, `computeTIR`, `computeGlucoseStats` (mean/median/SD/GMI), `logJobAudit` | Core math for [[Glucose Monitoring and Alerts]] and [[Health Data Normalization]]. |
| `token-refresh.ts` | `getValidToken` (auto-refresh within 5 min of expiry), `storeTokens` | Reads/writes `provider_accounts.*_encrypted` columns — which hold **plaintext** tokens despite the name. |
| `logger.ts` | `Logger` class | Structured JSON logs with request IDs, duration, and redaction of keys containing password/token/secret/apikey — the [[PHI Handling]] logging guard. |
| `validation.ts` | `validateEmail`, `validateUUID`, `validateProvider`, `validateMetricType`, ... | Whitelist validation; providers limited to fitbit/oura/terra/dexcom/garmin/whoop/withings/polar/manual. |
| `cache.ts` | `Cache<T>` class | In-memory TTL + LRU cache with hit-rate stats (per-isolate only). |
| `data-transform.ts` | `transformDexcomData`, `transformFitbitData`, ... (`HealthDataMapper` consumed by `health-sync-processor`) | Provider payload → `StandardMetric` rows. |
| `provider-apis.ts` | `fetchDexcomData` (sandbox v3 EGVs), `fetchFitbitData`, `fetchOuraData` | Thin authenticated fetchers used by sync flows. |

> [!note] Only the newer generation of functions imports `_shared/` (`webhook-terra`, `cgm-*`, `connect-*`, `sync-health-now`, `token-refresh`, `glucose-aggregate-cron`, `health-insights-ai`). Older functions re-declare their own CORS headers and clients inline, which is why conventions drift between files.

## 365-Day Training Functions

The pipeline behind [[365-Day Personality Training]] and [[Custom Engrams]]:

- `daily-progress` — JWT-forwarded; calls the `get_or_create_user_progress` RPC and returns `{ progress_id, user_id }`.
- `get-daily-question` — calls `get_daily_question_for_user` RPC, returns the question plus streak/progress from `user_daily_progress`.
- `submit-daily-response` — stores the answer in `daily_question_responses`, mirrors it into `memories` (with time-of-day and mood), then embeds `Question+Answer` via `text-embedding-3-small` (1536 dims) into `daily_question_embeddings` and flags `embedding_generated`.
- `generate-embeddings` — general-purpose embedder into `engram_memory_embeddings` or `family_member_embeddings` (for [[Family Engrams]]); returns a **mock embedding** when `OPENAI_API_KEY` is missing so dev flows keep working.
- `generate-personality-profile` — batches a user's answered questions through gpt-4o-mini to extract traits (core traits, communication style, social tendencies, ...) with confidence and evidence, recording `ai_model_used: "gpt-4o-mini"`.

## Knowledge Base Pair

- `knowledge-ingest` — accepts `{ source_type, source_id, content, processing_options }`, generates OpenAI embeddings, and stores entries for the [[Knowledge Base System]]; supports entity extraction and relationship discovery flags.
- `knowledge-query` — text/vector/structured search with filters (user, engram, categories, date range, quality score) and a `requester` block distinguishing user/ai_agent/system callers. Text queries are embedded on the fly via `api.openai.com/v1/embeddings`.

## Ops and Diagnostics

- `safety-monitor` — the "negative delta detector": snapshots and compares row counts on eight health tables (`health_connections`, `health_unified_metrics`, `health_clinical_records`, ...) to catch mass deletions. Actions: `check`, `snapshot`, `compare`. Note this is **data-loss** monitoring, not chat-content moderation — the name overlaps confusingly with the [[Safety Guardrails]] concept.
- `send-admin-notification` — reads unsent `admin_notifications`, renders an HTML email for `ADMIN_EMAIL` (default `raphael@everafter.com`)...

> [!warning] ...but never sends it. There is no mail-provider call — the function `console.log`s the subject and marks `is_emailed = true` (`supabase/functions/send-admin-notification/index.ts:138-148`). Admin "emails" are silently swallowed until Resend/SendGrid/SES is wired in.

- `connection-rotation` — action-routed (`process_queue`, `schedule_rotation`, `execute_sync`, `check_health`) processor for `connection_sync_queue`, providing prioritized rotation and failover across a user's connected providers. See [[Connection Rotation]].
- `cgm-manual-upload` — JWT-authenticated multipart/JSON upload of Dexcom Clarity CSVs; parses via `parseDexcomCsv`, attaches readings to the auto-created St. Raphael engram, upserts `glucose_readings` (`src='manual'` rows are excluded from the daily aggregate cron), and audits via `logJobAudit`.
- `terra-test` — fires canned Terra activity/sleep/heart-rate payloads (mock user `mock_user_123`) at the webhook pipeline for integration testing of [[Terra Integration]].
- `test-key` — GET diagnostic that reports whether `SUPABASE_URL`, anon/service keys, and `OPENAI_API_KEY` are configured and exercises the OpenAI models/embeddings/chat endpoints. Handy first stop when a deploy misbehaves; pairs with [[Environment Variables]].

## Key Files

- `supabase/functions/_shared/connectors.ts` — CORS, clients, signatures, ingestion
- `supabase/functions/_shared/glucose.ts` — glucose math, CSV parsing, audit logging
- `supabase/functions/_shared/token-refresh.ts` — token expiry handling
- `supabase/functions/_shared/logger.ts` — redacting structured logger
- `supabase/functions/_shared/validation.ts` — input whitelists
- `supabase/functions/_shared/cache.ts` — in-memory TTL/LRU cache
- `supabase/functions/_shared/data-transform.ts` — provider → standard metric mapping
- `supabase/functions/_shared/provider-apis.ts` — Dexcom/Fitbit/Oura fetchers
- `supabase/functions/submit-daily-response/index.ts` — response + memory + embedding
- `supabase/functions/generate-personality-profile/index.ts` — trait extraction
- `supabase/functions/knowledge-query/index.ts` — knowledge search
- `supabase/functions/safety-monitor/index.ts` — row-count integrity checks
- `supabase/functions/test-key/index.ts` — config diagnostics

## Related

- [[Edge Functions Overview]] — the full inventory these helpers serve
- [[365-Day Personality Training]] — the daily-question product loop
- [[Embeddings and Vector Search]] — where all these embeddings land
- [[Knowledge Base System]] — ingest/query concepts
- [[Health Data Normalization]] — rules encoded in `glucose.ts`/`connectors.ts`
- [[Connection Rotation]] — the rotation feature in depth
- [[PHI Handling]] — why the logger redacts what it redacts
