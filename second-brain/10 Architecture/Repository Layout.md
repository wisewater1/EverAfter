---
tags: [architecture, repo-structure, navigation, monorepo]
updated: 2026-07-02
---

# Repository Layout

Directory-by-directory tour of `/home/user/EverAfter`. The live product is `src/` + `supabase/` + `server/` + `prisma/`; the rest is auxiliary services, tooling, and a very large pile of root-level markdown docs. All counts below were verified by listing the tree on 2026-07-02.

## Overview

### The live application

- **`src/`** — the React SPA.
  - `src/main.tsx`, `src/App.tsx` — entry + all routes (see [[Pages and Routing]])
  - `src/pages/` — 32 page components (Dashboard, StRaphaelHealthHub, LegacyVault, Marketplace, Onboarding, TrinityDashboard, ...)
  - `src/components/` — 119 components, with feature subfolders (`raphael/`, `council/`, `capsules/`, `rituals/`, `personality/`, `anthony/`, `gabriel/`, `saints/`) — see [[Saints Dashboard UI]] and [[Health UI Components]]
  - `src/contexts/` — `AuthContext`, `ConnectionsContext`, `NotificationContext` ([[Contexts and Hooks]])
  - `src/hooks/` — `useAuth`, `useAuthModal`, `useKeyboardNavigation`
  - `src/lib/` — ~45 modules: `supabase.ts`, `api-client.ts`, `edge-functions.ts`, per-saint helpers (`raphael/`, `michael/`, `joseph/`, `gabriel/`, `saints/`), `vault/` + `vault-encryption.ts`, `llm/`, `voice/`, `demo/`, `connectors/`, terra clients
  - `src/test/` — Vitest setup and a few unit tests
- **`supabase/`** — the primary backend.
  - `supabase/functions/` — **55 Edge Functions** + `_shared/` utilities ([[Edge Functions Overview]], [[Shared Edge Function Utilities]])
  - `supabase/migrations/` — **122 SQL migrations**, the schema source of truth ([[Migrations]])
- **`server/`** — the secondary Express backend ([[Express Server]]).
  - `server/index.ts` — entry; `server/api/raphael.ts`; `server/api/connections/` (`terra.ts`, `bridges.ts`, `webhooks.ts`, `iot_webhooks.ts`); `server/lib/` (`terra-client.ts`, `audit.ts`, `consent.ts`); `server/workers/scheduler.ts` ([[BullMQ Scheduler]])
- **`prisma/`** — `schema.prisma` (12 models: User, Source, Device, Metric, Consent, EngramEntry, AuditLog, ComplianceControl, JITAccessRequest, RestoreDrill, EmergencyContact, AgentRun), `migrations/`, `seed.ts` ([[Prisma Schema]])
- **`agents/raphael/`** — `manifest.json`, `runner.ts`, `tools.ts`: the autonomous agent the BullMQ worker executes ([[Autonomous Task System]])

### Tooling, tests, config

- **`scripts/`** — `validate-build-env.mjs` (runs before every build), `audit-rls-gap.mjs` (`npm run audit:rls`), `smoke-backends.mjs`, `smoke-test.sh`, `verify-device-integration.sh`, marketplace seeders
- **`tests/e2e/`** — Playwright specs (`mobile-smoke`, `public-auth`, `route-audit`, `saint-flows`) + `support/` ([[Testing Strategy]])
- Root configs — `vite.config.ts`, `vitest.config.ts`, `playwright.config.ts`, `tailwind.config.js`, `eslint.config.js`, `tsconfig*.json`, `netlify.toml`, `render.yaml`, `ecosystem.config.cjs` (PM2), `.env` (never commit)

### Auxiliary / parked codebases

> [!note] Several extra services live in the tree; none are on the primary request path
> Treat these as optional or exploratory until proven otherwise — the active system is Supabase + Express (see [[Dual Backend System]]).

- **`backend/`** — Python FastAPI backend (`backend/app/` with `api/`, `ai/`, `auth/`, `engrams/`, `workers/`). Described in `ARCHITECTURE.md` as the optional ML backend; the directory also contains dozens of one-off debug/seed scripts (`check_db.py`, `diagnose_500.py`, ...). `vite.config.ts` still proxies `/api/v1` and `/ws` to it on port 8010.
- **`health-api/`** — standalone Dockerized health API with its own `prisma/`, `src/`, `tests/`, and README; wired into `npm run test:health`.
- **`voice-ai-service/`** — Python voice service (`app/`, `requirements.txt`).
- **`nextjs-implementation/`** — partial Next.js API port.
- **`smart-contracts/`** — Hardhat + Solana experiments (`arbitrum/`, `chainlink/`, `solana/`).
- **`utils/`** — a self-contained health CLI/analytics toolkit with its own `package.json`.
- **`docs/`** — only two files (`ELOHIM_INTEGRATION.md`, ghost-cone apparition spec); the real documentation lives at the root.
- **`public/`**, **`dist/`** — static assets and build output.

### The 156 root-level markdown docs

The repo root contains **156 `.md` files** — feature guides, QA reports, visual specs, status logs. Useful clusters (see [[Documentation Index]] for the full map):

- Orientation: `README.md`, `CLAUDE.md` (most current), `ARCHITECTURE.md`, `PRD.md`, `SETUP.md`, `QUICK_START.md`
- Security: `SECURITY.md`, `SECURITY_FIXES_REPORT.md` ([[Security Overview]])
- Health: `HEALTH_MONITOR_COMPLETE_GUIDE.md`, `ST_RAPHAEL_CONNECTIVITY_ARCHITECTURE.md`, `GLUCOSE_CONNECTORS_COMPLETE.md`, seven `TERRA_*.md` guides ([[Terra Integration]])
- Design: `DESIGN_SYSTEM.md`, `DARK_NEUMORPHIC_DESIGN_SYSTEM.md`, the `BUTTON_*` series ([[Design System]])
- Features: `LEGACY_VAULT_COMPLETE_GUIDE.md`, `MARKETPLACE_IMPLEMENTATION_COMPLETE.md`, `BEYOND_MODULES_GUIDE.md`, `USER_PORTAL_DOCUMENTATION.md`

> [!warning] Root docs rot fast here — trust the code
> `FILE_ORGANIZATION.md` (Oct 2025) claims 26 Edge Functions, 37 migrations, 22 components, 7 pages; actual counts are 55 / 122 / 119 / 32. `ARCHITECTURE.md` omits the Express server entirely. Many `*_COMPLETE.md` files describe point-in-time snapshots. When a doc and the tree disagree, the tree wins.

> [!tip] Root clutter is real
> Stray artifacts sit beside the docs: `build_error.txt`, `corruption_report.csv`, `rawfile.pdf`, `fix_api_imports.py`, `patch_api.py`, `conversation.md`, Windows launchers (`start_everafter.bat`/`.ps1`). None are load-bearing; do not mistake them for tooling.

## Key Files

- `src/App.tsx` — route map; fastest way to enumerate product surfaces
- `supabase/functions/` — one directory per Edge Function, each an `index.ts`
- `supabase/migrations/` — chronological schema history
- `server/index.ts` — Express entry point and router mounts
- `prisma/schema.prisma` — Node-side data model
- `agents/raphael/runner.ts` — autonomous agent implementation
- `scripts/audit-rls-gap.mjs` — RLS coverage audit
- `CLAUDE.md` — the most accurate single-file orientation doc
- `FILE_ORGANIZATION.md` — historical layout map (stale; see warning)

## Related

- [[System Overview]] — what these directories do at runtime
- [[Dual Backend System]] — the `supabase/` vs `server/` split
- [[Edge Functions Overview]] — inside `supabase/functions/`
- [[Database Overview]] — the schema those 122 migrations build
- [[Documentation Index]] — navigating the 156 root docs
- [[Frontend MOC]] — entry point into `src/`
- [[Commands Cheatsheet]] — scripts that operate on this tree
