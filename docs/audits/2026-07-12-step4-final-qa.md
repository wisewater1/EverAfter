# Step 4 — Final QA Pass (2026-07-12)

Closing report for the four-step App Store finalization engagement
(Step 1 audit: `2026-07-11-demo-and-main-experience-audit.md`; Steps 2–3
landed across PRs #110–#116). This documents what was verified, what was
fixed in this pass, what debt remains, and the human-only checklist for
actual App Store submission.

**Platform reality check:** EverAfter is a web application (React + Vite,
deployed to Netlify). There is no iOS project in this repository — no
Capacitor, React Native, or Xcode target. Nothing can be submitted to the
App Store from this codebase as-is. The agreed path (owner-approved in
Step 1) is a **Capacitor wrapper as a post-Step-4 project**, primarily
because native in-app subscription rules make the current Stripe checkout
unusable inside a native iOS app without In-App Purchase work.

---

## 1. What this pass fixed

### Native dialogs eliminated (~100 call sites, 30+ files)
`window.alert()` / `window.confirm()` render as bare browser dialogs — in
an iOS WKWebView they even display the site origin as the dialog title.
Every call site in `src/` now routes through the app-styled system:

- `src/lib/dialogs.ts` — imperative `notify()` (toast) + promise-based
  `appConfirm()` bridge, with native fallback only if the host isn't
  mounted.
- `src/components/shared/DialogHost.tsx` — mount-once host (App.tsx)
  backing the bridge with the existing NotificationContext toasts and
  ConfirmDialog; queues overlapping confirms.
- Messages were classified (error/warning/info/success), not blanket-
  converted; destructive confirms use the destructive dialog style.

### Truthfulness bugs found during the sweep (all fixed)
1. **`HealthConnectionManager` (live in St. Raphael Hub) fabricated
   health data**: its non-demo "sync" slept 2 s, stamped `last_sync_at`,
   inserted **`Math.random()` steps/heart-rate/sleep rows into the real
   `health_metrics` table** attributed to the provider, and reported
   "Successfully synced!". Its non-demo "connect" inserted a permanently
   pending row and admitted in its own alert that a production app would
   do OAuth. Now: connect opens the real OAuth connections panel; sync
   calls the real `sync-health-now` function and reports its actual
   result (or its failure, persisted to `error_message`).
2. **`PersonalityTrainingCenter`**: "Mentorship registered!" was shown
   even when no backend profile existed, and the catch path claimed
   success on failure ("initiated in local mode"). The vignette trainer
   claimed "Memory saved locally" while **discarding the user's text
   unsaved**. Both now report honestly and preserve the user's text on
   failure.
3. **`FamilyMembers`**: "They'll receive it via email" — no email
   pipeline exists for `family_personality_questions`. Message now says
   the question is saved and email delivery isn't set up yet.
4. **`FamilyMembersGrid`**: activation toast dropped the pseudo-technical
   "Research Layers (Generative Agents, GenAgents, Agentic Collab)"
   framing for a plain statement of what happened.
5. **`HeartDeviceRecommendations`** (live in St. Raphael Hub): "Compare
   Devices" only wrote to the console. It now opens a real side-by-side
   comparison table (15 spec rows) of the selected devices.

### Debug statements
- Orientation-change `console.log` removed from
  `ConnectionRotationOverview`.
- Remaining `console.log`s in `src/`: 2, both inside Terra dev-mock
  branches that require `VITE_MOCK_TERRA_DATA` + `VITE_ALLOW_DEV_MOCKS`
  (never active in production builds). `console.error/warn` for real
  failures are intentionally kept.
- Boot-time logging and the dev crash overlay were already dev-gated in
  Step 3 (`src/main.tsx`).

### Dead components removed
- `EdgeSparkleButton` + `EdgeSparkleButtonShowcase` (unimported; the
  showcase's only action was `alert('clicked!')`).

## 2. Verification evidence (this pass)

| Check | Result |
| --- | --- |
| `npx vitest run` | **128/128 pass** (17 files) |
| `vite build` (production) | **clean** |
| `tsc -p tsconfig.app.json` on all touched files | **0 new errors** (per-file diff vs baseline; repo backlog 426 → 413) |
| Browser smoke sweep (Playwright, production preview) | **20/20** |

Smoke sweep detail (chromium against `vite preview`, production bundle):
6 public routes (landing, login, signup, privacy, terms, pricing), demo
boot via the real "See the Live Demo" flow, 12 demo routes (dashboard,
raphael hub, saints, michael, portal, devices, marketplace, digital
legacy, memorial, my-ais, legacy vault, family dashboard) — each
asserted to render, **not** bounce to /login, produce **zero console
errors**, and invoke **zero native dialogs** (tripwire instrumentation
on `window.alert`/`window.confirm`).

## 3. Cumulative state after Steps 1–4

All items from the §4.3 truthfulness checklist are done or explicitly
flagged (PRs #113–#116, all merged): no fabricated task results, real
in-app critical-alert delivery, honest FHIR/embedding failures, real
OSV.dev CVE scanning, unified task system with real reminder delivery,
training answers reaching the searched memory store, plus this pass's
findings above.

## 4. Remaining debt (known, not blocking web launch)

1. **Type backlog**: 413 pre-existing `tsc` errors repo-wide (down from
   583 at engagement start). `npm run type-check` is now an honest gate
   but does not yet pass. All files touched during Steps 2–4 are at zero
   or baseline.
2. **MyAIs / Creator dead ends**: `/creator/new` and
   `/creator/template/:id` routes and MyAIs chat/settings affordances
   (identified in Step 1) — feature completion, not fabrication.
3. **InsuranceConnection persistence** (Step 1 item).
4. **TerraSetupWizard decorative check rows** (Step 1 item).
5. **`agent_tasks` table drop** — zero consumers; needs a data-deleting
   migration (owner call).
6. **`familyMembersDb` vault wiring** — PR #69's stated follow-up.
7. **Health provider curation** — direct sync supports 6 providers;
   others fail honestly. Consider hiding unsupported direct-OAuth tiles.
8. **raphael-chat duplication** — edge function (GROQ) vs FastAPI
   backend; pick a canonical implementation.

## 5. Owner-only App Store checklist (cannot be done from this repo)

Pre-requisite: build the Capacitor wrapper project (new engagement).
Then, in App Store Connect / Xcode — all human tasks:

- [ ] Apple Developer Program enrollment ($99/yr) under the business
      entity (Wise & Savvy LLC or successor).
- [ ] **In-App Purchase**: Stripe checkout cannot be used for digital
      subscriptions inside the iOS app (App Review Guideline 3.1.1).
      Saints subscriptions must move to StoreKit/IAP in the wrapper, or
      the iOS build must hide purchase flows entirely (reader-app-style)
      — legal/product decision.
- [ ] **Health data disclosures**: App Privacy "nutrition label" must
      declare health & fitness data collection, linkage, and tracking;
      HealthKit entitlement only if the wrapper integrates HealthKit
      (current integrations are cloud-API based — Terra/Fitbit/Dexcom —
      which do NOT require HealthKit but DO require accurate privacy
      labels).
- [ ] Privacy policy URL (live at `/privacy`) and Terms (`/terms`) —
      counsel review still pending (flagged in Step 3; confirm Delaware
      governing law is intended).
- [ ] Medical-adjacent positioning review: St. Raphael's "never
      diagnose/prescribe" guardrails should be described accurately in
      the App Review notes; avoid medical-device claims (Guideline 1.4).
- [ ] Assets: 1024px icon, iPhone/iPad screenshots, preview video
      (optional), age rating questionnaire, support URL, marketing URL.
- [ ] Demo account or demo-mode instructions for App Review (the
      built-in "See the Live Demo" flow is well-suited; document it in
      the review notes).
- [ ] TestFlight internal → external testing round before submission.

## 6. Environment/config actions still with the owner

- Netlify env: `VITE_ENABLE_NON_CORE_ROUTES=true` (Step 1 scope
  decision) — set in Netlify dashboard for production if the expanded
  route set should ship.
- Supabase secrets for health integrations (`TERRA_*`, `DEXCOM_*`,
  `FITBIT_*`, `OURA_*`, `OPENAI_API_KEY`, `APP_BASE_URL`) — several
  features now fail *honestly* without them; they start working when
  the secrets are set.
- Cloudflare Workers "everafter" CI check fails on every commit
  (pre-existing, dashboard-managed); fix or remove the integration from
  the repo's checks.
- Phase 3/4 roadmap features (death-trigger/heartbeat, Visage): ship or
  cut — currently absent from the UI, so no user-facing lie either way.
