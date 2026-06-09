# St. Raphael Connectivity - Visual Reference Map

**Quick reference guide with ASCII diagrams for all system connections**

---

## Connection Layers Overview

```
╔═══════════════════════════════════════════════════════════════════════╗
║                  ST. RAPHAEL HEALTH MONITOR ARCHITECTURE              ║
╠═══════════════════════════════════════════════════════════════════════╣
║                                                                        ║
║  ┌──────────────────────┐              ┌──────────────────────────┐  ║
║  │   USER INTERFACE     │              │    AUTHENTICATION        │  ║
║  │                      │              │                          │  ║
║  │  • RaphaelConnectors │◄────────────►│  • Supabase Auth         │  ║
║  │  • Health Dashboard  │              │  • Row Level Security    │  ║
║  │  • Insights Panel    │              │  • JWT Tokens            │  ║
║  └──────────┬───────────┘              └────────────┬─────────────┘  ║
║             │                                       │                 ║
║             └───────────────┬───────────────────────┘                 ║
║                             │                                         ║
║  ┌──────────────────────────▼────────────────────────────────────┐   ║
║  │              SUPABASE DATABASE LAYER                          │   ║
║  │                                                                │   ║
║  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │   ║
║  │  │ provider_    │  │  health_     │  │  glucose_        │   │   ║
║  │  │ accounts     │  │  metrics     │  │  readings        │   │   ║
║  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────────┘   │   ║
║  │         │                 │                   │                │   ║
║  │  ┌──────▼───────┐  ┌──────▼───────┐  ┌──────▼───────────┐   │   ║
║  │  │ connector_   │  │  webhook_    │  │  connector_      │   │   ║
║  │  │ tokens       │  │  events      │  │  consent_ledger  │   │   ║
║  │  └──────────────┘  └──────────────┘  └──────────────────┘   │   ║
║  └────────────────────────┬──────────────────────────────────────┘   ║
║                           │                                           ║
║  ┌────────────────────────▼──────────────────────────────────────┐   ║
║  │              EDGE FUNCTIONS LAYER (Deno)                      │   ║
║  │                                                                │   ║
║  │  OAuth Flow          Data Sync          Webhook Handlers      │   ║
║  │  • connect-start     • sync-health-now  • cgm-dexcom-webhook  │   ║
║  │  • oauth-callback    • token-refresh    • wearable-fitbit-... │   ║
║  │                                         • aggregator-terra-... │   ║
║  └────────────────────────┬──────────────────────────────────────┘   ║
║                           │                                           ║
║  ┌────────────────────────▼──────────────────────────────────────┐   ║
║  │           HEALTH PROVIDER APIS (External Services)            │   ║
║  │                                                                │   ║
║  │  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐ │   ║
║  │  │ Dexcom │  │ Fitbit │  │  Oura  │  │ Terra  │  │ Manual │ │   ║
║  │  │  CGM   │  │Wearable│  │  Ring  │  │  API   │  │ Upload │ │   ║
║  │  └────────┘  └────────┘  └────────┘  └────────┘  └────────┘ │   ║
║  │                                                                │   ║
║  │  Coming Soon:                                                  │   ║
║  │  WHOOP • Garmin • Withings • Polar • SMART on FHIR           │   ║
║  └────────────────────────────────────────────────────────────────┘   ║
║                                                                        ║
╚═══════════════════════════════════════════════════════════════════════╝
```

---

## Data Flow: User Connects Provider

```
┌─────────┐                                                    ┌──────────┐
│  USER   │                                                    │ PROVIDER │
└────┬────┘                                                    └────┬─────┘
     │                                                              │
     │  1. Click "Connect Fitbit"                                  │
     ├──────────►┌────────────────┐                               │
     │           │   Frontend     │                               │
     │           │  RaphaelConns  │                               │
     │           └────────┬───────┘                               │
     │                    │                                        │
     │                    │  2. Generate state token              │
     │                    ├──────►┌──────────────────┐            │
     │                    │       │ Edge Function    │            │
     │                    │       │ connect-start    │            │
     │                    │       └────────┬─────────┘            │
     │                    │                │                       │
     │                    │  3. Build OAuth URL                   │
     │  4. Redirect       │◄───────────────┘                      │
     ├──────────────────────────────────────────────────────────►│
     │           https://fitbit.com/oauth2/authorize              │
     │           ?client_id=...&state=...&redirect_uri=...        │
     │                                                             │
     │  5. User authorizes & grants permissions                   │
     ├────────────────────────────────────────────────────────────┤
     │                                                             │
     │  6. Callback with authorization code                       │
     │◄────────────────────────────────────────────────────────────┤
     │           https://app.com/oauth/callback?code=...&state=...│
     │                                                             │
     ├──────────►┌─────────────────┐                              │
     │           │ Edge Function   │                              │
     │           │ oauth-callback  │                              │
     │           └────────┬────────┘                              │
     │                    │                                        │
     │                    │  7. Validate state token              │
     │                    ├──────►┌──────────────┐                │
     │                    │       │  Database    │                │
     │                    │       └──────────────┘                │
     │                    │                                        │
     │                    │  8. Exchange code for tokens          │
     │                    ├───────────────────────────────────────►│
     │                    │  POST /oauth2/token                    │
     │                    │  code=... &grant_type=authorization... │
     │                    │                                        │
     │                    │◄───────────────────────────────────────┤
     │                    │  { access_token: "...",                │
     │                    │    refresh_token: "...",               │
     │                    │    expires_in: 3600 }                  │
     │                    │                                        │
     │                    │  9. Encrypt & store tokens            │
     │                    ├──────►┌──────────────────┐            │
     │                    │       │ provider_accounts│            │
     │                    │       │  INSERT/UPDATE   │            │
     │                    │       └──────────────────┘            │
     │                    │                                        │
     │                    │  10. Register webhook                 │
     │                    ├───────────────────────────────────────►│
     │                    │  POST /webhooks/subscribe              │
     │                    │                                        │
     │                    │  11. Trigger initial sync             │
     │                    ├──────►┌──────────────────┐            │
     │                    │       │ Edge Function    │────────────►│
     │                    │       │ sync-health-now  │  GET /data │
     │                    │       └────────┬─────────┘            │
     │                    │                │                       │
     │                    │  12. Store health data                │
     │                    │◄───────────────┘                      │
     │                    ├──────►┌──────────────────┐            │
     │                    │       │ health_metrics   │            │
     │                    │       │    INSERT        │            │
     │                    │       └──────────────────┘            │
     │                    │                                        │
     │  13. Redirect to success page                              │
     │◄───────────────────┘                                       │
     │           /dashboard/connections?success=true              │
     │                                                             │
└────┴─────────────────────────────────────────────────────────────────┘
```

---

## Webhook Real-time Data Push

```
┌──────────┐                                           ┌──────────────┐
│ PROVIDER │                                           │  ST. RAPHAEL │
│ (Dexcom) │                                           │   DATABASE   │
└────┬─────┘                                           └──────┬───────┘
     │                                                         │
     │  New glucose reading detected                          │
     │  Value: 120 mg/dL, Trend: →                           │
     │                                                         │
     │  POST /functions/v1/cgm-dexcom-webhook                │
     ├────────►┌──────────────────────────┐                   │
     │         │  Edge Function           │                   │
     │         │  cgm-dexcom-webhook      │                   │
     │         └────────┬─────────────────┘                   │
     │                  │                                      │
     │                  │  1. Verify HMAC signature           │
     │                  │     (webhook security)              │
     │                  │                                      │
     │                  │  2. Parse JSON payload              │
     │                  │  {                                   │
     │                  │    "type": "egv",                    │
     │                  │    "records": [{                     │
     │                  │      "value": 120,                   │
     │                  │      "trend": "→",                   │
     │                  │      "systemTime": "2025-10-27T..."  │
     │                  │    }]                                │
     │                  │  }                                   │
     │                  │                                      │
     │                  │  3. Log webhook event                │
     │                  ├────────────────────────────────────►│
     │                  │  INSERT INTO webhook_events          │
     │                  │                                      │
     │                  │  4. Transform & store data           │
     │                  ├────────────────────────────────────►│
     │                  │  INSERT INTO glucose_readings        │
     │                  │  INSERT INTO health_metrics          │
     │                  │                                      │
     │                  │  5. Trigger Raphael AI analysis      │
     │                  ├────────►┌──────────────┐            │
     │                  │         │  Raphael AI  │            │
     │                  │         │  Processing  │            │
     │                  │         └──────┬───────┘            │
     │                  │                │                     │
     │                  │  6. Check for alerts                │
     │                  │     - Rapid rise/fall?              │
     │                  │     - Out of range?                 │
     │                  │     - Pattern detected?             │
     │                  │                │                     │
     │                  │  7. Update dashboard (realtime)     │
     │                  │◄───────────────┘                    │
     │                  │                                      │
     │  200 OK          │                                      │
     │◄─────────────────┘                                     │
     │                                                         │
```

---

## Database Entity Relationships

```
┌─────────────────────────────────────────────────────────────────┐
│                         auth.users                              │
│                                                                  │
│  id (uuid, PK)                                                  │
│  email                                                          │
│  encrypted_password                                             │
│  created_at                                                     │
└─────────────────┬───────────────────────────────────────────────┘
                  │
                  │ ON DELETE CASCADE
                  │
        ┌─────────┼─────────┬─────────────────┬──────────────────┐
        │         │         │                 │                  │
        ▼         ▼         ▼                 ▼                  ▼
┌────────────┐ ┌──────────┐ ┌─────────────┐ ┌───────────┐ ┌──────────┐
│ provider_  │ │  health_ │ │  glucose_   │ │ webhook_  │ │connector_│
│ accounts   │ │  metrics │ │  readings   │ │ events    │ │ tokens   │
├────────────┤ ├──────────┤ ├─────────────┤ ├───────────┤ ├──────────┤
│ id (PK)    │ │ id (PK)  │ │ id (PK)     │ │ id (PK)   │ │ id (PK)  │
│ user_id(FK)│ │user_id(FK)│ │user_id(FK)  │ │user_id(FK)│ │user_id(FK)│
│ provider   │ │metric_type│ │glucose_value│ │ provider  │ │connector_│
│ access_*   │ │metric_val│ │ trend_arrow │ │event_type │ │   id     │
│ refresh_*  │ │metric_unit│ │recorded_at  │ │  payload  │ │access_*  │
│ webhook_*  │ │ source    │ │   source    │ │ processed │ │refresh_* │
│ status     │ │recorded_at│ │ device_info │ │created_at │ │expires_at│
│last_sync_at│ │metadata   │ │             │ │           │ │          │
└────────────┘ └──────────┘ └─────────────┘ └───────────┘ └──────────┘
      │              │              │
      │              │              │
      └──────────────┴──────────────┴────────────►
                                                   │
                                                   ▼
                                    ┌───────────────────────┐
                                    │   Data Attribution    │
                                    │   & Source Tracking   │
                                    └───────────────────────┘
```

---

## OAuth Token Lifecycle

```
┌─────────────────────────────────────────────────────────────────┐
│                     TOKEN LIFECYCLE                              │
└─────────────────────────────────────────────────────────────────┘

1. INITIAL AUTHORIZATION
   ─────────────────────
   User grants permission
         │
         ▼
   ┌────────────────┐
   │ Authorization  │
   │     Code       │ ← One-time use, expires in 10 minutes
   └────────┬───────┘
            │
            │ Exchange
            ▼
   ┌────────────────┐     ┌─────────────────┐
   │ Access Token   │  +  │ Refresh Token   │
   │ expires: 1hr   │     │ expires: 90 days│
   └────────┬───────┘     └────────┬────────┘
            │                      │
            │ Stored encrypted     │ Stored encrypted
            │ in provider_accounts │ in provider_accounts
            ▼                      ▼
   ┌──────────────────────────────────────┐
   │         Database Storage             │
   │                                      │
   │  access_token_encrypted: "..."       │
   │  refresh_token_encrypted: "..."      │
   │  token_expires_at: "2025-10-27..."  │
   └──────────────────────────────────────┘

2. TOKEN USAGE
   ────────────
   API Call Needed
         │
         ▼
   ┌────────────────┐
   │ Check Expiry   │
   │ expires_at < ? │
   └────────┬───────┘
            │
      ┌─────┴──────┐
      │            │
   YES│          NO│
      │            │
      ▼            ▼
   ┌──────────┐ ┌──────────┐
   │ REFRESH  │ │   USE    │
   │  TOKEN   │ │ EXISTING │
   └────┬─────┘ └──────────┘
        │
        │ POST /oauth/token
        │ grant_type=refresh_token
        ▼
   ┌────────────────┐
   │  New Tokens    │
   │  Received      │
   └────────┬───────┘
            │
            │ Update database
            ▼
   ┌──────────────────┐
   │ Make API Call    │
   │ with valid token │
   └──────────────────┘

3. TOKEN EXPIRATION HANDLING
   ──────────────────────────
   
   Before Each API Call:
   ────────────────────
   IF token_expires_at - NOW() < 5 minutes
     THEN
       ├─ Trigger automatic refresh
       ├─ Update provider_accounts table
       └─ Use new access_token
     ELSE
       └─ Use current access_token

4. REFRESH TOKEN EXPIRY
   ────────────────────
   If refresh_token also expired:
   
   ┌────────────────────┐
   │ Refresh Failed     │
   │ (401 Unauthorized) │
   └────────┬───────────┘
            │
            ▼
   ┌────────────────────┐
   │ Update Status      │
   │ status='error'     │
   └────────┬───────────┘
            │
            ▼
   ┌────────────────────────────┐
   │ Notify User                │
   │ "Please reconnect Fitbit"  │
   │ [Reconnect Button]         │
   └────────────────────────────┘
```

---

## Manual Data Upload Flow

```
┌──────────┐
│   USER   │
└────┬─────┘
     │
     │  1. Upload CSV/JSON file
     ├────────►┌────────────────────┐
     │         │  File Input        │
     │         │  (Frontend)        │
     │         └────────┬───────────┘
     │                  │
     │                  │  2. Read file content
     │                  │
     │  ┌───────────────▼────────────────┐
     │  │  CSV Example:                  │
     │  │  ────────────────────────────  │
     │  │  timestamp,glucose,unit        │
     │  │  2025-10-27T08:00:00Z,110,mg/dL│
     │  │  2025-10-27T08:15:00Z,125,mg/dL│
     │  │  2025-10-27T08:30:00Z,118,mg/dL│
     │  └────────────────────────────────┘
     │                  │
     │                  │  3. POST to Edge Function
     │                  ├────────►┌──────────────────────┐
     │                  │         │ Edge Function        │
     │                  │         │ cgm-manual-upload    │
     │                  │         └─────────┬────────────┘
     │                  │                   │
     │                  │                   │  4. Parse file
     │                  │                   │     (CSV/JSON)
     │                  │                   │
     │                  │                   │  5. Validate data
     │                  │                   │     - Glucose range OK?
     │                  │                   │     - Timestamps valid?
     │                  │                   │
     │                  │                   │  6. Transform
     │                  │                   │  ┌──────────────────┐
     │                  │                   │  │ glucose_readings │
     │                  │                   │  │                  │
     │                  │                   │  │ user_id: ...     │
     │                  │                   │  │ glucose_value: 110│
     │                  │                   │  │ source: 'manual' │
     │                  │                   │  │ device_info: {   │
     │                  │                   │  │   filename: ...  │
     │                  │                   │  │ }                │
     │                  │                   │  └──────────────────┘
     │                  │                   │
     │                  │                   │  7. Batch insert
     │                  │                   ├────────►┌──────────┐
     │                  │                   │         │ Database │
     │                  │                   │         └──────────┘
     │                  │                   │
     │                  │  8. Return success           
     │                  │◄──────────────────┘
     │                  │  { 
     │                  │    success: true,
     │                  │    readings_inserted: 3 
     │                  │  }
     │                  │
     │  9. Show success message
     │◄─────────────────┘
     │  "✓ Uploaded 3 glucose readings from data.csv"
     │
```

---

## Provider-Specific Data Formats

### Dexcom CGM Webhook Payload
```json
{
  "type": "egv",
  "userId": "user-123",
  "records": [
    {
      "systemTime": "2025-10-27T14:30:00Z",
      "displayTime": "2025-10-27T14:30:00Z",
      "value": 120,
      "unit": "mg/dL",
      "trend": "→",
      "trendRate": 0.5,
      "transmitterId": "ABC123",
      "displayDevice": "G7"
    }
  ]
}
```

### Fitbit Activity Webhook Payload
```json
{
  "collectionType": "activities",
  "date": "2025-10-27",
  "ownerId": "user-456",
  "ownerType": "user",
  "subscriptionId": "1234567890"
}
```
↓ Triggers API call to fetch data ↓
```json
GET /1/user/-/activities/date/2025-10-27.json

Response:
{
  "summary": {
    "steps": 8547,
    "distance": 6.21,
    "caloriesOut": 2245,
    "activeMinutes": 45,
    "restingHeartRate": 62
  },
  "heartRateZones": [...]
}
```

### Oura Ring Daily Readiness
```json
GET /v2/usercollection/daily_readiness

Response:
{
  "data": [{
    "day": "2025-10-27",
    "score": 85,
    "temperature_deviation": 0.2,
    "temperature_trend_deviation": 0.1,
    "contributors": {
      "activity_balance": 89,
      "body_temperature": 92,
      "hrv_balance": 85,
      "previous_day_activity": 78,
      "previous_night": 90,
      "recovery_index": 88,
      "resting_heart_rate": 95,
      "sleep_balance": 82
    }
  }]
}
```

---

## Security Layers

```
┌────────────────────────────────────────────────────────────────┐
│                     SECURITY ARCHITECTURE                       │
└────────────────────────────────────────────────────────────────┘

LAYER 1: TRANSPORT SECURITY
────────────────────────────
┌───────────────────────────────────────────────┐
│  TLS 1.3 Encryption (HTTPS)                  │
│  ✓ All API calls encrypted in transit        │
│  ✓ Certificate pinning for provider APIs     │
│  ✓ Perfect forward secrecy enabled           │
└───────────────────────────────────────────────┘

LAYER 2: AUTHENTICATION
───────────────────────
┌───────────────────────────────────────────────┐
│  JWT Token-Based Auth (Supabase)             │
│  ✓ Short-lived access tokens (1 hour)        │
│  ✓ Refresh token rotation                    │
│  ✓ Device fingerprinting                     │
└───────────────────────────────────────────────┘

LAYER 3: AUTHORIZATION
──────────────────────
┌───────────────────────────────────────────────┐
│  Row-Level Security (RLS)                     │
│  ✓ Users see ONLY their own data             │
│  ✓ Policies enforced at database level       │
│  ✓ Automatic CASCADE DELETE on user removal  │
└───────────────────────────────────────────────┘

LAYER 4: DATA ENCRYPTION
────────────────────────
┌───────────────────────────────────────────────┐
│  At-Rest Encryption                           │
│  ✓ OAuth tokens encrypted (AES-256)          │
│  ✓ Database encryption enabled                │
│  ✓ Backup encryption automatic                │
└───────────────────────────────────────────────┘

LAYER 5: WEBHOOK SECURITY
──────────────────────────
┌───────────────────────────────────────────────┐
│  HMAC Signature Verification                  │
│  ✓ Each webhook has unique secret             │
│  ✓ Request body hashed & compared             │
│  ✓ Replay attack prevention (timestamps)      │
└───────────────────────────────────────────────┘

LAYER 6: AUDIT & COMPLIANCE
────────────────────────────
┌───────────────────────────────────────────────┐
│  Comprehensive Logging                        │
│  ✓ webhook_events table (all incoming data)  │
│  ✓ connector_consent_ledger (user actions)   │
│  ✓ Supabase audit logs (schema changes)      │
│  ✓ HIPAA-compliant data handling              │
└───────────────────────────────────────────────┘
```

---

## Frontend Component Integration Map

```
┌──────────────────────────────────────────────────────────────────┐
│                    FRONTEND COMPONENTS                            │
└──────────────────────────────────────────────────────────────────┘

src/pages/Dashboard.tsx
  │
  ├─► "Connections" Tab Selected
  │        │
  │        ▼
  │   RaphaelHealthInterface.tsx
  │        │
  │        └─► Renders: RaphaelConnectors.tsx
  │                 │
  │                 ├─► useEffect: Load provider_accounts
  │                 │        │
  │                 │        ▼
  │                 │   supabase
  │                 │     .from('provider_accounts')
  │                 │     .select('*')
  │                 │     .eq('user_id', user.id)
  │                 │
  │                 ├─► Display Provider Cards
  │                 │    ├─ Terra (Aggregator)
  │                 │    ├─ Fitbit (Wearable)
  │                 │    ├─ Oura Ring (Wearable)
  │                 │    ├─ Dexcom CGM
  │                 │    ├─ Abbott Libre
  │                 │    ├─ Manual Upload
  │                 │    └─ Coming Soon badges
  │                 │
  │                 ├─► handleConnect(providerId)
  │                 │    └─► window.location.href = 
  │                 │        `/functions/v1/connect-start?provider=${id}`
  │                 │
  │                 ├─► handleSync(providerId)
  │                 │    └─► POST /functions/v1/sync-health-now
  │                 │        { provider: id, days: 7 }
  │                 │
  │                 ├─► handleDisconnect(providerId)
  │                 │    └─► DELETE from provider_accounts
  │                 │        WHERE provider = id
  │                 │
  │                 └─► Real-time Subscriptions
  │                      └─► supabase.channel('provider_changes')
  │                          .on('postgres_changes', ...)
  │                          .subscribe()
  │
  └─► "Overview" Tab Selected
       │
       ▼
  RaphaelHealthInterface.tsx
       │
       └─► Queries: health_metrics table
            └─► Displays: Charts & graphs from all sources
```

---

## Monitoring & Alerting

```
┌──────────────────────────────────────────────────────────────────┐
│                    HEALTH CHECK DASHBOARD                         │
└──────────────────────────────────────────────────────────────────┘

CONNECTION STATUS
─────────────────
┌────────────────────────────────────────────────────────────┐
│ Provider    │ Status  │ Last Sync      │ Token Status    │
├─────────────┼─────────┼────────────────┼─────────────────┤
│ Dexcom CGM  │ ✓ Active│ 2 min ago      │ ✓ Valid        │
│ Fitbit      │ ✓ Active│ 15 min ago     │ ✓ Valid        │
│ Oura Ring   │ ✗ Error │ 3 hours ago    │ ⚠ Expired      │
│ Terra API   │ ✓ Active│ 5 min ago      │ ✓ Valid        │
└────────────────────────────────────────────────────────────┘

WEBHOOK PROCESSING
──────────────────
┌────────────────────────────────────────────────────────────┐
│ Provider    │ Events (24h)│ Processed  │ Failed        │
├─────────────┼─────────────┼────────────┼───────────────┤
│ Dexcom      │ 288         │ 288 (100%) │ 0             │
│ Fitbit      │ 96          │ 95 (99%)   │ 1 (retrying)  │
│ Oura        │ 24          │ 24 (100%)  │ 0             │
└────────────────────────────────────────────────────────────┘

DATA COMPLETENESS
─────────────────
┌────────────────────────────────────────────────────────────┐
│ Metric Type      │ Today's Data│ Expected │ Status       │
├──────────────────┼─────────────┼──────────┼──────────────┤
│ Glucose Readings │ 288         │ 288      │ ✓ Complete   │
│ Heart Rate       │ 1440        │ 1440     │ ✓ Complete   │
│ Steps            │ 1           │ 1        │ ✓ Complete   │
│ Sleep Data       │ 1           │ 1        │ ✓ Complete   │
└────────────────────────────────────────────────────────────┘

ALERTS & NOTIFICATIONS
──────────────────────
┌────────────────────────────────────────────────────────────┐
│ Time     │ Provider│ Alert                                  │
├──────────┼─────────┼────────────────────────────────────────┤
│ 14:25    │ Oura    │ ⚠ Token expired - reconnection needed │
│ 12:10    │ Fitbit  │ ℹ Sync delayed (30 min)               │
│ 08:00    │ Dexcom  │ ✓ Morning sync completed              │
└────────────────────────────────────────────────────────────┘
```

---

**END OF VISUAL REFERENCE**

**For detailed implementation, see:** `ST_RAPHAEL_CONNECTIVITY_ARCHITECTURE.md`
