---
tags: [architecture, repo-structure, navigation, monorepo]
updated: 2026-08-16
---

# Repository Layout

Directory-by-directory tour of `/home/user/EverAfter`. The live product is `src/` + `supabase/` + `backend/` + `voice-ai-service/`; `server/` + `prisma/` are legacy and undeployed, and the rest is parked services and tooling. All counts below were re-verified by listing the tree on 2026-08-16.

## Overview

### The live application

- **`src/`** — the React SPA.
  - `src/main.tsx`, `src/App.tsx` — entry + all routes (see [[Pages and Routing]])
  - `src/pages/` — 34 page components (Dashboard, StRaphaelHealthHub, LegacyVault, Marketplace, Onboarding, TrinityDashboard, ...)
  - `src/components/` — 94 top-level components (~212 including feature subfolders such as `raphael/`, `council/`, `capsules/`, `rituals/`, `personality/`, `anthony/`, `gabriel/`, `saints/`, `oversight/`) — see [[Saints Dashboard UI]] and [[Health UI Components]]
  - `src/contexts/` — `AuthContext`, `ConnectionsContext`, `NotificationContext` ([[Contexts and Hooks]])
  - `src/hooks/` — `useAuth`, `useAuthModal`, `useKeyboardNavigation`
  - `src/lib/` — ~45 modules: `supabase.ts`, `api-client.ts`, `edge-functions.ts`, per-saint helpers (`raphael/`, `michael/`, `joseph/`, `gabriel/`, `saints/`), `vault/` + `vault-encryption.ts`, `llm/`, `voice/`, `demo/`, `connectors/`, terra clients
  - `src/test/` — Vitest setup and a few unit tests
- **`supabase/`** — the primary backend.
  - `supabase/functions/` — **55 Edge Functions** + `_shared/` utilities ([[Edge Functions Overview]], [[Shared Edge Function Utilities]])
  - `supabase/migrations/` — **130 SQL migrations**, the schema source of truth ([[Migrations]])
- **`backend/`** — the Python FastAPI backend, **live** on Render as `everafter-api` plus the `everafter-elohim-anchor` worker (`render.yaml`); proxied at `/api/v1/*` and `/governance/*` via `netlify.toml` and consumed through `src/lib/backend-request.ts`. The directory also still contains dozens of one-off debug/seed scripts (`check_db.py`, `diagnose_500.py`, ...).
- **`voice-ai-service/`** — Python voice sidecar, **live** on Render as `everafter-voice-ai` (ElevenLabs); consumed via `src/lib/joseph/voice.ts`.

### Legacy backend (in-tree, NOT deployed)

- **`server/`** — the legacy Express backend ([[Express Server]]); no deploy config references it and it does not type-check standalone. Local-only via `npm run dev:server`.
  - `server/index.ts` — entry; `server/api/raphael.ts`; `server/api/connections/` (`terra.ts`, `bridges.ts`, `webhooks.ts`, `iot_webhooks.ts`); `server/lib/` (`terra-client.ts`, `audit.ts`, `consent.ts`); `server/workers/scheduler.ts` ([[BullMQ Scheduler]])
- **`prisma/`** — `schema.prisma` (12 models: User, Source, Device, Metric, Consent, EngramEntry, AuditLog, ComplianceControl, JITAccessRequest, RestoreDrill, EmergencyContact, AgentRun), `migrations/`, `seed.ts` ([[Prisma Schema]]) — belongs to the legacy `server/` stack
- **`agents/raphael/`** — `manifest.json`, `runner.ts`, `tools.ts`: the autonomous agent the (legacy) BullMQ worker executes ([[Autonomous Task System]])

### Tooling, tests, config

- **`scripts/`** — `validate-build-env.mjs` (runs before every build), `audit-rls-gap.mjs` (`npm run audit:rls`), `smoke-backends.mjs`, `smoke-test.sh`, `verify-device-integration.sh`, marketplace seeders
- **`tests/e2e/`** — Playwright specs (`mobile-smoke`, `public-auth`, `route-audit`, `saint-flows`) + `support/` ([[Testing Strategy]])
- Root configs — `vite.config.ts`, `vitest.config.ts`, `playwright.config.ts`, `tailwind.config.js`, `eslint.config.js`, `tsconfig*.json`, `netlify.toml`, `render.yaml`, `ecosystem.config.cjs` (PM2), `.env` (never commit)

### Parked codebases (owner decision pending)

> [!note] Several extra services live in the tree; none are on the primary request path
> Treat these as parked — the live system is Supabase + the Render services (see [[Dual Backend System]]).

- **`health-api/`** — standalone Dockerized health API with its own `prisma/`, `src/`, `tests/`, and README; wired into `npm run test:health`. Broken (committed compiler-error logs) and not deployed.
- **`nextjs-implementation/`** — dead scaffolding; no Next.js app actually exists (no next config/package).
- **`smart-contracts/`** — unstarted WGOLD token roadmap (`arbitrum/`, `chainlink/`, `solana/`); single bulk commit, zero imports.
- **`utils/`** — a self-contained health CLI/analytics toolkit with its own `package.json`; unbuilt, zero imports.
- **`public/`**, **`dist/`** — static assets and build output.

### Documentation: 4 root docs + `docs/archive/`

The repo root now contains only **4 `.md` files**: `README.md`, `CLAUDE.md` (day-to-day agent guidance), `CURRENT_STATE.md` (the dated ground-truth doc — trust it over everything else), and `FABLE_FINALIZATION_PROMPT.md`. The 150+ historical status docs that used to clutter the root were moved to **`docs/archive/`** (152 files); `docs/audits/` holds the 2026-07 engagement audits, and a handful of current docs (`ELOHIM_INTEGRATION.md`, `FAMILY_DATA_MODEL.md`, `SITE_REPAIR_AUDIT.md`, ...) sit directly in `docs/`. See [[Documentation Index]] for the map.

> [!warning] Archived docs rot — trust the code
> `docs/archive/FILE_ORGANIZATION.md` (Oct 2025) claims 26 Edge Functions and 37 migrations; actual counts are 55 / 130. `docs/archive/ARCHITECTURE.md` and the many `*_COMPLETE.md` snapshots self-declare states that never matched the tree. Nothing under `docs/archive/` should be treated as current; when a doc and the tree disagree, the tree wins.

> [!tip] Some root clutter remains
> Stray artifacts still sit at the root: `rawfile.pdf`, `fix_api_imports.py`, `patch_api.py`, Windows launchers (`start_everafter.bat`/`.ps1`). None are load-bearing; do not mistake them for tooling.

## Key Files

- `src/App.tsx` — route map; fastest way to enumerate product surfaces
- `supabase/functions/` — one directory per Edge Function, each an `index.ts`
- `supabase/migrations/` — chronological schema history
- `render.yaml` — blueprint for the three live Render services
- `server/index.ts` — legacy Express entry point and router mounts (not deployed)
- `prisma/schema.prisma` — legacy Node-side data model
- `agents/raphael/runner.ts` — autonomous agent implementation (legacy stack)
- `scripts/audit-rls-gap.mjs` — RLS coverage audit
- `CURRENT_STATE.md` — dated ground-truth orientation doc
- `CLAUDE.md` — agent guidance, aligned with `CURRENT_STATE.md`

## Related

- [[System Overview]] — what these directories do at runtime
- [[Dual Backend System]] — the `supabase/` vs `server/` split
- [[Edge Functions Overview]] — inside `supabase/functions/`
- [[Database Overview]] — the schema those 130 migrations build
- [[Documentation Index]] — navigating the docs tree and archive
- [[Frontend MOC]] — entry point into `src/`
- [[Commands Cheatsheet]] — scripts that operate on this tree
