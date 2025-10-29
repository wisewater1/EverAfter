# Quick Start Guide - Raphael Health Connect API

Get the API running in 5 minutes with this step-by-step guide.

## Prerequisites

Ensure you have:
- Node.js 20+ installed
- Access to a PostgreSQL database (Supabase)
- Redis running locally or accessible URL
- Provider OAuth credentials (at minimum Terra for testing)

## Step 1: Install Dependencies

```bash
cd health-api
npm install
```

## Step 2: Configure Environment

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` with your actual values:

```env
# Required - Database
DATABASE_URL=postgresql://postgres:password@host:5432/postgres

# Required - Redis
REDIS_URL=redis://localhost:6379

# Required - Auth
JWT_SECRET=your-secure-random-string-here

# Required - API URL (use ngrok for local dev)
BASE_URL=http://localhost:4000

# At least one provider (Terra recommended for testing)
TERRA_DEV_ID=your_terra_dev_id
TERRA_API_KEY=your_terra_api_key
TERRA_WEBHOOK_SECRET=your_terra_webhook_secret
```

## Step 3: Set Up Database

Generate Prisma client and push schema:

```bash
npm run prisma:generate
npm run prisma:push
```

Apply additional migrations:

```bash
# Connect to your database and run:
# prisma/migrations/001_health_connect_api_tables.sql
```

## Step 4: Start Redis (if not running)

**Using Docker:**
```bash
docker run -d -p 6379:6379 redis:7-alpine
```

**Or install locally:**
```bash
# macOS
brew install redis
brew services start redis

# Ubuntu
sudo apt install redis-server
sudo systemctl start redis
```

## Step 5: Run the API

**Development mode (with auto-reload):**
```bash
npm run dev
```

**Production mode:**
```bash
npm run build
npm start
```

The API will start on http://localhost:4000

## Step 6: Test the API

### Health Check
```bash
curl http://localhost:4000/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-10-29T...",
  "service": "raphael-health-connect-api"
}
```

### API Info
```bash
curl http://localhost:4000/
```

This shows available providers and endpoints.

## Step 7: Test OAuth Flow (with JWT Token)

You'll need a valid JWT token from your Supabase auth system. For testing, you can generate one:

```typescript
import { SignJWT } from 'jose';

const secret = new TextEncoder().encode('your-jwt-secret');
const token = await new SignJWT({ sub: 'user-id-here' })
  .setProtectedHeader({ alg: 'HS256' })
  .setExpirationTime('24h')
  .sign(secret);

console.log(token);
```

### Connect a Provider
```bash
curl -X POST http://localhost:4000/api/connections/me/connect/terra \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

Response will include the OAuth URL to redirect users to.

## Using Docker Compose (Alternative)

Instead of steps 4-5, you can use Docker Compose:

```bash
# Make sure .env is configured
docker-compose up -d
```

This starts both the API and Redis.

## Next Steps

1. **Add More Providers**: Configure OAuth credentials for Oura, Fitbit, Dexcom, Strava in `.env`
2. **Set Up Webhooks**: Configure webhook URLs in provider dashboards
3. **Enable Swagger**: Set `ENABLE_SWAGGER_UI=true` in `.env` and visit http://localhost:4000/docs
4. **Test Metrics**: Query health data using `/api/metrics/me/metrics` endpoint
5. **Monitor Jobs**: Use Redis CLI to monitor job queues: `redis-cli LLEN bull:health-sync:wait`

## Common Issues

### "Database connection failed"
- Verify `DATABASE_URL` in `.env`
- Check if database is accessible from your machine
- Ensure database exists

### "Redis connection failed"
- Verify `REDIS_URL` in `.env`
- Check if Redis is running: `redis-cli ping` (should return "PONG")

### "Provider not configured"
- Ensure OAuth credentials are in `.env`
- Provider must have both `CLIENT_ID` and `CLIENT_SECRET` configured

### "Token verification failed"
- Verify `JWT_SECRET` matches your auth system
- Check token is not expired
- Ensure Bearer token format: `Authorization: Bearer <token>`

## Development Tips

### Use Mock Mode
Enable mock providers for testing without real credentials:
```env
MOCK_PROVIDERS=true
```

### View Database
```bash
npm run prisma:studio
```

Opens a GUI at http://localhost:5555

### Test Webhooks Locally
Use ngrok to expose local API:
```bash
npx ngrok http 4000
# Use the https URL in provider webhook configs
```

### Monitor Logs
Logs are written to console (development) and `logs/` directory (production).

## Production Deployment

For production deployment, see the main README.md for:
- Environment variable checklist
- Security considerations
- Docker deployment
- Health check monitoring
- Log aggregation setup

---

**Need Help?** Check the full README.md or contact the EverAfter engineering team.
