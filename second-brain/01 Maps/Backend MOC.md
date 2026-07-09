---
tags: [backend, moc]
updated: 2026-07-02
---

# Backend MOC

Hub for everything server-side: the 55 Supabase edge functions (Deno) and the Express/Node half of the [[Dual Backend System]]. Start with [[Edge Functions Overview]] for the function catalog, or [[Express Server]] if you are working on Terra/webhook infrastructure.

## Edge Functions (Supabase / Deno)

- [[Edge Functions Overview]] — inventory of all 55 functions, deploy commands, CORS/auth/error conventions
- [[AI Chat Edge Functions]] — raphael-chat, engram-chat, career-chat and friends; all OpenAI, no Groq despite the docs
- [[Health Data Edge Functions]] — pull syncs, backfills, job processor, token refresh, analytics and reports
- [[Webhook Edge Functions]] — Terra/Fitbit/Dexcom push ingestion, signature verification, dedup, device health
- [[OAuth Edge Functions]] — provider connect flows, registry-driven OAuth, SMART on FHIR, Terra widget
- [[Agent and Task Edge Functions]] — tool-calling agent, task queues (execution currently simulated)
- [[Vault Edge Functions]] — legacy vault export, integrity checks, scheduled delivery
- [[Payment Edge Functions]] — Stripe checkout and webhook, saint activation per plan
- [[Shared Edge Function Utilities]] — `_shared/` helpers plus the 365-day training, knowledge, and diagnostics functions

## Express / Node Server

- [[Express Server]] — the secondary backend: Raphael API routes, connection handlers, webhook receivers
- [[BullMQ Scheduler]] — Redis-backed background sync jobs (`npm run dev:worker`)
- [[Terra Client Library]] — `server/lib/terra-client.ts`, the Node-side Terra API wrapper

## Cross-Cutting Concerns

- [[Authentication and JWT Flow]] — how functions validate users; [[Row Level Security]] under it all
- [[Payments and Subscriptions]] — product view of the Stripe pipeline
- [[Webhook Ingestion Pipeline]] / [[Webhook Signature Verification]] — ingestion architecture and HMAC details
- [[Health OAuth Flow]] — the connect story end to end
- [[Secrets Management]] / [[Environment Variables]] — where keys live for both backends
- [[Database Overview]] and [[Key Tables]] — what all these functions read and write

## Siblings

- [[Home]] — vault entry point
- [[Architecture MOC]] — the big picture above this layer
- [[Database MOC]] — schema, migrations, RLS
- [[Health Integrations MOC]] — provider-by-provider integration notes
- [[AI Systems MOC]] — models, embeddings, personas
- [[Security MOC]] — threat model for the caveats flagged in these notes
- [[Operations MOC]] — deploy, testing, monitoring
