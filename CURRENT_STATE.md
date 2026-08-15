# EverAfter — Current State (ground truth)

**Dated: 2026-08-15** (previous revision 2026-07-12). This file supersedes
every document now under `docs/archive/`, 150+ root-level markdown files
accumulated with contradictory "COMPLETE" claims, stale metrics, and
superseded architecture snapshots. None of them should be treated as
current. Every statement below was verified directly against code, deploy
configs, or command output, not against other docs.

Sections carry the date they were last measured. Anything marked 2026-07-12
was carried forward unchanged and has **not** been re-verified since; treat
those dates as the real age of the claim, not as a claim about today.

## What is live (deployed, wired, real)

| Component | Where | Evidence |
| --- | --- | --- |
| **React SPA** (`src/`) | Netlify — https://everafterai.net (prod), `dev--everafterai.netlify.app` | `netlify.toml`; Netlify deploy previews on every PR |
| **Supabase Edge Functions** (`supabase/functions/`, 55 functions) | Supabase project `sncvecvgxwkkxnxbvglv` | All 55 classified for auth in the 2026-07-12 sweep; JWT/signature/service-role gated |
| **Supabase Postgres** (`supabase/migrations/`, 130 migrations) | Same project | RLS enabled on all 211 live tables (exhaustive replay audit, 2026-07-12; hardening migration `20260712130000`) |
| **Household financial oversight** (`supabase/migrations/20260723090000_*`, `src/lib/gabriel/`, `src/components/oversight/`) | Same project | 8 tables, 24 functions, 7 triggers, 10 policies, applied and inventory-verified 2026-08-15; `fn_oversight_daily()` scheduled in pg_cron at `10 7 * * *` by `20260815170000_*` |
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

## Gates (measured 2026-08-15 on `main` at `e03ba02`)

| Gate | Status |
| --- | --- |
| `npx vitest run` | **PASS**, 145/145 across 18 files |
| `npm run build` | **PASS** (requires `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`; `scripts/validate-build-env.mjs` intentionally hard-fails without them) |
| `npm run type-check` | **FAIL, 176 errors** (413 on 2026-07-12, 583 when the gate was first made real; the old "passing" state was a vacuous solution-style tsconfig that checked nothing) |
| `npm run lint` | **FAIL, 925 problems** (~1,090 on 2026-07-12) |
| CI | `.github/workflows/ci.yml` — test + build REQUIRED; type-check + lint advisory until their backlogs are zero (do not weaken rule configs). |

Type-error composition on `main` at this date: `no-unused` declarations are at
**zero** (was 202), implicit-any parameters are the largest remaining group.
Lint composition: 724 `no-explicit-any`, 94 `react-hooks/exhaustive-deps`, the
rest a long tail. `no-explicit-any` is a genuine typing project rather than a
mechanical pass, and `exhaustive-deps` changes render behaviour when
dependencies are added, so neither is safe to bulk-fix.

An open branch (PR #125) takes type errors to **109** and lint to **909** by
declaring the Supabase client's type. See the note under the security section.

Re-confirmed 2026-08-15: the "Workers Builds: everafter" check fails on every
commit in zero seconds. See the Cloudflare row above. It carries no information
about the code and should not be read as a broken build.

## Verified security posture (2026-08-15 additions)

- **Postgres grants EXECUTE on new functions to PUBLIC by default.** After the
  household-oversight migration was applied, `anon` could execute 10
  `fn_oversight_*` helpers. Two were exploitable: `fn_oversight_active_grants`
  (SECURITY DEFINER, returned grant rows past RLS given any household id) and
  `fn_oversight_alert_both_sides` (SECURITY DEFINER write, injected alerts).
  Fixed in production and recorded in the migration; verified 10 to 0. Any
  future migration adding functions must revoke EXECUTE explicitly.
- `fn_oversight_daily()` is scheduled through pg_cron calling the SQL function
  directly, deliberately avoiding pg_net plus HTTP, which would have required
  storing a service-role key inside the database.
- `terra-test` edge function now requires a real user (it previously accepted
  unauthenticated calls and wrote fabricated health data into a caller-supplied
  `user_id` using the service-role key). `test-key` was deleted; it echoed an
  OpenAI key prefix with no auth.
- `src/lib/supabase.ts` exported the client as `null as any`, which widened the
  whole client to `any` and turned every `.from().select()` in the app into an
  untyped call. Typed as `SupabaseClient` in PR #125. Runtime behaviour is
  unchanged; the value is still null when configuration is absent.

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

## Truthfulness and dead ends found 2026-08-15

- `/insurance/connect` advertised an insurance product that does not exist:
  coverage up to five million dollars, no medical exam required, instant policy
  decisions, a tax-free death benefit, and a "certified and regulated insurance
  provider with A+ ratings", closing with a terms-of-service agreement. The file
  had no network call and no persistence; the selected plan was stored nowhere
  and the button navigated to `/dashboard`. Rewritten to describe what the app
  actually provides, which is record keeping for cover the person already holds.
  `/insurance` itself is real: 1,634 lines against `insurance_policies`,
  `insurance_beneficiaries`, `insurance_claims`, `insurance_payments`.
- Legacy Vault presented three cards as "verified service providers" badged
  Available. All three are areas of this app, and two of them
  (`/insurance/connect`, `/memorial-services`) sit behind
  `VITE_ENABLE_NON_CORE_ROUTES`, which is set nowhere, so their buttons
  redirected to the dashboard with no explanation. Card state now derives from
  the same flag the router uses, via `src/lib/routeAvailability.ts`.
- Creator Dashboard had two buttons navigating to `/creator/new`, which matches
  no route and fell through the catch-all to `/dashboard`. Replaced with an
  honest notice (PR #122).
- Five showcase components were unreferenced dead code and were removed.

**Still open for the owner:** two cards in that Legacy Vault section, "Legacy
Trust Partners" and "Memorial Services Network", keep names that read as outside
organisations even though both are areas of this app. That is a naming decision,
not a defect.

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
