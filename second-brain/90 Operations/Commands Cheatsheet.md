---
tags: [operations, commands, npm-scripts, cli]
updated: 2026-08-16
---

# Commands Cheatsheet

Every npm script in `package.json` plus the Supabase and Netlify CLI commands used to deploy, in one place. Commands that only drive the undeployed legacy `server/` / `health-api/` stacks are marked — running them is harmless locally but they are not part of any production path (see [[Deployment]]).

## Development

| Command | Purpose |
|---|---|
| `npm run dev` | Vite dev server for the React SPA (default http://localhost:5173) |
| `npm run dev:server` | **Legacy** — `tsx watch server/index.ts`, the undeployed [[Express Server]] on port 3001 |
| `npm run dev:worker` | **Legacy** — `tsx server/workers/scheduler.ts`, the undeployed [[BullMQ Scheduler]] (needs Redis) |
| `supabase functions serve` | Run edge functions locally for testing ([[Edge Functions Overview]]) |

## Testing

| Command | Purpose |
|---|---|
| `npm test` | Vitest unit tests in watch mode |
| `npm test -- src/lib/__tests__/errors.test.ts` | Run a single test file |
| `npm test -- -t "pattern"` | Run tests matching a name pattern |
| `npm run test:ui` | Vitest interactive UI |
| `npm run test:coverage` | v8 coverage report |
| `npm run test:e2e` | Playwright e2e suite (`tests/e2e/`) |
| `npm run test:e2e:ui` | Playwright UI mode |
| `npm run test:health` | **Legacy** — `cd health-api && npm test` (the broken, undeployed health-api service) |
| `npm run test:all` | Chains unit → health-api → e2e (fails if health-api does) |
| `USER_JWT='token' ./scripts/smoke-test.sh` | Probe deployed edge functions with a real JWT |
| `npm run smoke:backends` | `scripts/smoke-backends.mjs` — health-check local frontend and backends |
| `npm run audit:rls` | `scripts/audit-rls-gap.mjs` — diff backend models vs migrations for [[Row Level Security|RLS]] gaps |

Details and caveats (PowerShell-only Playwright `webServer`, colocated unit tests) in [[Testing Strategy]].

## Database

| Command | Purpose |
|---|---|
| `SUPABASE_ACCESS_TOKEN='...' npx supabase db push --linked` | Apply the 130 SQL [[Migrations|migrations]] in `supabase/migrations/` to production — the live database path |
| `npm run db:studio` | **Legacy** — Prisma Studio GUI against the [[Prisma Schema]] |
| `npm run db:seed` | **Legacy** — `tsx prisma/seed.ts` |
| `npm run migrate` | **Legacy** — `prisma migrate dev` (create + apply Prisma migration) |
| `npm run migrate:deploy` | **Legacy** — `prisma migrate deploy` |

> [!warning] The four `migrate`/`db:*` scripts are Prisma commands for the undeployed `server/` stack. The production database is Supabase Postgres and is migrated with `supabase db push`, never with `npm run migrate` — despite the generic names.

## Code Quality

| Command | Purpose |
|---|---|
| `npm run lint` | ESLint over the repo (FAIL with 925 problems as of 2026-08-15 — advisory in CI) |
| `npm run type-check` | `tsc --noEmit` on `tsconfig.app.json` + `tsconfig.node.json` (FAIL with 176 errors as of 2026-08-15 — advisory in CI) |
| `npm run format` | Prettier write over `src/**` |
| `npm run format:check` | Prettier check only |

## Build and Preview

| Command | Purpose |
|---|---|
| `npm run build` | `scripts/validate-build-env.mjs` then `vite build` → `dist/`; hard-fails without `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` ([[Environment Variables]]) |
| `npm run preview` | Serve the production build locally |

## Deploy (Supabase + Netlify CLI)

| Command | Purpose |
|---|---|
| `supabase link --project-ref sncvecvgxwkkxnxbvglv` | Link the CLI to the production project (one-time) |
| `supabase functions deploy raphael-chat` | Deploy a single edge function |
| `supabase functions deploy` | Deploy all 55 functions |
| `supabase secrets set KEY=value` | Set an edge function secret ([[Secrets Management]]) |
| `npx netlify-cli deploy --dir=dist --alias=dev` | Deploy `dist/` to the dev alias (dev--everafterai.netlify.app) |
| `npx netlify-cli deploy --dir=dist --prod` | Deploy to production (everafterai.net) |

The Render services (`everafter-api`, `everafter-voice-ai`, `everafter-elohim-anchor`) deploy from `render.yaml` on push — there is no CLI step; see [[Deployment]].

## CI Gates

`.github/workflows/ci.yml` runs four jobs on every PR: `npx vitest run` and `npm run build` are **required**; `npm run type-check` and `npm run lint` are **advisory** until their backlogs reach zero (per `CURRENT_STATE.md` — do not weaken rule configs to get them green).

## Key Files

- `package.json` — all npm scripts quoted above
- `scripts/validate-build-env.mjs` — the pre-build env gate `npm run build` runs first
- `scripts/smoke-test.sh` — JWT-authenticated edge function smoke test
- `scripts/smoke-backends.mjs`, `scripts/audit-rls-gap.mjs` — the `smoke:backends` / `audit:rls` targets
- `.github/workflows/ci.yml` — required vs advisory CI jobs
- `supabase/migrations/` — 130 SQL migrations applied via `db push`

## Related

- [[Operations MOC]] — hub for all operations notes
- [[Deployment]] — where each deploy command points and in what order
- [[Testing Strategy]] — what each test layer actually covers
- [[Environment Variables]] — vars the build and dev commands require
- [[Common Gotchas]] — the Prisma-vs-Supabase migration trap in full
- [[Edge Functions Overview]] — the 55 functions `functions deploy` ships
