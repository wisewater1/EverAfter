# Demo & Main Experience Audit — Step 1 of App Store Finalization

**Date:** 2026-07-11 · **Branch:** `claude/ios-app-store-audit-yso3bm` @ `b2ccc36` (= `main` HEAD)
**Method:** Every finding below was verified against current code this session (file:line), or by a command run this session. No claims are inherited from the repo's own docs.

---

## 0. What "Demo tab" and "Main tab" mean in this codebase

There is one app with two entry paths forked on the Landing page (`src/pages/Landing.tsx:120-140`):

- **Demo experience** — "See the Live Demo" calls `startDemoMode()` (`src/contexts/AuthContext.tsx:311`): a fake local session (`src/lib/demo-auth.ts`, localStorage key `everafter_demo_auth`, user id `00000000-0000-4000-8000-000000000001`) plus a fetch interceptor (`src/lib/demo/demo-data-provider.ts`) that mocks `/api/v1/*` and Supabase REST calls, and forces axios through fetch so it's intercepted too (`:918`). Demo survives reloads (re-installed on mount, `AuthContext.tsx:86-98`) until explicitly exited.
- **Main experience** — "Start Free" / login: real Supabase Auth, Supabase REST + Edge Functions, and the production FastAPI backend proxied at `/api/v1/*` (netlify.toml → `everafter-api-voac.onrender.com`).

Both paths render the same routes/components; demo-awareness is per-component (`isDemoMode` from `useAuth()`, consumed in ~45 files).

---

## 1. Reality check: "immediate iOS App Store submission"

**There is no iOS app in this repository to submit.** Verified this session:

- No `ios/` directory, no `.xcodeproj`/`.xcworkspace`, no Capacitor/React-Native/Expo dependency anywhere in `package.json`.
- No app icon set — only `public/apple-touch-icon.png` (180×180). No 1024×1024 marketing icon, no launch screens, no PWA manifest.
- The in-repo finalization brief (`FABLE_FINALIZATION_PROMPT.md` §2) explicitly requires **two user decisions before any native work starts**: (a) wrapper strategy (Capacitor wrap vs React Native rewrite — brief recommends Capacitor), and (b) the Apple Guideline 3.1.1 conflict: six subscription tiers currently sell via Stripe only (`src/pages/Pricing.tsx`), which Apple rejects for digital goods unless StoreKit/IAP is added or in-app selling is removed.
- Privacy Policy and Terms of Service — required by App Store Guideline 5.1.1 and for the web — **do not exist**: `Signup.tsx:222,226` are dead `href="#"` anchors, `Login.tsx:163` is plain text, no pages/routes exist (verified: no matching files in `src/pages`, no routes in `App.tsx`).

**Consequence for this engagement:** Steps 2–3 (below) bring both experiences to 100% functional, honest, polished state — which is the prerequisite for any wrapper and removes the known Guideline 1.4/2.1/5.1.1 rejection classes that live in the web code. Actual submission additionally requires the wrapper decision, IAP decision, icon/splash assets, and Apple-account actions only a human can perform. Those are flagged, not silently assumed.

---

## 2. Verified build/test/lint baseline (this session)

| Gate | Result | Evidence |
|---|---|---|
| `npm run build` | **PASS** (14.9s) | One warning: `web-llm` chunk is 6,040 kB (2,144 kB gzip) — should be lazy-loaded |
| `npm test` (vitest) | **PASS** — 113/113 tests, 17 files | |
| `npm run lint` | **FAIL** — 1,188 problems (1,073 errors, 115 warnings) | Flagged lines by dir: src 184, supabase 50, health-api 17, others ~14 |
| `npm run type-check` | **⚠️ VACUOUSLY PASSES — it checks nothing** | Root `tsconfig.json` is solution-style with `"files": []`; `tsc --noEmit` therefore type-checks zero files. `vite build` does not type-check either (esbuild transpile only). |
| Real type-check (`tsc -p tsconfig.app.json --noEmit`) | **FAIL — 583 errors** | 295 unused-symbol (TS6133), 84 implicit-any (TS7006), 45 TS2339, 27 TS2322, 19 TS2304 *Cannot find name* (includes 3 genuine runtime crashes, §4-A), rest misc |

> The vacuous type-check is why three ReferenceError-class crashes (§4-A) shipped: nothing in build, CI, or `npm run type-check` actually type-checks the app.

---

## 3. DEMO experience — inventory & gaps

### 3.1 What demonstrably works in demo (route-by-route)

| Route | Data path in demo | Outcome |
|---|---|---|
| `/dashboard` | Seeded `family_members`/`engrams` tables + mocked `/engrams/` list | Works; daily-question sub-card empty (unseeded `archetypal_ais`) |
| `/health-dashboard` | Mocked `/health/summary`, `/health/metrics`, predictions | **Works well** (mock carries the hub's flat fields on purpose) |
| `/security-dashboard` | Mocked monitoring/scan/vulnerabilities/HIPAA/ledger | **Works fully** |
| `/anthony-dashboard` | Mocked ledger/status; flow-map 404 → synthesized fallback | Works |
| `/trinity` | `/trinity/synapse` intentionally unmocked → rich local model | Works |
| `/council` | `/council` chat-mock lacks transcript → local deliberation fallback | Works (honestly labeled) |
| `/time-capsules` | Mocked list + echoed create | Works |
| `/rituals` | Supabase-echo + localStorage ceremonies; Akashic 404 → sample records | Works |
| `/legacy-vault` | Seeded `vault_items` (3) | Reads work; **action buttons error** (Edge Functions, §3.2) |
| `/family-dashboard` | `/family-home/*` swallowed by generic `/family` matcher | Renders; **tasks/shopping/bulletin empty, writes get wrong shapes** |
| `/finance-dashboard` | `isDemoMode` early-returns to **zeros** — the mocked `MOCK_FINANCE_DATA` is never fetched | Renders but **empty/zero**, inconsistent with other saints |
| `/devices` | Direct `.from()` on 4 unseeded tables, not demo-gated | **Entirely empty page** |
| `/career` | Dashboard: unseeded tables → empty. Chat: real Edge Function call | Dashboard empty; **Chat errors on send** |
| `/settings` | Demo-gated with explicit notice | Works, honestly labeled |
| `/personality-training` | Engram list mocked; analyze/mentorship/vignette hit wrong-shape `/engram` matcher | List renders; **actions degraded/error** |

Public quiz (`/quiz/:token`), onboarding, and the demo personality quiz all work — the demo quiz uses the identical question bank and scoring as the real offline path (`src/lib/demo/demoPersonalityQuiz.ts:26-34`).

### 3.2 Demo gaps (what Step 2 must fix)

**D1 — No demo labeling anywhere in-app (highest demo priority).** No banner/badge exists (verified: no such component; headers have no `isDemoMode` awareness). The only indicator is the `/dashboard` header button label "Exit Demo" (`Dashboard.tsx:276`) — and that label is `hidden sm:inline`, i.e. **invisible on mobile**. A viewer on `/health-dashboard` or `/security-dashboard` sees realistic vitals, CVEs, and a HIPAA "compliant" report with **zero indication it's sample data**. For a health app this is also an App-Review honesty risk. Fix: persistent, dismissible-safe demo banner rendered app-wide in demo, with an Exit-Demo affordance (fixes D2 too).

**D2 — Demo can only be exited from `/dashboard`** (or by signing in). Sub-dashboards have no exit affordance; demo persists across reloads by design (`AuthContext.tsx:86-98`).

**D3 — Broken-in-demo actions (unintercepted Supabase Edge Functions / Storage / ungated callers).** The interceptor covers `/api/v1/*` and Supabase REST, but **not** `/functions/v1/*` or `/storage/v1/*`, and `callEdgeFunction` throws `NO_SESSION` in demo (`src/lib/edge-functions.ts:47-53`). Broken on click in demo:
- Career **Chat send** — own fetch to `career-chat` (`CareerChat.tsx:173`) → error bubble.
- Raphael **"Generate report"** — `insights-report` (`RaphaelInsightsPanel.tsx:96`).
- **EngramTaskManager** task execution — `manage-agent-tasks` (`api-client.ts:668`).
- **File uploads** — `supabase.storage` (`file-storage.ts:56-198`, `PersonalityMediaUploader.tsx:98,197,207`).
- **Vault actions** — `vault-integrity-check`/`vault-export` (`lib/vault/data.ts:258,265`).
- **Ungated Stripe checkouts** — `CognitiveInsights.tsx:103`, `CustomEngramsDashboard.tsx:850` (Fast-track), `RaphaelHealthInterface.tsx:337` (others are demo-gated).
- **Health OAuth** — `health-oauth-initiate` (`ExpandedHealthConnections.tsx:101`).
Fix: demo-gate each with honest "not available in demo" messaging, or add interceptor coverage where a mock is meaningful.

**D4 — Empty-but-should-be-seeded surfaces:** `/devices` (seed `connections`/`device_health`/`alerts`/`webhook_logs`), career dashboard tables, `archetypal_ais` (so the daily-question card works), family-home tasks/shopping/bulletin (needs dedicated matchers instead of the generic `/family` catch), finance (either fetch the existing `MOCK_FINANCE_DATA` or keep zeros + explain).

**D5 — Wrong-shape interceptor matches corrupt demo flows:** `/api/v1/engrams/create`, `/engrams/:id/analyze`, `/mentorship/start`, `/vignette`, `/batch-sync` are all swallowed by the generic `/engram` matcher (`demo-data-provider.ts:871`); `/family-home/*` by `/family` (`:879`). Write callers receive `undefined` payloads (`api-client.ts:1051,1068,1085`). Fix: add specific matchers before the generic ones.

**D6 — 404-catchall endpoints worth mocking:** `/health/predictions?lookbackDays=` (used by `PredictiveHealthInsights.tsx:64` — note only `/health-predictions/predict` is mocked), `/saints/status` (`api-client.ts:699`, no fallback), `/social/boost`, `/social/propagate/:id`, `/social/interact/random` (SocietyFeed action buttons).

**D7 — Demo/`/quiz` residue:** none — quiz, readiness, and onboarding mocks are complete and shape-tested (`src/lib/__tests__/demoInterceptorShapes.test.ts`).

---

## 4. MAIN experience — inventory & gaps

The four auth pages, onboarding (all 7 steps), Settings (BYO-API), public quiz, ritual/ceremony CRUD, vault CRUD + real AES-GCM encryption (`src/lib/vault-encryption`), council, time capsules, Terra/OAuth callbacks, Joseph quiz→profile→engram pipeline, Gabriel finance (incl. real Plaid flow), and Anthony audit panels are genuinely wired with good loading/error states. The previously-reported `/health`→unrouted dead-end class is fixed (grep clean). What follows are the gaps.

### 4-A. Latent crashes (P0 — all confirmed by real type-check + code read)

| # | Crash | Trigger | Evidence |
|---|---|---|---|
| A1 | `ReferenceError: connectionNames is not defined` | `/portal` → Connections tab, when **any** pending/accepted connection exists (module-level `ConnectionsTab` references UserPortal's state) | `UserPortal.tsx:521,556` (also `user` at `:556`); TS2552 confirmed |
| A2 | `ReferenceError: payload is not defined` | Opening a Legacy Vault item that **has attachments** (guard uses `item.payload`, body uses bare `payload`) | `LegacyVaultEnhanced.tsx:2097` vs `:2093`; TS2304 confirmed |
| A3 | `ReferenceError: setDemoTemplate is not defined` | Marketplace template "Demo" button (state setter referenced outside its component) | `Marketplace.tsx:486`; TS2304 confirmed (route currently env-gated) |
| A4 | Stuck "Scanning…" forever | `DHTAnomalyAlertChain.load()` has no try/catch around `Promise.all`; one rejection skips `setLoading(false)` | `michael/DHTAnomalyAlertChain.tsx:32-43` |

### 4-B. Dead controls — click does nothing (P1)

- **`/devices` (`DevicesDashboard.tsx`) — the flagship connect flow is dead:** provider buttons Terra/Fitbit/Oura/Dexcom/Apple HealthKit have no `onClick` (`:667-675`); "Delete Data" (`:518`), Export-Data modal confirm (`:710`), "View All Logs" (`:414`), webhook refresh (`:417`), per-alert dismiss X (`:465`) — all dead; Metrics/Diagnostics tabs are placeholder text (`:621`, `:637`).
- **Dashboard's Chat and Activities views are unreachable dead code:** `navItems` contains only `engrams`+`trinity` (`Dashboard.tsx:206-209`); nothing ever sets `selectedView` to `'chat'`/`'activities'`, so `UnifiedChatInterface` (`:562`) and `HolisticTimeline`/`SocietyFeed`/`UnifiedActivityCenter` (`:513`) can never render.
- **Login "Remember me"** — unbound checkbox, no state (`Login.tsx:121-124`).
- **MyAIs**: "Chat" navigates to unrouted `/my-ais/chat/:id` → catch-all bounces to `/dashboard` (`MyAIs.tsx:151`); Settings button is `onClick={() => {}}` (`:321`). *(gated route)*
- **CreatorDashboard**: `/creator/new` (`:209,:298`) and `/creator/template/:id` (`:537`) unrouted → bounce; "View All" goals dead (`:544`); `analytics` tab defined but no button renders it. *(gated)*
- **EternalCareInsurance is a read-only shell**: Add-Policy modal never rendered (`:257,:269`), Edit/Delete/Add-Beneficiary/File-Claim/Record-Payment all lack `onClick` (`:315-466`). *(gated)*
- **MediaIntelligencePanel** lock/unlock button has `title` but no `onClick` (`joseph/MediaIntelligencePanel.tsx:737-739`).
- **SystemRelationshipsGraph "Isolate Node"** — 2s cosmetic pulse, no action (`saints/SystemRelationshipsGraph.tsx:57-62`).
- **AdminPortal** `activity` tab unreachable (type includes it; no button). *(gated)*
- **WidgetRenderer** drag/resize callbacks passed but never invoked (dead wiring); `refresh_interval: 0` would create a `setInterval(fn, 0)` hot loop (`WidgetRenderer.tsx:56-57`).
- **UserPortal "Send OCEAN question"** only increments a counter — no question is stored or delivered, failure silent (`UnifiedFamilyInterface.tsx:347-371`).

### 4-C. Fabricated/hardcoded data presented as real (P1 — the truthfulness bar)

| Surface | What's fabricated | Evidence |
|---|---|---|
| **SecurityIntegrityBadge** (on 5 dashboards) | Starts at 100, `Math.random() > 0.9` flips level; "Mock integrity score for now" comment | `shared/SecurityIntegrityBadge.tsx:9-32` |
| **St. Michael fallbacks** | Hardcoded threat events, CVE-2024-* list, file-integrity events, HIPAA/PCI/GDPR "pass" rows served whenever the live endpoint fails; dev builds fabricate `overallScore: 100` / `integrityScore: 99` | `lib/michael/security.ts:852,1117,1127,1139,585-592,745` |
| **VulnerabilityScanner progress** | 4 staged `setTimeout` messages regardless of real scan | `michael/VulnerabilityScanner.tsx:56-60` |
| **SystemMonitorDashboard** | Static "System Nominal" header; two hardcoded "Recent System Events" stamped with `new Date()` | `saints/SystemMonitorDashboard.tsx:149,268-277` |
| **SystemRelationshipsGraph fallback** | Hardcoded all-green nodes with fake CPU/memory/heart-rate under "Real-time saint interactions" | `saints/SystemRelationshipsGraph.tsx:45-51` |
| **FamilyTimeline analytics** | "Threads" random causal chains, "Echoes" `index%5\|\|%7`, "Branches" hardcoded "18%/12%" what-if, wealth projection on mock `1450.50` WGOLD base | `joseph/FamilyTimeline.tsx:571-585,814,866,439` |
| **PersonalityTrainingCenter** | "Run Analysis" renders hardcoded OCEAN `{65,70,55,75,40}` on the radar when no backend id | `personality/PersonalityTrainingCenter.tsx:163-169` |
| **MemorialServices "Explore"** | 5 fake "Verified" providers with `(555)` phones/emails wired to live `tel:`/`mailto:` *(gated)* | `MemorialServices.tsx:103-174` |
| **InsuranceConnection** | Static insurer marketing ("A+ ratings", "$5M coverage"); "Continue" saves nothing *(gated)* | `InsuranceConnection.tsx:22-27,80-103,272` |
| **Pricing trust badges** | "PCI Compliant / SOC 2 Certified / Trusted by thousands" — unverified claims *(gated)* | `Pricing.tsx:368-372` |
| **TerraSetupWizard** | TestCheck rows always-gray decorative, never reflect real test results | `TerraSetupWizard.tsx:398-402` |
| **OnboardingComplete tiles** | "Profile saved / First engram started / Saints ready" always green regardless of what saved | `onboarding/OnboardingComplete.tsx:87-100` |
| **DailyQuestionCard** | Hardcoded fallback question; `already_answered_today` hardcoded `false` (the "All Caught Up" state is unreachable) | `DailyQuestionCard.tsx:83-91` |
| **LegacyVault partner cards** | Trust-partner cards hardcoded "Available"; "Encryption Status: Active" static | `LegacyVaultEnhanced.tsx:954-991` |
| **vault-connect-api** | `encryptData()` is still base64-only with a "production-ready encrypted" docstring — **not used by the live vault UI** (which uses real AES-GCM), but the misleading module persists | `lib/vault-connect-api.ts:671-679` |

*(Trinity/FamilyIntelligence synthetic models are disclaimed on-screen and are a designed local-model fallback — flagged for copy review, not treated as fabrication.)*

### 4-D. Dead-end navigation & routing (P1)

- `/emergency` → `/health-dashboard#emergency`, `/files`+`/my-files` → `#documents` (`App.tsx:345-347`) — **no code anywhere consumes `location.hash`**; users land at the top of the hub. The components that render EmergencyContacts/FileManager live in the *unrouted duplicate* hub (`src/components/StRaphaelHealthHub.tsx`), not the routed one (`src/pages/StRaphaelHealthHub.tsx`).
- Health hub nav has two duplicate entries: "Evidence Ledger" → same view as Experiment Lab (`'lab'`), "Raphael AI Oracle" duplicates `'chat'` (`pages/StRaphaelHealthHub.tsx:408-428`).
- LegacyVault trust-partner "Connect" buttons target gated routes (`/insurance/connect`, `/memorial-services`) → bounce to `/dashboard` in production config (`LegacyVaultEnhanced.tsx:1053`).

### 4-E. Silent failures — no user feedback on error (P2)

- `TrinityCouncilChat` send failure: spinner vanishes, no message, no error (`trinity/TrinityCouncilChat.tsx:55`); `CrossSaintGoalEngine`/`CrossSaintWhatIf` errors are `console.warn` only.
- `TimeCapsuleVault` "Generate with AI" failure silent (`capsules/TimeCapsuleVault.tsx:152`); component also has **no empty state**.
- `CareerDashboard.saveProfile` ignores non-OK responses — modal just stays open (`CareerDashboard.tsx:183-210`).
- `UnifiedFamilyInterface` member-delete and send-question failures silent (`:367,:386`); `CustomEngramsDashboard` list-load silent (`:193`); `UserPortal` accept/decline silent (`:493,:507`).
- `StJosephFamilyDashboard` task-complete / mark-bought: optimistic flip with no try/catch (`:242-252`).
- `HealthAlertListener`: references non-existent `/sounds/alert.mp3` (`:81`) and never marks notifications read (acknowledged TODO `:50-51`).

### 4-F. UX polish / HIG-consistency (P2)

- **94 bare `alert()` calls + 1 `window.confirm`** across 25+ components (top: TerraIntegration 9, UserPortal 7, HealthConnectionManager 7…) — the app has a `NotificationContext` toast system; alerts should migrate to it, confirms to a styled dialog.
- **"Coming Soon" surfaces:** UserPortal Messages tab (`:355-361` — a real-looking tab that dead-ends), UnifiedFamilyInterface "PDF (Soon)" export (`:839-846`), WidgetRenderer fallback copy (`:336,394`). (SaintsNavigation/RaphaelConnectors "Coming Soon" are honest capability-gating — keep.)
- **Boot debris:** `main.tsx:8-9,43,53` diagnostic console.logs; `main.tsx:13-20` injects a raw developer crash overlay (monospace stack trace) over the branded ErrorBoundary for end users. `DailyQuestionCard.tsx:189,229`, `StJosephFamilyDashboard.tsx:280-282` debug logs.
- Deprecated `onKeyPress` in RaphaelChat/UserProfileSetup; unused icon imports (e.g. `UserProfileSetup.tsx:6-21`); `FamilyHealthHeatmap` returns `null` while loading (panel pops in, `pages/StRaphaelHealthHub.tsx:880`); Signup enforces 6-char minimum while its meter implies 8/12; `main.tsx` unthrottled `pointermove` querying all `.btn-reactive` with `getBoundingClientRect` per move.
- **UnifiedChatInterface** (currently dead code): hardcoded Raphael preview message; unbound settings toggles (`:71-74,388-399`) — resolve when re-wiring the Chat view.

### 4-G. Compliance / App-Store-facing (P0 for submission)

1. **Privacy Policy + Terms of Service pages** (real content for a health/legacy product), routed, linked from Signup/Login/Landing footer — currently dead `href="#"` (`Signup.tsx:222-227`).
2. **Native wrapper + IAP decisions** (user decisions, §1) — then icons (full set + 1024), launch screens, `Info.plist` usage strings, HealthKit-vs-web scope.
3. **web-llm 6 MB chunk** — confirm lazy-load or exclusion from initial bundle.
4. **Type-check gate is fake** — wire `type-check` to `tsc -b`/project configs and burn down the 583 real errors (at minimum the runtime-crash classes) so this can't regress silently.

---

## 5. Proposed execution plan

### Step 2 — Demo experience (single PR-sized batch)
1. Global **DemoBanner** (persistent, labeled "Demo — sample data", with Exit Demo) rendered app-wide in demo; visible on mobile. (D1, D2)
2. Interceptor completeness: specific matchers for `/family-home/tasks|shopping|calendar|bulletin`, `/engrams/create|analyze`, `/mentorship/start`, `/vignette`, `/batch-sync`, `/health/predictions`, `/saints/status`, `/social/boost|propagate|interact/random`; seed `connections`/`device_health`/`alerts`/`webhook_logs`, `archetypal_ais`, career tables; serve `MOCK_FINANCE_DATA` in finance demo instead of zeros. (D3–D6)
3. Demo-gate the broken Edge-Function/Storage/Stripe callers with honest in-UI messaging (career chat, insights report, task execution, uploads, vault export/integrity, 3 ungated checkouts, health OAuth). (D3)
4. Extend `demoInterceptorShapes.test.ts` to cover every new matcher.

### Step 3 — Main experience
1. **Crashes:** A1–A4.
2. **Dead controls:** restore Dashboard Chat/Activities views; wire the `/devices` connect wizard to the real ConnectionsPanel/Terra flow and implement or remove its dead buttons/placeholder tabs; fix MyAIs/Creator dead ends (route or repoint); Remember-me (implement via Supabase session persistence choice or remove); EternalCare + MediaIntelligence + remaining B-items (gated ones only if kept in scope — see decisions).
3. **Truthfulness:** replace SecurityIntegrityBadge with real computed state (or honest "monitoring unavailable"); make Michael fallbacks honest "unable to fetch live data" empty/error states instead of fake CVEs/compliance passes; tie scanner progress to the real request; derive SystemMonitor header/events from real metrics; remove or clearly label FamilyTimeline's fabricated toggles; fix PersonalityTrainingCenter fake OCEAN injection; OnboardingComplete tiles reflect actual save results; DailyQuestionCard honest states; MemorialServices/InsuranceConnection/Pricing claims (per scope decision); delete or de-claim `vault-connect-api.encryptData`.
4. **Navigation:** hash-anchor handling in the routed health hub + render Emergency/Documents sections there (or repoint redirects); dedupe hub nav items; fix LegacyVault partner links under prod gating.
5. **Error handling:** user-visible feedback for every 4-E item; migrate `alert()`/`confirm()` to toasts/dialogs (mechanical, ~25 files).
6. **Compliance & hygiene:** Privacy Policy + ToS pages/routes/links; remove `main.tsx` boot logs + dev crash overlay (gate to dev); remaining console debris; fix `npm run type-check` to actually check, resolve the 583 real errors (crash-classes first, then unused/implicit-any sweep); lazy-load web-llm.

### Step 4 — Final QA
Re-run build/lint/real-type-check/tests; route-by-route sweep of both experiences (demo pass + real-account pass); backgrounding/foregrounding (visibility handlers, intervals); asset references; evidence log per the in-repo brief's Definition of Done; a written list of remaining human-only App Store Connect steps.

### Decisions needed from you (flag-don't-assume items)
1. **Gated routes** (`VITE_ENABLE_NON_CORE_ROUTES=false` hides Pricing/Marketplace/Creator/MyAIs/Admin/Insurance/Memorial/Beyond in prod): keep them out of launch scope (recommended — fix only crash-class bugs in them), or bring any into scope now?
2. **Fabricated-feature strategy** where no real backend exists (Michael CVE fallbacks, FamilyTimeline analytics toggles, Memorial vendors, Insurance page): **honest-empty/labeled states (recommended)** vs. building real integrations now vs. removing the UI entirely.
3. **Lint/type debt depth:** full zero-out of 1,188 lint + 583 type errors (large, mostly mechanical), or crash-classes + `src/`-only burn-down with the gate fixed (recommended for this pass)?
4. **iOS wrapper:** start Capacitor integration after Step 4 (recommended), or defer entirely? (Stripe-vs-IAP must be decided before any native submission.)

---

*Full per-element inventories (every button/handler/state per page) were compiled during this audit and are reproducible from the file:line references above. This document lists every gap found; items not listed were verified working.*
