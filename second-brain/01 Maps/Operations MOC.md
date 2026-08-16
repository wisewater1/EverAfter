---
tags: [operations, moc]
updated: 2026-08-16
---

# Operations MOC

Hub for running, testing, shipping, and not breaking EverAfter: commands, deploy targets, configuration, and the traps between them. Start with [[Commands Cheatsheet]] if you know what you want to do, or [[Documentation Index]] if you are returning after months away.

## Run and Ship

- [[Commands Cheatsheet]] — every npm script and the Supabase/Netlify CLI commands, with legacy-stack commands flagged
- [[Deployment]] — Netlify SPA, Supabase functions + migrations, and the three Render services; what has no deploy config at all
- [[Environment Variables]] — every config value by layer: `VITE_*`, edge secrets, legacy `.env`, Render backend
- [[Secrets Management]] — where the sensitive halves live and the key-name discrepancies

## Verify

- [[Testing Strategy]] — Vitest, Playwright, smoke and audit scripts, and what coverage actually exists
- [[Common Gotchas]] — code-verified traps: Prisma-vs-Supabase, the EXECUTE-grant hole, RLS idioms, JWT forwarding, unit conversion, route gating

## Orient

- [[Documentation Index]] — `CURRENT_STATE.md` first, the audits, the surviving guides, and why `docs/archive/` must not be trusted

## Siblings

- [[Home]] — vault entry point
- [[Architecture MOC]] — the system these operations serve
- [[Backend MOC]] — edge functions and the legacy Express stack
- [[Frontend MOC]] — the SPA that Netlify ships
- [[Database MOC]] — schema, migrations, RLS
- [[AI Systems MOC]] — models, embeddings, personas
- [[Health Integrations MOC]] — provider integrations these deploys carry
- [[Legacy and Family MOC]] — legacy/family product surfaces
- [[Products MOC]] — product-level views
- [[Security MOC]] — the threat model behind the gotchas
