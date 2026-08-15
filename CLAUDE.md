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

> Ground truth lives in `CURRENT_STATE.md` (dated, verified against deploy
> configs). Summary below; when they disagree, trust `CURRENT_STATE.md`.

### Production Backends (three, all live)

**1. Supabase Edge Functions** (Deno/TypeScript)
- 55 serverless functions in `supabase/functions/`
- Authentication, AI chat, health data sync, webhooks (incl. Terra), payments
- Deployed to Supabase project `sncvecvgxwkkxnxbvglv`

**2. Python FastAPI backend** (`backend/`)
- Render web service `everafter-api` (`render.yaml`), proxied at
  `/api/v1/*` and `/governance/*` via `netlify.toml`
- Saints runtime, monitoring/audit (St. Michael/Anthony), family/genealogy,
  finance, DHT/causal-twin, personality training APIs
- Consumed by 20+ `src/` files through `src/lib/backend-request.ts`
- A companion Render worker `everafter-elohim-anchor` runs from the same tree

**3. Voice AI sidecar** (`voice-ai-service/`)
- Render web service `everafter-voice-ai` (ElevenLabs)
- Consumed via `src/lib/joseph/voice.ts` (Joseph voice profiles)

### Legacy, NOT deployed

**Express/Node Server** (`server/` + `agents/`) — no deploy config
references it, it does not currently type-check standalone, and Terra
webhooks actually run through the `webhook-terra` Edge Function
(signature-verified), not this stack. `npm run dev:server` /
`npm run dev:worker` start it locally only. Do not build new features on
it; owner decision pending on fix-vs-remove (see `CURRENT_STATE.md`).
The same applies to `health-api/` (separate Node/Prisma service, broken,
undeployed).

**Database Layer**:
- **Supabase PostgreSQL**: Main database (130 migrations; RLS on every table)
- **Prisma schema** (`prisma/schema.prisma`) belongs to the legacy `server/`
  stack — do not mix Prisma and the Supabase client in the same code

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
- `src/components/TerraIntegration.tsx` - **orphaned, not the live Terra UI.**
  Nothing imports or routes it (verified 2026-08-15), so no user reaches it. It
  and `src/lib/terra-client.ts` are kept pending an owner decision. The Terra
  path that actually runs is the `webhook-terra` Edge Function plus the OAuth
  functions below. Do not treat this file as the integration surface.
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
- `safety-monitor` - Data-loss detector: watches health tables for negative row-count deltas (unauthorized deletes). It does NOT monitor St. Raphael chat guardrails.
- `knowledge-ingest`, `knowledge-query` - AI knowledge base system

### Database Schema
- `supabase/migrations/` - 130 migration files (Supabase uses SQL migrations)
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
Use this shape for all NEW or edited functions:
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
Reality check: a legacy majority of functions still return `{error: message}`
(via `_shared/connectors.ts`). Don't assume either shape when consuming a
function — read it. Migrating legacy functions requires updating their
callers' error handling in the same change.

### Component Organization
- Page-level components in `src/pages/`
- Reusable components in `src/components/`
  - Health: `ComprehensiveHealthConnectors.tsx`, `DeviceMonitorDashboard.tsx`
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
- Terra: `supabase/functions/webhook-terra/` (signature-verified; the live path)
- Dexcom: `supabase/functions/cgm-dexcom-webhook/` (signature-verified; `webhook-dexcom` is an honest 501 stub)
- Fitbit: `supabase/functions/webhook-fitbit/` (signature-verified)
- `server/api/connections/webhooks.ts` belongs to the undeployed legacy stack

## Common Gotchas

1. **Supabase vs Prisma**: Supabase Edge Functions use Supabase client (Deno), Node server uses Prisma. Don't mix them in the same file.

2. **RLS Performance**: Use `(select auth.uid())` instead of `auth.uid()` in WHERE clauses for index usage.

3. **Edge Function Secrets**: Set in Supabase Dashboard → Functions → Secrets, not in `.env` files.

4. **JWT Forwarding**: When calling Supabase from Edge Functions, forward user JWT: `Authorization: Bearer ${jwt}` for RLS enforcement.

5. **Background Jobs**: the BullMQ scheduler belongs to the undeployed legacy `server/` stack. Live scheduled work runs as Supabase scheduled functions (e.g. `glucose-aggregate-cron`, gated by service-role key / `CRON_SECRET`) and the Render worker `everafter-elohim-anchor`.

6. **Glucose Units**: Always convert to mg/dL before storing. Preserve original unit in metadata.

7. **Webhook Idempotency**: Use unique constraints on `(user_id, provider, external_id, ts)` to prevent duplicates.

8. **St. Raphael Safety**: Never allow diagnostic/prescriptive language. Check responses for medical claims before returning.

9. **Postgres grants EXECUTE on new functions to PUBLIC by default.** Creating a
   function in a migration makes it callable by `anon` and `authenticated`
   through PostgREST unless you revoke it. This has already caused a real hole:
   after the household-oversight migration was applied, ten `fn_oversight_*`
   helpers were reachable by `anon`, two of them exploitable SECURITY DEFINER
   (one leaked grant rows past RLS given any household id, the other injected
   alerts). Every migration that adds a function must end with an explicit
   `revoke all on function ... from public, anon, authenticated`, and you should
   verify the result rather than assume it.

10. **Routes gated by `VITE_ENABLE_NON_CORE_ROUTES`** redirect to the dashboard
    when the flag is unset, which is the case in production. Any surface that
    links into one of those routes must derive its own state from
    `src/lib/routeAvailability.ts`, or it will show a control that silently
    bounces the user.

## Deployment Notes

### Frontend (Netlify) - CURRENT
- **Production:** https://everafterai.net
- **Dev Branch:** https://dev--everafterai.netlify.app
- **Site ID:** `everafterai` (2b042583-f657-4e89-914e-af3623dd3e78)
- Build: `npm run build` → `dist/`
- Deploy: `npx netlify-cli deploy --dir=dist --alias=dev` (dev) or `--prod` (production)
- Environment: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

### Edge Functions (Supabase) - CURRENT
- **Project Ref:** `sncvecvgxwkkxnxbvglv`
- **URL:** https://sncvecvgxwkkxnxbvglv.supabase.co
- Deploy: `SUPABASE_ACCESS_TOKEN='...' npx supabase db push --linked`
- Functions deploy: `supabase functions deploy [function-name]`
- Auto-scales with traffic
- Set secrets in Supabase Dashboard → Settings → Edge Functions → Secrets

**Secrets Currently Set:**
- `GROQ_API_KEY` - For raphael-chat

**Secrets Needed for Health Integrations:**
- `TERRA_CLIENT_ID`, `TERRA_CLIENT_SECRET` - Terra aggregator
- `FITBIT_CLIENT_ID`, `FITBIT_CLIENT_SECRET` - Fitbit direct
- `DEXCOM_CLIENT_ID`, `DEXCOM_CLIENT_SECRET` - Dexcom CGM
- `OURA_CLIENT_ID`, `OURA_CLIENT_SECRET` - Oura Ring
- `APP_BASE_URL` - Set to https://everafterai.net

### Python Backend + Voice Sidecar (Render) - CURRENT
- `backend/` → Render web service `everafter-api` + worker `everafter-elohim-anchor` (`render.yaml`)
- `voice-ai-service/` → Render web service `everafter-voice-ai`
- Frontend reaches them through the Netlify proxies in `netlify.toml`

### Stripe Secrets (Supabase Functions)
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_ID_PRO`, `STRIPE_PRICE_ID_ENTERPRISE` — REQUIRED for
  entitlements; unmapped prices grant nothing by design

### Database Migrations
- Dev: `npm run migrate` (creates migration + applies)
- Production: `npm run migrate:deploy` (applies only)

## Additional Documentation

- `CURRENT_STATE.md` — the single dated ground-truth doc (live vs dead
  components, gate status, security posture). Trust this over anything else.
- `docs/audits/` — the 2026-07 engagement audits and closing QA report.
- `docs/archive/` — 150+ historical snapshot docs moved out of the root.
  Many self-declare "COMPLETE" with contradictory dates/metrics. Do NOT
  treat anything in the archive as current.
- `second-brain/` — curated knowledge base (verify claims against code;
  some notes predate the 2026-07 truthfulness fixes).
