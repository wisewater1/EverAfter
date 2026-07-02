---
tags: [operations, testing, vitest, playwright, smoke-tests]
updated: 2026-07-02
---

# Testing Strategy

Four test layers: Vitest unit/component tests inside `src/`, Playwright e2e journeys in `tests/e2e/`, a separate Vitest suite in `health-api/`, and shell/node smoke scripts in `scripts/` that probe deployed backends and edge functions.

## Unit Tests (Vitest)

Config: `vitest.config.ts` — jsdom environment, `globals: true`, alias `@` → `./src`, setup file `src/test/setup.ts` (polyfills `localStorage`/`sessionStorage` because jsdom 27 under Vitest 4 doesn't expose Web Storage). Excludes `tests/e2e/**` and `health-api/**`. Coverage uses the v8 provider with text/json/html reporters.

Tests live next to the code:

- `src/lib/__tests__/` — auth session, backend request fallback, vault connect API, error shapes, health data transformer, demo interceptors
- `src/components/__tests__/` — `ProtectedRoute`, `SaintChat`, `GovernanceView`, and friends via `@testing-library/react`
- `src/test/` — cross-cutting scrolling and orientation tests

```bash
npm test                       # watch mode
npm test -- src/lib/__tests__/errors.test.ts   # single file
npm test -- -t "pattern"       # by test-name pattern
npm run test:ui                # Vitest UI
npm run test:coverage          # v8 coverage report
```

> [!warning] `CLAUDE.md` says component tests live "in `tests/` directory" — they don't. `tests/` contains only the Playwright e2e suite; unit tests are colocated under `src/`. Also, root `TESTING_GUIDE.md` is not a general testing guide: it is a device-integration test plan (SQL table checks + curl calls against `device-stream-handler`).

## E2E Tests (Playwright)

Config: `playwright.config.ts` — `testDir: './tests/e2e'`, base URL `http://localhost:5000` (override with `BASE_URL`), HTML reporter, traces on first retry, 3 projects:

- **chromium** (Desktop Chrome) — runs everything except `mobile-smoke.spec.ts`
- **Mobile Chrome** (Pixel 5) and **Mobile Safari** (iPhone 12) — run only `mobile-smoke.spec.ts`

Specs and what they cover:

- `tests/e2e/public-auth.spec.ts` — landing page reaches login/signup
- `tests/e2e/route-audit.spec.ts` — a route matrix renders without client-side console errors
- `tests/e2e/saint-flows.spec.ts` — demo-mode bootstrap into the protected dashboard and [[The Saints|Saints]] journeys
- `tests/e2e/mobile-smoke.spec.ts` — no horizontal overflow / console errors on mobile viewports
- `tests/e2e/support/demo-mode.ts` — enables demo auth via the `everafter_demo_auth` localStorage key and collects console errors

```bash
npm run test:e2e               # headless
npm run test:e2e:ui            # Playwright UI mode
```

> [!warning] The `webServer` entries in `playwright.config.ts` launch the three dev servers (Express on 3001, `health-api` on 8010, Vite on 5000 with `VITE_ENABLE_NON_CORE_ROUTES=true`) through `powershell -NoProfile` — Windows-only. On Linux/macOS start the servers yourself; `reuseExistingServer: !process.env.CI` makes Playwright attach to them instead of failing.

## health-api Tests

`npm run test:health` runs `cd health-api && npm test` (its own Vitest). `health-api/tests/providers.spec.ts` covers the provider adapters; `npm run test:integration` (inside `health-api/`) runs `tests/integration`. `npm run test:all` chains unit → health-api → e2e.

## Smoke and Audit Scripts (`scripts/`)

| Script | What it does |
|---|---|
| `scripts/smoke-test.sh` | Probes deployed [[Edge Functions Overview|edge functions]] with a real user JWT: `test-key` diagnostics, `daily-progress`, three `agent` conversations (memory, tool call, safety), legacy `raphael-chat`. Needs `curl` + `jq`; reads `VITE_SUPABASE_URL` from `.env`. Run: `USER_JWT='token' ./scripts/smoke-test.sh` |
| `scripts/smoke-backends.mjs` | `npm run smoke:backends` — checks frontend (`:5000`), app API `/health` (`:8010`), health-api `/health` (`:4000`); with `SMOKE_BEARER_TOKEN` also hits an authenticated route and a saint bootstrap/chat probe |
| `scripts/audit-rls-gap.mjs` | `npm run audit:rls` — diffs SQLAlchemy `__tablename__`s in `backend/app/models/` against `CREATE TABLE`s in `supabase/migrations/`; tables missing from migrations are [[Row Level Security|RLS]] gap candidates |
| `scripts/verify-device-integration.sh` | File-existence sanity check for device-integration components and functions |

## Coverage Reality Check

Verified from the code: unit coverage concentrates on `src/lib/` utilities and a handful of components; e2e coverage is route-rendering and demo-mode journeys rather than real authenticated flows; edge functions have no automated unit tests — only the JWT smoke script. The Python `backend/` has its own ad-hoc check scripts but is outside the npm test story entirely.

## Key Files

- `vitest.config.ts` — unit test config (jsdom, coverage, excludes)
- `src/test/setup.ts` — Web Storage polyfill + testing-library cleanup
- `playwright.config.ts` — e2e projects, base URL, webServer commands
- `tests/e2e/` — the four spec files plus `support/demo-mode.ts`
- `health-api/package.json` — nested test scripts
- `scripts/` — smoke and audit scripts described above
- `TESTING_GUIDE.md` — device-integration test plan (SQL + curl), despite the generic name

## Related

- [[Commands Cheatsheet]] — every test command in one table
- [[Common Gotchas]] — PowerShell webServer and test-location traps
- [[Deployment]] — smoke tests belong in the post-deploy checklist
- [[Edge Functions Overview]] — what `smoke-test.sh` exercises
- [[Row Level Security]] — what the RLS gap audit protects
- [[Operations MOC]] — hub for operations notes
