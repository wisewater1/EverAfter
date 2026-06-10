# St. Raphael Production AI - Setup Guide

A production-capable health assistant that connects to real data sources, analyzes health metrics, schedules autonomous runs, and writes consented memories to the Vault with full audit trails.

## Features

- **Real Data Integration**: Terra API + Apple Health/Health Connect bridges
- **Autonomous Scheduling**: Daily runs at 09:00 via BullMQ
- **Consent Management**: Explicit user consent for data usage
- **Audit Trail**: SHA-256 hashed logs for compliance
- **Mock Mode**: Demo with synthetic data when `MOCK_PROVIDERS=1`
- **Mobile-First UI**: Dark glass neumorphic design with safe areas
- **Medical Disclaimer**: Compliant with non-diagnostic guidelines

## Architecture

```
┌─────────────────┐
│  React Frontend │  (Vite + TypeScript)
│  RaphaelDashboard
└────────┬────────┘
         │
┌────────▼────────┐
│  Express API    │  (Node.js + Prisma)
│  /me/raphael/*  │
└────────┬────────┘
         │
┌────────▼────────┐
│  Raphael Agent  │  (OpenAI GPT-4)
│  Runner + Tools │
└────────┬────────┘
         │
┌────────▼────────┐
│  BullMQ Worker  │  (Redis)
│  Scheduler      │
└────────┬────────┘
         │
┌────────▼────────┐
│  PostgreSQL     │  (Prisma ORM)
│  + Audit Logs   │
└─────────────────┘
```

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Required variables:
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis for BullMQ
- `OPENAI_API_KEY`: For GPT-4 insights
- `TERRA_API_KEY` + `TERRA_DEV_ID`: Terra integration
- `BASE_URL`: Public HTTPS domain (required for OAuth)
- `BRIDGE_SHARED_SECRET`: For mobile bridge auth
- `SESSION_SECRET`: Session encryption
- `MOCK_PROVIDERS=1`: Enable demo mode (optional)

### 3. Run Migrations

```bash
npm run migrate
npm run db:seed
```

This creates:
- Demo user (`demo@everafter.com`)
- Consent records for training
- Sample metrics (if `MOCK_PROVIDERS=1`)

### 4. Start Services

In separate terminals:

```bash
# Terminal 1: Frontend
npm run dev

# Terminal 2: API Server
npm run dev:server

# Terminal 3: Worker (optional, for scheduled runs)
npm run dev:worker
```

### 5. Access Dashboard

Open `http://localhost:5173/raphael-production`

## OAuth Setup

**CRITICAL**: Terra OAuth requires a **public HTTPS URL**.

### Option 1: Deploy to Production (Recommended)

1. Deploy to a platform with HTTPS (Vercel, Railway, Fly.io)
2. Set `BASE_URL=https://your-domain.com`
3. Configure Terra redirect: `https://your-domain.com/oauth/terra/callback`

### Option 2: Local Development with ngrok

```bash
ngrok http 3001

# Set BASE_URL to ngrok URL in .env
BASE_URL=https://abc123.ngrok.io
```

### Option 3: Mock Mode (Demo Only)

```bash
MOCK_PROVIDERS=1
```

Simulates all connections and generates synthetic data.

## API Endpoints

### Connections

```
POST /api/me/connect/terra
  → Create Terra widget session

GET  /api/oauth/terra/callback
  → Handle OAuth callback

POST /api/bridge/apple-health
  → Ingest Apple Health data (signed)

POST /api/bridge/health-connect
  → Ingest Android Health Connect data (signed)

POST /api/webhooks/terra
  → Handle Terra webhooks
```

### Raphael

```
GET  /api/me/raphael/summary
  → Today's vitals + latest insights

POST /api/me/raphael/run
  → Trigger manual run (rate limited: 5min)

POST /api/me/raphael/log
  → Log insight to Vault (requires consent)

GET  /api/me/metrics?types=&since=
  → Fetch normalized metrics

GET  /api/me/engrams?kind=
  → Fetch vault entries
```

## Mobile Bridge Setup

### iOS (Apple Health)

1. Export your shared secret:
```swift
let secret = "BRIDGE_SHARED_SECRET"
```

2. Sign payloads:
```swift
let payload = ["userId": userId, "timestamp": timestamp, "metrics": metrics]
let signature = payload.hmacSHA256(secret: secret)
```

3. POST to `/api/bridge/apple-health`

### Android (Health Connect)

Similar flow using HMAC-SHA256 signature.

## Consent & Privacy

### Grant Consent

```typescript
await fetch('/api/me/consent', {
  method: 'POST',
  body: JSON.stringify({
    purpose: 'train', // or 'project'
    interactionCap: 1000, // optional limit
  }),
});
```

### Check Consent

All vault writes are blocked without active consent for `train` or `project` purposes.

### Audit Trail

Every action logs to `audit_logs` with:
- User ID
- Action type
- Consent ID (if applicable)
- SHA-256 hash of metadata
- Timestamp

## Scheduling

Default: **Daily at 09:00 AM** (UTC)

Configure in `agents/raphael/manifest.json`:

```json
"scheduleDefault": "0 9 * * *"
```

Manual runs triggered via `/api/me/raphael/run` are rate-limited to one every 5 minutes.

## Database Schema

Key tables:
- `users`: User accounts
- `sources`: Connected providers (Terra, Apple, etc.)
- `devices`: Physical devices (Fitbit, Oura, etc.)
- `metrics`: Time-series health data
- `consents`: User permissions for data usage
- `engram_entries`: Vault memories from Raphael
- `audit_logs`: Compliance trail
- `agent_runs`: Execution history

View schema: `npm run db:studio`

## Testing

### Unit Tests

```bash
npm test
```

### E2E Tests

```bash
npm run test:e2e
```

### Acceptance Criteria

1. ✅ Seed user → Dashboard shows vitals
2. ✅ "Log to Vault" button creates `engram_entries`
3. ✅ Consent check blocks vault writes without permission
4. ✅ Terra OAuth redirects correctly on public domain
5. ✅ Scheduled run creates new insights at 09:00
6. ✅ Audit log created for every vault write

## Production Checklist

- [ ] PostgreSQL configured with connection pooling
- [ ] Redis configured for persistence
- [ ] `BASE_URL` set to public HTTPS domain
- [ ] Terra webhook secret configured
- [ ] OpenAI API key with billing enabled
- [ ] Session secret rotated
- [ ] Bridge shared secret rotated
- [ ] Rate limiting enabled
- [ ] SSL certificates valid
- [ ] Monitoring & alerts configured
- [ ] Database backups scheduled

## Security Notes

1. **No API keys in frontend**: All sensitive calls go through backend
2. **HMAC signatures**: Mobile bridges use signed payloads
3. **Consent-first**: No data writes without explicit consent
4. **Audit everything**: Every action logged with SHA-256
5. **PII minimization**: Store only necessary health data
6. **Medical disclaimer**: Displayed prominently in UI

## Troubleshooting

### "OAuth not supported in WebContainer"

Deploy to a public domain or use Mock Mode.

### "Invalid signature" on bridges

Verify `BRIDGE_SHARED_SECRET` matches on mobile app and server.

### "Rate limited" on manual runs

Wait 5 minutes between runs.

### "Consent required" on vault log

Grant consent via settings or API.

## Architecture Decisions

### Why Prisma?

Type-safe ORM with migrations, perfect for health data schemas.

### Why BullMQ?

Production-ready job queues with Redis, supports cron and retries.

### Why Express?

Battle-tested Node.js server with middleware ecosystem.

### Why Not Supabase Edge Functions?

This system needs long-running workers, scheduled jobs, and stateful connections—better suited for a traditional Node.js server.

## License

MIT

## Support

For issues or questions, see `TROUBLESHOOTING.md` or open a GitHub issue.
