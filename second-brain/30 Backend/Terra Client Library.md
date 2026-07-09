---
tags: [backend, terra, health-connectors, api-client]
updated: 2026-07-02
---

# Terra Client Library

`server/lib/terra-client.ts` is a small axios wrapper around the Terra aggregator REST API (`https://api.tryterra.co/v2`), used by the [[Express Server]]'s Terra routes. It covers exactly three operations: create a connect-widget session, exchange an auth code for tokens, and fetch user data by type.

## Overview

The file exports one class, `TerraClient`, plus two internal interfaces (`TerraWidgetSession`, `TerraTokens`). Construction reads credentials from env:

- `TERRA_API_KEY` — sent as the `x-api-key` header on every request
- `TERRA_DEV_ID` — sent as the `dev-id` header on every request

If either is missing the constructor logs a warning but does not throw — calls will simply fail against the Terra API later. Credentials belong in server env, never the frontend; see [[Secrets Management]].

## API Surface

| Method | HTTP call | Returns |
|---|---|---|
| `generateWidgetSession(referenceId, redirectUrl)` | `POST /auth/generateWidgetSession` | `{ url, session_id, expires_at }` |
| `exchangeToken(code)` | `POST /auth/exchangeToken` | `{ access_token, refresh_token, expires_in, user_id, scope? }` |
| `getUserData(userId, type)` | `GET /user/{type}?user_id=...` | raw Terra payload (untyped) |

Notes on each:

- **`generateWidgetSession`** hardcodes the provider list to `'FITBIT,OURA,WHOOP,GARMIN,APPLE'` and language `en`, and passes the caller's `referenceId` (the EverAfter user id) so the eventual callback can be tied back to a user. The returned `url` is what the frontend opens for the Terra connect widget.
- **`exchangeToken`** is the OAuth code→token step; the caller persists the tokens.
- **`getUserData`** is a generic passthrough where `type` is a Terra data category (e.g. `daily`, `sleep`, `activity`); nothing in `server/` currently calls it — it exists for future sync/backfill use.

## How Server Routes Use It

`server/api/connections/terra.ts` instantiates one shared `const terra = new TerraClient()` at module load:

1. `POST /api/connect/terra` → `terra.generateWidgetSession(userId, callbackUrl)` where `callbackUrl` is `${BASE_URL}/oauth/terra/callback`; returns `authorizeUrl` + `sessionId` to the client and audit-logs `terra.connect.initiated`.
2. `GET /api/oauth/terra/callback` → `terra.exchangeToken(code)`; upserts a `Source` row (`provider: 'TERRA'`, with `accessToken`, `refreshToken`, `expiresAt`, `scopes`) via the [[Prisma Schema]], audit-logs `terra.connect.completed`, and redirects to the dashboard. See [[Health OAuth Flow]] for the pattern.

Incoming data after connection arrives via Terra webhooks handled in `server/api/connections/webhooks.ts` (and on the Supabase side), not through this client — see [[Webhook Ingestion Pipeline]].

> [!warning] Three Terra implementations coexist — don't confuse them
> - `server/lib/terra-client.ts` — this Node/axios class (auth: `TERRA_API_KEY` + `TERRA_DEV_ID`).
> - `src/lib/terra-client.ts` — a separate, larger frontend module (~449 lines) that talks to Supabase Edge Functions and includes its own webhook-signature helper. Same filename, different codebase layer.
> - `supabase/functions/terra-widget`, `terra-webhook`, `webhook-terra`, `terra-backfill`, `terra-test` — the Deno Edge Function suite. Despite `CLAUDE.md` documenting `TERRA_CLIENT_ID`/`TERRA_CLIENT_SECRET` secrets, the function code reads `TERRA_API_KEY`, `TERRA_DEV_ID`, and `TERRA_WEBHOOK_SECRET` — the same credentials as this Node client.
> When changing Terra behavior, confirm which layer actually serves your flow; the [[Dual Backend System]] note explains the split.

> [!note] The class has no retry, rate-limit, or token-refresh logic, and `getUserData` responses are untyped `any`. Refreshing expired `Source.accessToken` values is not implemented anywhere in `server/` — see [[Connection Rotation]] for how token freshness is supposed to be handled platform-wide.

## Key Files

- `server/lib/terra-client.ts` — the `TerraClient` class (this note's subject)
- `server/api/connections/terra.ts` — only in-repo consumer of the class
- `server/api/connections/webhooks.ts` — receives the Terra data this client's sessions enable
- `src/lib/terra-client.ts` — unrelated frontend Terra module sharing the filename
- `supabase/functions/terra-widget/` — Edge Function counterpart for widget sessions

## Related

- [[Terra Integration]] — the end-to-end Terra story across all three layers
- [[Express Server]] — hosts the routes that call this client
- [[Health OAuth Flow]] — the generic connect/callback pattern this implements
- [[Webhook Ingestion Pipeline]] — how Terra data flows in after connection
- [[Webhook Signature Verification]] — companion concern for the webhook side
- [[Environment Variables]] — where `TERRA_API_KEY` / `TERRA_DEV_ID` are configured
- [[Backend MOC]] — sibling backend notes
