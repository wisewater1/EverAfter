# 🚀 Terra OAuth Quick Fix - "Failed to connect service"

## ⚡ 30-Second Solution

### Option 1: Enable Mock Mode (Fastest - for UI testing)

1. Create `.env.local` file:
   ```env
   VITE_MOCK_TERRA_DATA=true
   ```

2. Restart your dev server:
   ```bash
   npm run dev
   ```

3. Click "Connect Terra" - you'll see:
   - ✅ Mock connection successful
   - 🔧 Dev Mode Active banner
   - Realistic health data (HR, steps, sleep, glucose)
   - All UI features work

**Result:** Instant testing without OAuth complexity!

---

### Option 2: Use ngrok (for real OAuth testing)

1. Start your app:
   ```bash
   npm run dev
   # Running on http://localhost:5173
   ```

2. In another terminal:
   ```bash
   npx ngrok http 5173
   ```

3. Copy the HTTPS URL (e.g., `https://abc123.ngrok-free.app`)

4. Add to `.env.local`:
   ```env
   BASE_URL=https://abc123.ngrok-free.app
   ```

5. Go to [Terra Dashboard](https://dashboard.tryterra.co) → Redirect URIs:
   ```
   https://abc123.ngrok-free.app/terra/return
   ```

6. Restart your app and test!

---

### Option 3: Deploy to Public URL (for production)

1. Deploy to Netlify/Vercel/your hosting
2. Get your HTTPS URL (e.g., `https://yourapp.netlify.app`)
3. Add to Terra Dashboard redirect URIs
4. Update production `.env` with your URL
5. Test with real devices

---

## 🎯 What Each Option Does

| Feature | Mock Mode | ngrok | Production |
|---------|-----------|-------|------------|
| **Setup Time** | 30 seconds | 2 minutes | 10 minutes |
| **Real Data** | ❌ No | ✅ Yes | ✅ Yes |
| **Works Offline** | ✅ Yes | ❌ No | ❌ No |
| **UI Testing** | ✅ Perfect | ✅ Perfect | ✅ Perfect |
| **Webhook Testing** | ❌ No | ✅ Yes | ✅ Yes |
| **Best For** | Quick demos | Local dev | Production |

---

## 💡 Why the Error Happens

The error `Failed to connect service ...local-credentialless.webcontainer-api.io` occurs because:

1. You're in a **sandboxed environment** (Bolt, StackBlitz, WebContainer)
2. These environments **block OAuth** for security
3. Terra requires **HTTPS** and **valid redirect URIs**

---

## 📋 Complete Setup Instructions

### For Mock Mode (Recommended for Quick Testing)

**Step 1:** Create `.env.local`:
```env
# Enable mock data
VITE_MOCK_TERRA_DATA=true
VITE_DEV_MODE=true

# Your Supabase config (if needed)
VITE_SUPABASE_URL=your_url
VITE_SUPABASE_ANON_KEY=your_key
```

**Step 2:** Restart:
```bash
npm run dev
```

**Step 3:** Test:
1. Go to Terra integration page
2. See "🔧 Development Mode Active" banner
3. Click "Connect Terra"
4. Alert shows: "✅ Mock connection successful"
5. Data populates: HR (72 bpm), Steps (7842), Sleep (7.2h), Glucose (98 mg/dL)

**What You Get:**
- 2 mock connections (Fitbit, Dexcom)
- 24h of realistic health metrics
- All UI features functional
- No Terra API calls

---

### For Real OAuth (ngrok Method)

**Step 1:** Install ngrok (if not already):
```bash
npm install -g ngrok
# or visit https://ngrok.com/download
```

**Step 2:** Start your app:
```bash
npm run dev
```

**Step 3:** Create tunnel (in new terminal):
```bash
ngrok http 5173
```

You'll see:
```
Forwarding  https://abc123.ngrok-free.app -> http://localhost:5173
```

**Step 4:** Configure Terra Dashboard:

1. Go to [dashboard.tryterra.co](https://dashboard.tryterra.co)
2. Click your project
3. Navigate to **Settings → Authentication**
4. Add Redirect URI:
   ```
   https://abc123.ngrok-free.app/terra/return
   ```
5. Save

**Step 5:** Update `.env.local`:
```env
# Your ngrok URL
BASE_URL=https://abc123.ngrok-free.app

# Terra credentials
TERRA_API_KEY=your_api_key
TERRA_DEV_ID=your_dev_id
TERRA_WEBHOOK_SECRET=your_secret

# Disable mock mode
VITE_MOCK_TERRA_DATA=false

# Supabase
VITE_SUPABASE_URL=your_url
VITE_SUPABASE_ANON_KEY=your_key
```

**Step 6:** Restart your app:
```bash
npm run dev
```

**Step 7:** Test:
1. Click "Connect Terra"
2. Terra widget opens in popup
3. Select a provider (Fitbit, Oura, etc.)
4. Authorize on provider's site
5. Returns to your app
6. Real data syncs!

---

## 🧪 Verification Checklist

### After Enabling Mock Mode
- [ ] Dev mode banner shows at top
- [ ] "Connect Terra" button works
- [ ] Mock connection alert appears
- [ ] 2 connections show (Fitbit, Dexcom)
- [ ] Daily summary displays metrics
- [ ] Export buttons work
- [ ] No API errors in console

### After Setting Up ngrok
- [ ] ngrok tunnel running
- [ ] BASE_URL matches ngrok URL
- [ ] Terra redirect URI configured
- [ ] Widget opens in popup
- [ ] OAuth completes successfully
- [ ] Redirects to /terra/return
- [ ] Real data appears in database

---

## 🔍 Troubleshooting

### "Mock data not showing"

**Check:**
```bash
# In browser console:
console.log(import.meta.env.VITE_MOCK_TERRA_DATA)
# Should output: "true"
```

**Fix:**
1. Restart dev server after changing `.env.local`
2. Hard refresh browser (Ctrl+Shift+R / Cmd+Shift+R)
3. Check `.env.local` is in project root

### "ngrok URL changes every time"

**Solution:**
- Free ngrok = New URL every session (8 hours)
- Use ngrok paid ($8/mo) for static URLs
- Or deploy to staging for persistent URL

### "Redirect URI mismatch"

**Fix:**
1. Check exact match: `https://yoururl.com/terra/return`
2. Must include `/terra/return` path
3. Must be HTTPS (or localhost exception)
4. No trailing slashes unless added in Terra

### "Still getting credentialless error"

**Solution:**
1. Enable mock mode (bypass OAuth entirely)
2. Or use ngrok/public URL
3. Cannot fix in sandboxed environments

---

## 📖 Full Documentation

For complete details:
- **OAuth Setup:** See `TERRA_OAUTH_SETUP_GUIDE.md`
- **Integration Guide:** See `TERRA_INTEGRATION_COMPLETE.md`
- **Next.js/Expo:** See `TERRA_NEXTJS_EXPO_GUIDE.md`

---

## 🎉 Quick Start Commands

### Mock Mode (30 seconds)
```bash
echo "VITE_MOCK_TERRA_DATA=true" >> .env.local
npm run dev
# ✅ Ready to test!
```

### ngrok Mode (2 minutes)
```bash
# Terminal 1
npm run dev

# Terminal 2
npx ngrok http 5173
# Copy HTTPS URL
# Add to Terra Dashboard
# Update .env.local with URL
# Restart app
# ✅ Ready for real OAuth!
```

### Production (10 minutes)
```bash
# Deploy to hosting
vercel --prod
# or: netlify deploy --prod

# Get production URL
# Add to Terra Dashboard
# Update env vars
# ✅ Ready for users!
```

---

## ✅ Success Indicators

### Mock Mode Working
- Yellow "Development Mode Active" banner visible
- "Connect Terra" shows mock success alert
- Connections list shows Fitbit + Dexcom
- Daily summary shows realistic metrics
- Console shows: "🔧 Dev Mode: Loading mock Terra data"

### Real OAuth Working
- No dev mode banner
- Widget opens in popup window
- OAuth completes successfully
- Redirects back to app
- Real provider shows in connections
- Webhooks arrive in database
- Console shows successful API calls

---

**Status:** ✅ OAuth issue resolved with 3 solution paths
**Recommended:** Start with mock mode for immediate testing
**Production:** Use real OAuth with proper HTTPS URL

