---
tags: [security, moc]
updated: 2026-08-16
---

# Security MOC

Hub for the security posture of EverAfter: four invariants (JWT everywhere, RLS everywhere, no PHI in logs, signature-verified webhooks), the stores that hold the secrets, and the incidents that shaped the rules. Start with [[Security Overview]] for the threat model, then drill into the invariant you care about.

## Core Security Notes

- [[Security Overview]] — the threat model mapped to code: four invariants, seven threats, where `SECURITY.md` overstates reality
- [[PHI Handling]] — what counts as PHI, logging rules, live consent tables and audit trails (and the undeployed `server/lib/` originals)
- [[Webhook Signature Verification]] — HMAC mechanics per provider (Terra ×2, Dexcom, Fitbit, Stripe), which endpoints are honest 501 stubs, remaining gotchas
- [[Secrets Management]] — Supabase Function Secrets vs Netlify `VITE_*` vs Render env, gitignore protections, leak history and open rotations

## Enforcement Layers (documented elsewhere)

- [[Authentication and JWT Flow]] — invariant 1: how every user-facing edge function validates the caller
- [[Row Level Security]] — invariant 2: per-table policies on all 211 live tables, the `(select auth.uid())` idiom, service-role bypasses
- [[Safety Guardrails]] — the medical-liability threat: what [[St Raphael]] must never say
- [[Shared Edge Function Utilities]] — where the JWT-forwarding vs service-role client split and HMAC helpers actually live

## Incidents Worth Remembering

- The `fn_oversight_*` hole (PR #123): Postgres grants EXECUTE to PUBLIC on new functions by default — two SECURITY DEFINER helpers were anon-callable until revoked; every migration adding a function must now revoke explicitly ([[Row Level Security]], [[Migrations]])
- The `terra-test` IDOR and `test-key` leak (PR #120): unauthenticated service-role writes and a key-prefix echo, both closed ([[Webhook Signature Verification]], [[Secrets Management]])
- The paywall-bypass RLS defects (PR #118): nine broken policies including anon INSERT into `saints_subscriptions` ([[Row Level Security]], [[Payments and Subscriptions]])
- More traps in [[Common Gotchas]]

## Siblings

- [[Home]] — vault entry point
- [[Architecture MOC]] — the system these controls protect
- [[Backend MOC]] — the edge functions where most enforcement runs
- [[Database MOC]] — RLS, migrations, and the audit tables
- [[Health Integrations MOC]] — the PHI-bearing pipelines
- [[Operations MOC]] — deployment and environment configuration
