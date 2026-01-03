# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

EverAfter is a digital legacy and health companion platform featuring:
- **St. Raphael**: ChatGPT-class health AI companion with safety guardrails
- **Custom Engrams**: AI personalities trained from 365-day user responses
- **Health Monitoring**: Multi-provider health data integration (Terra, Fitbit, Dexcom, etc.)
- **Autonomous Task System**: AI-driven health task execution
- **Family & Legacy Features**: Memory preservation and family member AI representations

**Tech Stack**: React 18 + TypeScript + Vite + Tailwind CSS + Supabase (PostgreSQL + Auth + Edge Functions) + Prisma

## Common Commands

### Development
```bash
npm run dev                    # Start Vite dev server (frontend) on http://localhost:5173
npm run dev:server            # Start Express server with hot reload (backend API)
npm run dev:worker            # Start BullMQ scheduler for background tasks
```

### Testing
```bash
npm test                      # Run Vitest unit tests in watch mode
npm test -- src/test/file.ts # Run single test file
npm test -- -t "pattern"     # Run tests matching pattern
npm run test:ui              # Launch Vitest UI for interactive testing
npm run test:coverage        # Generate code coverage report
npm run test:e2e             # Run Playwright end-to-end tests
npm run test:e2e:ui          # Launch Playwright UI mode
```

### Database (Prisma)
```bash
npm run migrate              # Create and apply migration (dev environment)
npm run migrate:deploy       # Apply migrations (production)
npm run db:seed              # Seed database with initial data
npm run db:studio            # Launch Prisma Studio GUI
```

### Code Quality
```bash
npm run lint                 # ESLint check
npm run format               # Format code with Prettier
npm run format:check         # Check formatting without modifying
npm run type-check           # TypeScript type checking without emitting files
```

### Build & Preview
```bash
npm run build                # Production build (outputs to dist/)
npm run preview              # Preview production build locally
```

### Supabase Edge Functions
```bash
supabase functions serve       # Run Edge Functions locally for testing

# Deploy individual functions
supabase functions deploy raphael-chat
supabase functions deploy task-create
supabase functions deploy daily-progress

# Deploy all functions
supabase functions deploy
```

## Architecture Overview

### Dual Backend System

**Primary: Supabase Edge Functions** (Deno/TypeScript)
- 54 serverless functions in `supabase/functions/`
- Authentication, AI chat, health data sync, webhooks, payments
- Deployed to Supabase with automatic scaling
- Accesses PostgreSQL directly via Supabase client

**Secondary: Express/Node Server** (`server/`)
- `server/index.ts` - Express server entry point
- `server/api/raphael.ts` - Raphael-specific API routes
- `server/api/connections/` - Health provider OAuth and webhook handlers
- `server/lib/terra-client.ts` - Terra API client library
- `server/workers/scheduler.ts` - BullMQ worker for background jobs
- Run with `npm run dev:server` and `npm run dev:worker`

**When to Use Each Backend**:
- **Frontend + Edge Functions Only**: Sufficient for St. Raphael chat, custom engrams, tasks, payments
- **Express Server**: Required for Terra integration and health provider webhooks
- **BullMQ Worker**: Required for background health data sync jobs

**Database Layer**:
- **Supabase PostgreSQL**: Main database (108+ migrations)
- **Prisma Client**: Optional ORM for Node server (`prisma/schema.prisma`)
- Health connectors use Prisma models (User, Source, Device, Metric, etc.)

### Key Architectural Patterns

1. **JWT Authentication Flow**
   - Supabase Auth manages all JWT tokens
   - Edge Functions auto-validate via `Authorization: Bearer` header
   - Row Level Security (RLS) enforces data isolation at database level
   - All tables use `(select auth.uid())` in RLS policies for performance

2. **Health Data Integration**
   - OAuth flow: `connect-start` → Provider → `connect-callback` → Store tokens
   - Webhook ingestion: Provider → Signature verification → Normalize → Store in `health_metrics`
   - Manual sync: User trigger → `sync-health-now` → Backfill historical data
   - Terra aggregator provides unified interface for 50+ devices

3. **AI Chat Architecture**
   - User message → `raphael-chat` Edge Function
   - Generate embedding → Search `vector_embeddings` for context
   - Retrieve personality from `archetypal_ais` table
   - Build system prompt + context → OpenAI API → Return response
   - Safety guardrails: Never diagnose/prescribe, emergency escalation patterns

4. **Task Management (engram_ai_tasks)**
   - Single source of truth for all health/personal tasks
   - Status flow: `pending` → `in_progress` → `done`/`failed`
   - Full audit trail in execution logs
   - St. Raphael operates through engrams schema

## Critical Code Locations

### Authentication & Routes
- `src/contexts/AuthContext.tsx` - Global auth state provider
- `src/hooks/useAuth.tsx` - Auth hook with user state
- `src/components/ProtectedRoute.tsx` - Route guard for authenticated pages
- `src/pages/Login.tsx`, `src/pages/Signup.tsx` - Auth UI

### Core UI Components
- `src/components/SaintsDashboard.tsx` - Main Saints AI interface
- `src/components/RaphaelChat.tsx` - St. Raphael chat interface
- `src/components/CustomEngramsDashboard.tsx` - Custom AI personality builder
- `src/components/DailyQuestionCard.tsx` - 365-day personality training UI
- `src/pages/Dashboard.tsx` - Main user dashboard

### Health Integrations
- `src/components/ComprehensiveHealthConnectors.tsx` - OAuth connection manager
- `src/components/TerraIntegration.tsx` - Terra API integration UI
- `src/components/DeviceMonitorDashboard.tsx` - Device health monitoring
- `server/lib/terra-client.ts` - Terra API client
- `server/api/connections/terra.ts` - Terra OAuth and webhook handlers
- `server/workers/scheduler.ts` - Background sync jobs (BullMQ)

### Supabase Edge Functions (Critical)
- `raphael-chat` - AI chat with safety guardrails + OpenAI integration
- `engram-chat` - Custom engram AI chat with personality embeddings
- `task-create` - Task creation with validation
- `manage-agent-tasks` - Autonomous task management system
- `daily-progress` - User engagement tracking
- `get-daily-question` - Daily question retrieval for 365-day training
- `submit-daily-response` - Store daily question responses
- `generate-embeddings` - Generate vector embeddings for personality
- `generate-personality-profile` - Create personality profiles from responses
- `cgm-dexcom-oauth`, `cgm-dexcom-webhook` - Dexcom CGM integration
- `connect-start`, `connect-callback` - OAuth flows for health providers
- `terra-webhook`, `terra-backfill`, `terra-widget` - Terra integration suite
- `health-oauth-initiate`, `health-oauth-callback` - Generic health OAuth flows
- `health-sync-processor` - Process health data syncs
- `device-stream-handler`, `device-webhook-handler` - Device data ingestion
- `glucose-aggregate-cron` - Daily glucose statistics computation
- `stripe-checkout`, `stripe-webhook` - Payment processing
- `safety-monitor` - Monitor St. Raphael safety guardrails
- `knowledge-ingest`, `knowledge-query` - AI knowledge base system

### Database Schema
- `supabase/migrations/` - 108+ migration files (Supabase uses SQL migrations)
- `prisma/schema.prisma` - Prisma schema for Node server (health connectors)
- Key tables: `profiles`, `archetypal_ais`, `daily_question_pool`, `saints_subscriptions`, `agent_task_queue`, `glucose_readings`, `health_metrics`, `provider_accounts`

## Important Conventions

### Security & Compliance
- **Never log PHI/credentials**: Device serials, OAuth tokens, sensitive health data
- **All Edge Functions require JWT**: Check `Authorization` header first
- **RLS on all tables**: Use `(select auth.uid())` for performance
- **Webhook signature verification**: Verify HMAC on all webhook endpoints
- **OpenAI keys in Supabase Secrets**: Never hardcode API keys
- **Idempotent processing**: Prevent duplicate data ingestion with unique constraints

### Code Style
- TypeScript strict mode enabled
- Tailwind CSS for all styling (no CSS modules except custom animations)
- Lucide React for icons
- React Hooks + Context API (no Redux)
- ESLint + Prettier configured

### Error Handling Pattern (Edge Functions)
```typescript
return new Response(
  JSON.stringify({
    code: 'ERROR_CODE',
    message: 'User-friendly message',
    hint: 'Actionable suggestion'
  }),
  { status: 400, headers: { 'Content-Type': 'application/json' } }
)
```

### Component Organization
- Page-level components in `src/pages/`
- Reusable components in `src/components/`
  - Health: `ComprehensiveHealthConnectors.tsx`, `DeviceMonitorDashboard.tsx`, `TerraIntegration.tsx`
  - Dashboard: `SaintsDashboard.tsx`, `CustomEngramsDashboard.tsx`
  - Task management: `EngramTaskManager.tsx`, `AutonomousHealthTaskManager.tsx`
- Raphael-specific components in `src/components/raphael/`
- Shared hooks in `src/hooks/`
- Context providers in `src/contexts/`

### Health Data Normalization
- All glucose readings stored in `mg/dL` (convert `mmol/L × 18.0182`)
- Original unit preserved in `unit` field
- Raw provider payload stored in `raw` jsonb column
- Metrics standardized: `steps`, `resting_hr`, `hrv`, `sleep_efficiency`, `glucose`, `tir`, `vo2_max`, `calories`

## Testing Strategy

### Unit Tests (Vitest)
- Component tests in `tests/` directory
- Use `@testing-library/react` for component testing
- Mock Supabase client in tests
- Run with `npm test` or `npm run test:ui`

### E2E Tests (Playwright)
- Test files in `tests/` with `.spec.ts` extension
- Config in `playwright.config.ts`
- Test critical flows: auth, chat, health connections, task creation
- Run with `npm run test:e2e` or `npm run test:e2e:ui`

### Edge Function Testing
- Use `supabase functions serve` for local testing
- Smoke test scripts in `scripts/` directory
- Test with user JWT: `USER_JWT='token' ./scripts/smoke-test.sh`

## Environment Variables

### Frontend (.env)
```
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbG...
```

### Supabase Functions (Dashboard → Secrets)
```
OPENAI_API_KEY=sk-your-key
APP_BASE_URL=https://your-app.com
TERRA_CLIENT_ID=your_terra_client_id
TERRA_CLIENT_SECRET=your_terra_secret
DEXCOM_CLIENT_ID=your_dexcom_client_id
DEXCOM_CLIENT_SECRET=your_dexcom_secret
FITBIT_CLIENT_ID=your_fitbit_client_id
STRIPE_SECRET_KEY=sk_live_...
```

### Backend Server (.env for dev:server)
```
DATABASE_URL=postgresql://...
REDIS_URL=redis://localhost:6379
TERRA_API_KEY=your_terra_key
```

## Health Connectors Reference

### Supported Providers
- **Aggregators**: Terra (primary), Human API, Validic, Metriport
- **Wearables**: Fitbit, Oura Ring, WHOOP, Garmin, Withings, Polar
- **CGM**: Dexcom G6/G7 (sandbox + production), Abbott Libre (via aggregators)
- **Clinical**: SMART on FHIR (Epic, Oracle Health/Cerner)

### Alert Thresholds (Conservative Clinical Standards)
- **Urgent Low**: <55 mg/dL → Immediate notification
- **Low**: <70 mg/dL sustained 20+ min
- **High**: >180 mg/dL sustained 60+ min
- **Weekly TIR**: <70% over 7 days → Insight

### OAuth Flow Files
- OAuth initiation: `supabase/functions/connect-start/`
- OAuth callback: `supabase/functions/connect-callback/`
- Terra-specific: `server/api/connections/terra.ts`

### Webhook Flow Files
- Terra: `supabase/functions/webhook-terra/`
- Dexcom: `supabase/functions/webhook-dexcom/`
- Fitbit: `supabase/functions/webhook-fitbit/`
- Generic handler: `server/api/connections/webhooks.ts`

## Common Gotchas

1. **Supabase vs Prisma**: Supabase Edge Functions use Supabase client (Deno), Node server uses Prisma. Don't mix them in the same file.

2. **RLS Performance**: Use `(select auth.uid())` instead of `auth.uid()` in WHERE clauses for index usage.

3. **Edge Function Secrets**: Set in Supabase Dashboard → Functions → Secrets, not in `.env` files.

4. **JWT Forwarding**: When calling Supabase from Edge Functions, forward user JWT: `Authorization: Bearer ${jwt}` for RLS enforcement.

5. **Background Jobs**: BullMQ scheduler (`server/workers/scheduler.ts`) must run separately with `npm run dev:worker`.

6. **Glucose Units**: Always convert to mg/dL before storing. Preserve original unit in metadata.

7. **Webhook Idempotency**: Use unique constraints on `(user_id, provider, external_id, ts)` to prevent duplicates.

8. **St. Raphael Safety**: Never allow diagnostic/prescriptive language. Check responses for medical claims before returning.

## Deployment Notes

### Frontend (Vercel/Netlify)
- Build: `npm run build` → `dist/`
- Environment: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

### Edge Functions (Supabase)
- Deploy: `supabase functions deploy [function-name]`
- Auto-scales with traffic
- Set secrets in Supabase Dashboard

### Backend Server (Railway/Render)
- Requires: PostgreSQL, Redis
- Start: `npm run dev:server` (production: use PM2 or Docker)
- Worker: `npm run dev:worker` (separate process)

### Database Migrations
- Dev: `npm run migrate` (creates migration + applies)
- Production: `npm run migrate:deploy` (applies only)

## Additional Documentation

Extensive documentation exists in 150+ markdown files in the root directory. Key references:
- `README.md` - Full project documentation
- `ARCHITECTURE.md` - Detailed system architecture
- `SECURITY.md` - Threat model and mitigations
- `TESTING_GUIDE.md` - Testing strategies
- `HEALTH_MONITOR_COMPLETE_GUIDE.md` - Health integration details
- `ST_RAPHAEL_CONNECTIVITY_ARCHITECTURE.md` - Raphael system design
- `TERRA_INTEGRATION_COMPLETE.md` - Terra API integration guide
