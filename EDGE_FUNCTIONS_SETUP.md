# EverAfter Edge Functions Setup Guide

This guide walks you through deploying and configuring production-ready Edge Functions for EverAfter.

## Prerequisites

- Supabase project created
- Supabase CLI installed (`npm install -g supabase`)
- OpenAI API key (from https://platform.openai.com/api-keys)

## 🔐 Critical Security Step: Set OpenAI API Key

**NEVER** commit API keys to your repository. Set them as secrets in Supabase:

### Option 1: Via Supabase Dashboard (Recommended)

1. Go to https://supabase.com/dashboard/project/YOUR_PROJECT/functions
2. Click "Edge Functions" in the left sidebar
3. Click "Manage secrets" or go to the "Secrets" tab
4. Add a new secret:
   - **Name**: `OPENAI_API_KEY`
   - **Value**: `sk-...` (your OpenAI API key)
5. Click "Save"

### Option 2: Via CLI

```bash
# Set the secret
supabase secrets set OPENAI_API_KEY=sk-your-actual-key-here

# Verify it's set (will show masked value)
supabase secrets list
```

## 📦 Deploy Edge Functions

### Link Your Local Project to Supabase

```bash
# Login to Supabase
supabase login

# Link to your project (get project ref from dashboard URL)
supabase link --project-ref YOUR_PROJECT_REF
```

### Deploy All Functions

```bash
# Deploy all Edge Functions at once
supabase functions deploy raphael-chat
supabase functions deploy task-create
supabase functions deploy daily-progress

# Or deploy individually
supabase functions deploy raphael-chat
```

### Check Deployment Status

```bash
# List all deployed functions
supabase functions list
```

## 🧪 Test Edge Functions

### Get Your User JWT

1. Open your app in the browser and log in
2. Open DevTools (F12)
3. Go to **Application** → **Local Storage**
4. Find `sb-YOUR_PROJECT-auth-token`
5. Copy the `access_token` value

### Run Smoke Tests

```bash
# Set your JWT and run tests
USER_JWT='your-jwt-here' ./scripts/smoke-test.sh
```

Expected output:
```
🔍 EverAfter Edge Functions Smoke Test
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Testing daily-progress... ✓ PASS (HTTP 200)
Testing raphael-chat... ✓ PASS (HTTP 200)
Testing raphael-chat (safety check)... ✓ PASS (HTTP 200)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Results: 3 passed, 0 failed
✓ All tests passed!
```

### Manual Testing with cURL

```bash
# Replace YOUR_PROJECT with your actual project ref
# Replace YOUR_JWT with your actual JWT token

# Test daily progress
curl -i https://YOUR_PROJECT.supabase.co/functions/v1/daily-progress \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{}'

# Test Raphael chat
curl -i https://YOUR_PROJECT.supabase.co/functions/v1/raphael-chat \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{"input": "Hello, how are you today?"}'

# Test task creation (requires valid engram_id)
curl -i https://YOUR_PROJECT.supabase.co/functions/v1/task-create \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{"engramId": "your-engram-uuid", "title": "Take vitamins daily"}'
```

## 📋 Edge Functions Overview

### `raphael-chat`

**Purpose**: Chat with St. Raphael health companion

**Request**:
```json
{
  "input": "How can I improve my sleep?",
  "engramId": "optional-engram-uuid",
  "system": "optional-custom-system-prompt"
}
```

**Response**:
```json
{
  "reply": "To improve your sleep, consider...",
  "user_id": "user-uuid"
}
```

**Safety Features**:
- Never diagnoses medical conditions
- Never prescribes treatments
- Always directs emergencies to professional help
- Tracks daily progress automatically

### `task-create`

**Purpose**: Create health-related tasks for engrams

**Request**:
```json
{
  "engramId": "engram-uuid",
  "title": "Schedule annual checkup",
  "task_description": "Call Dr. Smith's office",
  "details": { "priority": "high" }
}
```

**Response**:
```json
{
  "task": {
    "id": "task-uuid",
    "user_id": "user-uuid",
    "engram_id": "engram-uuid",
    "title": "Schedule annual checkup",
    "status": "pending",
    "created_at": "2025-10-25T10:00:00Z",
    ...
  }
}
```

### `daily-progress`

**Purpose**: Track user's daily activity

**Request**: `{}` (empty body)

**Response**:
```json
{
  "progress_id": "progress-uuid",
  "user_id": "user-uuid"
}
```

## 🔍 Monitoring & Debugging

### View Function Logs

```bash
# Stream logs in real-time
supabase functions serve raphael-chat --debug

# Or view in dashboard
# Go to: Functions → Select function → Logs tab
```

### Common Error Codes

| Code | Meaning | Solution |
|------|---------|----------|
| `AUTH_MISSING` | No Authorization header | Frontend must send JWT |
| `AUTH_FAILED` | Invalid/expired JWT | User needs to log in again |
| `CONFIG_MISSING` | OpenAI key not set | Set `OPENAI_API_KEY` secret |
| `OPENAI_ERROR` | OpenAI API failed | Check API key, quota, status |
| `ENGRAM_NOT_FOUND` | Invalid engram ID | Verify engram exists and user owns it |

### Debugging Checklist

If functions fail:

1. ✅ **JWT is being sent**: Check browser DevTools → Network → Request Headers → `Authorization: Bearer ...`
2. ✅ **OpenAI key is set**: Run `supabase secrets list` and verify `OPENAI_API_KEY` exists
3. ✅ **RLS policies allow access**: Query `engrams` table from frontend to verify RLS works
4. ✅ **User is authenticated**: Call `supabase.auth.getSession()` and verify session exists
5. ✅ **Check function logs**: Dashboard → Functions → Logs

## 🔄 Updating Functions

After modifying function code:

```bash
# Redeploy the specific function
supabase functions deploy raphael-chat

# Functions are deployed immediately
# No restart required
```

## 🛡️ Security Checklist

Before going to production:

- [ ] `OPENAI_API_KEY` is set as a Supabase secret (not in code)
- [ ] All Edge Functions validate JWT and call `supabase.auth.getUser()`
- [ ] RLS policies are enabled on all tables
- [ ] Error responses don't leak sensitive information
- [ ] Function logs don't contain PHI or tokens
- [ ] CORS headers allow only your domain (not `*` in production)
- [ ] Rate limiting is configured (Supabase Dashboard → Settings → API)

## 📚 Additional Resources

- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference)
- [Deno Runtime Docs](https://deno.com/runtime)

---

**Need help?** Check function logs first, then review the error code table above.
