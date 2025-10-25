# EverAfter - Digital Legacy & Health Companion

A production-grade ChatGPT-class assistant with health intelligence. Features St. Raphael (health companion), autonomous task execution, and daily progress tracking. Built with React, TypeScript, Tailwind CSS, and Supabase.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Supabase account (https://supabase.com)
- OpenAI API key (https://platform.openai.com/api-keys)

### Installation

```bash
# 1. Install dependencies
npm install

# 2. Copy environment template
cp .env.example .env

# 3. Add your Supabase credentials to .env
# Get these from: https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# 4. Start development server
npm run dev
```

The application will be available at `http://localhost:5173`

### Deploy Edge Functions

**CRITICAL**: Edge Functions require additional setup. See [EDGE_FUNCTIONS_SETUP.md](./EDGE_FUNCTIONS_SETUP.md) for complete instructions.

Quick version:
```bash
# 1. Set OpenAI API key in Supabase Dashboard → Functions → Secrets
#    Name: OPENAI_API_KEY
#    Value: sk-your-actual-key-here

# 2. Link your project
supabase login
supabase link --project-ref YOUR_PROJECT_REF

# 3. Deploy functions
supabase functions deploy raphael-chat
supabase functions deploy task-create
supabase functions deploy daily-progress

# 4. Test deployment
USER_JWT='your-jwt-here' ./scripts/smoke-test.sh
```

## Features

### Production Features

**Unified Task System** (engram_ai_tasks):
- Single source of truth for all health and personal tasks
- St. Raphael operates through engrams schema
- Full audit trail with execution logs
- Status tracking: pending → in_progress → done/failed

**St. Raphael Health Companion**:
- ChatGPT-class conversational AI
- Health information and emotional support
- Never diagnoses or prescribes (safety-first design)
- Automatic daily progress tracking
- Emergency escalation patterns

**Edge Functions** (Production-Grade):
- `raphael-chat`: AI chat with safety guardrails
- `task-create`: Create health/personal tasks
- `daily-progress`: Track user engagement
- Structured error responses (code/message/hint)
- JWT forwarding with RLS enforcement

**Health Monitoring**:
- Medication tracking with adherence rates
- Appointment scheduling and reminders
- Health goal setting and progress
- Emergency contact management
- Health Connectors with OAuth integration (see below)

**Health Connectors**:
- OAuth-based integration with health data providers
- Aggregators: Terra (multi-device), Human API, Validic, Metriport
- Wearables: Fitbit, Oura Ring, WHOOP, Garmin, Withings, Polar
- Glucose/CGM: Dexcom, Abbott Libre (via aggregators)
- Clinical/EHR: SMART on FHIR (Epic, Oracle Health/Cerner)
- Webhook ingestion with signature verification
- Background sync with idempotent processing
- Normalized metrics storage (steps, heart rate, sleep, glucose, etc.)
- See [Health Connectors Setup](#health-connectors-setup) for configuration

### Security & Compliance

- ✅ Row Level Security (RLS) on all 30+ tables
- ✅ All policies use `(select auth.uid())` for performance
- ✅ JWT authentication enforced in Edge Functions
- ✅ OpenAI API keys stored in Supabase Secrets (never in code)
- ✅ Function security with `search_path` hardening
- ✅ PHI protection (no logging of sensitive health data)
- ✅ CORS headers configured
- ✅ Rate limiting available

See [SECURITY.md](./SECURITY.md) for complete threat model and mitigations.

### User Experience

- iPhone-optimized (320-430px, safe areas, no horizontal scroll)
- Responsive design for all devices
- Dark theme with accessible contrast
- Loading states and error handling
- Production-ready interface
- Smooth animations and transitions

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Routing**: React Router v6
- **Backend**: Supabase (PostgreSQL + Auth + Edge Functions)
- **State Management**: React Hooks + Context API
- **Optional**: Python FastAPI backend (for advanced ML features)

## Architecture

EverAfter uses a **Supabase-First Architecture**:
- All authentication via Supabase Auth
- All database operations via Supabase PostgreSQL
- All API endpoints via Supabase Edge Functions (8 serverless functions)
- Python FastAPI backend available but optional (only for advanced ML/NLP)

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed system design.

## Project Structure

```
src/
├── components/          # React components
│   ├── CustomEngramsDashboard.tsx
│   ├── DailyQuestionCard.tsx
│   ├── EngramChat.tsx
│   ├── EngramTaskManager.tsx
│   ├── FamilyMembers.tsx
│   ├── ProtectedRoute.tsx
│   ├── RaphaelAgentMode.tsx
│   └── SaintsDashboard.tsx
├── contexts/           # React contexts
│   └── AuthContext.tsx
├── hooks/             # Custom React hooks
│   └── useAuth.tsx
├── lib/               # Third-party integrations
│   ├── supabase.ts
│   └── api-client.ts
├── pages/             # Page components
│   ├── Dashboard.tsx
│   ├── Login.tsx
│   ├── Signup.tsx
│   └── Pricing.tsx
├── App.tsx            # Main application component
└── main.tsx           # Application entry point

supabase/
├── migrations/        # Database schema migrations (17 files)
└── functions/         # Edge functions (8 serverless functions)

backend/               # Optional Python FastAPI backend
├── app/              # FastAPI application
└── requirements.txt  # Python dependencies
```

## Environment Variables

The Supabase credentials are already configured in `.env`:

```env
VITE_SUPABASE_URL=https://rfwghspbhuqdhyyipynt.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbG...
```

## Database Schema

The application uses 17+ Supabase tables including:

**Core Tables:**
- `profiles` - User information
- `archetypal_ais` - Custom AI personalities
- `daily_question_pool` - 365 questions
- `daily_question_responses` - User responses
- `user_daily_progress` - Progress tracking

**Saints AI:**
- `saints_subscriptions` - Active Saints per user
- `saint_activities` - Activity logs

**Family & Social:**
- `family_members` - Family access control
- `family_personality_questions` - Questions for family
- `family_member_invitations` - Invitation system

**Advanced Features:**
- `agent_task_queue` - Autonomous task system
- `personality_dimensions` - Multi-layer personality model
- `vector_embeddings` - AI personality vectors
- `subscriptions` - Stripe payment management

All tables have Row Level Security enabled with proper policies.

## Key Features Explained

### 1. Saints AI Dashboard
Pre-configured AI assistants:
- **St. Raphael** (FREE): Health management, appointments, prescriptions
- **St. Michael** (Premium): Security & privacy protection
- **St. Martin** (Premium): Charitable giving & community
- **St. Agatha** (Premium): Crisis support & resilience

### 2. Custom Engrams
Build your own AI personalities:
- Answer daily questions (365-day journey)
- AI learns your communication style, values, humor
- Activate when readiness reaches 80%
- Chat with your trained AI

### 3. Family Members
- Invite family via email
- Send personality questions
- Collect external memories
- Build family member AI representations

## Development

```bash
# Development mode with hot reload
npm run dev

# Type checking
npx tsc --noEmit

# Linting
npm run lint

# Production build
npm run build

# Preview production build
npm run preview
```

## Deployment

See [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) for detailed deployment instructions.

### Recommended: Vercel
```bash
npm install -g vercel
vercel --prod
```

### Alternative: Netlify
```bash
npm install -g netlify-cli
netlify deploy --prod
```

## Health Connectors Setup

The Health Connectors system allows Raphael to integrate with external health data providers through OAuth and webhooks.

### Architecture

1. **OAuth Flow**: User initiates connection → Edge Function redirects to provider → Callback stores tokens
2. **Webhook Ingestion**: Provider sends data → Signature verified → Metrics normalized → Stored in `health_metrics`
3. **Manual Sync**: User triggers backfill → Edge Function fetches historical data → Stored with idempotency

### Database Tables

- `provider_accounts`: OAuth tokens and connection status
- `health_metrics`: Normalized health data (steps, heart rate, sleep, glucose, etc.)
- `webhook_events`: Webhook audit log with deduplication

### Supported Providers

#### Aggregators (One OAuth, Multiple Devices)
- **Terra**: https://tryterra.co/ - Supports Fitbit, Garmin, Apple Health, Google Fit, Oura, WHOOP, and more
- **Human API**: https://humanapi.co/ - Wellness + Medical records
- **Validic**: https://validic.com/ - Broad device catalog with streaming
- **Metriport**: https://metriport.com/ - Open-source, FHIR-native

#### Direct Wearables
- **Fitbit**: https://dev.fitbit.com/ - Steps, heart rate, sleep
- **Oura Ring**: https://cloud.ouraring.com/docs/ - Sleep, HRV, readiness
- **WHOOP**: https://developer.whoop.com/ - Strain, recovery (coming soon)
- **Garmin**: https://developer.garmin.com/ - Fitness, VO2 max (coming soon)
- **Withings**: https://developer.withings.com/ - Weight, BP (coming soon)
- **Polar**: https://www.polar.com/accesslink-api/ - Training load (coming soon)

#### Glucose Monitoring (CGM)
- **Dexcom**: https://developer.dexcom.com/ - Real-time glucose via OAuth
- **Abbott Libre**: Via aggregator partners (no public API)

#### Clinical/EHR
- **SMART on FHIR**: https://docs.smarthealthit.org/ - Epic, Oracle Health/Cerner, etc.
- Requires per-institution registration

### Provider Configuration

#### 1. Set Environment Variables

Add to Supabase Dashboard → Functions → Secrets:

```bash
APP_BASE_URL=https://your-app.com

# Terra
TERRA_CLIENT_ID=your_terra_client_id
TERRA_CLIENT_SECRET=your_terra_secret
TERRA_WEBHOOK_SECRET=your_terra_webhook_secret

# Fitbit
FITBIT_CLIENT_ID=your_fitbit_client_id
FITBIT_CLIENT_SECRET=your_fitbit_secret
FITBIT_SUBSCRIBER_VERIFICATION_CODE=your_verification_code

# Oura
OURA_CLIENT_ID=your_oura_client_id
OURA_CLIENT_SECRET=your_oura_secret

# Dexcom
DEXCOM_CLIENT_ID=your_dexcom_client_id
DEXCOM_CLIENT_SECRET=your_dexcom_secret
```

#### 2. Register OAuth Applications

**Terra**:
1. Sign up at https://dashboard.tryterra.co/
2. Create new integration
3. Set redirect URL: `https://your-app.com/api/connect-callback`
4. Set webhook URL: `https://YOUR_PROJECT.supabase.co/functions/v1/webhook-terra`

**Fitbit**:
1. Register app at https://dev.fitbit.com/apps/new
2. OAuth 2.0 Application Type: Server
3. Redirect URL: `https://your-app.com/api/connect-callback`
4. Webhook subscription URL: `https://YOUR_PROJECT.supabase.co/functions/v1/webhook-fitbit`

**Oura**:
1. Request API access at https://cloud.ouraring.com/oauth/applications
2. Set redirect URI: `https://your-app.com/api/connect-callback`

**Dexcom**:
1. Register at https://developer.dexcom.com/
2. Use sandbox for testing: https://sandbox-api.dexcom.com
3. Set redirect URI: `https://your-app.com/api/connect-callback`

#### 3. Deploy Edge Functions

```bash
# Deploy OAuth handlers
supabase functions deploy connect-start
supabase functions deploy connect-callback

# Deploy webhook handlers
supabase functions deploy webhook-terra
supabase functions deploy webhook-fitbit
supabase functions deploy webhook-oura
supabase functions deploy webhook-dexcom

# Deploy sync function
supabase functions deploy sync-health-now
```

#### 4. Configure Webhooks

For providers that support webhooks, register the webhook URLs in their developer dashboards:

- Terra: `https://YOUR_PROJECT.supabase.co/functions/v1/webhook-terra`
- Fitbit: `https://YOUR_PROJECT.supabase.co/functions/v1/webhook-fitbit`
- Oura: `https://YOUR_PROJECT.supabase.co/functions/v1/webhook-oura`
- Dexcom: `https://YOUR_PROJECT.supabase.co/functions/v1/webhook-dexcom`

### Security Notes

- All OAuth tokens encrypted at rest in Supabase
- Webhook signatures verified on every request
- Idempotent processing prevents duplicate data
- Row Level Security enforces user data isolation
- No PHI/credentials logged
- Rate limiting on sync endpoints

### Known Constraints

- **Apple HealthKit**: Requires native iOS app companion
- **Android Health Connect**: Requires native Android app
- **Strava**: Workout data only; training/AI uses violate ToS
- **Abbott Libre**: Must use aggregator programs (no public API)

### Metric Normalization

All providers map to standardized metrics:

- `steps` (count)
- `resting_hr` (bpm)
- `hrv` (ms)
- `sleep_efficiency` (%)
- `glucose` (mg/dL)
- `tir` (% time in range for glucose)
- `vo2_max` (ml/kg/min)
- `calories` (kcal)

See Edge Function handlers for complete mapping tables.

## Support & Documentation

- **Setup Guide**: [SETUP.md](./SETUP.md)
- **Deployment**: [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)
- **Stripe Integration**: [STRIPE_SETUP.md](./STRIPE_SETUP.md)

## Security

- Row Level Security (RLS) on all database tables
- Secure authentication via Supabase Auth
- Protected routes with auth guards
- Environment variables for sensitive data
- Automatic user initialization triggers

## Recent Improvements

**Code Quality:**
- Removed all TypeScript linting errors
- Fixed React Hook dependencies
- Removed unused imports and variables
- Proper type definitions throughout

**Authentication:**
- Added ProtectedRoute component
- Auto-redirect for authenticated users
- Proper loading states
- Session management

**Database:**
- Verified all 17+ tables exist
- Confirmed RLS policies active
- Auto user initialization working
- Complete schema migrations

**Build:**
- Production build: 390KB JS (gzipped: 107KB)
- Optimized CSS: 28KB (gzipped: 5.6KB)
- Zero TypeScript errors
- Clean, maintainable code

## License

All rights reserved.

---

Built with care for preserving memories and honoring legacies.
