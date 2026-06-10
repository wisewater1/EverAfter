# Raphael Health Connect API - Architecture

## System Overview

The Raphael Health Connect API is a unified backend service that provides OAuth authentication, webhook processing, and normalized data access for 14+ health service providers. Built on Node.js/TypeScript with Express, it integrates seamlessly with your existing Supabase infrastructure while running as an independent service that can scale horizontally.

---

## Core Components

### 1. Provider System

**Purpose:** Modular provider drivers implementing a unified interface

**Structure:**
```
src/providers/
├── index.ts              # Provider registry and factory
├── terra.ts              # ✅ Terra aggregator (300+ devices)
├── oura.ts               # ✅ Oura Ring
├── fitbit.ts             # ✅ Fitbit
├── dexcom.ts             # ✅ Dexcom CGM
├── strava.ts             # ✅ Strava
└── scaffold-providers.ts # 🚧 Pending implementations
```

**Provider Driver Interface:**
```typescript
interface ProviderDriver {
  authorizeUrl(params): string
  exchangeCodeForTokens(code, redirectUri): Promise<OAuthTokens>
  refreshTokens(refreshToken): Promise<OAuthTokens>
  fetchProfile(accessToken): Promise<ProviderProfile>
  fetchLatestMetrics(params): Promise<NormalizedMetric[]>
  verifyWebhook?(payload, signature): boolean
}
```

### 2. OAuth Flow Handler

**Purpose:** Secure authorization code flow with PKCE support

**Flow:**
1. User initiates connection → `POST /api/connections/me/connect/:provider`
2. API generates state parameter and returns OAuth URL
3. User redirects to provider's authorization page
4. Provider redirects back → `GET /oauth/:provider/callback?code=...&state=...`
5. API verifies state, exchanges code for tokens
6. Tokens encrypted with AES-256 and stored in `provider_accounts`
7. Initial sync job enqueued

**Security:**
- State parameter stored with 10-minute expiration
- CSRF protection via state verification
- Token encryption at rest
- Automatic token refresh before expiration

### 3. Job Queue System

**Purpose:** Asynchronous processing with reliability and retry logic

**Queues:**
- **health-sync** - Data fetching from providers
- **token-refresh** - Automatic token renewal
- **webhook-processing** - Async webhook handling

**Tech Stack:**
- BullMQ for job management
- Redis for queue storage
- Exponential backoff retry strategy
- Job deduplication by key

**Workers:**
```typescript
// Sync Worker: Fetches data from providers
createSyncWorker(processSyncJob)
  - Concurrency: 5
  - Retries: 3
  - Backoff: 5s exponential

// Token Refresh Worker: Renews expiring tokens
createTokenRefreshWorker(processTokenRefresh)
  - Concurrency: 10
  - Retries: 5
  - Backoff: 10s exponential
  - Scheduled: Hourly checks

// Webhook Worker: Processes incoming webhooks
createWebhookWorker(processWebhook)
  - Concurrency: 20
  - Retries: 3
  - Backoff: 3s exponential
```

### 4. Data Normalization Layer

**Purpose:** Transform provider-specific formats into unified schema

**Normalized Metrics:**
```typescript
enum MetricType {
  HEART_RATE, STEPS, CALORIES, SLEEP_DURATION,
  SLEEP_STAGE, HRV, OXYGEN_SAT, RESPIRATION,
  TEMPERATURE, BODY_WEIGHT, BODY_FAT, GLUCOSE,
  WORKOUT_DISTANCE, WORKOUT_PACE, WORKOUT_POWER,
  READINESS, STRAIN, RECOVERY, BLOOD_PRESSURE, SPO2
}
```

**Transformation Process:**
1. Provider returns raw data in vendor format
2. Provider driver maps to `NormalizedMetric[]`
3. API inserts into `health_metrics` table with:
   - Standardized `metric` enum value
   - Normalized `value` and `unit`
   - Timestamp in UTC
   - Original `raw` JSON for audit

**Example Transformation:**
```typescript
// Terra raw data
{
  "steps_data": { "steps": 12543 },
  "metadata": { "start_time": "2025-10-29T00:00:00Z" }
}

// Normalized metric
{
  metric: MetricType.STEPS,
  value: 12543,
  unit: "steps",
  timestamp: new Date("2025-10-29T00:00:00Z"),
  raw: { /* original data */ }
}
```

### 5. Webhook Processing

**Purpose:** Receive and process real-time data updates from providers

**Flow:**
1. Provider sends POST to `/webhooks/:provider`
2. Middleware verifies HMAC signature
3. Payload logged to `webhook_events` with dedup key
4. Job enqueued for async processing
5. Worker fetches metrics and normalizes
6. Metrics inserted into `health_metrics`

**Deduplication:**
```typescript
dedupKey = `${provider}:${eventId}:${timestamp}`
// Prevents duplicate processing of same webhook
```

**Signature Verification:**
- Terra: HMAC-SHA256
- Fitbit: HMAC-SHA1
- Oura: Vendor-specific
- Strava: Webhook subscription model

### 6. Token Management

**Purpose:** Automatic refresh of OAuth tokens before expiration

**Strategy:**
- Hourly cron checks for tokens expiring within 1 hour
- Refresh job enqueued with provider-specific logic
- Updated tokens re-encrypted and stored
- Failed refreshes mark account as ERROR status

**Token Encryption:**
```typescript
accessToken = AES.encrypt(rawToken, ENCRYPTION_KEY)
// Stored in provider_accounts.access_token
```

### 7. REST API

**Purpose:** Expose health data and connection management to frontends

**Endpoints:**
```
# Connection Management
POST   /api/connections/me/connect/:provider
GET    /api/connections/me/sources
POST   /api/connections/me/disconnect/:provider

# Data Queries
GET    /api/metrics/me/metrics?types=...&since=...
GET    /api/metrics/me/glucose/latest
GET    /api/metrics/me/sleep/latest
GET    /api/metrics/me/workouts
GET    /api/metrics/me/summary/daily

# Admin
GET    /health
GET    /docs (Swagger UI)
```

**Authentication:**
- JWT Bearer token required
- Token verified via `jose` library
- User ID extracted from `sub` claim
- Middleware attaches `userId` to request

---

## Data Flow Diagrams

### OAuth Connection Flow
```
[Frontend]
    │
    │ 1. POST /api/connections/me/connect/oura
    ├──────────────────────────────────────────►
    │                                            [API]
    │                                              │
    │                                              │ 2. Generate state
    │                                              │    Store in DB
    │ 3. Return OAuth URL                          │
    ◄──────────────────────────────────────────────┤
    │
    │ 4. Redirect user to Oura
    ├────────────────────────────────────►
    │                                      [Oura OAuth]
    │                                              │
    │ 5. User authorizes                           │
    │                                              │
    │ 6. Redirect to callback                      │
    ◄──────────────────────────────────────────────┤
    │
    │ 7. GET /oauth/oura/callback?code=...&state=...
    ├──────────────────────────────────────────►
    │                                            [API]
    │                                              │
    │                                              │ 8. Verify state
    │                                              │ 9. Exchange code
    │                                              │ 10. Encrypt tokens
    │                                              │ 11. Store account
    │                                              │ 12. Enqueue sync
    │ 13. Return success                           │
    ◄──────────────────────────────────────────────┤
```

### Webhook Processing Flow
```
[Provider]
    │
    │ 1. POST /webhooks/terra
    ├────────────────────────────────►
    │                                 [API]
    │                                   │
    │                                   │ 2. Verify signature
    │                                   │ 3. Log to webhook_events
    │                                   │ 4. Generate dedup key
    │ 5. Return 200 OK                  │
    ◄─────────────────────────────────┤
    │                                   │
    │                                   │ 6. Enqueue job
    │                                   ├──────────►
    │                                                [Redis Queue]
    │                                                      │
    │                                                      │ 7. Worker picks up
    │                                                      ├──────────►
    │                                                                  [Worker]
    │                                                                     │
    │                                                                     │ 8. Fetch metrics
    │                                                                     │ 9. Normalize
    │                                                                     │ 10. Insert DB
```

---

## Database Schema

### Key Tables

**provider_accounts**
```sql
CREATE TABLE provider_accounts (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  provider TEXT (enum),
  external_user_id TEXT,
  access_token TEXT (encrypted),
  refresh_token TEXT (encrypted),
  expires_at TIMESTAMPTZ,
  status TEXT (ACTIVE|DISCONNECTED|ERROR),
  last_sync_at TIMESTAMPTZ,
  UNIQUE(user_id, provider)
);
```

**health_metrics** (high-volume table)
```sql
CREATE TABLE health_metrics (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  source TEXT,
  metric TEXT (enum),
  value NUMERIC,
  unit TEXT,
  ts TIMESTAMPTZ,
  raw JSONB,
  inserted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ON health_metrics(user_id, ts DESC);
CREATE INDEX ON health_metrics(user_id, metric, ts DESC);
```

**webhook_events**
```sql
CREATE TABLE webhook_events (
  id UUID PRIMARY KEY,
  provider TEXT,
  event_id TEXT,
  payload JSONB,
  dedup_key TEXT UNIQUE,
  processed BOOLEAN DEFAULT FALSE,
  received_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Scalability Considerations

### Horizontal Scaling
- **Stateless API** - No in-memory session state
- **Redis for shared state** - Job queues and caching
- **Database connection pooling** - Prisma connection pool
- **Load balancer ready** - Health check endpoint at `/health`

### Performance Optimizations
- **Batch inserts** - Group metrics by timestamp
- **Indexes on hot paths** - (user_id, ts) and (user_id, metric, ts)
- **BIGSERIAL for metrics** - Handles billions of records
- **Webhook deduplication** - Prevents duplicate processing
- **Worker concurrency** - Configurable per queue type

### Data Retention
- **Metrics** - Keep all historical data (user's health record)
- **Webhooks** - Retain 30 days for debugging
- **OAuth states** - Auto-delete after 10 minutes
- **Audit logs** - Retain 7 years (HIPAA compliance)

---

## Security Model

### Defense in Depth
1. **Network** - HTTPS only, CORS whitelist
2. **Authentication** - JWT bearer tokens
3. **Authorization** - User ID from JWT claim
4. **Encryption** - AES-256 for tokens at rest
5. **Signatures** - HMAC verification for webhooks
6. **Rate Limiting** - 100 req/15min per IP
7. **Audit Logging** - All data access logged

### HIPAA/GDPR Compliance
- Consent tracking before data export
- Audit trail for all operations
- Data deletion workflow
- Encrypted storage
- Access control via RLS policies

---

## Monitoring and Observability

### Metrics to Track
- API request rate and latency
- Job queue depth and processing time
- Token refresh success rate
- Webhook processing latency
- Provider API error rates
- Database query performance

### Logging
- Structured JSON logs via Winston
- Request/response logging
- Error stack traces
- Job processing logs
- Token refresh events

### Health Checks
```bash
GET /health
{
  "status": "healthy",
  "uptime": 3600,
  "timestamp": "2025-10-29T...",
  "version": "1.0.0"
}
```

---

## Future Enhancements

### Phase 2
- Complete scaffold provider implementations (Whoop, Garmin, etc.)
- Mobile bridge SDKs for HealthKit & Health Connect
- GraphQL API option
- Real-time WebSocket subscriptions
- Data export in FHIR format

### Phase 3
- Machine learning insights engine
- Anomaly detection for health metrics
- Predictive alerts
- Multi-tenant support for research projects
- Advanced consent management UI

---

## Integration with EverAfter App

The Health Connect API integrates with your existing Supabase-based frontend:

1. **Authentication** - Reuse Supabase JWT tokens
2. **Database** - Writes to same Supabase Postgres instance
3. **Edge Functions** - Can run alongside existing Terra functions
4. **UI Components** - `ComprehensiveHealthConnectors.tsx` already exists

**Migration Path:**
- Run API in parallel with existing Edge Functions
- Gradually migrate providers from Edge to API
- Decommission Edge Functions once stable
- UI components require minimal changes

---

For implementation details, see README.md and QUICKSTART.md.
