---
tags: [security, phi, hipaa, consent, audit-logging]
updated: 2026-08-16
---

# PHI Handling

EverAfter stores protected health information — glucose readings, heart rate, sleep, medications discussed in chat — so three disciplines apply everywhere: PHI never reaches logs, data use is consent-gated, and access leaves an audit trail. The original consent/audit implementation in `server/lib/` is legacy and undeployed; this note maps the rules to the live equivalents that actually run.

## What Counts as PHI

Two written definitions exist, and they agree in substance:

- `docs/archive/SECURITY.md:138-146` (the threat-model doc): health data content, plus anything that identifies a user — never logged, encrypted at rest and in transit, RLS-isolated.
- `backend/app/services/hipaa_service.py` — the live FastAPI backend's `PHI_DATA_TYPES` map, categorized per HIPAA §164.514(b)(2): **demographics** (name, address, email, birth date), **identifiers** (SSN, MRN, device id, account number), **biometrics** (heart rate, blood pressure, glucose, BMI, steps, sleep), **clinical** (diagnosis, medication, ICD/CPT codes, lab results), **financial** (payment, insurance, claim).

`CLAUDE.md` ("Never log PHI/credentials") adds device serials and OAuth tokens to the never-log list even though they are credentials rather than PHI proper.

> [!warning] `SECURITY.md` moved
> The threat-model doc that [[Security Overview]] cites as root-level `SECURITY.md` now lives at `docs/archive/SECURITY.md` (archived in the PR #118 docs sweep). Its content is still the written policy — the archive location just means it is no longer maintained as ground truth; `CURRENT_STATE.md` is.

## Logging Rules

What may be logged: function invocations, auth events, durations, row *counts*, sanitized errors. What must never be logged: passwords, JWTs, API keys, health data content, full stack traces containing user input (`docs/archive/SECURITY.md:250-256`).

The live code follows this in observable ways:

- `supabase/functions/_shared/glucose.ts:347` — `logJobAudit()` writes only `job_name`, timestamps, `rows_written`, `duration_ms`, `status`, and an error string to `glucose_job_audit`. No reading values.
- The stub webhooks `supabase/functions/webhook-dexcom/index.ts` and `supabase/functions/webhook-oura/index.ts` drain the request body **without logging it**, with an explicit comment: "do NOT log the payload (potential PHI in logs on an unauthenticated endpoint)". They return honest 501s.
- Webhook handlers log external provider ids ("User not found for Terra user: …") and metric counts, not values.

> [!note] Logging ≠ storage
> The no-PHI rule is about *logs*. Full raw provider payloads are deliberately stored in database tables — `webhook_events.payload`, `terra_webhook_events.payload`, `terra_metrics_raw.payload`, and the `raw` jsonb column of `health_metrics` per [[Health Data Normalization]]. That is PHI at rest in operational tables, protected by [[Row Level Security]] and Supabase's encryption at rest, not by redaction.

## Consent — Live Implementations

There is no single consent table; each domain owns one. All are RLS-protected Supabase tables:

| Table | Created in | Purpose |
|---|---|---|
| `connector_consent_ledger` | `supabase/migrations/20251025120000_create_glucose_metabolic_system.sql:151` | Append-only grant/revoke ledger for CGM connectors. Written on Dexcom OAuth grant (`supabase/functions/cgm-dexcom-oauth/index.ts:136`) and manual CGM upload (`supabase/functions/cgm-manual-upload/index.ts:113`) |
| `vault_consents` | `supabase/migrations/20251029150000_create_legacy_vault_system.sql:135` | Purpose-scoped consent with `revoked_at` and `interaction_cap`; enforced by the [[Legacy Vault]] export function (below) |
| `family_consents` | `supabase/migrations/20260225212500_add_family_consents.sql` | The "Consented Family Graph": grantor/grantee pairs per data type (`genetics`, `vitals`, `conditions`, `timeline`), revocation via `revoked_at`, RLS keyed on `family_members` ownership — see [[Family Engrams]] |
| `media_consent` | `supabase/migrations/20260102110000_create_onboarding_system.sql:120` | Versioned media consent captured during [[Onboarding Flow]], including consent IP address |
| `research_consent` | `supabase/migrations/20251027000000_create_cognitive_insights_system.sql:72` | Opt-in research participation (surfaced by `src/components/ResearchParticipation.tsx`) |
| `dht_consents` | `supabase/migrations/20260304_dht_tables.sql:78` | Distributed health twin consents, used by the FastAPI DHT store (`backend/app/services/dht_store.py`) |

The most complete live enforcement is `supabase/functions/vault-export/index.ts:44-53`: it refuses to export vault data without an unrevoked `purpose = 'export'` consent row (403 "Export consent required") and increments `interaction_count` against `interaction_cap` on success — the same purpose/expiry/cap model the legacy Prisma layer defined.

## Audit Trails — Live Implementations

- `glucose_job_audit` — every CGM job (webhook, manual upload, `glucose-aggregate-cron`) logs running/success/failed via `logJobAudit()`.
- `health_connection_audit` — `supabase/migrations/20251105010000_create_comprehensive_health_connections_expansion.sql:409` — connection lifecycle events with a CHECK-constrained action list (`connected`, `token_refreshed`, `consent_granted`, `consent_revoked`, `data_deleted`, …) plus IP and user agent.
- `vault_audit_logs`, `terra_audit_log`, `dht_audit_log` — per-domain equivalents, all RLS-scoped to the owner.
- FastAPI `audit_logs` — `backend/app/models/audit.py` mirrors the legacy Prisma `AuditLog` shape (action, provider, `sha256` of metadata) and adds a cryptographic chain (`prevHash`, `signature`, `signerId`). Served at `/api/v1/audit` by `backend/app/api/endpoints/audit.py` on the live Render backend.
- `backend/app/services/hipaa_service.py` — HIPAA §164.312(b) audit controls "on behalf of St. Michael (Security Officer) and St. Anthony (Auditor)" among [[The Saints]]: logs who accessed which PHI category, when, in which context.

> [!warning] The HIPAA access log is file-backed
> `hipaa_service.py` persists its PHI-access log in memory plus a JSON file under `backend/data/`. On Render's free web service there is no persistent disk (`render.yaml` only attaches one to the anchor worker), so this log does not survive restarts or deploys. Treat the database audit tables as the durable trail; the HIPAA service log is best-effort.

## Legacy: the Prisma Consent and Audit Layer

`server/lib/consent.ts` and `server/lib/audit.ts` are the textbook implementations — `checkConsent()` enforces purpose, expiry, and `interactionCap` with a usage counter; `createAuditLog()` stores a SHA-256 hash of the metadata it records. Both run on Prisma models (`Consent`, `AuditLog` in `prisma/schema.prisma:84,117`) inside the [[Express Server]] stack, which per `CURRENT_STATE.md` is **not deployed anywhere**. Nothing calls this code in production. Its design survived, though: `vault_consents` + `vault-export` reimplement the consent model, and the FastAPI `audit_logs` model reuses the audit shape (including the `consents`/`audit_logs` table names). Do not extend the `server/lib/` versions — see [[Dual Backend System]] for why.

## Key Files

- `docs/archive/SECURITY.md` — written PHI policy: logging rules, HIPAA/GDPR posture (archived; still the only written policy).
- `backend/app/services/hipaa_service.py` — live PHI taxonomy and access-event logging (St. Michael / St. Anthony).
- `backend/app/api/endpoints/audit.py` — live audit API at `/api/v1/audit` (audit logs, JIT access requests, compliance controls).
- `supabase/functions/vault-export/index.ts` — live consent-gated export with interaction caps.
- `supabase/functions/_shared/glucose.ts` — `logJobAudit()`, the no-PHI job audit helper.
- `server/lib/consent.ts` / `server/lib/audit.ts` — legacy Prisma consent + audit (undeployed reference implementations).
- `supabase/migrations/20260225212500_add_family_consents.sql` — consented family graph schema.

## Related

- [[Security Overview]] — PHI logging is invariant 3 of the four security invariants.
- [[Row Level Security]] — the mechanism that actually isolates PHI at rest.
- [[Webhook Signature Verification]] — how PHI-bearing webhook payloads are authenticated before storage.
- [[Safety Guardrails]] — the AI-layer counterpart: what [[St Raphael]] may say about health data.
- [[Legacy Vault]] — the feature whose export path enforces the consent model end to end.
- [[Prisma Schema]] — where the legacy `Consent`/`AuditLog` models live.
- [[Health Data Normalization]] — the `raw` payload columns where PHI lands.
