---
tags: [database, prisma, orm, express, health]
updated: 2026-07-02
---

# Prisma Schema

`prisma/schema.prisma` defines the slice of the database used by the Express/Node server — health-connector sources, devices, metrics, consent, and audit tables. It is entirely separate from the 122 Supabase migrations: Prisma connects with its own `PRISMA_DATABASE_URL`, generates its own client, and bypasses [[Row Level Security]].

## Overview

- Generator: `prisma-client-js` with `previewFeatures = ["multiSchema"]`.
- Datasource: PostgreSQL via `env("PRISMA_DATABASE_URL")`, `schemas = ["public", "auth"]` — it points at the same Supabase database as everything else.
- IDs are `cuid()` TEXT strings, not the `uuid`s used by the Supabase-migration tables.

## Data Model

Models in `prisma/schema.prisma` (all mapped to snake_case table names via `@@map`):

| Model | Table | Purpose |
|---|---|---|
| `User` | `users` | Server-side user (id/email/name); parent of everything below. Distinct from Supabase `profiles`. |
| `Source` | `sources` | A connected provider account: `provider` enum, `externalUserId`, OAuth `accessToken`/`refreshToken`, `scopes[]`, `lastSyncAt`; `@@unique([userId, provider])`. Prisma's analogue of `provider_accounts`. |
| `Device` | `devices` | Physical device under a source; `@@unique([sourceId, providerDeviceId])`. |
| `Metric` | `metrics` | Time-series point: `type` (MetricType enum), `ts`, `value`, `unit`, raw `payload Json`; indexed `(sourceId, type, ts)`. Prisma's analogue of `health_metrics`. |
| `Consent` | `consents` | Purpose-scoped consent with `expiresAt`, `interactionCap`, `usageCount`, `revokedAt` — gates autonomous agent runs. |
| `EngramEntry` | `engram_entries` | Free-form engram text entries (`kind`, `text`, `tags[]`). |
| `AuditLog` | `audit_logs` | Append-only audit with hash-chain fields `prevHash`, `signature`, `signerId`. |
| `ComplianceControl` | `compliance_controls` | Control checklist rows (`controlId`, `isPassing`). |
| `JITAccessRequest` | `jit_access_requests` | Just-in-time access requests (PENDING/APPROVED/... status, `expiresAt`). |
| `RestoreDrill` | `restore_drills` | Backup-restore drill results with `proofHash`. |
| `EmergencyContact` | `emergency_contacts` | Per-user emergency contacts. |
| `AgentRun` | `agent_runs` | One autonomous agent execution: `status`, `tokensUsed`, `costCents`, `steps Json`. |

Enums: `Provider` (`TERRA`, `APPLE_HEALTH`, `SAMSUNG_HEALTH`, `FITBIT`, `OURA`, `WHOOP`, `DEXCOM`) and `MetricType` (14 values: `HEART_RATE`, `STEPS`, `CALORIES`, `HRV`, `OXYGEN_SAT`, `RESPIRATION`, `TEMP`, `SLEEP_DURATION`, `SLEEP_STAGE`, `GLUCOSE`, `BLOOD_PRESSURE`, `WEIGHT`, `ACTIVITY`, `DISTANCE`).

## Who Uses Prisma vs the Supabase Client

Prisma is used **only** by the Node server (verified importers of `@prisma/client`):

- `server/index.ts` — instantiates the shared `PrismaClient`.
- `server/api/connections/terra.ts` and `server/api/connections/bridges.ts` — provider OAuth/webhook handlers writing `Source`/`Metric` rows ([[Terra Integration]], [[Terra Client Library]]).
- `server/api/raphael.ts` — Raphael API routes.
- `server/lib/consent.ts`, `server/lib/audit.ts` — consent gating and audit-log writes.
- `server/workers/scheduler.ts` — the [[BullMQ Scheduler]] querying `Consent` before enqueueing agent runs.

Everything else — the React frontend and all Edge Functions — uses supabase-js and never touches Prisma ([[Dual Backend System]]). Per `CLAUDE.md`: don't mix the two clients in one file.

> [!warning] Prisma bypasses RLS
> Prisma connects as a database role, so none of the [[Row Level Security]] policies apply to [[Express Server]] queries. Authorization for these tables lives (or should live) in application code; the June 2026 RLS sweep added defensive policies on some of them for supabase-js access paths.

## Migrate Scripts

From `package.json`:

- `npm run migrate` → `prisma migrate dev` (create + apply a migration in dev).
- `npm run migrate:deploy` → `prisma migrate deploy` (apply pending migrations in prod).
- `npm run db:seed` → `tsx prisma/seed.ts`.
- `npm run db:studio` → Prisma Studio GUI.

> [!warning] `prisma/migrations/` is not in Prisma's own format
> The directory holds a single hand-written file, `prisma/migrations/001_raphael_production_schema.sql`, not the timestamped folders `prisma migrate` generates. Worse, its SQL uses snake_case columns (`user_id`) while `schema.prisma` fields like `userId` have no `@map`, so Prisma expects camelCase columns — and the RLS audit sweep (`supabase/migrations/20260620170000_enable_rls_audit_sweep.sql`) confirms the live `sources` table uses camelCase `"userId"`. Treat the SQL file as historical/reference; expect `prisma migrate dev` to want to baseline the schema first.

## Key Files

- `prisma/schema.prisma` — the schema described above.
- `prisma/migrations/001_raphael_production_schema.sql` — hand-written bootstrap SQL (see warning).
- `prisma/seed.ts` — seed script (`npm run db:seed`).
- `server/index.ts` — PrismaClient instantiation and graceful `$disconnect`.
- `server/workers/scheduler.ts` — heaviest Prisma consumer (consent-gated scheduling).

## Related

- [[Database Overview]] — where Prisma sits among the four DB access paths.
- [[Dual Backend System]] — Edge Functions vs Express and why both exist.
- [[Express Server]] — the only runtime that loads this client.
- [[Migrations]] — contrast with the Supabase SQL migration flow.
- [[Row Level Security]] — what Prisma connections skip.
- [[Terra Client Library]] — main producer of `Source`/`Metric` rows.
