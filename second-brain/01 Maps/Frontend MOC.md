---
tags: [frontend, moc]
updated: 2026-07-02
---

# Frontend MOC

Map of the React 18 + TypeScript + Vite + Tailwind frontend in `src/`. Start with [[Pages and Routing]] to see what mounts where, then drill into the surface you're touching.

## Entry Points and Navigation

- [[Pages and Routing]] — full route table from `src/App.tsx`: protection, release-flag gating, lazy loading with chunk-retry, redirects, global overlays.
- [[Onboarding Flow]] — signup → 7-step wizard → dashboard journey, drafts, resume banners, ProtectedRoute enforcement.

## State and Data

- [[Contexts and Hooks]] — AuthContext (warm boot, demo mode, watchdogs), ConnectionsContext (realtime `provider_accounts`), NotificationContext toasts, and the `src/hooks/` suite.
- [[Authentication and JWT Flow]] — the Supabase session everything above wraps.

## Feature Surfaces

- [[Saints Dashboard UI]] — `/dashboard`, `SaintsNavigation`, shared `SaintChat`, per-saint component dirs (michael/gabriel/joseph/raphael/saints).
- [[Health UI Components]] — St. Raphael hub at `/health-dashboard`, provider connectors, device monitoring, vitals/medication/goals trackers.
- [[Admin Portal]] — `/admin/portal` and `/admin/create-user`, their thin access control, and the notification email function.

## Look and Feel

- [[Design System]] — dark neumorphic/glass language, Tailwind tokens, `.ea-panel` pointer-reactive glow, Button system, GlassCard, NeonButton, EdgeSparkleButton.

## Backend Touchpoints

- [[Edge Functions Overview]] — the Supabase functions the UI calls for chat, tasks, and health sync.
- [[Express Server]] — the Node API behind the health hub summary and provider connect endpoints.
- [[St Raphael]] and [[Custom Engrams]] — the AI systems the main surfaces front.

> [!note] Recurring theme across the frontend notes: several documented components (`SaintsDashboard`, `CompactSaintsOverlay`, `RaphaelHealthInterface`, `OAuthCredentialsAdmin`, `LandingRecovery`) are orphaned or superseded — check the warnings in each note before editing them.

## Siblings

[[Home]] · [[Architecture MOC]] · [[Backend MOC]] · [[Database MOC]] · [[AI Systems MOC]] · [[Health Integrations MOC]] · [[Legacy and Family MOC]] · [[Products MOC]] · [[Security MOC]] · [[Operations MOC]]
