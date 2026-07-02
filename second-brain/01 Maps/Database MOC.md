---
tags: [moc, database, supabase, postgresql]
updated: 2026-07-02
---

# Database MOC

Map of content for EverAfter's data layer: one Supabase PostgreSQL database, 122 SQL migrations, RLS-based isolation, and a separate Prisma slice for the Node server.

## Core Notes

- [[Database Overview]] — the big picture: extensions (pgvector, pgcrypto, pg_trgm), the four access paths (frontend / Edge Functions / Prisma / FastAPI), and how the schema evolved from Oct 2025 to Jun 2026.
- [[Key Tables]] — column-level tour of the load-bearing tables: `profiles`, `archetypal_ais`, `engrams`, `daily_question_pool`, `daily_question_responses`, `saints_subscriptions`, `agent_task_queue`, `engram_ai_tasks`, `glucose_readings`, `health_metrics`, `provider_accounts`, `webhook_events`, and the embedding tables.
- [[Migrations]] — naming conventions, `supabase db push --linked` vs `npm run migrate`, duplicate timestamps, `IF NOT EXISTS` traps, fix-forward culture.
- [[Row Level Security]] — policy patterns, the `(select auth.uid())` performance idiom, service-role bypass, and the `scripts/audit-rls-gap.mjs` + sweep-migration remediation loop.
- [[Prisma Schema]] — the Node server's models (User, Source, Device, Metric, Consent, AuditLog...), who uses Prisma vs supabase-js, and the non-standard `prisma/migrations/` directory.

## Adjacent Topics

- [[Dual Backend System]] — why two backends share this database with different clients.
- [[Authentication and JWT Flow]] — the JWTs that make `auth.uid()` work.
- [[Security Overview]] — RLS in the broader threat model; see also [[PHI Handling]].
- [[Embeddings and Vector Search]] — the pgvector tables at query time.
- [[Health Data Normalization]] — the rules governing what lands in `health_metrics` and `glucose_readings`.
- [[Webhook Ingestion Pipeline]] — service-role writes into `webhook_events` and metric tables.
- [[Autonomous Task System]] — runtime consumer of `agent_task_queue` / `engram_ai_tasks`.

## Sibling Maps

- [[Home]] — vault entry point.
- [[Architecture MOC]] — system-level design context.
- [[Backend MOC]] — Edge Functions and Express server details.
- [[Security MOC]] — security-focused notes beyond RLS.
- [[Health Integrations MOC]] — the providers feeding the health tables.
- [[AI Systems MOC]] — the AI features built on top of these tables.
