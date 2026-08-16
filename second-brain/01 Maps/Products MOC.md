---
tags: [product, moc]
updated: 2026-08-16
---

# Products MOC

Hub for EverAfter's product surfaces beyond the core Saints/health/legacy platform: the things the app sells, showcases, or spins off. Start with [[Pricing Tiers]] to see the official lineup — then read the warnings, because most product routes sit behind the unset `VITE_ENABLE_NON_CORE_ROUTES` flag and the monetization plumbing is only half-connected.

## Selling and Billing

- [[Pricing Tiers]] — the seven `/pricing` plans, the secret-configured Stripe price→plan map, and the unmapped-price-grants-nothing design
- [[Payments and Subscriptions]] — Stripe Checkout lifecycle, the `subscriptions` row, saint activation, and per-domain feature gating (written 2026-07-02; the unmapped-price and saint-revocation claims are superseded by [[Pricing Tiers]])
- [[Marketplace and Creator Dashboard]] — the AI-template economy: buy expert personalities, clone them into your roster, sell your own via the creator side

## Product Surfaces

- [[Career Companion]] — dual-face career assistant: private coach for the owner plus a shareable public chat that captures visitor leads
- [[Eternal Care Insurance]] — life-insurance *record-keeping* inside the [[Legacy Vault]] area (policies, beneficiaries, claims, dividends); EverAfter underwrites nothing
- [[Beyond Modules]] — cinematic frontend-only showcase of three future concepts (likeness royalties, ethical engrams, legacy glyphs); zero backend

## Watch Out

- `/pricing`, `/marketplace`, `/insurance`, and `/beyond-modules` are all gated by `VITE_ENABLE_NON_CORE_ROUTES`, which production does not set — they redirect away silently. Surfaces linking into them must check `src/lib/routeAvailability.ts` first.
- No fulfillment path exists for the per-domain premium tables: paying through any in-app upgrade modal cannot unlock the feature that advertised it (details in [[Pricing Tiers]] and [[Payments and Subscriptions]]).
- Marketing copy runs ahead of code across this area — [[Beyond Modules]] is pure vision, and the insurance connect page was rewritten in 2026-08 after advertising a product that did not exist (`CURRENT_STATE.md`).

## Related

- [[Home]] — vault entry point
- [[Frontend MOC]] — the pages and routing these products render through
- [[Legacy and Family MOC]] — the legacy features Eternal Care and Legacy tiers attach to
- [[AI Systems MOC]] — the engram machinery the marketplace templates clone into
- [[Backend MOC]] — edge functions behind checkout, career chat, and the marketplace
- [[Security MOC]] — webhook signature verification and RLS on billing tables
