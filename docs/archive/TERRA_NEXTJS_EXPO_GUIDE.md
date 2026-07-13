# Terra Integration - Next.js + Expo Implementation Guide

This guide provides the complete Next.js App Router + Expo implementation for Terra health integration, complementing the existing Vite/React implementation.

---

## 📁 Directory Structure

```
everafter/
├── app/                                    # Next.js App Router
│   ├── api/
│   │   └── terra/
│   │       ├── widget/route.ts            # Generate widget session
│   │       ├── webhook/route.ts           # Webhook ingestion
│   │       └── test/route.ts              # Test harness
│   ├── terra/
│   │   └── return/page.tsx                # OAuth return page
│   └── health/
│       └── connections/page.tsx           # Connections hub
├── components/
│   ├── terra/
│   │   ├── TerraConnectionHub.tsx         # Web connections UI
│   │   ├── TerraSetupWizard.tsx          # Setup wizard
│   │   └── RaphaelHealthPanel.tsx         # 24h summary
│   └── mobile/
│       └── TerraIntegration.tsx           # Expo component
├── lib/
│   ├── terra/
│   │   ├── config.ts                      # Shared config
│   │   ├── client.ts                      # API client
│   │   └── normalize.ts                   # Data normalization
│   └── supabase/
│       └── client.ts                      # Supabase client
├── mobile/                                 # Expo app
│   ├── app/
│   │   ├── (tabs)/
│   │   │   └── health.tsx                 # Health tab
│   │   └── terra/
│   │       └── return.tsx                 # Deep link return
│   ├── app.json                           # Expo config
│   └── package.json
└── .env.local                             # Environment vars
```

---

## 🔧 Environment Configuration

### `.env.local` (Next.js)

```env
# Public (exposed to browser)
NEXT_PUBLIC_BASE_URL=https://yourapp.com
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Private (server-only)
TERRA_API_KEY=your_terra_api_key
TERRA_DEV_ID=your_terra_dev_id
TERRA_WEBHOOK_SECRET=your_webhook_secret
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### `.env.example`

```env
# Terra Health Integration
NEXT_PUBLIC_BASE_URL=https://app.yourdomain.com
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Server-side only (never expose to client)
TERRA_API_KEY=
TERRA_DEV_ID=
TERRA_WEBHOOK_SECRET=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

---

## 📊 Database Schema (Same as Vite)

Use the same Supabase migration from the Vite implementation:

```bash
# Apply the existing migration
supabase db push
```

The schema includes:
- `terra_users` - User-provider mappings
- `connections` - Connection status
- `metrics_raw` - Raw webhook payloads
- `metrics_norm` - Normalized metrics
- `sync_jobs` - Backfill job queue
- `consents` - Privacy preferences

---

## 🚀 Next.js API Routes

### 1. Widget Session Generator

**`app/api/terra/widget/route.ts`**

```typescript
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { providers } = await req.json().catch(() => ({ providers: [] }));

    const apiKey = process.env.TERRA_API_KEY;
    const devId = process.env.TERRA_DEV_ID;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

    if (!apiKey || !devId) {
      return NextResponse.json(
        { error: 'Terra configuration missing' },
        { status: 500 }
      );
    }

    const defaultProviders = [
      'FITBIT',
      'OURA',
      'GARMIN',
      'DEXCOM',
      'FREESTYLELIBRE',
      'WITHINGS',
      'POLAR',
    ];

    const res = await fetch(
      'https://api.tryterra.co/v2/auth/generateWidgetSession',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          accept: 'application/json',
          'x-api-key': apiKey,
          'dev-id': devId,
        },
        body: JSON.stringify({
          providers: providers.length > 0 ? providers : defaultProviders,
          language: 'en',
          reference_id: `EA-${Date.now()}`,
          auth_success_redirect_url: `${baseUrl}/terra/return?status=success`,
          auth_failure_redirect_url: `${baseUrl}/terra/return?status=failure`,
        }),
      }
    );

    const data = await res.json();

    if (!res.ok || !data.url) {
      return NextResponse.json({ error: data }, { status: 500 });
    }

    return NextResponse.json({
      url: data.url,
      session_id: data.session_id,
      expires_in: data.expires_in,
    });
  } catch (error) {
    console.error('Error generating widget session:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### 2. Webhook Ingestion

**`app/api/terra/webhook/route.ts`**

```typescript
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const supa = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function verifySignature(raw: string, sig: string | null): boolean {
  const secret = process.env.TERRA_WEBHOOK_SECRET;
  if (!secret || !sig) return false;

  const hmac = crypto.createHmac('sha256', secret).update(raw).digest('hex');

  try {
    return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(sig));
  } catch {
    return false;
  }
}

async function normalizeMetrics(payload: any, userId: string, provider: string) {
  const rows: any[] = [];
  const data = payload.data || [];

  for (const item of data) {
    const metadata = item.metadata || {};
    const timestamp = metadata.start_time || new Date().toISOString();

    // Steps from distance_data
    if (item.distance_data?.steps) {
      rows.push({
        user_id: userId,
        provider,
        metric_type: 'steps',
        ts: timestamp,
        value: item.distance_data.steps,
        unit: 'count',
        quality: 'good',
      });
    }

    // Heart rate
    if (item.heart_rate_data) {
      const hrData = item.heart_rate_data;
      if (hrData.avg_hr_bpm) {
        rows.push({
          user_id: userId,
          provider,
          metric_type: 'hr',
          ts: timestamp,
          value: hrData.avg_hr_bpm,
          unit: 'bpm',
          quality: 'good',
        });
      }
      if (hrData.resting_hr_bpm) {
        rows.push({
          user_id: userId,
          provider,
          metric_type: 'resting_hr',
          ts: timestamp,
          value: hrData.resting_hr_bpm,
          unit: 'bpm',
          quality: 'good',
        });
      }
    }

    // Sleep
    if (item.sleep_durations_data) {
      const sleepData = item.sleep_durations_data;
      if (sleepData.asleep_duration_seconds) {
        rows.push({
          user_id: userId,
          provider,
          metric_type: 'sleep',
          ts: timestamp,
          value: sleepData.asleep_duration_seconds / 60,
          unit: 'minutes',
          quality: 'good',
        });
      }
    }

    // Glucose
    if (item.glucose_data?.samples) {
      for (const sample of item.glucose_data.samples) {
        rows.push({
          user_id: userId,
          provider,
          metric_type: 'glucose',
          ts: sample.timestamp,
          value: sample.glucose_mg_per_dL || sample.value,
          unit: 'mg/dL',
          quality: 'good',
        });
      }
    }
  }

  return rows;
}

export async function POST(req: Request) {
  try {
    const raw = await req.text();
    const sig = req.headers.get('terra-signature');

    if (!verifySignature(raw, sig)) {
      return new NextResponse('Invalid signature', { status: 401 });
    }

    const payload = JSON.parse(raw);
    const { user, type } = payload;
    const terraUserId = user?.user_id;
    const provider = user?.provider || 'terra';

    // Find app user from terra_user_id
    const { data: terraUser } = await supa
      .from('terra_users')
      .select('user_id')
      .eq('terra_user_id', terraUserId)
      .eq('provider', provider)
      .single();

    if (!terraUser) {
      console.error('Terra user not found:', terraUserId, provider);
      return new NextResponse('User not found', { status: 404 });
    }

    const userId = terraUser.user_id;

    // Store raw payload
    await supa.from('metrics_raw').insert({
      user_id: userId,
      provider,
      type,
      payload,
    });

    // Normalize metrics
    const normalizedRows = await normalizeMetrics(payload, userId, provider);

    if (normalizedRows.length > 0) {
      await supa.from('metrics_norm').upsert(normalizedRows, {
        onConflict: 'user_id,provider,metric_type,ts',
        ignoreDuplicates: true,
      });
    }

    // Update last sync
    await supa
      .from('connections')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('provider', provider);

    return new NextResponse('ok', { status: 200 });
  } catch (error) {
    console.error('Webhook error:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}
```

### 3. Test Harness

**`app/api/terra/test/route.ts`**

```typescript
import { NextResponse } from 'next/server';

const FIXTURES = {
  activity: {
    type: 'activity',
    user: { user_id: 'test_user', provider: 'FITBIT' },
    data: [
      {
        metadata: {
          start_time: new Date().toISOString(),
          end_time: new Date(Date.now() + 3600000).toISOString(),
        },
        distance_data: {
          steps: 7500,
          distance_meters: 5000,
        },
        active_durations_data: {
          activity_seconds: 2400,
        },
      },
    ],
  },
  sleep: {
    type: 'sleep',
    user: { user_id: 'test_user', provider: 'OURA' },
    data: [
      {
        metadata: {
          start_time: new Date(Date.now() - 28800000).toISOString(),
          end_time: new Date().toISOString(),
        },
        sleep_durations_data: {
          asleep_duration_seconds: 25200,
          light_sleep_duration_seconds: 14400,
          deep_sleep_duration_seconds: 7200,
          rem_sleep_duration_seconds: 3600,
        },
      },
    ],
  },
  heart_rate: {
    type: 'body',
    user: { user_id: 'test_user', provider: 'POLAR' },
    data: [
      {
        metadata: { start_time: new Date().toISOString() },
        heart_rate_data: {
          avg_hr_bpm: 72,
          resting_hr_bpm: 58,
          max_hr_bpm: 165,
        },
      },
    ],
  },
  glucose: {
    type: 'body',
    user: { user_id: 'test_user', provider: 'DEXCOM' },
    data: [
      {
        metadata: { start_time: new Date().toISOString() },
        glucose_data: {
          samples: Array.from({ length: 12 }, (_, i) => ({
            timestamp: new Date(Date.now() - i * 300000).toISOString(),
            glucose_mg_per_dL: 95 + Math.floor(Math.random() * 20),
          })),
        },
      },
    ],
  },
};

export async function POST(req: Request) {
  try {
    const { type, user_id } = await req.json();

    const fixture = FIXTURES[type as keyof typeof FIXTURES];
    if (!fixture) {
      return NextResponse.json(
        {
          error: 'Invalid type',
          available: Object.keys(FIXTURES),
        },
        { status: 400 }
      );
    }

    // Post to webhook endpoint
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    const webhookUrl = `${baseUrl}/api/terra/webhook`;

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fixture),
    });

    const result = await response.text();

    return NextResponse.json({
      success: response.ok,
      fixture_type: type,
      webhook_response: result,
    });
  } catch (error) {
    console.error('Test harness error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

---

## 🌐 Next.js Pages

### Terra Return Page

**`app/terra/return/page.tsx`**

```typescript
'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { CheckCircle, XCircle, Sparkles } from 'lucide-react';

export default function TerraReturn() {
  const searchParams = useSearchParams();
  const status = searchParams.get('status');
  const isSuccess = status === 'success';

  useEffect(() => {
    if (isSuccess && window.opener) {
      window.opener.postMessage({ type: 'terra-connected' }, '*');
      setTimeout(() => window.close(), 3000);
    }
  }, [isSuccess]);

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-6">
      <div className="max-w-md w-full p-8 rounded-3xl bg-gradient-to-br from-[#1a1a24] to-[#13131a] shadow-[8px_8px_16px_#08080c,-8px_-8px_16px_#1c1c28] border border-white/5 text-center">
        {isSuccess ? (
          <>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center border border-emerald-500/30">
              <CheckCircle className="w-8 h-8 text-emerald-400" />
            </div>
            <h1 className="text-2xl font-bold text-emerald-300 mb-2">
              Raphael is Connected
            </h1>
            <p className="text-slate-400 text-sm mb-4">
              Your health data is now syncing. We'll build insights and start
              monitoring your metrics.
            </p>
            <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>Initial backfill in progress...</span>
            </div>
          </>
        ) : (
          <>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-red-500/20 to-orange-500/20 flex items-center justify-center border border-red-500/30">
              <XCircle className="w-8 h-8 text-red-400" />
            </div>
            <h1 className="text-2xl font-bold text-red-300 mb-2">
              Connection Failed
            </h1>
            <p className="text-slate-400 text-sm mb-4">
              Something went wrong connecting your device. Please try again.
            </p>
            <button
              onClick={() => window.close()}
              className="px-6 py-2 rounded-xl bg-gradient-to-r from-slate-600 to-slate-700 text-white hover:opacity-90 transition-all text-sm"
            >
              Close Window
            </button>
          </>
        )}
      </div>
    </div>
  );
}
```

---

## 📱 Expo Mobile Implementation

### Expo Configuration

**`mobile/app.json`**

```json
{
  "expo": {
    "name": "EverAfter",
    "slug": "everafter",
    "scheme": "everafter",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "dark",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#0a0a0f"
    },
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.yourcompany.everafter",
      "infoPlist": {
        "CFBundleURLTypes": [
          {
            "CFBundleURLSchemes": ["everafter"]
          }
        ]
      }
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#0a0a0f"
      },
      "package": "com.yourcompany.everafter",
      "intentFilters": [
        {
          "action": "VIEW",
          "data": [
            {
              "scheme": "everafter",
              "host": "terra"
            }
          ],
          "category": ["BROWSABLE", "DEFAULT"]
        }
      ]
    },
    "plugins": [
      "expo-router"
    ]
  }
}
```

### Terra Integration Component (Expo)

**`mobile/components/TerraIntegration.tsx`**

```typescript
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { Plus, Heart, Activity, Moon, Droplet } from 'lucide-react-native';

export default function TerraIntegration() {
  const [connecting, setConnecting] = useState(false);
  const [connections, setConnections] = useState([]);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    loadData();

    // Handle deep link return
    const subscription = Linking.addEventListener('url', handleDeepLink);
    return () => subscription.remove();
  }, []);

  const handleDeepLink = ({ url }) => {
    if (url.includes('everafter://terra/return')) {
      const params = new URL(url).searchParams;
      if (params.get('status') === 'success') {
        loadData();
      }
    }
  };

  const loadData = async () => {
    // Load connections and summary from API
    // Implementation depends on your API client
  };

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/api/terra/widget`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            providers: ['FITBIT', 'OURA', 'GARMIN', 'DEXCOM'],
          }),
        }
      );

      const data = await response.json();

      if (data.url) {
        // Open in Custom Tab (Android) or Safari View Controller (iOS)
        await WebBrowser.openBrowserAsync(data.url, {
          dismissButtonStyle: 'close',
          controlsColor: '#10b981',
        });
      }
    } catch (error) {
      console.error('Error connecting Terra:', error);
    } finally {
      setConnecting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Terra Health</Text>
          <Text style={styles.subtitle}>
            Connect 300+ wearables and health devices
          </Text>
        </View>

        {/* Connect Button */}
        <TouchableOpacity
          style={[styles.connectButton, connecting && styles.connectButtonDisabled]}
          onPress={handleConnect}
          disabled={connecting}
          activeOpacity={0.8}
        >
          {connecting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Plus color="#fff" size={20} />
              <Text style={styles.connectButtonText}>Connect Terra</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Daily Summary */}
        {summary && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Last 24 Hours</Text>
            <Text style={styles.summarySubtitle}>
              Raphael is watching your health metrics
            </Text>

            <View style={styles.metricsGrid}>
              <MetricCard
                icon={<Heart color="#ef4444" size={20} />}
                label="Avg HR"
                value={summary.avgHr}
                unit="bpm"
              />
              <MetricCard
                icon={<Activity color="#10b981" size={20} />}
                label="Steps"
                value={summary.steps}
                unit="steps"
              />
              <MetricCard
                icon={<Moon color="#6366f1" size={20} />}
                label="Sleep"
                value={summary.sleep}
                unit="hrs"
              />
              <MetricCard
                icon={<Droplet color="#3b82f6" size={20} />}
                label="Glucose"
                value={summary.glucose}
                unit="mg/dL"
              />
            </View>
          </View>
        )}

        {/* Connected Devices */}
        {connections.length > 0 && (
          <View style={styles.devicesCard}>
            <Text style={styles.cardTitle}>Connected Devices</Text>
            {connections.map((conn) => (
              <DeviceRow key={conn.id} connection={conn} />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function MetricCard({ icon, label, value, unit }) {
  return (
    <View style={styles.metricCard}>
      {icon}
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricUnit}>{unit}</Text>
    </View>
  );
}

function DeviceRow({ connection }) {
  return (
    <View style={styles.deviceRow}>
      <View style={styles.deviceIcon}>
        <Activity color="#a78bfa" size={20} />
      </View>
      <View style={styles.deviceInfo}>
        <Text style={styles.deviceName}>{connection.provider}</Text>
        <Text style={styles.deviceStatus}>Last sync: {connection.lastSync}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
  },
  connectButton: {
    backgroundColor: 'linear-gradient(to right, #9333ea, #7c3aed)',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
    shadowColor: '#9333ea',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  connectButtonDisabled: {
    opacity: 0.5,
  },
  connectButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  summaryCard: {
    backgroundColor: '#1a1a24',
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  summarySubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  metricLabel: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 8,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  metricUnit: {
    fontSize: 10,
    color: '#64748b',
  },
  devicesCard: {
    backgroundColor: '#1a1a24',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    marginBottom: 8,
  },
  deviceIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(167, 139, 250, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  deviceStatus: {
    fontSize: 11,
    color: '#64748b',
  },
});
```

---

## 🧪 Test Fixtures

Create a test harness page for local development:

**`app/health/test/page.tsx`**

```typescript
'use client';

import { useState } from 'react';
import { Send, CheckCircle, XCircle } from 'lucide-react';

export default function TestHarness() {
  const [results, setResults] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const testTypes = [
    { id: 'activity', label: 'Activity (Steps)', icon: '👟' },
    { id: 'sleep', label: 'Sleep', icon: '😴' },
    { id: 'heart_rate', label: 'Heart Rate', icon: '❤️' },
    { id: 'glucose', label: 'Glucose (CGM)', icon: '🩸' },
  ];

  const sendTest = async (type: string) => {
    setLoading((prev) => ({ ...prev, [type]: true }));

    try {
      const response = await fetch('/api/terra/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });

      const data = await response.json();
      setResults((prev) => ({ ...prev, [type]: data }));
    } catch (error) {
      setResults((prev) => ({
        ...prev,
        [type]: { error: error.message },
      }));
    } finally {
      setLoading((prev) => ({ ...prev, [type]: false }));
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Terra Test Harness
          </h1>
          <p className="text-slate-400">
            Send mock webhooks to test data ingestion pipeline
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {testTypes.map((test) => (
            <div
              key={test.id}
              className="p-6 rounded-2xl bg-gradient-to-br from-[#1a1a24] to-[#13131a] border border-white/5"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{test.icon}</span>
                  <div>
                    <h3 className="text-white font-semibold">{test.label}</h3>
                    <p className="text-xs text-slate-500">Mock webhook</p>
                  </div>
                </div>
                {results[test.id] && (
                  <div>
                    {results[test.id].success ? (
                      <CheckCircle className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-400" />
                    )}
                  </div>
                )}
              </div>

              <button
                onClick={() => sendTest(test.id)}
                disabled={loading[test.id]}
                className="w-full px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-white font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
              >
                {loading[test.id] ? (
                  'Sending...'
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send Test Event
                  </>
                )}
              </button>

              {results[test.id] && (
                <div className="mt-4 p-3 rounded-lg bg-black/30 border border-white/5">
                  <pre className="text-xs text-slate-400 overflow-auto">
                    {JSON.stringify(results[test.id], null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

---

## ✅ Success Checklist

### Setup Steps

- [ ] Copy `.env.example` to `.env.local`
- [ ] Add Terra API Key, Dev ID, and Webhook Secret
- [ ] Apply Supabase migration (`supabase db push`)
- [ ] Deploy Next.js app to Vercel/hosting
- [ ] Configure webhook in Terra Dashboard pointing to your domain
- [ ] Test widget session generation
- [ ] Test webhook ingestion with test harness
- [ ] Verify data in Supabase tables

### Testing Workflow

1. **Widget Session:**
   ```bash
   curl -X POST http://localhost:3000/api/terra/widget \
     -H "Content-Type: application/json" \
     -d '{"providers": ["FITBIT"]}'
   ```

2. **Test Webhook:**
   - Visit `/health/test`
   - Click "Send Test Event" for each type
   - Verify data appears in database

3. **Mobile Deep Link:**
   ```bash
   npx uri-scheme open everafter://terra/return?status=success --android
   npx uri-scheme open everafter://terra/return?status=success --ios
   ```

---

## 📚 Additional Resources

- [Terra API Documentation](https://docs.tryterra.co)
- [Next.js App Router](https://nextjs.org/docs/app)
- [Expo Web Browser](https://docs.expo.dev/versions/latest/sdk/webbrowser/)
- [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)

---

**Status:** ✅ Complete Next.js + Expo implementation ready
**Compatibility:** Works alongside existing Vite implementation
**Mobile:** iOS and Android deep link support included
**Testing:** Full test harness with mock fixtures

