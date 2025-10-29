# Raphael Health Connect API

**Unified API for 14+ Health Service Integrations**

A production-ready Node.js/TypeScript backend that provides OAuth authentication, webhook processing, and normalized data access across all major health platforms and wearables.

---

## 🎯 Features

### ✅ Fully Implemented Providers (OAuth + Webhooks + Sync)
- **Terra** - Aggregator for 300+ wearables with real-time webhooks
- **Oura Ring** - Sleep, readiness, HRV, and activity tracking
- **Fitbit** - Steps, heart rate, sleep, and weight
- **Dexcom CGM** - Continuous glucose monitoring
- **Strava** - Workout and activity data

### 🚧 Scaffolded Providers (Structure Ready, Implementation Pending)
- Whoop, Garmin, Withings, Polar, Google Fit, Abbott LibreView
- Validic, Human API, Metriport, ROOK, Spike (aggregators)
- Apple HealthKit & Samsung Health Connect (mobile bridges)

### 🔧 Core Capabilities
- **OAuth 2.0 Flow** - Full authorization code + PKCE support
- **Token Management** - Automatic refresh with encryption
- **Webhook Processing** - Async job queue with BullMQ & Redis
- **Data Normalization** - Unified schema across all providers
- **HIPAA/GDPR Compliance** - Consent tracking & audit logs
- **Mock Mode** - Development without real provider credentials
- **OpenAPI Docs** - Interactive Swagger UI

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL (Supabase)
- Redis (for job queue)

### Installation

```bash
cd health-api
npm install
```

### Configuration

1. Copy environment template:
```bash
cp .env.example .env
```

2. Configure your `.env` file with:
   - Database connection (Supabase)
   - Redis URL
   - Provider OAuth credentials (see Provider Setup below)

### Database Setup

```bash
# Generate Prisma client
npm run prisma:generate

# Push schema to database
npm run prisma:push

# Or view schema in Prisma Studio
npm run prisma:studio
```

### Running the API

**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm run build
npm start
```

The API will start on `http://localhost:4000`

---

## 📚 API Endpoints

### Health Check
```bash
GET /health
```

### Connection Management

**List Connected Providers**
```bash
GET /api/connections/me/sources
Authorization: Bearer <jwt_token>
```

**Initiate OAuth Flow**
```bash
POST /api/connections/me/connect/:provider
Authorization: Bearer <jwt_token>

# Returns: { authUrl: "https://..." }
```

**OAuth Callback** (handled automatically)
```bash
GET /oauth/:provider/callback?code=...&state=...
```

**Disconnect Provider**
```bash
POST /api/connections/me/disconnect/:provider
Authorization: Bearer <jwt_token>
```

### Health Data

**Query Metrics**
```bash
GET /api/metrics/me/metrics?types=HEART_RATE,STEPS&since=2025-01-01
Authorization: Bearer <jwt_token>
```

**Get Latest Glucose Data (CGM)**
```bash
GET /api/metrics/me/glucose/latest?hours=24
Authorization: Bearer <jwt_token>
```

**Get Recent Sleep Data**
```bash
GET /api/metrics/me/sleep/latest?days=7
Authorization: Bearer <jwt_token>
```

**Get Workout History**
```bash
GET /api/metrics/me/workouts?since=2025-01-01
Authorization: Bearer <jwt_token>
```

**Get Daily Summary**
```bash
GET /api/metrics/me/summary/daily?date=2025-01-15
Authorization: Bearer <jwt_token>
```

---

## 🔐 Provider Setup

### Terra (Aggregator)
1. Sign up at [Terra API](https://tryterra.co)
2. Get Dev ID and API Key from dashboard
3. Configure webhook URL: `https://your-domain.com/webhooks/terra`
4. Add to `.env`:
```env
TERRA_DEV_ID=your_dev_id
TERRA_API_KEY=your_api_key
TERRA_WEBHOOK_SECRET=your_webhook_secret
```

### Oura Ring
1. Apply for API access at [Oura Cloud](https://cloud.ouraring.com)
2. Create OAuth application
3. Set redirect URI: `https://your-domain.com/oauth/oura/callback`
4. Add to `.env`:
```env
OURA_CLIENT_ID=your_client_id
OURA_CLIENT_SECRET=your_client_secret
```

### Fitbit
1. Register app at [Fitbit Dev](https://dev.fitbit.com)
2. Set OAuth redirect: `https://your-domain.com/oauth/fitbit/callback`
3. Enable subscriptions for webhooks
4. Add to `.env`:
```env
FITBIT_CLIENT_ID=your_client_id
FITBIT_CLIENT_SECRET=your_client_secret
FITBIT_SUBSCRIBER_VERIFICATION_CODE=your_subscriber_code
```

### Dexcom
1. Apply for API access at [Dexcom Developer](https://developer.dexcom.com)
2. Configure OAuth redirect: `https://your-domain.com/oauth/dexcom/callback`
3. Add to `.env`:
```env
DEXCOM_CLIENT_ID=your_client_id
DEXCOM_CLIENT_SECRET=your_client_secret
```

### Strava
1. Create app at [Strava Settings](https://www.strava.com/settings/api)
2. Set authorization callback: `https://your-domain.com/oauth/strava/callback`
3. Add to `.env`:
```env
STRAVA_CLIENT_ID=your_client_id
STRAVA_CLIENT_SECRET=your_client_secret
```

---

## 🏗️ Architecture

```
health-api/
├── src/
│   ├── config/
│   │   └── providers.ts          # Provider OAuth configs
│   ├── middleware/
│   │   └── auth.ts                # JWT authentication
│   ├── providers/
│   │   ├── terra.ts               # ✅ Terra integration
│   │   ├── oura.ts                # ✅ Oura integration
│   │   ├── fitbit.ts              # ✅ Fitbit integration
│   │   ├── dexcom.ts              # ✅ Dexcom integration
│   │   ├── strava.ts              # ✅ Strava integration
│   │   ├── scaffold-providers.ts  # 🚧 Pending implementations
│   │   └── index.ts               # Provider registry
│   ├── routes/
│   │   ├── connections.ts         # OAuth & connection management
│   │   └── metrics.ts             # Health data queries
│   ├── services/
│   │   ├── queue.ts               # BullMQ job queues
│   │   ├── sync-service.ts        # Data sync processor
│   │   └── token-refresh-service.ts
│   ├── types/
│   │   └── index.ts               # TypeScript interfaces
│   ├── utils/
│   │   ├── crypto.ts              # Encryption & signing
│   │   ├── db.ts                  # Prisma client
│   │   └── logger.ts              # Winston logger
│   └── index.ts                   # Express app
├── prisma/
│   └── schema.prisma              # Database schema
└── package.json
```

---

## 🔄 Data Flow

### OAuth Connection Flow
1. User requests to connect provider via frontend
2. Frontend calls `POST /api/connections/me/connect/:provider`
3. API returns OAuth authorization URL
4. User redirects to provider's OAuth page
5. Provider redirects back to `/oauth/:provider/callback`
6. API exchanges code for tokens, stores encrypted
7. Triggers initial data backfill job

### Webhook Flow
1. Provider sends webhook to `/webhooks/:provider`
2. API verifies signature and enqueues job
3. Background worker processes webhook asynchronously
4. Normalizes data and inserts into `health_metrics`

### Scheduled Sync Flow
1. Cron job checks for providers without webhooks
2. Enqueues sync jobs for active accounts
3. Worker fetches data since last sync
4. Normalizes and stores metrics

---

## 🧪 Development

### Mock Mode
Enable mock mode for development without real provider credentials:

```env
MOCK_PROVIDERS=true
```

This returns fake OAuth URLs and sample data.

### Testing
```bash
npm test
npm run test:integration
```

### Ngrok for Local Webhooks
```bash
npx ngrok http 4000
# Use https URL as webhook endpoint in provider dashboards
```

---

## 📊 Database Schema

### Key Tables
- **provider_accounts** - OAuth tokens and connection status
- **health_metrics** - Normalized health data (bigint PK for scale)
- **devices** - Individual wearables/trackers
- **webhook_events** - Incoming webhook log with deduplication
- **consents** - HIPAA/GDPR consent tracking
- **audit_logs** - Data access audit trail

### Supported Metric Types
`HEART_RATE`, `STEPS`, `CALORIES`, `SLEEP_DURATION`, `SLEEP_STAGE`, `HRV`, `OXYGEN_SAT`, `RESPIRATION`, `TEMPERATURE`, `BODY_WEIGHT`, `BODY_FAT`, `GLUCOSE`, `WORKOUT_DISTANCE`, `WORKOUT_PACE`, `WORKOUT_POWER`, `READINESS`, `STRAIN`, `RECOVERY`, `BLOOD_PRESSURE`, `SPO2`

---

## 🚢 Deployment

### Docker
```bash
docker build -t health-connect-api .
docker run -p 4000:4000 --env-file .env health-connect-api
```

### Environment Variables Checklist
- ✅ `DATABASE_URL` - Supabase PostgreSQL connection
- ✅ `REDIS_URL` - Redis for job queue
- ✅ `JWT_SECRET` - For authentication
- ✅ `BASE_URL` - Public API URL for OAuth redirects
- ✅ Provider OAuth credentials (see Provider Setup)

### Production Considerations
- Use HTTPS only
- Enable rate limiting
- Set up log aggregation (Winston → CloudWatch/Datadog)
- Configure Redis persistence
- Enable Prisma connection pooling
- Set up health check monitoring
- Rotate JWT secrets regularly

---

## 🔒 Security

- **Token Encryption** - AES-256 encryption for OAuth tokens at rest
- **Webhook Verification** - HMAC signature validation
- **JWT Authentication** - Bearer token required for all API endpoints
- **Rate Limiting** - 100 requests per 15 minutes per IP
- **CORS** - Configurable origin whitelist
- **Helmet** - Security headers enabled
- **Audit Logging** - All data access logged with consent tracking

---

## 📝 License

Proprietary - EverAfter

---

## 🤝 Contributing

### Adding a New Provider

1. Implement `ProviderDriver` interface in `src/providers/your-provider.ts`
2. Add provider to `Provider` enum in Prisma schema
3. Register in `src/providers/index.ts`
4. Add OAuth config to `src/config/providers.ts`
5. Update README with setup instructions
6. Add tests

See existing implementations (Terra, Oura, Fitbit) for reference.

---

## 📞 Support

For questions or issues, contact the EverAfter engineering team.
