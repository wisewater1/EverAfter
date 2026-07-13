# EverAfter Integrations Guide

This document lists all third-party integrations required for EverAfter, what credentials are needed, and how to obtain them.

---

## Quick Reference - Required Secrets

| Secret Name | Provider | Required For | Priority |
|-------------|----------|--------------|----------|
| `GROQ_API_KEY` | Groq | AI Chat (Raphael) | **Critical** - Already Set |
| `TERRA_API_KEY` | Terra | Health device aggregator | **High** |
| `TERRA_DEV_ID` | Terra | Health device aggregator | **High** |
| `TERRA_WEBHOOK_SECRET` | Terra | Webhook verification | **High** |
| `STRIPE_SECRET_KEY` | Stripe | Payments | **High** |
| `STRIPE_WEBHOOK_SECRET` | Stripe | Payment webhooks | **High** |
| `OPENAI_API_KEY` | OpenAI | Embeddings (optional) | Medium |
| `DEXCOM_CLIENT_ID` | Dexcom | CGM direct integration | Medium |
| `DEXCOM_CLIENT_SECRET` | Dexcom | CGM direct integration | Medium |
| `FITBIT_CLIENT_ID` | Fitbit | Direct Fitbit integration | Low |
| `FITBIT_CLIENT_SECRET` | Fitbit | Direct Fitbit integration | Low |
| `OURA_CLIENT_ID` | Oura | Direct Oura integration | Low |
| `OURA_CLIENT_SECRET` | Oura | Direct Oura integration | Low |
| `RESEND_API_KEY` | Resend | Email notifications | Medium |
| `APP_BASE_URL` | - | OAuth callbacks | **High** |

---

## 1. AI & LLM Providers

### Groq (Primary - Chat)
**Status:** Already configured

**What it does:** Powers St. Raphael chat with fast inference using Llama models.

**Credentials needed:**
| Credential | Supabase Secret Name |
|------------|---------------------|
| API Key | `GROQ_API_KEY` |

**How to get credentials:**
1. Go to https://console.groq.com
2. Sign up / Log in
3. Navigate to API Keys
4. Create new API key
5. Copy the key (starts with `gsk_`)

**Cost:** Free tier available (30 requests/minute)

---

### OpenAI (Optional - Embeddings)
**Status:** Not configured

**What it does:** Provides text embeddings for semantic memory search in the `agent` function. Only needed if you want memory/context features.

**Credentials needed:**
| Credential | Supabase Secret Name |
|------------|---------------------|
| API Key | `OPENAI_API_KEY` |

**How to get credentials:**
1. Go to https://platform.openai.com
2. Sign up / Log in
3. Navigate to API Keys (https://platform.openai.com/api-keys)
4. Create new secret key
5. Copy the key (starts with `sk-`)

**Cost:** Pay-as-you-go (~$0.02 per 1M tokens for embeddings)

---

## 2. Health Device Aggregators

### Terra (Recommended - 50+ Devices)
**Status:** Edge Functions ready, needs credentials

**What it does:** Single API to connect Fitbit, Garmin, Oura, Apple Health, Whoop, Dexcom, and 50+ other devices.

**Credentials needed:**
| Credential | Supabase Secret Name |
|------------|---------------------|
| API Key | `TERRA_API_KEY` |
| Developer ID | `TERRA_DEV_ID` |
| Webhook Secret | `TERRA_WEBHOOK_SECRET` |

**How to get credentials:**
1. Go to https://tryterra.co
2. Click "Get Started" or "Sign Up"
3. Create your account (email verification required)
4. Create a new application in the dashboard
5. From your app settings, copy:
   - **API Key** - Found in API section
   - **Dev ID** - Found in app overview
   - **Webhook Secret** - Generate in Webhooks section
6. Configure webhook URL in Terra Dashboard:
   ```
   https://sncvecvgxwkkxnxbvglv.supabase.co/functions/v1/terra-webhook
   ```

**Supported devices via Terra:**
- Fitbit (all devices)
- Garmin (all devices)
- Oura Ring
- Whoop
- Apple Health
- Google Fit
- Samsung Health
- Polar
- Suunto
- Coros
- Wahoo
- Peloton
- Eight Sleep
- Dexcom CGM
- Freestyle Libre
- And 40+ more

**Cost:**
- Free tier: 25 users, 3 integrations
- Starter: $99/month for 500 users
- Growth: Custom pricing

---

## 3. Direct Health Device Integrations

### Dexcom (CGM - Direct)
**Status:** Edge Functions ready, needs credentials

**What it does:** Direct integration with Dexcom G6/G7 continuous glucose monitors. Use this for real-time glucose data if Terra's Dexcom integration isn't sufficient.

**Credentials needed:**
| Credential | Supabase Secret Name |
|------------|---------------------|
| Client ID | `DEXCOM_CLIENT_ID` |
| Client Secret | `DEXCOM_CLIENT_SECRET` |

**How to get credentials:**
1. Go to https://developer.dexcom.com
2. Create a developer account
3. Create a new application
4. Select OAuth 2.0 application type
5. Set Redirect URI to:
   ```
   https://everafterai.net/api/connect-callback?provider=dexcom
   ```
6. Copy Client ID and Client Secret

**Important notes:**
- Sandbox environment available for testing
- Production access requires Dexcom approval
- Change `sandbox-api.dexcom.com` to `api.dexcom.com` for production

**Cost:** Free (API access)

---

### Fitbit (Direct)
**Status:** Edge Functions ready, needs credentials

**What it does:** Direct OAuth integration with Fitbit. Usually not needed if using Terra.

**Credentials needed:**
| Credential | Supabase Secret Name |
|------------|---------------------|
| Client ID | `FITBIT_CLIENT_ID` |
| Client Secret | `FITBIT_CLIENT_SECRET` |
| Subscriber Verification Code | `FITBIT_SUBSCRIBER_VERIFICATION_CODE` |

**How to get credentials:**
1. Go to https://dev.fitbit.com
2. Log in with your Fitbit account
3. Go to "Manage" > "Register an App"
4. Fill out application details:
   - Application Name: EverAfter
   - OAuth 2.0 Application Type: Server
   - Callback URL: `https://everafterai.net/api/connect-callback?provider=fitbit`
   - Default Access Type: Read-Only (or Read & Write)
5. Copy Client ID and Client Secret
6. For webhooks, generate a Subscriber Verification Code

**Cost:** Free (API access)

---

### Oura Ring (Direct)
**Status:** Edge Functions ready, needs credentials

**What it does:** Direct OAuth integration with Oura Ring. Usually not needed if using Terra.

**Credentials needed:**
| Credential | Supabase Secret Name |
|------------|---------------------|
| Client ID | `OURA_CLIENT_ID` |
| Client Secret | `OURA_CLIENT_SECRET` |

**How to get credentials:**
1. Go to https://cloud.ouraring.com/oauth/applications
2. Log in with your Oura account
3. Click "New Application"
4. Fill out:
   - Application Name: EverAfter
   - Redirect URI: `https://everafterai.net/api/connect-callback?provider=oura`
5. Copy Client ID and Client Secret

**Cost:** Free (API access)

---

## 4. Payments

### Stripe
**Status:** Edge Functions exist, needs credentials

**What it does:** Handles subscriptions, one-time payments, and billing portal.

**Credentials needed:**
| Credential | Supabase Secret Name |
|------------|---------------------|
| Secret Key | `STRIPE_SECRET_KEY` |
| Webhook Secret | `STRIPE_WEBHOOK_SECRET` |
| Publishable Key | `VITE_STRIPE_PUBLISHABLE_KEY` (frontend .env) |

**How to get credentials:**
1. Go to https://dashboard.stripe.com
2. Sign up / Log in
3. For **test mode** (recommended first):
   - Toggle "Test mode" in dashboard
   - Go to Developers > API keys
   - Copy Publishable key (starts with `pk_test_`)
   - Copy Secret key (starts with `sk_test_`)
4. For webhooks:
   - Go to Developers > Webhooks
   - Add endpoint: `https://sncvecvgxwkkxnxbvglv.supabase.co/functions/v1/stripe-webhook`
   - Select events: `checkout.session.completed`, `customer.subscription.*`, `invoice.*`
   - Copy Signing secret (starts with `whsec_`)
5. For **production**:
   - Complete Stripe account verification
   - Switch off test mode
   - Use live keys (start with `pk_live_` and `sk_live_`)

**Cost:** 2.9% + $0.30 per transaction

---

## 5. Email & Notifications

### Resend (Recommended for Email)
**Status:** Not implemented yet

**What it does:** Transactional emails (welcome, password reset, health alerts).

**Credentials needed:**
| Credential | Supabase Secret Name |
|------------|---------------------|
| API Key | `RESEND_API_KEY` |

**How to get credentials:**
1. Go to https://resend.com
2. Sign up / Log in
3. Go to API Keys section
4. Create new API key
5. Copy the key (starts with `re_`)

**Additional setup:**
- Verify your domain for sending emails
- Or use `onboarding@resend.dev` for testing

**Cost:**
- Free: 100 emails/day
- Pro: $20/month for 50K emails

---

### SendGrid (Alternative for Email)
**Status:** Not implemented

**Credentials needed:**
| Credential | Supabase Secret Name |
|------------|---------------------|
| API Key | `SENDGRID_API_KEY` |

**How to get credentials:**
1. Go to https://sendgrid.com
2. Sign up / Log in
3. Go to Settings > API Keys
4. Create API key with "Mail Send" permission
5. Copy the key

**Cost:** Free tier: 100 emails/day

---

### Pushover (Push Notifications)
**Status:** Not implemented (in PRD)

**What it does:** Send push notifications to mobile devices for health alerts.

**Credentials needed:**
| Credential | Supabase Secret Name |
|------------|---------------------|
| User Key | `PUSHOVER_USER_KEY` |
| API Token | `PUSHOVER_API_TOKEN` |

**How to get credentials:**
1. Go to https://pushover.net
2. Create account
3. Copy your **User Key** from dashboard
4. Create an Application to get **API Token**

**Cost:** $5 one-time purchase per platform (iOS/Android)

---

## 6. Career Agent Integrations (Future)

### LinkedIn API
**Status:** Not implemented

**What it does:** Import profile data, skills, experience for Career Agent.

**Credentials needed:**
| Credential | Supabase Secret Name |
|------------|---------------------|
| Client ID | `LINKEDIN_CLIENT_ID` |
| Client Secret | `LINKEDIN_CLIENT_SECRET` |

**How to get credentials:**
1. Go to https://www.linkedin.com/developers/
2. Create an app
3. Request "Sign In with LinkedIn" and "r_liteprofile" permissions
4. Set OAuth redirect URL
5. Copy Client ID and Client Secret

**Note:** LinkedIn API access is restrictive. May need to apply for Marketing Developer Platform access.

---

## 7. Infrastructure

### App Base URL
**Required for:** OAuth callbacks, webhook URLs, email links

| Credential | Supabase Secret Name |
|------------|---------------------|
| Base URL | `APP_BASE_URL` |

**Value to set:**
```
https://everafterai.net
```

---

## Setup Checklist

### Phase 1 - Essential (Do First)
- [x] `GROQ_API_KEY` - Already set
- [ ] `APP_BASE_URL` - Set to `https://everafterai.net`
- [ ] `TERRA_API_KEY` - Register at tryterra.co
- [ ] `TERRA_DEV_ID` - From Terra dashboard
- [ ] `TERRA_WEBHOOK_SECRET` - From Terra dashboard

### Phase 2 - Payments
- [ ] `STRIPE_SECRET_KEY` - Register at stripe.com
- [ ] `STRIPE_WEBHOOK_SECRET` - From Stripe webhooks
- [ ] `VITE_STRIPE_PUBLISHABLE_KEY` - Add to frontend .env

### Phase 3 - Notifications
- [ ] `RESEND_API_KEY` - Register at resend.com

### Phase 4 - Direct Device Integrations (Optional)
- [ ] `DEXCOM_CLIENT_ID` / `DEXCOM_CLIENT_SECRET`
- [ ] `FITBIT_CLIENT_ID` / `FITBIT_CLIENT_SECRET`
- [ ] `OURA_CLIENT_ID` / `OURA_CLIENT_SECRET`

### Phase 5 - Advanced Features
- [ ] `OPENAI_API_KEY` - For memory/embeddings
- [ ] `LINKEDIN_CLIENT_ID` / `LINKEDIN_CLIENT_SECRET` - Career Agent

---

## How to Set Secrets in Supabase

1. Go to https://supabase.com/dashboard/project/sncvecvgxwkkxnxbvglv/settings/functions
2. Scroll to "Secrets" section
3. Click "Add new secret"
4. Enter name and value
5. Click "Save"

**Or via CLI:**
```bash
SUPABASE_ACCESS_TOKEN='your-token' npx supabase secrets set SECRET_NAME='value' --project-ref sncvecvgxwkkxnxbvglv
```

---

## Cost Summary

| Provider | Free Tier | Paid |
|----------|-----------|------|
| Groq | 30 req/min | Pay-as-you-go |
| Terra | 25 users | $99/mo (500 users) |
| Stripe | - | 2.9% + $0.30/txn |
| Resend | 100 emails/day | $20/mo |
| OpenAI | - | ~$0.02/1M tokens |
| Dexcom | Free API | - |
| Fitbit | Free API | - |
| Oura | Free API | - |

**Estimated monthly cost for MVP:** $0-50 (depending on usage)

---

## Questions?

If you need help with any integration:
1. Check the provider's documentation
2. Review existing Edge Functions in `supabase/functions/`
3. Check `CLAUDE.md` for architecture guidance

---

*Last updated: January 5, 2026*
