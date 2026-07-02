---
tags: [product, insurance, legacy, fastapi]
updated: 2026-07-02
---

# Eternal Care Insurance

Eternal Care Insurance is a life-insurance *record-keeping* dashboard inside the [[Legacy Vault]] area: users catalog their existing policies, beneficiaries, claims, and premium payments, and view "Integrity Dividends" computed by the Python backend. Despite the product name, EverAfter does not underwrite or sell insurance — the connection page is a static marketing funnel that currently exits to an external site.

## Overview

- `/insurance` (`src/App.tsx:219`, protected + `VITE_ENABLE_NON_CORE_ROUTES` gate) renders `src/pages/EternalCareInsurance.tsx`: a policy list on the left, and a detail panel with **Overview / Beneficiaries / Claims / Payments / Dividends** tabs.
- `/insurance/connect` (`src/App.tsx:209`, same gating) renders `src/pages/InsuranceConnection.tsx`: a plan-picker splash with four static plan cards (Life Insurance, Legacy Protection, Beneficiary Management, Claims Support) and trust badges.
- Both pages back-link to `/legacy-vault`, positioning insurance as part of the [[Digital Legacy and Memorials|legacy]] suite.
- Summary cards aggregate client-side: total coverage, active policy count, and monthly premium (quarterly ÷ 3, annual ÷ 12).

## How It Works

`EternalCareInsurance` loads four Supabase tables in parallel with the user's JWT ([[Row Level Security]] scopes everything to the owner):

- `insurance_policies` — filtered by `user_id`, ordered newest first.
- `insurance_beneficiaries`, `insurance_claims`, `insurance_payments` — fetched unfiltered with `select('*')`; RLS policies restrict rows to beneficiaries/claims/payments of the user's own policies, and the UI then filters by the selected `policy_id`.

The **Dividends** tab is the odd one out: it fetches `GET /api/v1/integrity/dividends` from the FastAPI backend via `buildApiUrl` (`src/lib/env.ts:86`). The endpoint (`backend/app/api/integrity.py:12`, mounted in `backend/app/main.py` under `/api/v1/integrity`) returns `{total_accumulated, recent_history}` derived from the user's "St. Michael integrity score" — a daily security-posture reward, unrelated to the manually-entered policies. The page defensively normalizes the response shape before rendering to avoid crashes on error bodies.

`InsuranceConnection` has no backend calls at all: selecting a plan just sets local state, and "Continue to Dashboard" navigates to `https://crystal-blockchain-a-uwvs.bolt.host` (an external Bolt-hosted prototype), not the in-app `/insurance` page.

## Key Files

- `src/pages/EternalCareInsurance.tsx` — policy CRM dashboard with five detail tabs and dividends integration.
- `src/pages/InsuranceConnection.tsx` — static onboarding/marketing page for the four coverage plans.
- `supabase/migrations/20251029180000_create_eternal_care_insurance_system.sql` — all insurance tables + per-user RLS policies.
- `backend/app/api/integrity.py` — FastAPI dividends endpoint feeding the Dividends tab.
- `src/lib/env.ts` — `buildApiUrl` helper that targets the FastAPI backend (`VITE_API_BASE_URL` in production).

## Data Model

From `20251029180000_create_eternal_care_insurance_system.sql`:

| Table | Notes |
|---|---|
| `insurance_policies` | number, type, provider, coverage/premium amounts, frequency (MONTHLY/QUARTERLY/ANNUAL), status (ACTIVE/PENDING/LAPSED/CANCELLED), document URL |
| `insurance_beneficiaries` | per policy: name, relationship, percentage split, contact info |
| `insurance_claims` | claim number/type/amount, filed date, status (incl. APPROVED/DENIED/PAID) |
| `insurance_payments` | payment date, amount, method, confirmation number |
| `insurance_documents` | policy document metadata (no UI surface yet) |

All five have owner-scoped RLS policies (child tables join through the owning policy).

## Gotchas

> [!warning] The write path is unfinished. "Add Your First Policy" only sets `showAddPolicy` state — no modal or form is ever rendered for it, and the Edit/Delete/Add Beneficiary/File Claim/Record Payment buttons have no handlers. As shipped, the dashboard can only display rows inserted by some other means (SQL, seed, or a future form).

> [!warning] `InsuranceConnection`'s CTA leaves the product entirely for `crystal-blockchain-a-uwvs.bolt.host` — a hardcoded external prototype URL that ignores which plan the user selected (`handleConnect` duplicates the same redirect). If this page is ever promoted out of the non-core gate, that link needs replacing with the in-app `/insurance` route.

> [!note] Dividends depend on the FastAPI backend being deployed and reachable at `VITE_API_BASE_URL`; without it the tab quietly shows $0.00 and an empty history. The Integrity Dividend concept belongs to the St. Michael security system, not to any insurance table.

## Related

- [[Products MOC]] — parent hub.
- [[Legacy Vault]] — the navigation home for both insurance pages and the broader legacy storage product.
- [[Digital Legacy and Memorials]] — sibling legacy features (memorials, wills) this sits beside.
- [[Time Capsules]] — another Legacy Vault artifact type in the same monetization migration family.
- [[Row Level Security]] — the per-policy ownership model protecting insurance rows.
- [[Beyond Modules]] — the concept page whose "Death Insurance → Life Royalties" pillar is the aspirational version of this product.
- [[Pages and Routing]] — non-core release gating of `/insurance` and `/insurance/connect`.
