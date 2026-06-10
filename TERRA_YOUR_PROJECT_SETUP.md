# Terra Setup Guide - Your Project

## Your Project URLs

Based on your current Supabase configuration:

### Supabase Details
- **Project URL**: `https://rfwghspbhuqdhyyipynt.supabase.co`
- **Project Ref**: `rfwghspbhuqdhyyipynt`

### URLs to Configure in Terra Dashboard

#### 1. Webhook URL
```
https://rfwghspbhuqdhyyipynt.supabase.co/functions/v1/terra-webhook
```

**Where to add:**
1. Go to [Terra Dashboard](https://dashboard.tryterra.co)
2. Navigate to **Settings → Webhooks**
3. Click **Add Destination**
4. Paste the URL above
5. Enable all event types:
   - ✅ Activity
   - ✅ Body
   - ✅ Daily
   - ✅ Sleep
   - ✅ Nutrition
   - ✅ Heart Rate
   - ✅ User Reauth
6. Save

#### 2. OAuth Redirect URLs

**Success Redirect URL:**
```
https://YOUR-PRODUCTION-DOMAIN.com/terra/return
```

**Failure Redirect URL:**
```
https://YOUR-PRODUCTION-DOMAIN.com/health/devices
```

**Where to add:**
1. Go to **Settings → OAuth**
2. Add both URLs to **Allowed Redirect URLs**
3. Save

**Note:** Replace `YOUR-PRODUCTION-DOMAIN.com` with:
- Your production domain (e.g., `app.everafter.health`)
- OR your Bolt preview URL (e.g., `your-project.bolt.new`)
- OR your ngrok URL for testing (e.g., `https://abc123.ngrok.io`)

## Environment Variables

Add these to your `.env` file:

```bash
# Terra API Credentials (get from Terra Dashboard)
TERRA_API_KEY=your_api_key_here
TERRA_DEV_ID=your_dev_id_here
TERRA_WEBHOOK_SECRET=your_webhook_secret_here

# Your production domain
NEXT_PUBLIC_BASE_URL=https://YOUR-PRODUCTION-DOMAIN.com

# Already configured
VITE_SUPABASE_URL=https://rfwghspbhuqdhyyipynt.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmd2doc3BiaHVxZGh5eWlweW50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3MjQ0MzIsImV4cCI6MjA3NTMwMDQzMn0.d_GP9IBBPRFWAGMCjQd5v4TDj1RBFOCphLuvssZsclY
```

## Step-by-Step Setup

### Step 1: Get Terra Credentials

1. Sign up at https://dashboard.tryterra.co
2. Create a new app or select existing
3. Go to **Settings → API Keys**
4. Copy your credentials:
   - **Developer ID** (starts with `testing-` or `prod-`)
   - **API Key** (long string)
   - **Webhook Secret** (for signature verification)

### Step 2: Update Environment Variables

```bash
# Add to .env
TERRA_API_KEY=your_actual_api_key
TERRA_DEV_ID=your_actual_dev_id
TERRA_WEBHOOK_SECRET=your_actual_webhook_secret
NEXT_PUBLIC_BASE_URL=https://your-actual-domain.com
```

### Step 3: Configure Terra Webhooks

1. Open Terra Dashboard
2. Go to **Settings → Webhooks**
3. Click **Add Destination**
4. Enter webhook URL:
   ```
   https://rfwghspbhuqdhyyipynt.supabase.co/functions/v1/terra-webhook
   ```
5. Select all event types
6. Save

### Step 4: Configure OAuth Redirects

1. In Terra Dashboard, go to **Settings → OAuth**
2. Add Success URL:
   ```
   https://YOUR-DOMAIN.com/terra/return
   ```
3. Add Failure URL:
   ```
   https://YOUR-DOMAIN.com/health/devices
   ```
4. Save

### Step 5: Test the Integration

Navigate to the setup wizard in your app:
```
https://YOUR-DOMAIN.com/setup/terra
```

The wizard will:
1. ✅ Validate your API credentials
2. ✅ Test webhook connectivity
3. ✅ Verify signature generation
4. ✅ Check database schema
5. ✅ Confirm Edge Functions deployment

## Available Routes

### For Users
- `/health/devices` - Connect devices
- `/health/metrics` - View health data
- `/terra/return` - OAuth callback (auto-redirect)

### For Admins
- `/setup/terra` - Setup wizard
- `/dev/terra` - Test harness (dev only)

## Testing Locally with ngrok

If you want to test locally before deploying:

1. **Install ngrok:**
   ```bash
   npm install -g ngrok
   ```

2. **Start your dev server:**
   ```bash
   npm run dev
   ```

3. **In another terminal, start ngrok:**
   ```bash
   ngrok http 5173
   ```

4. **Copy the HTTPS URL** (e.g., `https://abc123.ngrok.io`)

5. **Update Terra Dashboard:**
   - Webhook URL: `https://abc123.ngrok.io/functions/v1/terra-webhook`
   - Success Redirect: `https://abc123.ngrok.io/terra/return`
   - Failure Redirect: `https://abc123.ngrok.io/health/devices`

6. **Update `.env`:**
   ```bash
   NEXT_PUBLIC_BASE_URL=https://abc123.ngrok.io
   ```

7. **Restart dev server**

## Supported Providers

Terra connects 40+ providers. Most popular:

| Provider | Data Types | Notes |
|----------|------------|-------|
| **Fitbit** | Activity, Sleep, HR, Weight | OAuth flow |
| **Oura Ring** | Sleep, HRV, Temperature, Activity | OAuth flow |
| **Garmin** | Activity, GPS, HR, Sleep | OAuth flow |
| **WHOOP** | Recovery, Strain, Sleep, HRV | OAuth flow |
| **Withings** | Body, BP, Activity, Sleep | OAuth flow |
| **Apple Health** | All metrics | SDK required |
| **Google Fit** | All metrics | SDK required |
| **Dexcom** | Glucose (CGM) | OAuth flow |
| **FreeStyle Libre** | Glucose (CGM) | OAuth flow |
| **Polar** | HR, Activity, Sleep | OAuth flow |
| **Suunto** | Activity, GPS, HR | OAuth flow |
| **Peloton** | Workouts, HR | OAuth flow |
| **Eight Sleep** | Sleep tracking | OAuth flow |
| **Strava** | GPS, Activities | OAuth flow |

## Webhook Event Types

Your webhook will receive these event types:

1. **activity** - Steps, distance, calories, active minutes
2. **body** - Weight, BMI, body fat percentage
3. **daily** - Daily summaries across all metrics
4. **sleep** - Sleep sessions, stages, duration, quality
5. **nutrition** - Meal logs, macros, calories
6. **heart_rate** - Continuous HR measurements
7. **user.reauth** - When user needs to re-authenticate

## Webhook Signature Verification

All webhooks are verified using HMAC-SHA256:

```typescript
// Automatic in terra-webhook Edge Function
const signature = req.headers.get('terra-signature');
const body = await req.text();
const isValid = await verifyTerraWebhookSignature(
  signature,
  body,
  TERRA_WEBHOOK_SECRET
);
```

**Security:** Invalid signatures are rejected with 403.

## Data Flow

```
User Device (Fitbit/Oura/etc)
    ↓
Terra API (aggregates data)
    ↓
Webhook POST → /functions/v1/terra-webhook
    ↓
1. Verify HMAC signature ✓
2. Log to terra_webhook_logs
3. Store raw → terra_metrics_raw
4. Normalize → terra_metrics_norm
5. Update connection status
6. Evaluate device health
7. Generate alerts if needed
    ↓
UI Updates (Supabase Realtime)
```

## Database Tables

Created by migration `20251029120000_create_terra_integration_system.sql`:

1. **terra_connections** - Device connections per user/provider
2. **terra_metrics_raw** - Immutable webhook payloads
3. **terra_metrics_norm** - Normalized time-series data
4. **terra_device_health** - Quality metrics (uptime, latency, freshness)
5. **terra_webhook_logs** - Diagnostic logs
6. **terra_alerts** - System alerts
7. **terra_consents** - OAuth scope tracking
8. **terra_sync_jobs** - Background sync jobs

## Edge Functions

Located in `/supabase/functions/`:

1. **terra-widget** - Creates OAuth widget sessions
2. **terra-webhook** - Processes incoming webhooks
3. **terra-backfill** - Historical data sync (7/30/90 days)
4. **terra-test** - Development test harness

## Components

1. **TerraSetupWizard** - 4-step setup wizard with validation
2. **TerraIntegration** - Connection management UI
3. **TerraCallback** - OAuth success/error page
4. **TerraMetricsVisualization** - Data visualization dashboard

## Quick Test

After setup, test the integration:

```bash
# 1. Navigate to setup wizard
open https://YOUR-DOMAIN.com/setup/terra

# 2. Enter your credentials

# 3. Run all tests

# 4. Connect your first device
open https://YOUR-DOMAIN.com/health/devices
```

## Troubleshooting

### Webhook not receiving data

**Check:**
1. ✅ Webhook URL in Terra Dashboard matches exactly
2. ✅ `TERRA_WEBHOOK_SECRET` in `.env` is correct
3. ✅ Edge Function deployed: `supabase functions list`
4. ✅ View logs: `supabase functions logs terra-webhook`

**Debug:**
```sql
-- Check webhook logs
SELECT * FROM terra_webhook_logs
ORDER BY received_at DESC
LIMIT 10;

-- Check for errors
SELECT * FROM terra_webhook_logs
WHERE error IS NOT NULL;
```

### OAuth widget not loading

**Check:**
1. ✅ `TERRA_API_KEY` and `TERRA_DEV_ID` set correctly
2. ✅ Redirect URLs in Terra Dashboard match your domain
3. ✅ `NEXT_PUBLIC_BASE_URL` is set

**Test:**
```bash
curl -X POST \
  https://rfwghspbhuqdhyyipynt.supabase.co/functions/v1/terra-widget \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
  -d '{"user_id":"test"}'
```

### No data appearing

**Check:**
1. ✅ Connection exists in `terra_connections` table
2. ✅ Webhooks logged in `terra_webhook_logs`
3. ✅ Raw data in `terra_metrics_raw`
4. ✅ Normalized data in `terra_metrics_norm`

**Verify:**
```sql
-- Check connections
SELECT * FROM terra_connections WHERE user_id = 'YOUR_USER_ID';

-- Check raw metrics
SELECT * FROM terra_metrics_raw
WHERE user_id = 'YOUR_USER_ID'
ORDER BY received_at DESC
LIMIT 10;

-- Check normalized metrics
SELECT * FROM terra_metrics_norm
WHERE user_id = 'YOUR_USER_ID'
ORDER BY ts DESC
LIMIT 10;
```

## Support

- **Terra Docs**: https://docs.tryterra.co
- **Terra Status**: https://status.tryterra.co
- **Terra Dashboard**: https://dashboard.tryterra.co
- **Your Supabase Project**: https://supabase.com/dashboard/project/rfwghspbhuqdhyyipynt

## Next Steps

After completing setup:

1. ✅ Connect your first device
2. ✅ View real-time metrics in dashboard
3. ✅ Set up health alerts
4. ✅ Enable AI insights
5. ✅ Share with care team

---

**Ready?** Start with the setup wizard: `/setup/terra` 🚀
