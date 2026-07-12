# Terra OAuth Setup Guide - Fixing "Failed to connect service"

## 🔍 Understanding the Issue

The error `Failed to connect service ...local-credentialless.webcontainer-api.io` occurs when:

1. **Running in a sandbox** (Bolt, StackBlitz, WebContainer)
2. **Local development** without proper HTTPS redirect
3. **Redirect URI mismatch** between your app and Terra console

Terra's OAuth requires:
- ✅ HTTPS (or localhost exception)
- ✅ Exact redirect URI match
- ✅ Secure cookie/session storage

---

## 🚀 Quick Fix Options

### Option 1: Use Public Preview URL (Recommended for Bolt/StackBlitz)

**Step 1: Get Your Public URL**

In Bolt/StackBlitz:
1. Click **"Share"** or **"Preview"** button
2. Copy the public HTTPS URL (e.g., `https://yourapp.bolt.run`)

**Step 2: Configure Terra Dashboard**

1. Go to [Terra Dashboard](https://dashboard.tryterra.co)
2. Navigate to **Settings → Authentication**
3. Add Redirect URI:
   ```
   https://yourapp.bolt.run/terra/return
   ```
4. Save changes

**Step 3: Update Your Environment**

```env
# .env or .env.local
BASE_URL=https://yourapp.bolt.run
NEXT_PUBLIC_BASE_URL=https://yourapp.bolt.run
```

**Step 4: Test Connection**

Click "Connect Terra" - should now work!

---

### Option 2: Use ngrok for Local Development

**Step 1: Install ngrok**

```bash
# Via npm
npm install -g ngrok

# Or download from https://ngrok.com/download
```

**Step 2: Start Your App**

```bash
# Terminal 1
npm run dev
# Running on http://localhost:5173
```

**Step 3: Create Tunnel**

```bash
# Terminal 2
ngrok http 5173
```

You'll see:
```
Forwarding  https://abc123.ngrok-free.app -> http://localhost:5173
```

**Step 4: Configure Terra**

Add to Terra Dashboard Redirect URIs:
```
https://abc123.ngrok-free.app/terra/return
```

**Step 5: Update Environment**

```env
BASE_URL=https://abc123.ngrok-free.app
```

**Step 6: Test**

Reload app and click "Connect Terra"

---

### Option 3: Mock Data (Development Only)

**Best for:** Quick demos, UI testing, avoiding OAuth complexity

**Step 1: Enable Dev Mode**

Add to `.env.local`:
```env
VITE_DEV_MODE=true
VITE_MOCK_TERRA_DATA=true
```

**Step 2: Use Mock Component**

The Terra component will automatically detect dev mode and:
- ✅ Skip OAuth flow
- ✅ Load mock data (steps, HR, sleep, glucose)
- ✅ Show UI as if connected
- ✅ Allow testing all features

**Step 3: Test UI**

All features work with realistic mock data:
- Daily summary shows
- Metric cards populate
- Sync buttons functional
- Export/delete testable

---

## 📝 Terra Dashboard Configuration

### Complete Setup Checklist

**1. Create Terra Account**
- Go to [dashboard.tryterra.co](https://dashboard.tryterra.co)
- Sign up / Log in

**2. Create Project**
- Click "New Project"
- Name: "EverAfter" (or your app name)

**3. Get Credentials**
- Copy **API Key** (starts with `terra-`)
- Copy **Dev ID** (UUID format)
- Generate **Webhook Secret**

**4. Configure Redirect URIs**

Add all URLs you'll use:

**Production:**
```
https://everafter.app/terra/return
https://app.everafter.com/terra/return
```

**Staging:**
```
https://staging.everafter.app/terra/return
```

**Development:**
```
https://abc123.ngrok-free.app/terra/return
https://yourapp.bolt.run/terra/return
http://localhost:5173/terra/return
```

**Mobile (Expo):**
```
everafter://terra/return
```

**5. Configure Webhooks (Destinations)**

URL: `https://yourapp.com/functions/v1/terra-webhook`

Or for Next.js: `https://yourapp.com/api/terra/webhook`

Enable Event Types:
- ✅ activity
- ✅ sleep
- ✅ body
- ✅ daily
- ✅ nutrition (optional)

**6. Save Webhook Secret**

Copy and add to `.env`:
```env
TERRA_WEBHOOK_SECRET=your_secret_here
```

---

## 🔐 Environment Configuration

### .env.example Template

```env
# Terra Health Integration
TERRA_API_KEY=terra-your-api-key-here
TERRA_DEV_ID=your-dev-id-uuid-here
TERRA_WEBHOOK_SECRET=your-webhook-secret-here

# Base URL (match Terra redirect URIs)
BASE_URL=https://yourapp.com

# Development Options
VITE_DEV_MODE=false
VITE_MOCK_TERRA_DATA=false

# Supabase
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Development vs Production

**Development (.env.local):**
```env
BASE_URL=https://abc123.ngrok-free.app
VITE_DEV_MODE=true
VITE_MOCK_TERRA_DATA=true  # Optional: use mock data
```

**Production (.env):**
```env
BASE_URL=https://everafter.app
VITE_DEV_MODE=false
VITE_MOCK_TERRA_DATA=false
```

---

## 🛠️ Code Implementation

### Enhanced Terra Client with Dev Mode

**`src/lib/terra-client.ts`** (Updated)

```typescript
import { supabase } from './supabase';
import { getTerraConfig } from './terra-config';

const IS_DEV = import.meta.env.VITE_DEV_MODE === 'true';
const USE_MOCK = import.meta.env.VITE_MOCK_TERRA_DATA === 'true';

export class TerraClient {
  async generateWidgetSession(userId: string, providers?: string[]) {
    // In dev mode with mock data, skip OAuth
    if (IS_DEV && USE_MOCK) {
      return {
        url: '#mock-oauth',
        session_id: 'mock-session',
        expires_in: 3600,
        mock: true
      };
    }

    const { data, error } = await supabase.functions.invoke('terra-widget', {
      body: { reference_id: userId, providers }
    });

    if (error) {
      throw new Error(`Failed to generate widget session: ${error.message}`);
    }

    return data;
  }

  async getMockData(userId: string) {
    // Return realistic mock data for development
    return {
      connections: [
        {
          id: 'mock-1',
          provider: 'FITBIT',
          status: 'connected',
          last_sync_at: new Date().toISOString()
        }
      ],
      summary: {
        avgHr: 72,
        restingHr: 58,
        steps: 7842,
        distance: 6234,
        sleep: 432,
        glucose: 98
      },
      metrics: [
        {
          type: 'hr',
          value: 72,
          timestamp: new Date().toISOString()
        },
        {
          type: 'steps',
          value: 7842,
          timestamp: new Date().toISOString()
        }
      ]
    };
  }

  // ... rest of existing methods
}
```

### Enhanced Terra Component with Dev Mode

**`src/components/TerraIntegration.tsx`** (Add at top)

```typescript
const IS_DEV = import.meta.env.VITE_DEV_MODE === 'true';
const USE_MOCK = import.meta.env.VITE_MOCK_TERRA_DATA === 'true';

export default function TerraIntegration() {
  const handleConnect = async () => {
    if (IS_DEV && USE_MOCK) {
      // Mock connection in dev mode
      const mockData = await terraClient.getMockData(user.id);
      setConnections(mockData.connections);
      setSummary(mockData.summary);
      alert('✅ Mock Terra connection successful! (Dev Mode)');
      return;
    }

    // Real OAuth flow
    setConnecting(true);
    try {
      const session = await terraClient.generateWidgetSession(user.id);

      if (session.mock) {
        // Handle mock mode
        const mockData = await terraClient.getMockData(user.id);
        setConnections(mockData.connections);
        setSummary(mockData.summary);
      } else {
        // Open real Terra widget
        window.open(session.url, '_blank', 'width=500,height=700');
      }
    } catch (error) {
      console.error('Connection error:', error);
      setError('Failed to connect. Check configuration.');
    } finally {
      setConnecting(false);
    }
  };

  // ... rest of component
}
```

---

## 🧪 Testing Scenarios

### Scenario 1: Bolt/StackBlitz Sandbox

**Problem:** `local-credentialless.webcontainer-api.io` error

**Solution:**
1. Get public preview URL
2. Add to Terra redirect URIs
3. Update `BASE_URL` env var
4. Test connection

**Verification:**
```bash
# Check environment
echo $BASE_URL
# Should be: https://yourapp.bolt.run

# Test widget generation
curl https://yourapp.bolt.run/api/terra/widget
# Should return: { "url": "https://widget.tryterra.co/...", ... }
```

### Scenario 2: Local Development

**Problem:** No HTTPS, OAuth blocked

**Solution:**
1. Use ngrok tunnel
2. Or enable mock mode

**Verification:**
```bash
# With ngrok
ngrok http 5173
# Note the HTTPS URL

# With mock mode
VITE_MOCK_TERRA_DATA=true npm run dev
# Click "Connect Terra" - should show mock data
```

### Scenario 3: Production

**Problem:** Need real data, real OAuth

**Solution:**
1. Deploy to production HTTPS
2. Configure Terra redirect URIs
3. Set production env vars
4. Test end-to-end

**Verification:**
```bash
# Test widget session
curl -X POST https://yourapp.com/functions/v1/terra-widget \
  -H "Content-Type: application/json" \
  -d '{"reference_id": "test-user"}'

# Should return real Terra widget URL
```

---

## 🔧 Troubleshooting

### Error: "Invalid redirect URI"

**Cause:** Mismatch between app URL and Terra console

**Fix:**
1. Check `BASE_URL` in `.env`
2. Check Terra Dashboard → Redirect URIs
3. Ensure exact match (including `/terra/return`)
4. Add trailing slash if needed

### Error: "Webhook signature invalid"

**Cause:** Wrong webhook secret or signature algorithm

**Fix:**
1. Regenerate webhook secret in Terra Dashboard
2. Update `TERRA_WEBHOOK_SECRET` in `.env`
3. Redeploy webhook function
4. Test with Terra test event

### Error: "User not found"

**Cause:** Terra user not created in database

**Fix:**
1. After OAuth success, ensure user is saved:
```sql
INSERT INTO terra_users (user_id, terra_user_id, provider, status)
VALUES (
  'your-user-id',
  'terra-user-id-from-oauth',
  'FITBIT',
  'connected'
);
```

### Error: "CORS blocked"

**Cause:** Missing CORS headers on webhook endpoint

**Fix:**
Ensure all responses include:
```typescript
headers: {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
}
```

---

## 📱 Mobile Deep Link Setup

### iOS Configuration

**Info.plist:**
```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>everafter</string>
    </array>
  </dict>
</array>
```

**Terra Dashboard:**
Add redirect URI: `everafter://terra/return`

### Android Configuration

**AndroidManifest.xml:**
```xml
<intent-filter>
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data
    android:scheme="everafter"
    android:host="terra"
    android:pathPrefix="/return" />
</intent-filter>
```

**Terra Dashboard:**
Add redirect URI: `everafter://terra/return`

---

## ✅ Verification Checklist

### Pre-Connection
- [ ] Terra API Key set in `.env`
- [ ] Terra Dev ID set in `.env`
- [ ] Webhook Secret set in `.env`
- [ ] BASE_URL matches environment (dev/prod)
- [ ] Redirect URIs configured in Terra Dashboard
- [ ] Webhook URL configured (if using webhooks)

### Post-Configuration
- [ ] Widget session generates URL
- [ ] Widget opens in popup/tab
- [ ] OAuth completes successfully
- [ ] Redirects to `/terra/return`
- [ ] User saved in `terra_users` table
- [ ] Connection shows in UI

### Webhook Testing
- [ ] Send test webhook from Terra Dashboard
- [ ] Verify signature validation
- [ ] Check `metrics_raw` table for payload
- [ ] Check `metrics_norm` table for normalized data
- [ ] Verify no duplicate metrics

---

## 🚀 Deployment Recommendations

### Development
- Use **ngrok** for local OAuth testing
- Or use **mock mode** for UI development
- Use **ngrok free tier** (8 hour sessions)
- Or paid ngrok for persistent URLs

### Staging
- Deploy to **Netlify/Vercel preview**
- Get preview URL (e.g., `pr-123.app.netlify.app`)
- Add to Terra redirect URIs
- Test full OAuth flow

### Production
- Use **custom domain with HTTPS**
- Add to Terra redirect URIs
- Set production environment variables
- Test with real devices
- Monitor webhook deliveries

---

## 📊 Comparison: Dev Modes

| Feature | Real OAuth | Mock Mode | ngrok |
|---------|-----------|-----------|-------|
| **Setup Time** | 10 min | 1 min | 5 min |
| **Real Data** | ✅ Yes | ❌ No | ✅ Yes |
| **Offline Work** | ❌ No | ✅ Yes | ❌ No |
| **Terra API Calls** | ✅ Yes | ❌ No | ✅ Yes |
| **UI Testing** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Webhook Testing** | ✅ Yes | ❌ No | ✅ Yes |
| **Best For** | Production | UI dev | Local test |

---

## 🎯 Summary

**For Sandbox/Bolt Development:**
→ Use **public preview URL** + Terra redirect URI config

**For Local Development:**
→ Use **ngrok tunnel** OR **mock mode**

**For Production:**
→ Use **real HTTPS domain** + proper Terra configuration

**Quick Test:**
1. Set `VITE_MOCK_TERRA_DATA=true`
2. Reload app
3. Click "Connect Terra"
4. See mock data populate

**Production Deploy:**
1. Remove mock mode
2. Configure real Terra credentials
3. Add production redirect URIs
4. Deploy with HTTPS

---

**All documentation updated in:**
- `TERRA_OAUTH_SETUP_GUIDE.md` (this file)
- `TERRA_INTEGRATION_COMPLETE.md`
- `TERRA_NEXTJS_EXPO_GUIDE.md`

**Need help with a specific scenario?** Check the troubleshooting section or use mock mode for immediate testing!
