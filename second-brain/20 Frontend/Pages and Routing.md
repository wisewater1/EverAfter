---
tags: [frontend, routing, react-router, lazy-loading]
updated: 2026-07-02
---

# Pages and Routing

All routing lives in `src/App.tsx` using React Router v6 (`BrowserRouter` with v7 future flags). Provider nesting is `ErrorBoundary > NotificationProvider > AuthProvider > ConnectionsProvider > Router > Suspense > RouteErrorBoundary > Routes` — see [[Contexts and Hooks]] for what each provider does.

## Overview

Three routing mechanisms combine:

- **`ProtectedRoute`** (`src/components/ProtectedRoute.tsx`) — redirects logged-out users to `/login`, checks onboarding status (redirects incomplete users to `/onboarding`, see [[Onboarding Flow]]), and consults `src/lib/runtime-readiness.ts` route gates: if a route's hard dependencies (`auth.session`, `frontend.supabase`) are down it renders `FeatureBlockedState` instead of the page.
- **Release flag** — `nonCoreRoutesEnabled = import.meta.env.VITE_ENABLE_NON_CORE_ROUTES === 'true'` (`src/App.tsx:64`). When false, non-core routes redirect to `/` (public) or `/dashboard` (protected).
- **Lazy loading with retry** — everything except Login, Signup, ForgotPassword, ResetPassword and Dashboard is loaded via `lazyWithRetry` (`src/lib/lazyWithRetry.ts`), which catches chunk-load errors after a deploy and reloads the page once (sessionStorage token `everafter:chunk-retry` prevents loops).

## Route Table

### Public (always on)

| Path | Component | Notes |
|---|---|---|
| `/` | `src/pages/Landing.tsx` | lazy |
| `/quiz/:token` | `src/pages/PublicPersonalityQuiz.tsx` | no-account quiz via shared link |
| `/login`, `/signup` | `src/pages/Login.tsx`, `src/pages/Signup.tsx` | eager |
| `/forgot-password`, `/reset-password` | `src/pages/ForgotPassword.tsx`, `src/pages/ResetPassword.tsx` | eager |

### Public, flag-gated (`VITE_ENABLE_NON_CORE_ROUTES`)

| Path | Component |
|---|---|
| `/admin/create-user` | `src/pages/AdminUserCreation.tsx` — see [[Admin Portal]] |
| `/pricing` | `src/pages/Pricing.tsx` — see [[Pricing Tiers]] |
| `/marketplace` | `src/pages/Marketplace.tsx` — see [[Marketplace and Creator Dashboard]] |
| `/beyond-modules` | `src/pages/BeyondModules.tsx` — see [[Beyond Modules]] |
| `/dark-glass-carousel` | `src/pages/DarkGlassCarouselShowcase.tsx` — [[Design System]] showcase |
| `/dev/device-check` | `src/pages/DeviceCheck.tsx` |
| `/career/public/:token` | `src/pages/PublicCareerChat.tsx` — see [[Career Companion]] |

### Protected (always on)

| Path | Component |
|---|---|
| `/onboarding` | `src/pages/Onboarding.tsx` — [[Onboarding Flow]] |
| `/dashboard` | `src/pages/Dashboard.tsx` — main hub, eager; renders [[Saints Dashboard UI|SaintsNavigation]] |
| `/health-dashboard` | `src/pages/StRaphaelHealthHub.tsx` — [[Health UI Components]] |
| `/security-dashboard` | `src/components/StMichaelSecurityDashboard.tsx` |
| `/family-dashboard` | `src/components/StJosephFamilyDashboard.tsx` |
| `/family-intelligence` | `src/pages/FamilyIntelligence.tsx` |
| `/anthony-dashboard` | `src/components/anthony/StAnthonyAuditDashboard.tsx` |
| `/finance-dashboard` | `src/components/gabriel/StGabrielFinanceDashboard.tsx` |
| `/monitor` | `src/components/saints/SystemMonitorDashboard.tsx` |
| `/trinity` | `src/pages/TrinityDashboard.tsx` — [[Trinity and Council]] |
| `/council` | `src/components/council/CouncilOracle.tsx` |
| `/time-capsules` | `src/components/capsules/TimeCapsuleVault.tsx` — [[Time Capsules]] |
| `/rituals` | `src/components/rituals/RitualAltar.tsx` |
| `/personality-training` | `src/components/personality/PersonalityTrainingCenter.tsx` — [[365-Day Personality Training]] |
| `/digital-legacy` | `src/pages/DigitalLegacy.tsx` — [[Digital Legacy and Memorials]] |
| `/legacy-vault` | `src/pages/LegacyVault.tsx` — [[Legacy Vault]] |
| `/portal` | `src/pages/UserPortal.tsx` |
| `/portal/profile` | `src/pages/UserProfileSetup.tsx` |
| `/devices` | `src/components/DevicesDashboard.tsx` |
| `/oauth/callback` | `src/pages/OAuthCallback.tsx` — [[Health OAuth Flow]] return leg |
| `/setup/terra`, `/terra/return` | `src/components/TerraSetupWizard.tsx`, `src/pages/TerraCallback.tsx` — [[Terra Integration]] |
| `/career` | `src/pages/Career.tsx` |

### Protected + flag-gated

`/creator` (`CreatorDashboard`), `/my-ais` (`MyAIs`), `/admin/portal` (`AdminPortal` — [[Admin Portal]]), `/insurance/connect` (`InsuranceConnection`), `/insurance` (`EternalCareInsurance` — [[Eternal Care Insurance]]), `/memorial-services` (`MemorialServices`). When the flag is off these render `<Navigate to="/dashboard">` inside `ProtectedRoute`.

### Redirects

- `/raphael`, `/raphael-prototype` → `/health-dashboard`
- `/michael-dashboard` → `/security-dashboard`
- `/saints` → `/dashboard`
- `/emergency` → `/health-dashboard#emergency`; `/files`, `/my-files` → `/health-dashboard#documents`
- `*` (catch-all) → `/dashboard` (`ProtectedRoute` then bounces logged-out users to `/login`)

## Global Mount Points

Rendered alongside `<Routes>` in `src/App.tsx:393-400`: `ConnectionsPanel` (slide-over managed by ConnectionsContext), `SacredOverlay` (rituals), and outside the Router a second `Suspense` with `HealthAlertListener` and `NotificationToast`. `App` also attaches the cursor-reactive `.ea-panel` glow (`src/lib/edge-reactive.ts`) and starts the saint heartbeat from `src/lib/saintBridge.ts` on mount.

## Gotchas

> [!warning] `src/pages/LandingRecovery.tsx` is not referenced by any route or import — it is dead code kept from an earlier landing-page recovery effort.

> [!note] Several "pages" are actually components: the five saint dashboards, `DevicesDashboard`, `TerraSetupWizard`, council/capsules/rituals/personality screens all live under `src/components/` yet are mounted as top-level routes.

> [!note] `RouteFallback` (`src/App.tsx:72`) is the Suspense spinner for every lazy route; `RouteErrorBoundary` wraps only the `<Routes>` element so a crashing page does not take down the toast system.

## Related

- [[Frontend MOC]] — parent map for all frontend notes
- [[Contexts and Hooks]] — the providers that wrap the router
- [[Onboarding Flow]] — how ProtectedRoute forces new users into onboarding
- [[Saints Dashboard UI]] — what renders at `/dashboard` and the saint routes
- [[Health UI Components]] — what renders at `/health-dashboard`
- [[Admin Portal]] — the flag-gated admin routes
- [[Authentication and JWT Flow]] — the session that ProtectedRoute depends on
