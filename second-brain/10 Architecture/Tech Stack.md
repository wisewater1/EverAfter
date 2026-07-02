---
tags: [architecture, tech-stack, tooling, dependencies]
updated: 2026-07-02
---

# Tech Stack

Every major technology in EverAfter and the role it plays, verified against `package.json` and the configs. Frontend: React 18 + TypeScript + Vite + Tailwind. Backend: Supabase (Postgres/Auth/Deno Edge Functions) plus Express + Prisma + BullMQ/Redis. Testing: Vitest + Playwright.

## Overview

### Frontend

- **React 18.3** (`react`, `react-dom`) — SPA UI; hooks + Context API only, no Redux. Entry `src/main.tsx` → `src/App.tsx`.
- **TypeScript 5.5** — strict mode; three configs (`tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`); `npm run type-check` runs `tsc --noEmit`.
- **Vite 5** — dev server and bundler. `vite.config.ts` sets **port 5000 (strictPort)**, proxies `/api` → Express (3001) and `/api/v1` + `/ws` → the optional Python backend (8010), and does aggressive `manualChunks` vendor splitting (react-vendor, charts, supabase, icons, framer-motion, openai, lodash, web-llm, prisma). `npm run build` runs `scripts/validate-build-env.mjs` before `vite build`.
- **Tailwind CSS 3.4** (+ `tailwindcss-animate`, PostCSS, autoprefixer) — all styling; see [[Design System]].
- **react-router-dom 6.28** — routing with v7 future flags enabled in `src/App.tsx`; see [[Pages and Routing]].
- **lucide-react** — icon set (excluded from Vite `optimizeDeps`, pinned to its own chunk).
- **framer-motion 12** — animation on a handful of advanced surfaces; deliberately kept off the cold path.
- **recharts 3** — charts for health analytics dashboards.
- **zod 3** — runtime schema validation.
- **@mlc-ai/web-llm** — on-device LLM, dynamically loaded inside on-device chat.
- **@supabase/supabase-js 2.57** — auth, CRUD, realtime, and `functions.invoke` from the browser (`src/lib/supabase.ts`).

### Backend and data

- **Supabase** — the primary platform: PostgreSQL (122 migrations in `supabase/migrations/`), Auth/JWT (see [[Authentication and JWT Flow]]), [[Row Level Security|RLS]], Realtime, Storage, and 55 Deno **Edge Functions** in `supabase/functions/`. Project ref `sncvecvgxwkkxnxbvglv`.
- **Deno** — Edge Function runtime; imports supabase-js via `npm:` specifiers, deployed with the Supabase CLI.
- **Express 4** — the secondary Node server (`server/index.ts`) for [[Terra Integration]] and provider webhooks; run with `tsx watch` via `npm run dev:server`. See [[Dual Backend System]].
- **Prisma 6** — ORM for the Node server only (`prisma/schema.prisma`: User, Source, Device, Metric, Consent, EngramEntry, AuditLog, AgentRun, ...). Commands: `npm run migrate`, `migrate:deploy`, `db:seed`, `db:studio`. See [[Prisma Schema]].
- **BullMQ 5 + Redis** — background job queues (`agent-schedule`, `agent-run`) in `server/workers/scheduler.ts`; disabled unless `REDIS_URL` is set. See [[BullMQ Scheduler]].
- **OpenAI SDK / API** — LLM calls from Edge Functions (e.g. `raphael-chat` calls `gpt-4o-mini` via raw fetch) and embeddings for [[Embeddings and Vector Search]].
- **Stripe** — payments via `stripe-checkout` / `stripe-webhook` Edge Functions; see [[Payment Edge Functions]].
- **tsx** — TypeScript execution for the Node server and worker (no build step in dev).
- **dotenv / cors / axios / lodash** — standard server and client utilities.

### Testing and quality

- **Vitest 4** — unit tests (`npm test`, `test:ui`, `test:coverage`); jsdom environment, `@testing-library/react` + `jest-dom`, setup in `src/test/setup.ts`, config in `vitest.config.ts`.
- **Playwright 1.56** — e2e specs in `tests/e2e/` (`mobile-smoke`, `public-auth`, `route-audit`, `saint-flows`); `playwright.config.ts`. See [[Testing Strategy]].
- **ESLint 9 + Prettier 3** — `npm run lint`, `npm run format`; flat config in `eslint.config.js`.

### Hosting

- **Netlify** — frontend (`netlify.toml`; prod https://everafterai.net).
- **Supabase** — Edge Functions + database.
- **Railway/Render-style host** — Express server + worker (needs Postgres + Redis). See [[Deployment]].

> [!note] Stack members that exist but are not on the main path
> `@netlify/neon` (Neon Postgres client), the Python FastAPI `backend/`, `voice-ai-service/` (Python), `health-api/` (standalone Node service with its own Prisma), and `smart-contracts/` (Hardhat/Solana) are all present in the repo but auxiliary. Do not assume a technology is live just because it is in the tree — check [[Repository Layout]].

> [!warning] LLM provider mismatch in docs
> `CLAUDE.md` says the deployed secret for `raphael-chat` is `GROQ_API_KEY`, but `supabase/functions/raphael-chat/index.ts:91-116` reads `OPENAI_API_KEY` and calls OpenAI `gpt-4o-mini`. The code is authoritative for this repo snapshot; the deployed function may differ from what the doc remembers. See [[Secrets Management]].

## Key Files

- `package.json` — all scripts and dependency versions quoted above
- `vite.config.ts` — dev ports/proxies, chunking strategy
- `tailwind.config.js` / `postcss.config.js` — styling pipeline
- `vitest.config.ts` / `playwright.config.ts` — test runners
- `eslint.config.js` — lint rules
- `prisma/schema.prisma` — Node-side data model
- `tsconfig.app.json` — strict TS settings for the SPA
- `netlify.toml` — frontend deploy config

## Related

- [[System Overview]] — how these pieces compose at runtime
- [[Dual Backend System]] — Deno vs. Node split the stack serves
- [[Commands Cheatsheet]] — the npm scripts that drive each tool
- [[Testing Strategy]] — Vitest/Playwright usage in depth
- [[Deployment]] — where each layer ships
- [[Environment Variables]] — configuration each technology expects
