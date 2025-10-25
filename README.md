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
- OAuth integration (Apple Health, Google Fit, Fitbit, Garmin)

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
