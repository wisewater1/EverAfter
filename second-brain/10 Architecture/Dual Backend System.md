---
tags: [architecture, backend, supabase, express, deno]
updated: 2026-08-16
---

# Dual Backend System

The two backends actually live in production are Supabase Edge Functions (Deno, serverless, the primary API surface) and the Python FastAPI service in `backend/` (Render web service `everafter-api`, proxied at `/api/v1/*` and `/governance/*` via `netlify.toml`, reached through `src/lib/backend-request.ts`). The Express/Node server (`server/`, Terra plumbing plus BullMQ background jobs) that this note originally paired with the Edge Functions is **legacy and not deployed** — no deploy config references it. The Express and Supabase sides share the same PostgreSQL database but access it through different clients — Supabase client vs. [[Prisma Schema|Prisma]].

## Overview

| | Supabase Edge Functions | Express Server (legacy) |
|---|---|---|
| Runtime | Deno (TypeScript, `Deno.serve`) | Node (tsx, `express`) |
| Location | `supabase/functions/` (55 functions) | `server/` |
| DB access | supabase-js with forwarded user JWT → [[Row Level Security|RLS]] | Prisma Client (direct connection, no RLS) |
| Auth | Validates user JWT per request | Stubbed (see warning below) |
| Deploy | `supabase functions deploy` (project `sncvecvgxwkkxnxbvglv`) | **Not deployed** — no deploy config anywhere in the repo |
| Run locally | `supabase functions serve` | `npm run dev:server` (port 3001) |
| Scaling | Auto-scales | Single process + separate worker |

**What actually serves which** (per `CURRENT_STATE.md`, verified against deploy configs):

- Frontend + Edge Functions cover [[St Raphael]] chat, [[Custom Engrams]], tasks, [[Payments and Subscriptions|payments]], and all health OAuth/webhook flows — [[Terra Integration]] webhooks run through the `webhook-terra` Edge Function (signature-verified), **not** the Express stack.
- The Python FastAPI backend on Render serves the Saints runtime, monitoring/audit, family/genealogy, finance, and personality-training APIs at `/api/v1/*` and `/governance/*`.
- The [[Express Server]] and [[BullMQ Scheduler]] run only locally (`npm run dev:server` / `dev:worker`); do not build new features on them — owner decision pending on fix-vs-remove.

## How It Works

```mermaid
graph LR
    FE[React SPA] -->|"supabase.functions.invoke + JWT"| EF[Edge Functions<br/>Deno]
    FE -->|"Netlify proxy /api/v1, /governance"| FA["FastAPI backend<br/>Render everafter-api"]
    FE -.->|"/api → :3001 Vite proxy, local dev only"| EX["Express Server (legacy)"]
    EF -->|supabase-js, RLS enforced| DB[(PostgreSQL)]
    FA --> DB
    EX -.->|Prisma, service-level access| DB
    EX -.-> SCHED["BullMQ Scheduler (legacy)"]
    SCHED -.-> REDIS[(Redis)]
    TERRA[Terra / providers] -->|webhooks, signature-verified| EF
```

**Edge Function shape** — every function is an `index.ts` with `Deno.serve`, CORS preflight handling, and manual `Authorization` header validation. Newer/edited functions use the prescribed `{ code, message, hint }` error envelope; a legacy majority still return `{ error: message }` via `_shared/connectors.ts`, so read the function before assuming either shape. `supabase/functions/raphael-chat/index.ts` is the canonical example: it builds a supabase client that forwards the caller's JWT (so RLS applies), calls `supabase.auth.getUser()`, verifies engram ownership, then calls OpenAI. Shared helpers (logging, token refresh, provider APIs, glucose math, validation) live in `supabase/functions/_shared/` — see [[Shared Edge Function Utilities]].

**Express side (legacy, local only)** — `server/index.ts` mounts five routers: Terra connections, bridges, generic provider webhooks, IoT webhooks, and Raphael API routes. It instantiates Prisma directly and, outside development, starts the scheduler when `REDIS_URL` is set (`isSchedulerEnabled()`). The scheduler enqueues per-user `agent-run` jobs on BullMQ queues (`agent-schedule`, `agent-run`) but only for users with active `Consent` rows (`purpose in ('train','project')`, not revoked) — consent gating is enforced in `server/workers/scheduler.ts` before any autonomous run. Per `CURRENT_STATE.md` this stack also does not type-check standalone (Prisma client not generated, missing `Request.user` augmentation).

> [!warning] The Express server does not validate JWTs
> `server/index.ts:20-23` installs middleware that hard-codes `req.user = { id: 'demo-user-001' }` for every request. There is no Supabase JWT verification on this backend today, unlike the Edge Functions. Treat any Express endpoint as unauthenticated until this stub is replaced; do not expose it publicly as-is. This contradicts docs that imply uniform JWT auth across backends.

> [!note] The FastAPI backend is live; Express and health-api are not
> The Python FastAPI backend (`backend/app/main.py`) is deployed on Render as `everafter-api` (plus the `everafter-elohim-anchor` worker from the same tree), and `vite.config.ts` proxies `/api/v1` and `/ws` to `localhost:8010` for local dev. An earlier revision of this note called the Express server "the active secondary backend" — deploy configs show the opposite. `health-api/` is yet another standalone Node/Prisma service (exercised via `npm run test:health`); it is broken and not deployed.

## Gotchas

- **Never mix clients in one file**: Edge Functions (Deno) use supabase-js via `npm:` specifiers; the Node server uses Prisma. Importing Prisma into a Deno function or supabase-js server-side patterns into Express is the classic mistake (`CLAUDE.md` gotcha #1). `vite.config.ts:43-45` even isolates `@prisma` into its own chunk in case a stray client import slips into the frontend.
- **Two migration systems**: Supabase SQL migrations (`supabase/migrations/`, 130 files) define the real schema; `prisma/schema.prisma` + `prisma/migrations/` model the subset the legacy Node server touches. Keep them in sync manually — see [[Migrations]].
- **Secrets live in different places**: Edge Function secrets go in the Supabase Dashboard ([[Secrets Management]]); the legacy Express server reads `.env` (`DATABASE_URL`, `REDIS_URL`, `TERRA_API_KEY`); the Render services get theirs from the Render dashboard per `render.yaml`.
- The scheduler silently no-ops without `REDIS_URL` — "background jobs not running" usually means Redis is not configured, not a code bug.

## Key Files

- `supabase/functions/raphael-chat/index.ts` — canonical Edge Function: JWT validation, RLS-forwarding client, OpenAI call
- `supabase/functions/_shared/` — cross-function utilities (`connectors.ts`, `http.ts`, `glucose.ts`, `data-transform.ts`, `user-api-keys.ts`)
- `src/lib/backend-request.ts` — SPA-side client for the live FastAPI backend
- `server/index.ts` — legacy Express entry: routers, Prisma init, scheduler startup, auth stub
- `server/api/connections/terra.ts` — Terra OAuth + webhook handlers
- `server/api/raphael.ts` — Raphael routes on the Node side
- `server/lib/terra-client.ts` — [[Terra Client Library|Terra API client]]
- `server/workers/scheduler.ts` — BullMQ queues + consent-gated agent runs
- `agents/raphael/runner.ts` — the agent the scheduler executes
- `vite.config.ts` — dev proxies wiring the SPA to both backends

## Related

- [[System Overview]] — where the backends sit in the whole platform
- [[Edge Functions Overview]] — per-function catalog of the Deno side
- [[Express Server]] — deeper dive on the legacy Node side
- [[BullMQ Scheduler]] — the background job half of the legacy Express stack
- [[Prisma Schema]] — the ORM models only the Node server uses
- [[Authentication and JWT Flow]] — why the auth guarantees differ between backends
- [[Terra Integration]] — now served by Edge Functions, not the Express stack
