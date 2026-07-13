# iOS App Store Readiness — Status & Owner Runbook

**Date:** 2026-07-13 · **Wrapper decision (owner-approved):** Capacitor ·
**IAP decision (owner-approved):** native app sells nothing in-app

This documents what is done in-repo, what must happen on a Mac, and what only
the account owner can do. It is the evidence trail for the §4.1 readiness
checklist. Statements below are verified against this repo at the date above;
nothing here claims work that hasn't happened.

---

## 1. What is DONE in this repo

### 1.1 Capacitor wrapper (was BLOCKER: "no wrapper exists")
- `capacitor.config.ts` — appId `com.everafterai.app`, appName `EverAfter`,
  `webDir: dist`, dark background matching the app shell. The config
  deliberately has **no `server.url`**: the app ships its web assets in the
  bundle. Pointing a wrapper at a remote URL is the classic Guideline 4.2
  ("minimum functionality / repackaged website") rejection.
- `ios/` — generated Xcode project (`npx cap add ios --packagemanager SPM`).
  SPM instead of CocoaPods, so dependency resolution happens inside Xcode
  with no Ruby toolchain. `ios/App/App/public/` (the copied web build) is
  gitignored; run `npx cap sync ios` after any web build to refresh it.
- Verified: `npm run build && npx cap sync ios` completes on this tree.
  **Not yet verified: an actual `xcodebuild archive` — impossible on Linux.**
  See §2.

### 1.2 App icon + splash (was BLOCKER: "no icon set")
- `assets/icon.png`, `assets/icon-only.png` (1024×1024) and
  `assets/splash.png`, `assets/splash-dark.png` (2732×2732) — rendered from
  `public/apple-touch-icon.svg` (the brand mark on an opaque gradient; App
  Store icons must have no alpha).
- `ios/App/App/Assets.xcassets/AppIcon.appiconset/` and `Splash.imageset/`
  populated via `npx @capacitor/assets generate --ios`. Regenerate any time
  with the same command if the brand mark changes.
- The 1024×1024 App Store marketing icon is `assets/icon.png` itself —
  upload it in App Store Connect.

### 1.3 In-app purchases (was BLOCKER: Stripe vs Guideline 3.1.1)
Owner-approved strategy: **the native app sells nothing.** Stripe checkout
for digital subscriptions inside an iOS binary violates 3.1.1, and linking
out to buy ("purchase on our website") violates 3.1.3's anti-steering rules
unless the External Purchase Link entitlement is granted. So the native
build hides every purchase surface entirely; entitlements bought on the web
still work when the same account signs in natively (Netflix/Spotify "reader"
pattern — permitted).

Implementation: `src/lib/platform.ts` exposes `purchasesEnabled()`
(`!Capacitor.isNativePlatform()`); it gates:
- `src/pages/Pricing.tsx` — whole page redirects to `/dashboard` natively
- `src/pages/Marketplace.tsx` — purchase buttons hidden (browsing remains)
- `src/pages/DigitalLegacy.tsx` — premium banner + upgrade modal
- `src/components/CognitiveInsights.tsx` — Insight Pro upsell
- `src/components/CustomEngramsDashboard.tsx` — fast-track upgrade + modal
- `src/components/RaphaelHealthInterface.tsx` — premium modal

On the web build nothing changes (`purchasesEnabled()` is `true` in every
browser). Verified by Playwright against the production bundle: pricing
plans and marketplace purchase CTAs render on web.

If the owner later wants native sales, that is a separate project: StoreKit 2
products + receipt validation + a reconciliation path in
`stripe-webhook`-equivalent server code. Do not bolt Stripe into the shell.

### 1.4 St. Raphael medical guardrails (was BLOCKER: backend had none)
The FastAPI backend's Raphael chat path (`saint_agent_service.chat`) now has
three layers (`backend/app/services/health/medical_safety.py`):
1. `RAPHAEL_SAFETY_PROMPT` appended to the served system prompt — never
   diagnose, never dose/start/stop medication, 911/988 escalation.
2. `detect_emergency()` on the **user message** — chest pain, breathing,
   stroke, bleeding, overdose, suicide/self-harm → the response is prefixed
   with an emergency-services preface regardless of what the model said.
3. `apply_output_safety()` on the **model output** — concrete dosing or
   start/stop-medication instructions replace the entire response with a
   safe refusal (fail-safe; flagged in logs); diagnostic claims get a
   prominent appended correction.

Evidence: 13 unit tests (`backend/tests/test_medical_safety.py`), 13/13
passing. **Still owed: a transcript from the deployed Render endpoint**
(this sandbox cannot reach it) — after the next backend deploy, send
"what dose of ibuprofen should I take" and "do I have diabetes based on
these readings" to `/api/v1/saints/raphael/chat` and file the transcript
here. The Supabase `raphael-chat` Edge Function already had guardrails;
this closes the second, previously-unguarded path.

### 1.5 Viewport / safe areas (MED)
`index.html` already ships `viewport-fit=cover`,
`apple-mobile-web-app-capable`, and a dark `theme-color`, and the app shell
uses full-height dark surfaces, so notch/home-indicator regions render
correctly. If specific screens later need padding, use the standard
`env(safe-area-inset-*)` CSS.

---

## 2. What must happen on a Mac (anyone with Xcode 15+)

```bash
npm ci
npm run build                      # web bundle → dist/
npx cap sync ios                   # copies dist/ into ios/App/App/public
open ios/App/App.xcodeproj         # resolve SPM packages on first open
```
Then in Xcode: select the `App` target → Signing & Capabilities → choose the
team (requires §3.1) → Product ▸ Archive → Distribute App ▸ App Store
Connect. CLI equivalent once signing is configured:

```bash
xcodebuild -project ios/App/App.xcodeproj -scheme App \
  -destination 'generic/platform=iOS' archive \
  -archivePath build/EverAfter.xcarchive
```

Expect first-run housekeeping, not code changes: SPM package resolution,
signing team selection, and (if prompted) bumping `IPHONEOS_DEPLOYMENT_TARGET`.

---

## 3. Owner-only items (no code can do these)

1. **Apple Developer Program enrollment** ($99/yr) for the entity that will
   publish. D-U-N-S verification for an LLC takes days–weeks; start first.
2. **App Store Connect record**: name "EverAfter", bundle ID
   `com.everafterai.app`, primary category (Health & Fitness or Lifestyle).
3. **Privacy nutrition labels** — must declare: Health & Fitness data,
   messages/chat content, identifiers, purchases (web), and that health data
   is linked to identity. Understating this is a review rejection and a
   trust problem. The privacy policy at `/privacy` must match.
4. **Screenshots** (6.7" and 6.5" minimum) from the archived build on a
   real device or simulator.
5. **Review notes + demo account**: give App Review a working login. State
   plainly that St. Raphael is a wellness companion with guardrails, not a
   medical device (Guideline 1.4.1 scrutiny is certain for health AI).
6. **Age rating questionnaire** — health/medical content questions.

---

## 4. Deferred scope — flagged, not silently dropped

- **HealthKit (was HIGH)**: NOT wired. Current health data flows through
  cloud APIs (Terra, Dexcom, Fitbit) and works in the wrapper unchanged.
  HealthKit is only mandatory if we read/write on-device Health data; adding
  it later means a Capacitor plugin + `NSHealthShareUsageDescription` +
  the HealthKit entitlement. Decision needed only when on-device data is
  actually wanted.
- **APNs push (was HIGH)**: NOT wired. Health alerts today surface through
  in-app realtime (Supabase) and email-side flows; there is no
  push-notification dispatch pipeline server-side, so shipping v1 without
  APNs is honest. Adding it later: APNs key in the developer account,
  `@capacitor/push-notifications`, and a server dispatch path tied to the
  existing alert thresholds.
- **OAuth deep links (MED)**: health-provider OAuth (Terra/Dexcom/Fitbit)
  currently completes via `https://everafterai.net` redirect URIs. In the
  wrapper these flows open in the system browser and return to the site,
  not the app. Proper fix when prioritized: Universal Links
  (`applinks:everafterai.net`) + provider redirect-URI updates. The
  `everafter://` scheme mentioned in older archived docs was never
  registered anywhere and remains fictional.
- **WiseGold / crypto surfaces (MED)**: any exchange/wallet functionality
  draws Guideline 3.1.5(b) scrutiny (crypto exchanges must be licensed
  entities). WiseGold UI is not part of the current core-route release
  scope (`VITE_ENABLE_NON_CORE_ROUTES` gates non-core surfaces off). Before
  ever enabling it in the native build, get a compliance read.

---

## 5. Current honest status

Submittable **after** the Mac archive step and owner items in §3 — every
in-repo blocker (wrapper, icons, IAP conflict, backend guardrails) is
resolved and evidenced above. The archive step itself and the live-endpoint
guardrail transcript are the two remaining verifications that require
infrastructure this environment does not have (a Mac; the deployed backend).
