---
tags: [architecture, moc]
updated: 2026-07-02
---

# Architecture MOC

Hub for everything about how EverAfter is put together: the big picture, the two backends, auth, the stack, and where things live on disk. Start at [[System Overview]] if you are returning after time away.

## Core Architecture Notes

- [[System Overview]] — the 10,000-ft view: subsystems, system diagram, how data flows
- [[Dual Backend System]] — Supabase Edge Functions (Deno) vs Express/Node: what runs where and why
- [[Authentication and JWT Flow]] — Supabase Auth, per-function JWT validation, RLS, ProtectedRoute
- [[Tech Stack]] — every major technology (React 18, Vite, Tailwind, Supabase, Prisma, BullMQ, Redis, Vitest, Playwright) and its role
- [[Repository Layout]] — directory-by-directory tour, including the 156 root docs and parked codebases

## Entry Points into Other Domains

### Backend and data

- [[Backend MOC]] — hub for server-side notes
- [[Edge Functions Overview]] — catalog of the 55 Deno functions
- [[Express Server]] / [[BullMQ Scheduler]] — the Node half and its worker
- [[Database MOC]] — schema, [[Migrations]], [[Key Tables]], [[Prisma Schema]]
- [[Row Level Security]] — the enforcement layer under everything

### Frontend

- [[Frontend MOC]] — hub for UI notes
- [[Pages and Routing]] — the route map defined in `src/App.tsx`
- [[Contexts and Hooks]] — Auth/Connections/Notification providers
- [[Design System]] — Tailwind conventions and visual language

### Health and integrations

- [[Health Integrations MOC]] — providers, OAuth, webhooks
- [[Terra Integration]] — the aggregator that motivates the Express backend
- [[Webhook Ingestion Pipeline]] — provider data → `health_metrics`
- [[Health Data Normalization]] — units and metric conventions

### AI, products, operations, security

- [[AI Systems MOC]] — [[St Raphael]], [[Custom Engrams]], [[Embeddings and Vector Search]]
- [[Products MOC]] — [[The Saints]], legacy features, marketplace
- [[Operations MOC]] — [[Deployment]], [[Environment Variables]], [[Commands Cheatsheet]], [[Testing Strategy]]
- [[Security MOC]] — [[Security Overview]], [[Safety Guardrails]], [[PHI Handling]]
- [[Legacy and Family MOC]] — vault, memorials, family engrams
- [[Common Gotchas]] — the traps that bite returning developers first
- [[Documentation Index]] — map of the 156 root-level markdown docs

## Navigation

Back to [[Home]].
