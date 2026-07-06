# EverAfter Full App Audit and Horizontal Directionality Report

Branch: `audit/horizontal-directionality`, base commit `d27d3b2` (main).
Date: 2026-07-06.

This report covers two missions: (1) verify everything works, (2) enforce left-to-right directionality across wording, interactions, animations, and iconography. Sections marked FINAL are filled in at the end of the pass; everything else is recorded as the audit progresses.

## 1. Baseline (recorded before any change)

### Toolchain
| Tool | Version |
| --- | --- |
| node | v22.22.2 |
| npm | 10.9.7 |
| vite | 5.4.21 |
| typescript | 5.9.3 (package range ^5.5.3) |
| eslint | 9.39.1 |
| vitest | 4.0.18 |

### Gates
| Gate | Baseline result |
| --- | --- |
| `npx tsc --noEmit` | Clean, exit 0 |
| `npm run build` | Success in 15.41s. Pre-existing warning: `web-llm` chunk is 6,040 kB (2,144 kB gzip), from the Crystal runtime evaluation. Non-blocking. |
| `npx eslint . --ext .ts,.tsx` | 1210 problems: 1096 errors, 114 warnings. This is the baseline ceiling; the final count must be at or under it. |
| `npx vitest run` | 14 files, 96 tests, 96 passed. One test intentionally exercises the backend-unreachable fallback path and logs ECONNREFUSED 127.0.0.1:8010; it passes. |

### npm audit (recorded, not auto-fixed)
7 vulnerabilities: 1 low, 2 moderate, 2 high, 2 critical.

| Package | Severity | Advisory |
| --- | --- | --- |
| vitest 4.0.x | critical | fix available via `npm audit fix` |
| form-data 4.0.0-4.0.5 | high | CRLF injection, GHSA-hmw2-7cc7-3qxx |
| @babel/core <=7.29.0 | low | sourceMappingURL arbitrary file read, GHSA-4x5r-pxfx-6jf8 |
| esbuild <=0.24.2 (via vite, vitest) | moderate | dev-server request exposure, GHSA-67mh-4wv8-2f99 |
| js-yaml 4.0.0-4.1.1 | moderate | fix available via `npm audit fix` |

All are dev-time or transitive; none ship in the production bundle directly. Recommendation: run `npm audit fix` (no `--force`) in a dedicated PR and re-run the full gate battery.

## 2. Phase 1B: Static integrity

### Routing
Every route defined in `src/App.tsx` resolves to a real component (verified by tsc plus a link cross-check). Four navigation targets pointed at routes that do not exist; the catch-all was silently dumping them on /dashboard. Fixed:

| Broken target | Where | Fix |
| --- | --- | --- |
| `/health/devices` (4 uses) | TerraCallback, TerraSetupWizard | Now `/devices` |
| `/health` (5 uses) | TerraCallback, TerraSetupWizard, AnthonyStaleDataPanel, DHTAnomalyAlertChain | Now `/health-dashboard` |
| `/support` (1 use) | TerraCallback | No support page exists anywhere; the link now opens device troubleshooting at `/devices` |
| `/creator/new` (2 uses) | CreatorDashboard | NOT fixed; page is behind `VITE_ENABLE_NON_CORE_ROUTES` and the create-template destination was never built. Parked under Needs Joshua's decision. |

### Dead code inventory (knip)
163 unused files repo-wide, of which 47 are in `src/`. The repo-wide number includes `health-api/`, `smart-contracts/`, and `nextjs-implementation/`, which are separate deployables and not truly dead for their own runtimes. The 47 `src/` files are genuinely unreferenced by the app build, including: `TerraIntegration.tsx`, `terra-client.ts`, `terra-config.ts`, `AkashicStream.tsx`, `saints/CouncilRoom.tsx`, `saints/MissionBoard.tsx`, `ScrollIndicator.tsx`, `useKeyboardNavigation.tsx`, `LandingRecovery.tsx`, and a family of showcase/button demo components. Full list in the PR description. Recommendation: delete in a dedicated cleanup PR so this audit stays reviewable; not deleted here.

Also from knip: unused dependencies `@netlify/neon`, `@types/lodash`, `lodash` (lodash is only imported by the dead AkashicStream), and 40 unused exports.

### Environment variables
Referenced in `src/` but absent from `.env.example`: `VITE_API_URL` (RaphaelInsights), `VITE_HEALTH_API_URL` (ComprehensiveHealthConnectors, falls back to localhost:4000), `VITE_API_FALLBACK_URL`, `VITE_API_TUNNEL_URL`, `VITE_RENDER_API_URL`, `VITE_LOCAL_API_URL` (backend-request.ts). These silently resolve to undefined in production builds; the code paths fall back, but the variables should either be documented or removed.

Finding requiring attention: `src/lib/terra-config.ts` reads `import.meta.env.TERRA_API_KEY`, `TERRA_DEV_ID`, and `TERRA_WEBHOOK_SECRET`. Non-VITE variables are never exposed by Vite, so this validation can never pass in the browser; worse, the pattern invites putting Terra secrets into frontend env where they would ship in the bundle. The entire file (and its importers `terra-client.ts`, `TerraIntegration.tsx`) is dead code per knip. Severity is contained because it is unreachable, but it should be deleted. Parked with the dead-code cleanup recommendation.

### Secrets in source
None found. No hardcoded `*.supabase.co` project URLs outside generic pattern matching in the demo interceptor, and no JWT-shaped strings in `src/`.

### Supabase client usage
Single shared client created once in `src/lib/supabase.ts` and imported everywhere else. Auth session handling lives in `src/lib/auth-session.ts` plus `AuthContext`. Critical-path queries (save, load, auth) carry error handling; remaining silently-swallowed errors are in decorative paths (for example sealed-status lookups) and are intentional per their comments.

### Fixes shipped in this phase
- `fix(works)`: dead navigation targets repaired (see table).
- `fix(works)`: `@vitest/coverage-v8` added; `npm run test:coverage` was broken (config referenced an uninstalled reporter) and now runs.
- `fix(works)`: CouncilOracle (route `/council`) no longer calls the backend with raw axios (no timeout, invisible to the demo interceptor, errors swallowed with a stub comment). It now shares the grounded local deliberation with SocietyFeed via `src/lib/saints/deliberation.ts`, races the live service against a 2.5s deadline, always answers, and states provenance honestly. The five guardians now sit in a real circle around a central You node.

## 3. Phase 1C: Runtime smoke test

Method: production build served by `vite preview`, driven headlessly (Playwright, scripts committed as `scripts/audit-walk.mjs` and `scripts/audit-flows.mjs`). Demo mode entered through the landing CTA so the app exercises its real fetch paths against the demo interceptor. Screenshots for every route at 1440x900 and 390x844 are in `audit-artifacts/before/` (54 files, captured at the end of Mission 1, before any directionality change).

### Route walk results
Every reachable route renders with no console errors, no page errors, no unexpected failed requests, no error-boundary triggers, and zero horizontal scroll at 390px.

| Route set | Result |
| --- | --- |
| Public: `/`, `/login`, `/signup`, `/forgot-password`, `/reset-password` | All clean. Empty submits on login and signup show validation instead of crashing. |
| `/quiz/demo-token` (public, invalid token) | Renders the honest "Quiz unavailable" state. The one console line is the browser logging the failed HTTP request itself, which is expected with an invalid token and no backend. |
| App: `/dashboard`, `/trinity`, `/health-dashboard`, `/security-dashboard`, `/family-dashboard`, `/family-intelligence`, `/finance-dashboard`, `/anthony-dashboard`, `/monitor`, `/legacy-vault`, `/digital-legacy`, `/rituals`, `/time-capsules`, `/council`, `/career`, `/devices`, `/personality-training`, `/portal`, `/portal/profile` | All clean after the fixes below. |
| Redirects: `/raphael`, `/michael-dashboard`, `/saints`, `/ceremonies`, and the non-core gates (`/pricing`, `/marketplace`, `/beyond-modules`) | All resolve to their intended targets. |

### Core flows (9 of 9 pass)
1. Council Circle renders five guardian nodes plus the central You seat (the request named six saints; the roster discrepancy is parked under Needs Joshua's decision).
2. Council deliberation produces a consensus with honest provenance.
3. Ancestry tree renders on the family dashboard.
4. Timeline Echoes toggle works.
5. Soul profile cards on family intelligence open a detail view.
6. Comparison mode (Delphi, Compare with family) opens.
7. Auth screens validate.
8. No page errors anywhere in the walk.
9. Demo entry lands on the dashboard.

### Bugs found by the runtime walk, and fixed
1. `/saints/missions/active` was not mocked in demo mode, so the family timeline logged a console error on every visit. Mocked to an empty list, matching the intercessions pattern.
2. ProtectedRoute unmounted every page right after its first render to show a "Checking runtime dependencies" spinner, then remounted it. Consequences: page state reset (which silently destroyed every `/family-dashboard?tab=` deep link, because the dashboard had already consumed and deleted the param), double data loading on every protected page visit, and a visible flash. Children now stay mounted while the gate resolves; a confirmed hard blocker still replaces the page.
3. The family dashboard now treats the URL as the source of truth for its active tab: deep links (`?tab=delphi`), refreshes, shared quiz links (`?memberId=`), and the Michael to Anthony ledger links all land on the right tab. Verified end to end.

## 4. Phase 2A: Wording changes (pending)

## 5. Phase 2B: Interaction, animation, icon changes (pending)

## 6. Phase 2C: Layout and flow changes (pending)

## 7. Needs Joshua's decision

## 8. Known issues ranked by severity

## 9. FINAL verification proof (pending)
