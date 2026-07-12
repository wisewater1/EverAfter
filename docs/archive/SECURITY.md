# Security Policy

## Overview

EverAfter handles sensitive health information and user data. This document outlines the security architecture, threat model, and mitigation strategies.

## ⚠️ NEVER Store These in Code

- OpenAI API keys
- Supabase service role keys
- User passwords or tokens
- Protected Health Information (PHI)
- Stripe secret keys

**All secrets MUST be stored in Supabase Functions → Secrets or environment variables.**

## Threat Model

### 1. Token Leakage

**Threat**: JWT access tokens exposed in logs, error messages, or client-side storage.

**Mitigations**:
- JWTs stored in memory only (via Supabase Auth SDK)
- Tokens never logged server-side
- Short token expiration (1 hour default)
- Refresh tokens used for long-term sessions
- Edge Functions never return tokens in responses

### 2. Row Level Security (RLS) Bypass

**Threat**: Unauthorized access to other users' data through SQL injection or policy gaps.

**Mitigations**:
- RLS enabled on ALL tables
- All policies use `(select auth.uid())` pattern for performance and security
- No direct SQL queries from frontend
- Edge Functions forward user JWT to Supabase client
- Foreign key constraints enforce data relationships
- Security-definer functions minimize attack surface

**RLS Policy Pattern** (all tables follow this):
```sql
CREATE POLICY "Users can read own data" ON table_name
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));
```

### 3. Function Hijacking

**Threat**: Malicious users exploit database functions to escalate privileges.

**Mitigations**:
- All custom functions use `SET search_path = pg_catalog, public`
- SECURITY DEFINER functions are minimal and audited
- Only authenticated role granted EXECUTE permission
- Function parameters validated before use

### 4. API Key Exposure

**Threat**: OpenAI or other API keys leaked through client code or error messages.

**Mitigations**:
- Keys stored in Supabase Secrets (encrypted at rest)
- Edge Functions access keys via `Deno.env.get()`
- Errors never include full API keys (truncated to first 10 chars)
- Rate limiting prevents API quota exhaustion

### 5. Webhook Spoofing

**Threat**: Malicious actors send fake webhook events (Stripe, health integrations).

**Mitigations**:
- Webhook signatures verified before processing
- Stripe webhook secret stored in Supabase Secrets
- Health data webhooks require OAuth tokens
- All webhook handlers validate source IP/headers

### 6. Cross-Site Scripting (XSS)

**Threat**: User-supplied content injected into UI causing script execution.

**Mitigations**:
- React automatic escaping prevents XSS
- AI responses sanitized before rendering
- No `dangerouslySetInnerHTML` used
- Content Security Policy headers set

### 7. Medical Advice Liability

**Threat**: AI provides harmful medical advice; user takes it as professional guidance.

**Mitigations**:
- System prompt explicitly forbids diagnosis and prescriptions
- Every AI response includes safety disclaimers
- Emergency situations redirect to local emergency services
- Clear "Information only, not medical advice" copy on all pages
- Task execution never includes clinical decisions

## Authentication & Authorization

### User Authentication

- Email/password via Supabase Auth (bcrypt hashing)
- Optional social providers (Google, Apple)
- Multi-factor authentication available (Supabase native)
- Session tokens rotated on every request
- Password reset uses secure email links (valid 1 hour)

### Edge Function Authorization

**CRITICAL**: Every Edge Function MUST:

1. Extract `Authorization: Bearer <jwt>` header
2. Create Supabase client with header forwarded
3. Call `supabase.auth.getUser()` to verify authentication
4. Return `401` if user is null or error occurs

**Example**:
```typescript
const authHeader = req.headers.get("Authorization");
if (!authHeader) {
  return errorResponse("AUTH_MISSING", "Missing Authorization header", 401);
}

const supabase = createClient(url, key, {
  global: { headers: { Authorization: authHeader } },
});

const { data: { user }, error } = await supabase.auth.getUser();
if (error || !user) {
  return errorResponse("AUTH_FAILED", "Invalid session", 401);
}
```

## Data Protection

### Protected Health Information (PHI)

EverAfter may handle PHI under HIPAA (US) or similar regulations:

- **Logging**: PHI never logged to console, error trackers, or analytics
- **Storage**: All health data encrypted at rest (Supabase default)
- **Transit**: All connections use TLS 1.2+ (enforced by Supabase)
- **Access**: Only user can access their own health data (RLS)
- **Audit Trail**: `created_at`, `updated_at` timestamps on all records

### Data Minimization

- Only collect data necessary for functionality
- No tracking pixels or third-party analytics on health pages
- User can delete account and all data (`ON DELETE CASCADE`)

## Secure Development Practices

### Code Review Checklist

Before merging any PR:

- [ ] No secrets committed (use git-secrets or similar)
- [ ] RLS enabled on new tables
- [ ] Edge Functions validate JWT
- [ ] Error messages don't leak implementation details
- [ ] User input validated and sanitized
- [ ] Database migrations follow naming convention
- [ ] Tests cover authentication failures

### Dependency Management

- `npm audit` run in CI on every commit
- Critical vulnerabilities block deployment
- Dependencies pinned to exact versions
- Supabase SDK updated quarterly (after testing)
- OpenAI SDK follows their stable channel

### Deployment Checklist

Before deploying to production:

- [ ] All secrets rotated (if previously exposed)
- [ ] `OPENAI_API_KEY` set in Supabase Functions → Secrets
- [ ] RLS policies reviewed and tested
- [ ] Edge Functions smoke tests pass
- [ ] CORS headers restrict to production domain
- [ ] Rate limiting configured (Supabase Dashboard)
- [ ] Database backups enabled (Supabase default)
- [ ] Monitoring alerts configured

## Incident Response

### If API Key is Compromised

1. **Immediately rotate** the key:
   - OpenAI: Delete old key, create new key
   - Supabase: Reset anon key (Dashboard → Settings → API)
2. **Update secrets**: `supabase secrets set OPENAI_API_KEY=new-key`
3. **Redeploy functions**: `supabase functions deploy --all`
4. **Monitor usage**: Check OpenAI usage dashboard for abuse
5. **Notify users**: If user data was accessed

### If User Data is Breached

1. **Isolate**: Take affected service offline if needed
2. **Investigate**: Query audit logs to identify scope
3. **Notify**: Email affected users within 72 hours (GDPR requirement)
4. **Remediate**: Patch vulnerability, rotate keys
5. **Document**: Create post-mortem and update this document

### Reporting Vulnerabilities

**Do NOT open public issues for security vulnerabilities.**

Email: security@everafter.app (or your security contact)

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

We will respond within 48 hours.

## Compliance

### HIPAA (if applicable)

If handling PHI:
- Sign BAA with Supabase (Enterprise plan required)
- Encrypt all PHI at rest and in transit ✅ (default)
- Implement access controls ✅ (RLS)
- Audit logs of PHI access (Supabase audit logs)
- User consent for data sharing

### GDPR (EU users)

- User can request data export (implement `/api/export`)
- User can request deletion (implement `/api/delete-account`)
- Privacy policy and terms of service required
- Cookie consent banner (if using analytics)

## Monitoring & Logging

### What We Log

- Edge Function invocations (success/failure, duration)
- Authentication events (login, logout, password reset)
- Database query performance (slow queries)
- Error messages (sanitized, no PHI)

### What We DON'T Log

- User passwords
- JWT tokens
- OpenAI API keys
- Health data content (symptoms, medications, etc.)
- Full stack traces with user input

### Alerting

Set up alerts for:
- Failed authentication spike (>100/min → potential brute force)
- OpenAI API errors (quota exhausted, invalid key)
- Database connection failures
- Supabase RLS policy violations

## Regular Security Tasks

### Weekly
- Review Supabase audit logs for anomalies
- Check OpenAI usage dashboard for unexpected spikes

### Monthly
- Run `npm audit` and update dependencies
- Review Edge Function error rates
- Test backup restore process

### Quarterly
- Rotate OpenAI API key
- Review and update RLS policies
- Penetration test (automated or manual)
- Security training for team

---

**Last Updated**: 2025-10-25
**Version**: 1.0
**Owner**: Security Team
