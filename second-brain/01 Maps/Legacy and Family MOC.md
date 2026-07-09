---
tags: [legacy, moc]
updated: 2026-07-02
---

# Legacy and Family MOC

Hub for EverAfter's original mission: preserving people. Vaulted messages and wills, memorial planning, AI representations of family members, and the analysis layer over the family tree. Start with [[Legacy Vault]] for the flagship continuity product — and note that "time capsule" means three different tables depending on which page you are on.

## Preservation and Continuity

- [[Legacy Vault]] — `vault_items` capsules/memorials/wills/messages, client-side AES-GCM encryption, beneficiaries with roles, and the dormant Vault Connect partner panel
- [[Digital Legacy and Memorials]] — the older `legacy_vault` store with Legacy Premium upsell, plus the memorial services marketplace (`memorial_plans`)
- [[Time Capsules]] — FastAPI-backed sealed letters, optionally ghost-written by a Saint, unlocked on demand
- [[Vault Edge Functions]] — vault-export, vault-integrity-check, and the vault-scheduler sweep behind the vault

## Family AI

- [[Family Engrams]] — family-member AI profiles: create/train engrams, personality questionnaires, the Family Hub, and the Trinity-powered Family Intelligence page
- [[Custom Engrams]] — the general engram machinery the family variant builds on
- [[365-Day Personality Training]] — the daily-question pipeline reused for training relatives' profiles
- [[Archetypal AIs]] — the persona substrate every engram and saint sits on
- [[Trinity and Council]] — Joseph/Raphael/Gabriel coordination that scores family vitality

## Adjacent Products

- [[Eternal Care Insurance]] — legacy-protection insurance reached from the vault's trust-partner cards
- [[Payments and Subscriptions]] — Legacy Premium checkout and the `subscription_tiers` gating
- [[Pricing Tiers]] — where the legacy tiers sit in the overall pricing model

## Watch Out

- Three disjoint capsule stores (`vault_items`, `legacy_vault`, `time_capsules`) and two "legacy vault" pages — check which table a bug report is about before touching code.
- Vault edge functions trust `user_id` from the request body, and the vault's encryption key is stored next to its ciphertext — see the warnings in [[Legacy Vault]] and [[Vault Edge Functions]].
- Nothing actually delivers scheduled messages: no cron triggers the scheduler, and no email is sent on "delivery".

## Related

- [[Home]] — vault entry point
- [[Frontend MOC]] — the pages and dashboard views these features render in
- [[AI Systems MOC]] — engram and persona machinery in depth
- [[Backend MOC]] — edge functions and the other backends
- [[Database MOC]] — the vault and family tables
- [[Products MOC]] — sibling product surfaces (insurance, marketplace)
