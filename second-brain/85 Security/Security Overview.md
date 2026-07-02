---
tags: [security, threat-model, jwt, rls, webhooks]
updated: 2026-07-02
---

# Security Overview

EverAfter handles health data, AI conversations, and payment state, so security rests on four invariants: every user-facing edge function validates a JWT, every table is behind [[Row Level Security]], PHI never reaches logs, and inbound webhooks are HMAC-verified. `SECURITY.md` is the written threat model; this note maps it to what the code actually does.

## The Four Invariants

1. **JWT everywhere** — every user-facing edge function must extract `Authorization: Bearer <jwt>`, build a Supabase client that forwards it, call `auth.getUser()`, and return 401 on failure (`SECURITY.md:112-134`). The [[Authentication and JWT Flow]] note traces this end to end. Webhook endpoints are the sanctioned exception: they authenticate the *sender* with an HMAC signature instead and write with the service-role client.
2. **RLS everywhere** — the same forwarded JWT reaches PostgreSQL, where per-table policies keyed on `(select auth.uid())` isolate rows. [[Row Level Security]] covers the policy patterns, the performance idiom, and the audit sweep that closed historical gaps.
3. **No PHI in logs** — health data content, tokens, passwords, and API keys are excluded from console logs, error trackers, and analytics (`SECURITY.md:250-256`, `CLAUDE.md` "Never log PHI/credentials"). Rules and known violations live in [[PHI Handling]].
4. **Signature-verified webhooks** — Terra, Fitbit, Dexcom, and Stripe payloads are verified against shared secrets before processing. Per-provider mechanics and the fail-open exceptions are in [[Webhook Signature Verification]].

Enforcement is deliberately layered: auth happens at the function boundary *and* at the database, so a missing check in one layer is usually caught by the other. The main blind spot is code that runs with the service-role key or Prisma, which bypasses RLS entirely — see the service-role section of [[Row Level Security]].

## Threat Model

`SECURITY.md:17-98` enumerates seven threats. Condensed, with the load-bearing mitigation for each:

| # | Threat | Primary mitigation |
|---|---|---|
| 1 | Token leakage | JWTs held in memory by the Supabase SDK, never logged, 1-hour expiry |
| 2 | RLS bypass | RLS on all tables, `(select auth.uid())` policies, JWT forwarded from functions |
| 3 | Function hijacking | `SET search_path = pg_catalog, public` on DB functions, minimal SECURITY DEFINER surface |
| 4 | API key exposure | Keys live in Supabase Secrets, read via `Deno.env.get()` — see [[Secrets Management]] |
| 5 | Webhook spoofing | HMAC verification per provider, Stripe secret in Supabase Secrets |
| 6 | XSS | React auto-escaping, no `dangerouslySetInnerHTML`, CSP headers |
| 7 | Medical advice liability | System prompt forbids diagnosis/prescription, disclaimers, emergency redirects — see [[Safety Guardrails]] |

Threat 7 is unusual for a security doc but central here: [[St Raphael]] must never produce diagnostic or prescriptive language, and the `safety-monitor` edge function exists to watch for exactly that.

## Where the Docs and Code Disagree

> [!warning] `SECURITY.md` overstates three mitigations
>
> - **CSP headers**: claimed at `SECURITY.md:87`, but `netlify.toml` sets only `Cache-Control`/`Pragma` headers — no `Content-Security-Policy` anywhere in the deploy config.
> - **`dangerouslySetInnerHTML`**: claimed "not used" (`SECURITY.md:86`), but `src/components/rituals/RitualAltar.tsx:261` uses it to inject a `<style>` block. The content is a static CSS keyframes string (no user input), so the practical risk is nil, but the invariant as written is false.
> - **Source IP validation on webhooks**: claimed at `SECURITY.md:77`; no webhook handler checks source IPs. Signature verification is the only sender authentication, and two Terra paths fail open — see [[Webhook Signature Verification]].

> [!note] Smaller drifts
> `SECURITY.md` speaks entirely in terms of OpenAI keys; `CLAUDE.md` claims `GROQ_API_KEY` is the secret set for `raphael-chat`, while the code reads `OPENAI_API_KEY` (`supabase/functions/raphael-chat/index.ts:91`). Also, `supabase/functions/device-stream/index.ts:15` accepts `user_id` as a query parameter with no `auth.getUser()` call — an SSE endpoint that leaks realtime device events for any user id, violating invariant 1.

## Incident Response and Compliance

`SECURITY.md:189-239` prescribes: rotate compromised keys immediately (`supabase secrets set` + redeploy), notify affected users within 72 hours (GDPR), and report vulnerabilities privately to security@everafter.app rather than public issues. For HIPAA, encryption at rest/in transit and RLS access control are in place by Supabase default; a BAA with Supabase (Enterprise plan) is listed as required *if* the product formally handles PHI. Consent and audit obligations are implemented in code — see [[PHI Handling]].

## Key Files

- `SECURITY.md` — threat model, auth requirements, logging policy, incident response.
- `CLAUDE.md` — "Security & Compliance" conventions (no PHI in logs, JWT on all functions, RLS idiom, webhook HMAC, idempotency).
- `supabase/functions/_shared/connectors.ts` — the JWT-forwarding vs service-role client split, plus HMAC helpers.
- `netlify.toml` — actual deployed headers (no CSP) and the secret-scanning allowlist.
- `src/components/rituals/RitualAltar.tsx` — the lone `dangerouslySetInnerHTML` usage (static CSS).
- `supabase/functions/device-stream/index.ts` — the unauthenticated SSE endpoint flagged above.

## Related

- [[Security MOC]] — hub for all security notes.
- [[Authentication and JWT Flow]] — how invariant 1 is implemented request by request.
- [[Row Level Security]] — invariant 2: policy patterns, sweeps, and service-role bypasses.
- [[PHI Handling]] — invariant 3: what counts as PHI, consent, and audit trails.
- [[Webhook Signature Verification]] — invariant 4, provider by provider.
- [[Secrets Management]] — where the keys behind all of this actually live.
- [[Safety Guardrails]] — the medical-liability threat handled at the AI layer.
