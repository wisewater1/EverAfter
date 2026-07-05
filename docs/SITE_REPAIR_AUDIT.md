# EverAfter Site Repair and Trinity Build: Audit Log

A running record of what was found broken, what was fixed, and how each item
was verified. Grouped by the parts of the build brief.

## Part 1: Full site audit and repair

| Area | Finding | Fix | Verified |
| --- | --- | --- | --- |
| Auth | Dead duplicate `src/hooks/useAuth.tsx`, demo-blind and unguarded | Removed (no importers) | grep confirms no references; tsc passes |
| Auth | `signOut` never removed the demo fetch interceptor | Interceptor torn down on demo sign-out; stale-closure demo flag captured before reset | tsc passes |
| St. Michael | Dynamic Tailwind color classes never compiled by JIT (silent unstyled) | Static color lookup map with full literal class strings | build + visual |
| St. Michael | Typo `phiLeeksDetected`; external texture from transparenttextures.com | Corrected to `phiLeaksDetected`; texture replaced with inline effect | tsc passes; no external host |
| SacredOverlay | External texture host | Replaced with inline data effect | no external request |
| St. Raphael chat | "Production AI" button hard-navigated to an external bolt.host URL | Button removed | grep: no bolt.host in src |
| St. Gabriel | Top-bar add button had no handler; Reports panel fed empty arrays | Wired add action; Reports fed real budget, family, and metrics data | tsc passes |
| Memorial Services | Documents tab was a fake list with dead upload/download/share buttons; fabricated stat tiles | Real file upload/list/download via storage helpers; honest highlights | tsc passes |
| Landing | Marketing roster out of sync with the real five Saints; red demo button | Roster corrected; demo button restyled gold with working demo path | browser smoke: five Saints present, no stale names, zero console errors |

## Part 2: Constellation starfield

New engine in `src/lib/starfield/`:
- `engine.ts`: three parallax depth layers, power-law star sizes, cool to
  warm color temperature, eased twinkle, nearest-neighbor constellation
  links with per-star cap and per-pair fade envelopes, pointer proximity
  brightening, click pulse rings, rare shooting stars, adaptive quality
  tiers with a frame-time watchdog.
- `renderGl.ts`: WebGL point-sprite renderer with shader core plus gaussian
  halo, additive blending for genuine bloom.
- `render2d.ts`: canvas 2D overlay for lines, pulses, streaks, and a full
  fallback when WebGL is unavailable.
- `StarfieldBackground.tsx`: pointer events (mouse and touch alike), Page
  Visibility pause, reduced-motion static render, device-pixel-ratio
  handling, never intercepts input.

Verified: browser smoke shows two canvases present and zero console/page
errors on the landing page with WebGL active.

## Part 3 and 4: Trinity live data and family backbone

- `src/lib/trinity/liveSignals.ts` gathers the signed-in user's real
  `health_metrics`, budget envelopes, guidance engagement, and protection
  counts.
- Family Vitality Score now maps Family continuity to St. Joseph with an
  St. Anthony guidance signal, Recovery and resilience to St. Raphael,
  Financial readiness to St. Gabriel, and shows St. Michael as the access
  layer footer rather than a fourth bar. Data provenance (live vs model) is
  reported per component.
- Canonical person model documented in `docs/FAMILY_DATA_MODEL.md`.
- `genealogySync.ts` write-through persists the tree to `family_members`,
  `family_member_links`, and `family_tree_events`; seeded sample data is
  demo/dev only and namespaced away from real accounts.

## Part 5: Ceremonies and Legacy Vault

- Vault: rule-aware unlock scheduler (DATE, HEARTBEAT_TIMEOUT, and reviewed
  DEATH_CERT / CUSTODIAN_APPROVAL via `vault_unlock_requests`); owner
  access-request review panel; successor request-access form with live
  status and a clear sealed-remains fallback; real attachment downloads via
  signed URLs; calm plain-language unlock-rule labels.
- Ceremonies: full create, edit, schedule, conduct, and complete flow backed
  by `public.ceremonies`, surfaced in the Calendar and Chronicle tabs and
  linked from the St. Joseph dashboard.

## Part 6: Onboarding

- Removed the fake health-connection OAuth simulation; provider selection is
  now honest and persisted.
- Camera permission toggle requests real browser permission and reflects
  granted or denied state; other toggles reframed as app-side consent.
- Completion screen shows real setup confirmations, not fabricated numbers.
- `onboardingApi` works without the Python backend through direct Supabase
  fallbacks.

## Part 7: Crystal chat runtime

Prototype, Python comparison target, and benchmark harness in `crystal-chat/`;
measured results and the decision are in `docs/CRYSTAL_RUNTIME_EVALUATION.md`.

## Part 8: Front page alignment

Real five Saints with in-app domains and icon language; red demo button
restyled to the gold accent with a working guided-demo path.

## Part 9: Mobile parity

Tap targets raised to at least 44px and visible focus states added on
controls across the landing page, onboarding, voice flow, and vault; landing
page verified at 390px with zero horizontal scroll.

## Part 10: Voice answer flow

Backend-independent client pipeline: MediaRecorder capture with a live level
meter and audio-signal detection, Web Speech API on-device transcription,
editable transcript, explicit approve step, on-device Likert derivation,
persistence to `voice_samples`, and every sanity check reflecting true
runtime state. The sign-in gate appears only for genuinely unauthenticated
sessions.
