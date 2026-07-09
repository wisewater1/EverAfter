---
tags: [product, marketing, concept, frontend]
updated: 2026-07-02
---

# Beyond Modules

Beyond Modules is a cinematic, frontend-only showcase page at `/beyond-modules` that pitches three future product concepts — posthumous likeness royalties, ethical-reasoning preservation, and a symbolic "legacy language". It is a marketing/vision artifact, not a functional feature: nothing on the page reads or writes the database.

## Overview

The route (`src/App.tsx:187`) is public but gated by the `VITE_ENABLE_NON_CORE_ROUTES` release flag (see [[Pages and Routing]]). `src/pages/BeyondModules.tsx` renders a starfield backdrop, three "pillar" cards on an auto-rotating 5-second carousel (pillar 1 → 2 → 3 → finale), navigation dots, a play/pause toggle, and a final "Trinity" scene whose CTA navigates to `/dashboard`.

The three concept modules, each with an explicit revenue-model blurb baked into the component data:

1. **Death Insurance → Life Royalties** — "digital talent agency for the dead": a deceased user's likeness, voice, and engram become licensable assets, with an animated token-particle flow illustrating a 10% EverAfter / 90% heir split via smart contract.
2. **Ethical Paradox Mode** — "a living moral codex": Raphael poses moral dilemmas ("Would you lie to save a life?") and records the reasoning as an "Ethical Engram"; pitched as Ethics-as-a-Service for institutions. The Yes/No buttons are decorative — no answer is captured.
3. **The Legacy Language Project** — "machine mysticism dialect": a 12-glyph grid where each glyph supposedly encodes an emotion or memory; pitched as Legacy Key NFTs and collectible glyph cards. Glyphs animate but have no click handlers.

Everything is client state: expanded module, carousel index, and a capped array of animated particles. Custom keyframes (`twinkle`, `flowRight`, `glyphFloat`, fade-ins) are inlined in a `<style>` block rather than Tailwind config.

## Key Files

- `src/pages/BeyondModules.tsx` — the entire feature: module data, carousel logic, particle system, trinity finale, inline animations.
- `BEYOND_MODULES_GUIDE.md` — root-level design document: visual identity, animation timings, responsive rules, proposed (unbuilt) schema, and KPIs.
- `src/App.tsx` — route registration and release-flag gating.

## Gotchas

> [!warning] `BEYOND_MODULES_GUIDE.md` oversells the implementation. It labels the experience "Production Ready" and specifies an audio design (choir pad, heartbeat, interaction chimes), but the component only declares an unused `audioRef` — no audio element exists, and the play/pause button controls the carousel, not sound. The guide's "Supabase Tables (Future Enhancement)" schema (`beyond_module_interactions`, `ethical_responses`, `legacy_glyphs`) appears in no migration under `supabase/migrations/` — verified absent. None of the analytics events listed in the guide are emitted.

> [!note] The concepts overlap real features elsewhere: the royalties pillar is the aspirational cousin of [[Eternal Care Insurance]] and the engram-licensing ideas in the [[Marketplace and Creator Dashboard|Marketplace]] "Memory Mining" tab; the ethical/glyph pillars would extend [[Custom Engrams]] if ever built. Treat this page as a roadmap statement when evaluating product scope.

> [!tip] Because the page is pure presentation with zero data dependencies, it is safe to restyle or A/B test without touching backend code — the only integration points are the two `navigate()` calls and the release flag in [[Environment Variables]].

## Related

- [[Products MOC]] — parent hub.
- [[Eternal Care Insurance]] — the shipped (record-keeping) counterpart to the "Death Insurance → Life Royalties" pillar.
- [[Marketplace and Creator Dashboard]] — where engram monetization actually exists today.
- [[Custom Engrams]] — the engram concept the ethics and language pillars build on.
- [[St Raphael]] — named as the AI that would record ethical reasoning and interpret emotions into glyphs.
- [[Trinity and Council]] — the trinity motif reused in the finale scene.
- [[Pages and Routing]] — the non-core release gate controlling visibility.
