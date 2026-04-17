# EverAfter — Commerce Readiness Roadmap

## Context

EverAfter is a React 18 + Vite + Tailwind app on Supabase (Edge Functions + Postgres) with a health-AI product surface (St. Raphael, custom engrams, health connectors for Terra/Dexcom/Fitbit/Oura). The product surface is substantial — 30+ pages, 7 pricing tiers ($0–$49.99/mo), Stripe checkout wired, 119 RLS policies, safety-guardrail infrastructure. But it is **not** ready to sell to paying customers.

Three parallel Explore agents audited the repo across three axes:

- **Commerce/payments (~40% ready)** — Stripe price IDs are placeholders, subscription lifecycle webhooks are missing, no customer portal.
- **Security/compliance (~70% ready)** — Strong RLS, but ToS/Privacy Policy are empty `href="#"` links, no CI, no error tracking, HIPAA/BAA decision outstanding.
- **Product/UX (~60% ready)** — `Onboarding.tsx` exists but post-signup flow doesn't route to it, no transactional email, no account/billing management UI, no help center.

This roadmap takes the app from "demo-grade" to "100% ready to charge customers" — real money, real compliance, real support. Branch: `claude/commerce-readiness-roadmap-SAZ1N`. Estimated effort: **4–6 weeks** with one focused engineer, or **2–3 weeks** across a small team running phases in parallel.

---

## Guiding principles

1. **Blockers first.** Anything that (a) stops charging money legally, (b) loses customer trust on day one, or (c) can't be undone after launch — ship before opening the door.
2. **Use what's built.** `Onboarding.tsx`, `stripe-checkout`, `stripe-webhook`, `ErrorBoundary.tsx`, `SafetyDisclaimer.tsx`, `subscription_tiers` table, `ForgotPassword.tsx`/`ResetPassword.tsx` all exist — wire them up rather than rewriting.
3. **One source of truth for plans.** Price IDs live in Stripe and `subscription_tiers` (DB), never hardcoded in `Pricing.tsx` or the webhook map.
4. **Entitlements, not saint activation.** The webhook hardcodes Michael/Martin/Agatha to "pro"/"enterprise" but Pricing lists 7 plans — replace with a single `get_user_entitlements(user_id)` function backed by `subscription_tiers.features` JSON.

---

## Phase 0 — Prerequisites (0.5 week)

| # | Task | File(s) / Location | Acceptance |
|---|------|---------------------|------------|
| 0.1 | Create live + test Stripe products for all 7 plans | Stripe Dashboard | 14 price IDs captured (7 monthly + 7 yearly) |
| 0.2 | Populate `subscription_tiers.stripe_price_id_monthly/yearly` via a new seed migration | new `supabase/migrations/` file | DB contains real price IDs, not placeholders |
| 0.3 | Set Supabase Edge Function secrets: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, `SENTRY_DSN`, `APP_BASE_URL=https://everafterai.net` | Supabase Dashboard → Functions → Secrets | `supabase secrets list` shows all set |
| 0.4 | Decide HIPAA stance: **either** upgrade Supabase to an Enterprise plan + sign BAA with Supabase/OpenAI/Stripe, **or** publicly position EverAfter as a "wellness companion, not a medical device" and keep PHI out of scope | `SECURITY.md`, `PRIVACY.md` | Decision recorded in `SECURITY.md`; Privacy Policy language aligned |

---

## Phase 1 — Payments must actually work (Week 1, CRITICAL)

Everything here is a launch blocker. Without this, money comes in but entitlements break.

### 1.1 Kill hardcoded price IDs
- `src/pages/Pricing.tsx` — replace the hardcoded `plans` array (lines 9–100+) with a `useEffect` that queries `subscription_tiers` and hydrates price IDs from DB.
- `supabase/functions/stripe-webhook/index.ts:128-131` — delete `PRICE_TO_PLAN_MAP`; look up plan by `SELECT * FROM subscription_tiers WHERE stripe_price_id_monthly = $1 OR stripe_price_id_yearly = $1`.

### 1.2 Complete the subscription lifecycle
Add handlers in `supabase/functions/stripe-webhook/index.ts`:
- `customer.subscription.updated` → upsert new period dates, status, `cancel_at_period_end`
- `customer.subscription.deleted` → set status `canceled`, revoke entitlements
- `invoice.payment_failed` → mark `past_due`, email customer, keep access for 3-day grace
- `invoice.payment_succeeded` → reset to `active`, send receipt via Resend
- `charge.refunded` + `charge.dispute.created` → revoke entitlements, notify ops

### 1.3 Replace saint-activation with entitlements
- New SQL function `get_user_entitlements(user_id uuid)` returning JSONB of features from `subscription_tiers.features` for the user's active subscription.
- Delete the hardcoded `activateSaint` calls in `stripe-webhook/index.ts:200-208`.
- Add a shared TS helper `src/lib/entitlements.ts` with `useEntitlements()` hook for frontend gating.
- Edge Functions that gate premium features (raphael-chat, engram-chat, analytics-aggregator) check entitlements at the top of the handler.

### 1.4 Customer portal + account settings
- New page `src/pages/Account.tsx` with tabs: Profile, Subscription, Billing History, Data & Privacy.
- New Edge Function `supabase/functions/stripe-portal/` that creates a Stripe Customer Portal session (`stripe.billingPortal.sessions.create`). Link "Manage subscription" in `Account.tsx` → redirects to Stripe-hosted portal (cancellation, payment method, invoices — all handled by Stripe out-of-the-box).
- Add `/account` to the router in `src/App.tsx` behind `ProtectedRoute`.

### 1.5 Stripe Tax
- Enable Stripe Tax in Dashboard.
- In `stripe-checkout/index.ts`, pass `automatic_tax: { enabled: true }` and require `customer_update: { address: 'auto' }`.

**Exit criteria:** End-to-end dry run on Stripe test mode: signup → select plan → pay → receipt email → access premium → cancel in portal → lose access at period end. All with real test price IDs from DB.

---

## Phase 2 — Legal & compliance (Week 1–2, CRITICAL)

### 2.1 Publish real legal pages
- New `src/pages/Terms.tsx`, `src/pages/Privacy.tsx`, `src/pages/MedicalDisclaimer.tsx` (routes `/terms`, `/privacy`, `/medical-disclaimer`).
- Fix `src/pages/Signup.tsx:188,192` — replace `href="#"` with real routes.
- Add the same links to `src/pages/Login.tsx` footer and `src/pages/Landing.tsx`.
- Have counsel review before going live — these are liability-bearing documents for a health + AI product.

### 2.2 GDPR/CCPA data rights
- New Edge Function `supabase/functions/data-export/` — returns signed URL to a JSON+CSV archive of all user data (profiles, engrams, health_metrics, glucose_readings, daily responses, subscriptions).
- New Edge Function `supabase/functions/account-delete/` — soft-delete with 30-day grace, then cascade hard-delete. Revoke Stripe subscription, remove from Terra/Dexcom via their APIs.
- Surface both in the new `Account.tsx` → "Data & Privacy" tab.

### 2.3 Cookie consent + analytics disclosure
- Add a minimal consent banner component `src/components/CookieConsent.tsx` persisted in `localStorage`. Block analytics tags until accepted (relevant for EU traffic).

### 2.4 Safety disclaimers on AI
- `supabase/functions/raphael-chat/` — prepend a disclaimer block to every response (not just the chat wrapper). Already-built `src/components/SafetyDisclaimer.tsx` renders beneath message stream.
- Add crisis-keyword detection ("suicide", "overdose", etc.) → return 988/911 referral, log to `safety_events` table, do not call model.

---

## Phase 3 — Trust, auth & observability (Week 2, HIGH)

### 3.1 MFA
- Enable Supabase MFA (TOTP) in dashboard.
- `src/pages/Account.tsx` → "Security" section with enroll/disable.
- Enforce MFA for users on paid tiers after a 7-day grace period (check `user.factors` in `AuthContext.tsx`).

### 3.2 Error tracking
- `npm install @sentry/react @sentry/tracing` (frontend) and `npm:@sentry/deno` (Edge Functions).
- Init in `src/main.tsx` with `beforeSend` hook that strips PHI keys (`glucose_mgdl`, `hr`, `hrv`, `email`, `phone`).
- Wrap each Edge Function entrypoint in a Sentry transaction.

### 3.3 Rate limiting
- Use Supabase's per-user rate limiter or add a small middleware that reads `ip`/`user_id` and checks a `rate_limits` table. Apply to:
  - `raphael-chat`, `engram-chat` — 60 req/min/user
  - `stripe-checkout` — 10/min/IP
  - `ForgotPassword` email trigger — 3/hr/IP

### 3.4 Audit logging for PHI access
- New `audit_log` table (user_id, action, resource, ts, ip, ua) with append-only RLS.
- Insert from every Edge Function that reads `health_metrics`, `glucose_readings`, `vector_embeddings`.

### 3.5 CI/CD
- Create `.github/workflows/ci.yml`:
  - `npm run lint`, `npm run type-check`, `npm run test`, `npm run test:e2e`
  - `npm audit --audit-level=high`
  - Block merge on failure
- Create `.github/workflows/deploy.yml` — deploy to Netlify dev on every main push, require manual approval for prod.
- Fix `playwright.config.ts` Windows/PowerShell assumptions (per Explore agent findings) so CI can run on ubuntu-latest.

---

## Phase 4 — Go-to-market polish (Week 3, HIGH)

### 4.1 Post-signup onboarding
- `src/pages/Signup.tsx` currently redirects to `/dashboard`. Change to `/onboarding`.
- `src/pages/Onboarding.tsx` already exists — audit that it covers: welcome → health/legacy goal selection → first engram OR first health connector → dashboard tour. Add skip-for-now option.

### 4.2 Transactional email via Resend
- New Edge Function `supabase/functions/send-email/` with templates:
  - Welcome (on signup)
  - Email verification (Supabase auth hook)
  - Password reset (Supabase auth hook)
  - Payment receipt (from `invoice.payment_succeeded` webhook)
  - Payment failed (from `invoice.payment_failed`)
  - Subscription cancelled (from `customer.subscription.deleted`)
  - Weekly digest (from `daily-progress` cron)

### 4.3 Help & support
- New `src/pages/Help.tsx` with a real FAQ (pull from `FAQ.md` or write fresh, 20+ Qs across billing, health, AI safety, data).
- Add `mailto:support@everafterai.net` or a Crisp/Intercom widget for authenticated users.

### 4.4 Marketing site polish
- `src/pages/Landing.tsx` — audit above-the-fold: one-sentence value prop, CTA to `/signup`, social proof (testimonials/trust badges once real), screenshots of `SaintsDashboard` and `RaphaelChat`.
- `src/pages/Pricing.tsx` — expand FAQ from 3 Qs to 8–10, add annual toggle (20% off), add "compare plans" table.

### 4.5 Analytics & conversion
- Add PostHog or GA4 to `src/main.tsx` (behind cookie consent).
- Track: `signup_started`, `signup_completed`, `onboarding_step_N`, `paywall_viewed`, `checkout_started`, `checkout_completed`, `churn`.

---

## Phase 5 — Mobile, accessibility, performance (Week 3–4, MEDIUM)

- Mobile QA pass on `Landing`, `Pricing`, `Signup`, `Onboarding`, `Dashboard`, `RaphaelChat`, `Account` at 375px / 768px / 1024px.
- Lighthouse ≥ 90 on Landing and Pricing (code-split heavy dashboard chunks, compress hero images, preload fonts).
- Axe-core accessibility scan → zero critical violations on public pages. Add ARIA labels to icon-only buttons.

---

## Phase 6 — Launch hardening (Week 4, before flipping to live)

- **Staging environment**: separate Supabase project, Stripe test mode, Netlify `dev--` alias. Full end-to-end test pass.
- **Load test**: k6 or Artillery on `stripe-checkout`, `raphael-chat`, `connect-callback` — target 100 concurrent users.
- **Backup verification**: confirm Supabase point-in-time recovery, test restore into staging.
- **Incident response runbook**: `docs/INCIDENT_RESPONSE.md` covering webhook down, Stripe outage, OpenAI outage, data breach.
- **Status page**: statuspage.io or Instatus, linked from footer.
- **Security review**: external pen test or `npm audit`/Snyk scan + manual RLS audit on `subscriptions`, `stripe_orders`, `health_metrics`.
- **Soft launch**: 50-user beta with real credit cards, monitor for a week, then open.

---

## Critical files to modify (quick reference)

| Concern | File |
|---------|------|
| Hardcoded price IDs | `src/pages/Pricing.tsx:9-100+` |
| Subscription lifecycle | `supabase/functions/stripe-webhook/index.ts:56-232` |
| Empty legal links | `src/pages/Signup.tsx:188,192`; `src/pages/Login.tsx` |
| Post-signup routing | `src/pages/Signup.tsx` (redirect), `src/pages/Onboarding.tsx` (wire up) |
| Entitlements | new `src/lib/entitlements.ts`; new SQL fn `get_user_entitlements` |
| Customer portal | new `src/pages/Account.tsx`; new `supabase/functions/stripe-portal/` |
| Data export/delete | new `supabase/functions/data-export/`, `account-delete/` |
| Email | new `supabase/functions/send-email/` (Resend) |
| CI | new `.github/workflows/ci.yml`, `deploy.yml` |
| Error tracking | `src/main.tsx` (Sentry init); each Edge Function entrypoint |
| MFA | `src/contexts/AuthContext.tsx`; new Account security tab |

## Existing assets to reuse (do not rewrite)

- `src/components/ErrorBoundary.tsx` — already covers React errors.
- `src/components/SafetyDisclaimer.tsx` — already exists, just needs wider adoption.
- `src/pages/Onboarding.tsx`, `ForgotPassword.tsx`, `ResetPassword.tsx` — exist, just need to be wired into the flow.
- `supabase/migrations/20251026140000_create_monetization_system.sql` — `subscription_tiers` + `user_subscriptions` schema is already correct.
- 119 existing RLS policies — keep, do not refactor.

## Verification — how we know we're done

**Functional E2E (run on staging with Stripe test mode):**
1. Sign up with new email → verification email arrives → click link → lands on `/onboarding`.
2. Complete onboarding → `/dashboard` shows free-tier state.
3. Hit a premium feature → paywall → `/pricing` → pick plan → Stripe Checkout → return to app → receipt email arrives → premium feature unlocks.
4. Go to `/account` → "Manage subscription" → Stripe Customer Portal → cancel → return to app → access persists until period end → `customer.subscription.deleted` fires → access revoked.
5. Request data export → email arrives with signed download link → file contains expected data.
6. Request account deletion → soft-delete banner shows → 30 days later hard-delete confirmed.
7. Trigger `invoice.payment_failed` (Stripe test clock) → `past_due` email sent → 3-day grace → access revoked.

**Non-functional gates:**
- `npm run test`, `npm run test:e2e`, `npm run type-check`, `npm run lint` all green in CI.
- Sentry receives a forced error from each Edge Function during smoke test.
- Lighthouse ≥ 90 on `/` and `/pricing`.
- Axe scan reports zero critical issues on public pages.
- External reviewer confirms ToS, Privacy, Medical Disclaimer are substantive and current.
- `npm audit` reports zero high/critical vulns.

## Out of scope (explicit non-goals)

- New features beyond what's already in the repo (career agent, photo analysis, family legacy tiers from `IMPLEMENTATION_ROADMAP.md` Phases 3–4).
- Native mobile apps — web is the MVP.
- Localization beyond English.
- Multi-currency billing beyond what Stripe Tax handles automatically.
- SOC 2 / HITRUST certifications — plan for post-launch if enterprise deals emerge.
