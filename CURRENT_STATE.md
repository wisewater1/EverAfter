# EverAfter — Current State (ground truth)

**Dated: 2026-07-12.** This file supersedes every document now under
`docs/archive/` — 150+ root-level markdown files accumulated with
contradictory "COMPLETE" claims, stale metrics, and superseded
architecture snapshots. None of them should be treated as current. Every
statement below was verified directly against code, deploy configs, or
command output on this date, not against other docs.

## What is live (deployed, wired, real)

| Component | Where | Evidence |
| --- | --- | --- |
| **React SPA** (`src/`) | Netlify — https://everafterai.net (prod), `dev--everafterai.netlify.app` | `netlify.toml`; Netlify deploy previews on every PR |
| **Supabase Edge Functions** (`supabase/functions/`, 55 functions) | Supabase project `sncvecvgxwkkxnxbvglv` | All 55 classified for auth in the 2026-07-12 sweep; JWT/signature/service-role gated |
| **Supabase Postgres** (`supabase/migrations/`, 128 migrations) | Same project | RLS enabled on all 211 live tables (exhaustive replay audit, 2026-07-12; hardening migration `20260712130000`) |
| **Python FastAPI backend** (`backend/`) | Render web service `everafter-api` | `render.yaml:2-8`; proxied at `/api/v1/*` and `/governance/*` via `netlify.toml`; consumed by 20+ `src/` files through `src/lib/backend-request.ts` |
| **Voice AI sidecar** (`voice-ai-service/`) | Render web service `everafter-voice-ai` | `render.yaml:109-115`; ElevenLabs; consumed via `src/lib/joseph/voice.ts` |
| **Elohim anchor worker** (`backend/`, worker entry) | Render worker `everafter-elohim-anchor` | `render.yaml:85-93` |

## What is NOT live (in-repo but not deployed anywhere)

| Component | Status | Notes |
| --- | --- | --- |
| `server/` + `agents/` (Express/Prisma/BullMQ) | **Legacy, not deployed** | No entry in `render.yaml` or any deploy config; does not type-check standalone (Prisma client not generated, missing `Request.user` augmentation, JSON-import config). CLAUDE.md previously called this a "primary backend" — it is not. Terra webhooks run through Supabase Edge Functions (`webhook-terra`, signature-verified), NOT this stack. **Owner decision needed: fix or remove.** |
| `health-api/` (separate Node/Prisma health service) | **Broken, not deployed** | Committed compiler-error logs in the directory itself; not referenced by any deploy config. **Owner decision needed: repair or remove.** |
| `smart-contracts/` | **Unstarted roadmap** (WGOLD token scaffolding) | Single bulk commit 2026-06-11, never touched, zero imports. Kept as reference pending owner call. |
| `nextjs-implementation/` | **Dead scaffolding** | No Next.js app exists (no next config/package); only referenced by an archived doc's copy-paste instructions. Kept pending owner call. |
| `utils/` | **Standalone unbuilt npm package, zero imports** | Same bulk commit. Kept pending owner call. |
| Cloudflare Workers "everafter" | **Dashboard-managed, failing on every commit** | No `wrangler.toml` in-repo; logs need the owner's Cloudflare access. Netlify is the real deploy; fix or disconnect this integration from the repo's checks. |

## Gates (measured 2026-07-12 at merge of PR #117 + this branch)

| Gate | Status |
| --- | --- |
| `npx vitest run` | **PASS** — 128/128, 17 files |
| `npm run build` | **PASS** (requires `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`; `scripts/validate-build-env.mjs` intentionally hard-fails without them) |
| `npm run type-check` | **FAIL — 413 pre-existing errors** (was 583 when the gate was made real; the old "passing" state was a vacuous solution-style tsconfig that checked nothing). All files touched during the 2026-07 engagement are at zero. |
| `npm run lint` | **FAIL — ~1,090 problems** (771 `no-explicit-any`, 203 `no-unused-vars`, 94 `exhaustive-deps`; `src/` accounts for 694). |
| CI | `.github/workflows/ci.yml` — test + build REQUIRED; type-check + lint advisory until their backlogs are zero (do not weaken rule configs). |

## Verified security posture (2026-07-12)

- RLS enabled on all 211 live tables; 9 defective policies fixed in
  migration `20260712130000_rls_policy_hardening.sql` (worst: anon INSERT
  into `saints_subscriptions` — paywall bypass; `guardian_intercessions`
  readable/writable by everyone via missing TO clause).
- Stripe entitlements: price IDs come from `STRIPE_PRICE_ID_PRO` /
  `STRIPE_PRICE_ID_ENTERPRISE` secrets; unmapped prices grant nothing;
  canceled/unpaid subscriptions revoke premium saints (previously
  activation was one-way and canceled users kept paid tiers).
  **Owner action: set those two secrets to the real production price IDs.**
- All 55 edge functions auth-classified: JWT-gated, signature-verified
  (Stripe/Terra/Fitbit/Dexcom), service-role, or scheduler-secret-gated
  (`glucose-aggregate-cron` accepts service-role key or `CRON_SECRET`).
  `terra-widget` derives `reference_id` from the JWT (was client-supplied).
  `webhook-dexcom`/`webhook-oura` are honest 501 stubs that no longer log
  payloads.
- Truthfulness bar: the fabricated-data layer was removed across PRs
  #110–#117 (see `docs/audits/2026-07-12-step4-final-qa.md` §3).

## Error-response convention (documented reality)

Two shapes coexist in edge functions today:
- `{code, message, hint}` — the prescribed convention (`raphael-chat`,
  `task-create`, `agent`, `career-chat`, `insights-report`,
  `manage-agent-tasks`, newer functions)
- `{error: message}` — the legacy majority via `_shared/connectors.ts`

**Use `{code, message, hint}` for all new/edited functions.** Migrating the
legacy shape wholesale is deliberate debt (each migration must update its
callers' error handling).

## Key references

- `CLAUDE.md` — day-to-day agent guidance (architecture section rewritten
  2026-07-12 to match this file)
- `docs/audits/2026-07-11-demo-and-main-experience-audit.md` — Step 1 audit
- `docs/audits/2026-07-12-step4-final-qa.md` — engagement closing report,
  remaining debt, owner-only App Store checklist
- `docs/archive/` — historical snapshots; **do not trust for current state**
