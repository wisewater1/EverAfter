---
tags: [frontend, design-system, tailwind, css, buttons]
updated: 2026-07-02
---

# Design System

EverAfter's visual language is dark glassmorphism with neumorphic depth and neon accent glows, implemented almost entirely in Tailwind utility classes plus a small set of custom CSS component classes in `src/index.css`. Three root docs describe it; the code blends all three.

## Overview

There are effectively **two coexisting palettes**:

1. **Emerald/slate minimalism** (`DESIGN_SYSTEM.md`, v2.0) — slate-950 backgrounds, emerald-400/500 as the only accent, used by `src/pages/Dashboard.tsx`, `SaintsNavigation`, auth pages.
2. **Dark neumorphic teal/cyan** (`DARK_NEUMORPHIC_DESIGN_SYSTEM.md`) — `#0a0a0f` deep-space background, `#1a1a24 → #13131a` card gradients, dual-shadow neumorphism (`8px 8px 16px #08080c, -8px -8px 16px #1c1c28`), teal/cyan accents at 10–20% opacity. Used by the [[Health UI Components|St. Raphael hub]].

> [!note] `DESIGN_SYSTEM.md` claims a strict 2-color emerald/slate palette, but the codebase also uses purple (Legacy Vault buttons), amber (admin), per-saint gradients, and the whole teal neumorphic health theme. Treat the docs as per-surface guides, not a single source of truth.

## Design Tokens (`tailwind.config.js`)

- **Colors**: `ink #0B0F14`, `neon`/`neon-cyan #00F5D4`, `neon-pink #FF2E97`, `neon-purple #B026FF`, `glass rgba(255,255,255,0.06)`, `muted #9AA4AF`.
- **Shadows**: `glow-emerald`, `card`, `card-hover`, `glass` (inset top highlight + deep drop), `neon` and `neon-focus` (cyan ring + bloom).
- **Screens**: standard breakpoints plus device-named ones (`iphone-se 375px`, `iphone-pro 430px`, `ipad-mini 768px`, `ipad-pro 1024px`, `compact 360px`).
- **Touch**: `min-h-touch`/`min-w-touch` = 44px (WCAG/iOS touch targets, enforced across button sizes).
- **Motion**: durations `fast 100ms` / `normal 200ms` / `smooth 300ms` / `slow 500ms`, a `scan` keyframe, and the `tailwindcss-animate` plugin (`animate-in fade-in slide-in-from-bottom-4` is everywhere).
- `darkMode: 'class'` — though the app is dark-only in practice.

## CSS Component Classes (`src/index.css`)

- **`.ea-panel`** — the flagship glass panel: `var(--glass)` background, backdrop blur, inset highlight, and a `::after` radial glow that follows the pointer via `--mx`/`--my` custom properties. `src/lib/edge-reactive.ts` (`attachEdgeReactive('.ea-panel')`, wired in `src/App.tsx:105`) updates those properties on `pointermove`. Variants via `data-variant="gold" | "emerald"`.
- **`.ea-btn`** — matching glass button, 44px minimum, focus-visible teal outline.
- **`.glass-card`** — legacy glass card kept for backwards compatibility; wrapped by the `GlassCard` component.
- **`.glass-strong`** — heavier translucent backdrop (used by `SaintsNavigation`'s bottom bar).
- **`.neon-border`** — proximity glow driven by a `--neon-intensity` variable; `src/components/raphael/Today.tsx` computes intensity from cursor distance per card.

## Component Layer

- `src/components/Button.tsx` + `src/lib/button-system.tsx` — the canonical button. Variants: `primary | secondary | tertiary | ghost | danger | success | warning`; sizes `xs`–`xl` (md = 44px). The lib exports `getButtonClasses`, `getButtonAriaProps`, and `LoadingSpinner`; `Button.tsx` adds `IconButton`, `FloatingActionButton`, `ButtonGroup`, `ToggleButton`, `LinkButton`. `BUTTON_SYSTEM_GUIDE.md` documents the variant colors (blue→cyan gradient primary, etc.) and contrast ratios.
- `src/components/GlassCard.tsx` — 22-line wrapper emitting `.glass-card` with an optional `hover` prop.
- `src/components/NeonButton.tsx` (+ `NeonButton.css`) — CSS-class-driven neon button with variant/size/`sparkleIntensity` modifiers and a `neon-button__border` sparkle layer.
- `src/components/EdgeSparkleButton.tsx` (+ `EdgeSparkleButton.css`) — border-glow button that injects an `edge-sparkle` keyframe inline; per-variant border colors (`primary` = `rgb(0,243,255)` cyan).
- Showcases: `ButtonShowcase`, `NeonButtonShowcase`, `EdgeSparkleButtonShowcase`, `RemoveButtonShowcase`, `DarkGlassPanelShowcase`, and the routed `/dark-glass-carousel` page (`src/pages/DarkGlassCarouselShowcase.tsx`) — living style-guide pages, flag-gated in [[Pages and Routing]].

> [!tip] When building a new panel, prefer `.ea-panel` (gets the pointer-reactive glow for free) or copy the neumorphic recipe from `DARK_NEUMORPHIC_DESIGN_SYSTEM.md` section "Primary Card": `rounded-3xl bg-gradient-to-br from-[#1a1a24] to-[#13131a] shadow-[8px_8px_16px_#08080c,-8px_-8px_16px_#1c1c28] border border-white/5`.

## Conventions

- Tailwind for everything; the only CSS files are `index.css`, `NeonButton.css`, `EdgeSparkleButton.css` (matches the CLAUDE.md rule "no CSS modules except custom animations").
- Icons are Lucide React exclusively.
- Animations are gated with `motion-safe:` in newer components (SaintsNavigation, health hub) to respect reduced-motion.
- Accessibility targets: WCAG 2.1 AA contrast, 44px touch minimums, focus rings (`focus:ring-2` emerald or neon) — backed by the keyboard hooks in [[Contexts and Hooks]].

## Key Files

- `tailwind.config.js` — tokens, breakpoints, shadows, animations
- `src/index.css` — `.ea-panel`, `.ea-btn`, `.glass-card`, `.neon-border`, CSS variables
- `src/lib/button-system.tsx` — variant/size class maps and ARIA helpers
- `src/components/Button.tsx` — Button, IconButton, FAB, ButtonGroup, ToggleButton, LinkButton
- `src/components/GlassCard.tsx` — glass card wrapper
- `src/components/NeonButton.tsx` — neon variant button
- `src/components/EdgeSparkleButton.tsx` — sparkle-border button
- `src/lib/edge-reactive.ts` — pointer-tracking glow for `.ea-panel`
- `DESIGN_SYSTEM.md`, `DARK_NEUMORPHIC_DESIGN_SYSTEM.md`, `BUTTON_SYSTEM_GUIDE.md` — root design docs

## Related

- [[Frontend MOC]] — parent map
- [[Pages and Routing]] — where the showcase routes live
- [[Saints Dashboard UI]] — emerald/slate palette in practice
- [[Health UI Components]] — teal neumorphic palette in practice
- [[Contexts and Hooks]] — keyboard/focus accessibility hooks
