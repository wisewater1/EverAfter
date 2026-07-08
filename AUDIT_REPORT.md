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
163 unused files repo-wide, of which 47 are in `src/`. The repo-wide number includes `health-api/`, `smart-contracts/`, and `nextjs-implementation/`, which are separate deployables and not truly dead for their own runtimes. The 47 `src/` files are genuinely unreferenced by the app build, including: `TerraIntegration.tsx`, `terra-client.ts`, `terra-config.ts`, `AkashicStream.tsx`, `saints/CouncilRoom.tsx`, `saints/MissionBoard.tsx`, `ScrollIndicator.tsx`, `useKeyboardNavigation.tsx`, `LandingRecovery.tsx`, and a family of showcase/button demo components. The full list is reproducible with `npx knip --reporter compact`. Recommendation: delete in a dedicated cleanup PR so this audit stays reviewable; not deleted here.

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

## 4. Phase 2A: Wording changes

### Adjudication policy
Directional wording was matched with judgment, not blind replace. Left untouched by design:
- Non-directional words from the brief's safe list: update, upload, upcoming, setup, signup, backup, popup, breakdown, download.
- Idioms with no spatial meaning: "passed down" (inheritance), "writing down", "strike up", "speak up", "follow up", "caught up", "breaks down (mentally)".
- Quantity comparisons: "above 180 mg/dL", "below target", "keep reserves above N months". These are thresholds, not navigation.
- Rankings: "Top adverse reactions", "top priority".
- Code comments (not user-visible).

### Genuine directional hits, all rewritten
| File | Before | After |
| --- | --- | --- |
| `components/DashboardViewer.tsx:131` | Add widgets ... using the "Add Widget" button above | ... using the "Add Widget" button in the toolbar |
| `components/UnifiedFamilyInterface.tsx:258` | The invite link is available below for reference. | The invite link is ready here for reference. |
| `components/UnifiedFamilyInterface.tsx:260` | share the link below manually. | share the link shown here manually. |
| `components/UnifiedFamilyInterface.tsx:262` | Share the link below manually. | Share the link shown here manually. |
| `components/UnifiedFamilyInterface.tsx:264` | Share the link below or open it in your email client. | Share the link shown here or open it in your email client. |
| `components/UnifiedFamilyInterface.tsx:284` | Copy it manually from the field below. | Copy it manually from the link field. |
| `components/LegacyVaultEnhanced.tsx:2119` | You may submit a new one below. | You are welcome to submit a new one. |
| `components/HealthConnectionManager.tsx:488` | Connect health sources above to get started | Connect a health source to get started |
| `components/RaphaelConnectors.tsx:753` | Connect health sources above to get started | Connect a health source to get started |
| `components/joseph/JosephVoiceAnswerPanel.tsx:113` | Type what you said above, then ... | Type what you said, then ... |
| `components/dht/DelphiView.tsx:212` | The measurement below would reduce ... | This measurement would reduce ... |
| `components/trinity/FamilyVitalityScore.tsx:179` | guards access to every score above. | guards access to every score in this view. |
| `components/TerraSetupWizard.tsx:316` | Add the Webhook URL above | Add the Webhook URL from this guide |
| `components/EdgeSparkleButtonShowcase.tsx:136` | Click the button below to see it in action | Click the button to see it in action |
| `components/rituals/RitualAltar.tsx:1052` | title "Move step up" | title "Move step earlier" |
| `components/rituals/RitualAltar.tsx:1061` | title "Move step down" | title "Move step later" |

### Em dash sweep (global rule 1)
229 em dash lines across 71 files in `src/` were replaced: comment headers use a colon, prose joints use a comma, quote attributions use a plain hyphen. One additional em dash lived in a visible UI label (ELEVATED RISK label in `DHTAnomalyAlertChain`) and now uses a colon. Zero em dashes remain in `src/` or `scripts/`.

## 5. Phase 2B: Interaction, animation, icon changes

### Keyboard
- No live code path used ArrowUp/ArrowDown for navigation. The two implementations found (`lib/keyboard-navigation.ts` list helper, `hooks/useKeyboardNavigation.tsx`) are unused exports; the shared helper's `horizontal` option now defaults to true so any future caller is horizontal-first. Home/End in the same helper are sequence jumps (first/last), not vertical semantics, and no live caller exists.
- Modal focus handling (Tab/Escape via ModalManager) is untouched; it has no directional semantics.

### Gestures
- `AppointmentManager` and `MedicationTracker` implemented vertical pull-to-refresh (touch deltaY at the container edge). The vertical gesture is removed entirely and each panel now has a visible refresh button using the same fetchers and spinner state. Rationale: a horizontal pull would collide with the browser's native edge-swipe navigation, and a visible control is more discoverable than any hidden gesture.
- No other touch handlers used vertical deltas for navigation. No `onWheel` navigation handlers exist.

### Animations and transitions
| Change | Instances | Files |
| --- | --- | --- |
| `animate-bounce` (vertical) to `animate-pulse` | 15 | CareerChat, RaphaelChat, SaintChat typing dots; PhoneHealthConnect footprints; AdvancedShoppingTab negotiator; OnboardingComplete badge; HealthReportGenerator download; StRaphaelHealthHub pulse button; FamilyMembers, CouncilRoom (dead files, swept anyway) |
| `slide-in-from-bottom/top-N` to `slide-in-from-left-N` | 10 | StRaphaelHealthHub tab panels, SocietyFeed notice, VulnerabilityScanner, CouncilRoom |
| `hover:-translate-y-N` lifts to `hover:scale` | 2 | StRaphaelHealthHub, EdgeSparkleButton |
| `index.css` hover lifts (`.ea-panel`, `.ea-btn`, `.glass-card`, `.btn-reactive`, `.neon-hover`) to scale | 5 | index.css |
| `index.css` entrance keyframes (`fadeIn`, `fadeInSlide`, `spring-in`) translateY to translateX | 3 | index.css |
| Inline keyframe entrances translateY to translateX | 4 | OAuthCallback, BeyondModules, CompactSaintsOverlay, RaphaelCinematicPrototype |
| Saints navigation center emphasis `translateY(-8px)` to `scale(1.08)` | 1 | SaintsNavigation |
| Governance accordion `height` animation to opacity fade | 1 | causal-twin/GovernanceView (framer-motion) |

Static `top-1/2 -translate-y-1/2` icon centering inside inputs is geometry, not motion, and is untouched.

Ambient vertical drift flagged per the brief (allowed to stay, listed for the record):
- `StarfieldBackground` stars twinkle and parallax in place (no directional travel; drift vector is horizontal-biased).
- `RaphaelCinematicPrototype` has an upward particle float; the file is dead code (never imported) and its entrance animation was converted anyway. Recommend deletion with the dead-code batch.

### Iconography
- Every ChevronUp/ChevronDown disclosure pair now uses the horizontal disclosure pattern: closed points right, open points left. Files: TrinitySynapsePanel, CompactSaintsOverlay, ExperimentLab, GovernanceView, MediaIntelligencePanel, FamilyTreeView, RiskCards, OceanBehavioralLayer, CrossSaintGoalEngine, RitualAltar (step reorder now ChevronLeft/ChevronRight, archived disclosure likewise).
- `SharedPredictionPanel` what-if chevron rotated to point at 90 degrees (which reads as pointing at the ground) when open; it now flips 180 to point back instead.
- `TransactionLedger` sort toggle used the vertical ArrowDownUp glyph; now ArrowLeftRight.
- `ResearchParticipation` used a literal caret glyph pointing at the ground; now a right-pointing glyph that flips when open.
- Zero ArrowUp/ArrowDown/ChevronsUpDown icons remain anywhere in `src/`.

## 6. Phase 2C: Layout and flow changes

- Screen-to-screen navigation now pages horizontally: a `PageTransition` wrapper in `App.tsx` keys on `location.pathname` and plays a motion-safe fade plus slide-in-from-left on every route change. Keyed on pathname only, so query-param changes (dashboard tabs) do not retrigger it. Verified against the production build: all routes render, deep links work, zero console errors.
- Onboarding was already a one-step-at-a-time flow; each step now pages in from the left (keyed on step).
- The engram training wizard's six stages (family-pre, family-connect, quiz-intro, quiz, results, memory) now page in from the left the same way.
- Long-form vertical overflow: 74 `overflow-y-auto` containers remain across 40 files (chat message lists, ledgers, transcripts, modal bodies). Policy check for each class of container: none carries vertical wording, none has up/down arrows or scroll-down prompts decorating it (verified by the wording and icon sweeps in 2A/2B). Recommendation: keep physical vertical overflow for chat histories, ledgers, and transcripts, where horizontal pagination would harm readability; these are listed as compliant physical overflow, not directional affordances. Candidates that could become horizontal pagers in a later pass: `PersonalityProfileViewer` sections and `WidgetRenderer` long widget lists.

## 7. Needs Joshua's decision

1. Council Circle roster: the brief expects six saint nodes plus the central You. The product's real roster is five saints (Michael, Joseph, Raphael, Gabriel, Anthony); the front page was aligned to those five in an earlier pass. The circle now renders five plus the central You. Decide: name a sixth saint (and its domain) or accept five.
2. `/creator/new`: the Creator dashboard's Create Template buttons target a route that was never built (page is behind `VITE_ENABLE_NON_CORE_ROUTES`). Decide: build the create-template flow, point the buttons at `/my-ais`, or remove the buttons until the flow exists.
3. TrendingUp/TrendingDown icons (56 uses): these are data-trend semantics on health and finance metrics (improving vs declining), not navigation, so they were left. Strictly they are diagonal up/down glyphs. Decide: keep as data semantics (recommended), or replace with signed percentage chips (+4% / -2%) with color, which would remove the last up/down glyphs from the product.
4. Native select elements: browsers render their own dropdown caret on `<select>`. Restyling every select to suppress the native caret would fight platform form patterns and hurt accessibility. Left native; no custom ChevronDown decorates any select.
5. Dead-code deletion: 47 unused `src/` files (list in section 2), including the frontend Terra config that reads secret-shaped env vars. Recommend a dedicated cleanup PR; deleting them here would bloat this audit's diff.
6. `npm audit fix`: would resolve the critical (vitest) and high (form-data) advisories within semver. Recommend running it in a dedicated PR with the full gate battery.
7. Onboarding flow direction word: "Back" buttons across the app retain the word "Back" (with left arrows). "Back" is not vertical, so it complies; flagging only because the brief says forward equals right, back equals left, which is exactly how these render.

## 8. Known issues ranked by severity

1. HIGH: The Python backend on Render (`everafter-api-voac.onrender.com`) is the live path for saint chat, engrams, council deliberation, time capsules, and family-home data. On the free tier it cold-starts slower than the client's 8s timeout, so first requests routinely fall back. Healthy `raphael-chat` and `engram-chat` Supabase edge functions exist and are unused by the in-app chat path. Repointing chat at the edge functions would remove the single point of failure. (Unchanged in this audit; out of its scope.)
2. HIGH: Health provider OAuth secrets (Terra, Dexcom, Fitbit, Oura) are documented as not yet set in Supabase secrets, so real device connections cannot complete even though all edge functions are deployed.
3. MEDIUM: 2 critical and 2 high npm audit advisories (dev-time tooling; see section 1).
4. MEDIUM: `web-llm` chunk is 6 MB (2.1 MB gzip) in the production bundle from the Crystal evaluation; it is lazy-loaded but still shipped. Consider gating it behind a dynamic feature flag or removing until needed.
5. LOW: 47 dead files in `src/` plus unused dependencies (`@netlify/neon`, `lodash`, `@types/lodash`).
6. LOW: `/quiz/:token` logs one browser console line (the failed HTTP request itself) when a token is invalid or the backend is absent; the page shows an honest error state. Cosmetic.
7. LOW: Six env vars referenced in code are undocumented in `.env.example` (section 2); all have safe fallbacks.

## 9. FINAL verification proof

Fresh output at the end of the pass, on the final tree of `audit/horizontal-directionality`:

| Gate | Baseline | Final |
| --- | --- | --- |
| `npx tsc --noEmit` | clean, exit 0 | clean, exit 0 |
| `npm run build` | success, 15.41s | success, 13.90s |
| `npx eslint . --ext .ts,.tsx` | 1210 problems (1096 errors, 114 warnings) | 1194 problems (1082 errors, 112 warnings): 16 under baseline |
| `npx vitest run` | 96/96 passing | 96/96 passing |
| Runtime walk (all routes, demo mode) | 1 unmocked-endpoint console error, deep links broken | zero console errors, deep links verified |
| Core flows | 8/9 (comparison unverified) | 9/9 |

Self-check sweeps on the final tree:
- Directional phrases (scroll/swipe/pull up-down, see above/below, back to top): 0 hits.
- Vertical motion classes (animate-bounce, slide-in-from-top/bottom, hover translate-y lifts): 0 hits.
- Vertical navigation icons (ChevronUp, ChevronDown, ArrowUp, ArrowDown, ChevronsUpDown): 0 rendered.
- Animated translateY: 0 in live code. 4 lines remain in `RaphaelCinematicPrototype.tsx`, a dead file's ambient particle float, kept under the brief's ambience exception and flagged in section 5.
- Em dashes in `src/`, `scripts/`, and this report: 0.

Screenshot sets: `audit-artifacts/before/` (54 files, end of Mission 1) and `audit-artifacts/after/` (54 files, end of Mission 2), both at 1440x900 and 390x844 per route plus interaction captures (council deliberation, timeline echoes, soul profile, comparison mode).
