# Senior Developer Bug Audit Report

**Date:** 2026-04-16
**Auditor:** Automated Senior Developer Review
**Scope:** Full codebase — authentication, frontend React, Supabase Edge Functions, Express server, data layer
**Total Bugs Found:** 35

---

## CRITICAL (8 bugs) — Fix Immediately

### 1. Terra Webhook Signature Bypass
**`supabase/functions/terra-webhook/index.ts:373-382`**
If `TERRA_WEBHOOK_SECRET` is unset OR the signature header is missing, ALL webhooks are accepted without verification. Attacker can inject forged health data.
```typescript
if (TERRA_WEBHOOK_SECRET && terraSignature) {
  signatureValid = await verifyTerraSignature(...);
} else {
  signatureValid = true;  // DANGEROUS: accepts any request
}
```
**Fix:** Make signature verification mandatory — reject requests without valid signatures.

---

### 2. Task Creation Missing Ownership Check
**`supabase/functions/task-create/index.ts:79-88`**
Engram query doesn't filter by `user_id`. Any authenticated user can create tasks for ANY engram in the system.
```typescript
const { data: engram } = await supabase
  .from("engrams")
  .select("id, name")
  .eq("id", engramId)
  .single();  // Does NOT filter by user_id!
```
**Fix:** Add `.eq("user_id", user.id)` to the query.

---

### 3. Prompt Injection via System Prompt Override (raphael-chat)
**`supabase/functions/raphael-chat/index.ts:97-106`**
Client can pass a `system` parameter that completely replaces St. Raphael's safety instructions:
```typescript
const systemPrompt = system || `You are St. Raphael...`
```
**Fix:** Never allow client to override system prompt. Remove the `system` parameter.

---

### 4. Prompt Injection via Personality Traits (engram-chat)
**`supabase/functions/engram-chat/index.ts:105`**
Unsanitized `JSON.stringify(personality_traits)` interpolated directly into the system prompt. A crafted personality can inject arbitrary instructions.

**Fix:** Sanitize personality_traits before prompt interpolation.

---

### 5. OAuth State Token Not Signed (connect-start)
**`supabase/functions/connect-start/index.ts:35-39`**
State is just base64-encoded JSON (not HMAC-signed). Attacker can decode, modify `user_id`, re-encode, and hijack OAuth connections to another user's account.
```typescript
const state = btoa(JSON.stringify({
  user_id: user.id,
  provider,
  timestamp: Date.now(),
}));
```
**Fix:** HMAC-sign the state parameter and verify signature in connect-callback.

---

### 6. Anon Key Overrides User JWT (api-client.ts)
**`src/lib/api-client.ts:310`**
`callEdgeFunction` sets `Authorization: Bearer ${ANON_KEY}` before checking for the user's JWT token, potentially overriding real auth.

**Fix:** Remove the anon key header; only set the user's JWT.

---

### 7. Hardcoded Demo User in Express Middleware
**`server/index.ts:21`**
ALL requests are authenticated as `demo-user-001` regardless of actual user. Complete data isolation bypass.
```typescript
app.use((req, res, next) => {
  req.user = { id: 'demo-user-001' };
  next();
});
```
**Fix:** Implement proper JWT/session authentication.

---

### 8. OAuth State Parameter Hijacking (Express)
**`server/api/connections/terra.ts:67`**
Callback uses `req.query.state` directly as `userId` without validation. Attacker can exchange a legitimate code for any user's account.
```typescript
const userId = state as string;  // UNTRUSTED!
```
**Fix:** Store state in Redis/session, validate on callback.

---

## HIGH (12 bugs) — Fix This Sprint

### 9. HMAC Buffer Length Mismatch
**`server/api/connections/webhooks.ts:35-37`**
`crypto.timingSafeEqual()` throws if buffers are different lengths. If signature header isn't expected hex format, the function crashes.

### 10. Webhook Body Re-serialization
**`server/api/connections/webhooks.ts:44`**
Signature verified against `JSON.stringify(req.body)` instead of raw body. JSON re-serialization changes whitespace/ordering — legitimate webhooks fail verification.

### 11. Dual `useAuth` Hook Conflict
**`src/hooks/useAuth.tsx` vs `src/contexts/AuthContext.tsx`**
Two different `useAuth` implementations. Wrong import causes inconsistent auth state.

### 12. Sign Out Doesn't Clear State on Failure
**`src/contexts/AuthContext.tsx:263-279`**
If `supabase.auth.signOut()` fails, user/session state is NOT cleared. User appears logged in while thinking they logged out.

### 13. CORS Allows All Origins
**All Edge Functions** use `Access-Control-Allow-Origin: *`. Should be restricted to `https://everafterai.net`.

### 14. Safety Monitor Reads Wrong URL
**`supabase/functions/safety-monitor/index.ts:244-246`**
Parses `Deno.env.get("SUPABASE_URL")` instead of incoming request URL. `snapshot_id` always returns `null`.

### 15. Expired Session Hydration
**`src/contexts/AuthContext.tsx:45-73`**
`readWarmAuthState()` loads sessions from localStorage without checking `expires_at`. Expired tokens get reused.

### 16. Memory Leaks — Unmounted Component State Updates
**`src/components/RaphaelChat.tsx:152-160`**, **`src/components/DeviceMonitorDashboard.tsx:67-74`**
Async callbacks update state after unmount. No abort controller or mounted flag.

### 17. 7 Separate PrismaClient Instances
**`server/index.ts`, `raphael.ts`, `bridges.ts`, `terra.ts`, `consent.ts`, `audit.ts`, `scheduler.ts`**
Each creates `new PrismaClient()` = ~70 database connections (7 pools x 10 default). Will exhaust connection limit.

### 18. BullMQ Workers Never Cleaned Up
**`server/workers/scheduler.ts:30-102`**
Workers created but never closed on SIGTERM. Redis connections leak.

### 19. Token Refresh Never Happens
**`server/api/connections/terra.ts:85-87`**
`expiresAt` stored but never checked. After tokens expire, all Terra API calls silently fail.

### 20. Consent Usage Count Race Condition
**`server/lib/consent.ts:21-34`**
Two concurrent requests can both pass the cap check and both increment, exceeding `interactionCap`.
**Fix:** Use atomic `updateMany` with `usageCount < interactionCap` in WHERE clause.

---

## MEDIUM (12 bugs) — Plan for Next Release

| # | File | Issue |
|---|------|-------|
| 21 | `engram-chat/index.ts:129` | No null-check on `chatData.choices[0].message.content` — crashes on unexpected OpenAI response |
| 22 | `connect-callback/index.ts:99` | Error messages may leak DB connection strings or API keys to client |
| 23 | `terra-webhook/index.ts:86` | Error responses expose internal database schema details |
| 24 | `stripe-webhook/index.ts:5-6` | No upfront check that Stripe secrets are configured |
| 25 | `ComprehensiveHealthConnectors.tsx:497` | `window.location.href` redirect in setTimeout — no cleanup on unmount |
| 26 | `Dashboard.tsx:108-166` | No cancellation for `loadOnboardingResume` — multiple rapid calls possible |
| 27 | `CustomEngramsDashboard.tsx:210` | `onSelectAI` in setTimeout without error handling or unmount guard |
| 28 | `demo-auth.ts:5-26` | Hardcoded demo tokens — predictable and shared across all demo sessions |
| 29 | All Edge Functions | No per-user rate limiting on expensive OpenAI API calls |
| 30 | `server/api/raphael.ts:197` | `calculateVitals()` filter `&& m.value` drops metrics with value=0 |
| 31 | `supabase/migrations/20260304_dht_tables.sql:14` | Numeric health values stored as TEXT — string comparison `"9" > "10"` |
| 32 | `server/api/connections/terra.ts:71-102` | Find-then-create race condition on OAuth callback — use `upsert` |

---

## LOW (3 bugs)

| # | File | Issue |
|---|------|-------|
| 33 | `manage-agent-tasks/index.ts:42` | `action` parameter extracted but never used |
| 34 | Multiple Edge Functions | Inconsistent error response formats across functions |
| 35 | `generate-embeddings/index.ts:58` | Mock embeddings use `Math.random()` — non-deterministic, breaks similarity search in test mode |

---

## Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 8 |
| HIGH | 12 |
| MEDIUM | 12 |
| LOW | 3 |
| **Total** | **35** |

## Recommended Fix Priority

### Week 1 — Critical Security
1. Terra webhook signature bypass (#1)
2. Task-create ownership check (#2)
3. Remove system prompt override in raphael-chat (#3)
4. Sanitize personality_traits in engram-chat (#4)
5. HMAC-sign OAuth state token (#5)
6. Fix api-client JWT header precedence (#6)
7. Replace hardcoded demo user (#7)
8. Validate OAuth state in Express callback (#8)

### Week 2 — High Priority
9. Fix HMAC buffer comparison (#9)
10. Use raw body for webhook verification (#10)
11. Consolidate dual useAuth (#11)
12. Clear auth state on signOut failure (#12)
13. Restrict CORS origins (#13)
14. Fix safety-monitor URL parsing (#14)
15. Add expires_at check to session hydration (#15)
16. Add abort controllers to async effects (#16)
17. Singleton PrismaClient (#17)
18. Clean up BullMQ workers on shutdown (#18)
19. Implement token refresh (#19)
20. Atomic consent cap enforcement (#20)
