# EverAfter File Organization Structure

**Last Updated:** October 25, 2025
**Total Files:** 160 tracked files (1747 including node_modules)
**Status:** ✅ Complete & Organized

---

## 📁 Root Level Files

### Configuration Files
```
├── .env                          # Environment variables (DO NOT DELETE)
├── .env.example                  # Template for environment setup
├── .gitignore                    # Git ignore patterns
├── eslint.config.js              # ESLint configuration
├── postcss.config.js             # PostCSS configuration
├── tailwind.config.js            # Tailwind CSS configuration
├── tsconfig.json                 # TypeScript root configuration
├── tsconfig.app.json             # TypeScript app configuration
├── tsconfig.node.json            # TypeScript Node configuration
├── vite.config.ts                # Vite build configuration
├── package.json                  # NPM dependencies
├── package-lock.json             # NPM lock file
├── index.html                    # HTML entry point
└── supabase_schema.sql           # Database schema backup
```

### Documentation Files
```
├── README.md                     # Main project documentation
├── ARCHITECTURE.md               # System architecture overview
├── SETUP.md                      # Setup instructions
├── QUICK_START.md                # Quick start guide
├── SECURITY.md                   # Security guidelines
├── STRIPE_SETUP.md               # Stripe integration guide
├── DEPLOYMENT_CHECKLIST.md       # Original deployment checklist
├── DEPLOYMENT_CHECKLIST_NEW.md   # Updated deployment checklist
├── EDGE_FUNCTIONS_SETUP.md       # Edge functions documentation
├── GLUCOSE_CONNECTORS_COMPLETE.md # Glucose connector documentation
├── INTEGRATION_STATUS.md         # Integration status tracker
└── FILE_ORGANIZATION.md          # This file (organization map)
```

### Utility Scripts
```
├── verify.sh                     # Verification script
└── scripts/
    └── smoke-test.sh             # Smoke testing script
```

---

## 📁 Frontend Structure (`/src`)

### Core Application Files
```
src/
├── main.tsx                      # React application entry point
├── App.tsx                       # Root React component
├── index.css                     # Global styles
└── vite-env.d.ts                 # Vite environment types
```

### Components (`/src/components`) - 22 files

#### Health & Medical Components
```
components/
├── HealthAnalytics.tsx           # Health analytics dashboard
├── HealthConnectionManager.tsx   # Health connection management
├── HealthConnectionStatus.tsx    # Connection status display
├── HealthGoals.tsx               # Health goals tracking
├── HealthReportGenerator.tsx     # Health report generation
├── HealthTips.tsx                # Rotating health tips carousel
├── MedicationTracker.tsx         # Medication tracking
├── AppointmentManager.tsx        # Appointment management
└── EmergencyContacts.tsx         # Emergency contacts management
```

#### Raphael AI Components
```
components/
├── RaphaelChat.tsx               # Main Raphael chat interface
├── RaphaelHealthInterface.tsx    # Raphael health dashboard
├── RaphaelInsights.tsx           # Raphael insights display
├── RaphaelInsightsPanel.tsx      # Raphael insights panel
├── RaphaelConnectors.tsx         # Health connector management (WITH CUSTOM PLUGIN BUILDER)
├── RaphaelAgentMode.tsx          # Raphael agent mode selector
└── AIServiceStatus.tsx           # AI service status indicator
```

#### Engram & Personality System
```
components/
├── CustomEngramsDashboard.tsx    # Custom engrams dashboard
├── EngramChat.tsx                # Engram chat interface
├── EngramTaskManager.tsx         # Engram task management
├── DailyQuestionCard.tsx         # Daily question display
└── SaintsDashboard.tsx           # Saints/archetypal dashboard
```

#### User & Family Management
```
components/
├── FamilyMembers.tsx             # Family member management
├── QuickActions.tsx              # Quick action buttons
├── ConnectionSetupWizard.tsx     # Connection setup wizard
├── OAuthCredentialsAdmin.tsx     # OAuth credentials admin
└── ProtectedRoute.tsx            # Route protection component
```

### Pages (`/src/pages`) - 7 files
```
pages/
├── Landing.tsx                   # Landing/home page
├── Login.tsx                     # Login page
├── Signup.tsx                    # Signup page
├── Dashboard.tsx                 # Main user dashboard
├── HealthDashboard.tsx           # Health-specific dashboard
├── Pricing.tsx                   # Pricing page
└── OAuthCallback.tsx             # OAuth callback handler
```

### Contexts (`/src/contexts`) - 1 file
```
contexts/
└── AuthContext.tsx               # Authentication context provider
```

### Hooks (`/src/hooks`) - 1 file
```
hooks/
└── useAuth.tsx                   # Authentication hook
```

### Library/Utilities (`/src/lib`) - 5 files
```
lib/
├── supabase.ts                   # Supabase client initialization
├── config.ts                     # Application configuration
├── api-client.ts                 # API client utilities
├── edge-functions.ts             # Edge function helpers
└── connectors/
    └── registry.ts               # Connector registry
```

---

## 📁 Backend Structure (`/backend`)

### Python Backend Application
```
backend/
├── Dockerfile                    # Docker configuration
├── README.md                     # Backend documentation
├── requirements.txt              # Python dependencies
└── .env.example                  # Backend environment template
```

### Backend Core (`/backend/app`)

#### Main Entry
```
app/
└── main.py                       # FastAPI application entry
```

#### AI Modules (`/app/ai`)
```
app/ai/
├── llm_client.py                 # LLM client interface
└── prompt_builder.py             # Prompt construction
```

#### API Endpoints (`/app/api`)
```
app/api/
├── chat.py                       # Chat endpoints
├── engrams.py                    # Engram endpoints
├── personality.py                # Personality analysis endpoints
├── tasks.py                      # Task management endpoints
└── autonomous_tasks.py           # Autonomous task endpoints
```

#### Authentication (`/app/auth`)
```
app/auth/
├── dependencies.py               # Auth dependencies
├── jwt.py                        # JWT handling
└── middleware.py                 # Auth middleware
```

#### Core Utilities (`/app/core`)
```
app/core/
└── config.py                     # Backend configuration
```

#### Database (`/app/db`)
```
app/db/
└── session.py                    # Database session management
```

#### Engram Processing (`/app/engrams`)
```
app/engrams/
├── nlp.py                        # NLP processing
└── personality.py                # Personality analysis
```

#### Data Models (`/app/models`)
```
app/models/
├── agent.py                      # Agent models
└── engram.py                     # Engram models
```

#### Schemas (`/app/schemas`)
```
app/schemas/
└── engram.py                     # Engram schemas
```

#### Services (`/app/services`)
```
app/services/
├── invitation_service.py         # Invitation service
├── personality_analyzer.py       # Personality analysis service
└── task_executor.py              # Task execution service
```

#### Workers (`/app/workers`)
```
app/workers/
└── task_worker.py                # Background task worker
```

---

## 📁 Supabase Structure (`/supabase`)

### Edge Functions (`/supabase/functions`) - 26 functions

#### Shared Utilities
```
functions/_shared/
├── connectors.ts                 # Connector utilities
└── glucose.ts                    # Glucose data utilities
```

#### Core Functions
```
functions/
├── agent/index.ts                # Main agent function
├── agent-cron/index.ts           # Agent cron jobs
├── raphael-chat/index.ts         # Raphael chat endpoint
├── engram-chat/index.ts          # Engram chat endpoint
└── test-key/index.ts             # API key testing
```

#### Daily Progress & Questions
```
functions/
├── get-daily-question/index.ts   # Daily question retrieval
├── submit-daily-response/index.ts # Daily response submission
└── daily-progress/index.ts       # Daily progress tracking
```

#### Task Management
```
functions/
├── task-create/index.ts          # Task creation
└── manage-agent-tasks/index.ts   # Agent task management
```

#### Health Data Sync
```
functions/
├── sync-health-data/index.ts     # Scheduled health data sync
├── sync-health-now/index.ts      # Manual health data sync
└── glucose-aggregate-cron/index.ts # Glucose aggregation cron
```

#### Health Connectors
```
functions/
├── connect-start/index.ts        # Start OAuth connection
├── connect-callback/index.ts     # OAuth callback handler
├── cgm-dexcom-oauth/index.ts     # Dexcom OAuth flow
├── cgm-dexcom-webhook/index.ts   # Dexcom webhook receiver
├── cgm-manual-upload/index.ts    # Manual CGM upload
├── webhook-dexcom/index.ts       # Dexcom webhook (alt)
├── webhook-fitbit/index.ts       # Fitbit webhook
├── webhook-oura/index.ts         # Oura webhook
└── webhook-terra/index.ts        # Terra webhook
```

#### AI & Embeddings
```
functions/
├── generate-embeddings/index.ts  # Vector embeddings generation
└── insights-report/index.ts      # AI insights report generation
```

#### Payment Processing
```
functions/
├── stripe-checkout/index.ts      # Stripe checkout session
└── stripe-webhook/index.ts       # Stripe webhook handler
```

### Database Migrations (`/supabase/migrations`) - 37 migrations

#### Initial Schema (October 6, 2025)
```
migrations/
└── 20251006070133_create_everafter_schema.sql
```

#### AI & Personality System (October 20, 2025)
```
migrations/
├── 20251020013555_add_archetypal_ai.sql
├── 20251020021144_add_vector_embeddings_system.sql
├── 20251020022430_enhance_daily_question_system.sql
├── 20251020025826_winter_palace.sql
├── 20251020031838_create_agent_tasks_system.sql
├── 20251020040000_engram_based_daily_questions.sql
├── 20251020050000_autonomous_task_execution.sql
├── 20251020050113_multilayer_personality_dimensions.sql
├── 20251020060000_multilayer_personality_system.sql
├── 20251020090445_add_family_personality_questions.sql
└── 20251020091357_seed_dante_daily_questions.sql
```

#### User System & Optimization (October 25, 2025)
```
migrations/
├── 20251025050005_fix_user_profile_creation.sql
├── 20251025060239_consolidate_missing_tables.sql
├── 20251025060451_auto_user_init_final.sql
├── 20251025080210_auto_confirm_user_emails.sql
└── 20251025080420_add_admin_password_reset_function.sql
```

#### Health Tracking (October 25, 2025)
```
migrations/
├── 20251025065152_add_health_tracking_system.sql
├── 20251025081029_add_medication_logs_and_health_goals.sql
├── 20251025110000_create_health_connectors_system.sql
└── 20251025120000_create_glucose_metabolic_system.sql
```

#### Performance Optimization (October 25, 2025)
```
migrations/
├── 20251025082149_add_missing_foreign_key_indexes.sql
├── 20251025082208_optimize_rls_policies_part1_core_tables.sql
├── 20251025082227_optimize_rls_policies_part2_ai_tables.sql
├── 20251025082253_optimize_rls_policies_part3_embeddings.sql
├── 20251025082317_optimize_rls_policies_part4_questions_responses.sql
├── 20251025082345_optimize_rls_policies_part5_health_tables.sql
├── 20251025082504_optimize_rls_policies_part6_final.sql
└── 20251025082549_fix_function_security_with_correct_signatures.sql
```

#### Advanced Features (October 25, 2025)
```
migrations/
├── 20251025082740_create_unified_engram_task_system.sql
├── 20251025082759_create_daily_progress_rpc.sql
├── 20251025093007_add_created_at_to_family_members.sql
├── 20251025093736_create_agent_memories_vector_system.sql
├── 20251025094507_create_insight_reports_system.sql
└── 20251025100000_complete_365_questions_and_features.sql
```

---

## 📁 Build Output (`/dist`)

### Production Build Files (DO NOT MODIFY)
```
dist/
├── index.html                    # Built HTML
├── _redirects                    # Netlify redirects
├── image.png                     # Static image
└── assets/
    ├── index-[hash].css          # Compiled CSS
    └── index-[hash].js           # Compiled JavaScript
```

---

## 📁 Public Assets (`/public`)

### Static Assets
```
public/
└── image.png                     # Public image asset
```

---

## 🗂️ File Count by Category

| Category | Count | Location |
|----------|-------|----------|
| **Frontend Components** | 22 | `/src/components` |
| **Pages** | 7 | `/src/pages` |
| **Edge Functions** | 26 | `/supabase/functions` |
| **Database Migrations** | 37 | `/supabase/migrations` |
| **Backend Python Files** | 20 | `/backend/app` |
| **Configuration Files** | 11 | Root level |
| **Documentation Files** | 12 | Root level |
| **Library/Utils** | 5 | `/src/lib` |
| **Context/Hooks** | 2 | `/src/contexts`, `/src/hooks` |

**Total Tracked Files:** 160 files

---

## 🔒 Critical Files (NEVER DELETE)

### Environment & Configuration
- `.env` - Contains all API keys and secrets
- `package.json` - NPM dependencies
- `vite.config.ts` - Build configuration
- `tsconfig.*.json` - TypeScript configuration

### Database
- All files in `/supabase/migrations/` - Database version history
- `supabase_schema.sql` - Schema backup

### Core Application
- `src/main.tsx` - Application entry
- `src/App.tsx` - Root component
- All files in `/src/lib/` - Core utilities

### Backend
- `backend/app/main.py` - Backend entry
- All Python files in `/backend/app/` - Backend logic

---

## 📊 Key Features by File

### Health Connector System
- **RaphaelConnectors.tsx** - Main connector UI with Custom Plugin Builder
- **connect-start/index.ts** - OAuth initiation
- **connect-callback/index.ts** - OAuth callback
- **webhook-*.ts** - Various provider webhooks
- **sync-health-*.ts** - Data synchronization

### AI Chat System
- **RaphaelChat.tsx** - Main chat UI
- **raphael-chat/index.ts** - Chat backend
- **EngramChat.tsx** - Engram-based chat
- **engram-chat/index.ts** - Engram chat backend

### Daily Questions
- **DailyQuestionCard.tsx** - Question display
- **get-daily-question/index.ts** - Question retrieval
- **submit-daily-response/index.ts** - Response submission
- **daily-progress/index.ts** - Progress tracking

### Health Tracking
- **HealthAnalytics.tsx** - Analytics dashboard
- **MedicationTracker.tsx** - Medication logs
- **HealthGoals.tsx** - Goal tracking
- **HealthTips.tsx** - Rotating health tips (NEW FEATURE)

### Custom Dashboard Builder (NEW)
- **RaphaelConnectors.tsx** - Contains full Custom Plugin Builder
  - Main card with stats
  - Modal with templates
  - Connected sources display
  - 4 pre-built templates

---

## 🔐 Security Notes

### Files with Sensitive Data
- `.env` - API keys, database URLs (NEVER COMMIT)
- `.env.example` - Template only (SAFE TO COMMIT)

### Files with User Data
- All database migrations handle user data
- RLS policies protect all tables
- Edge functions validate authentication

---

## 🚀 Recent Additions

### October 25, 2025 - Latest Updates
1. **HealthTips.tsx** - Rotating carousel with 10 health tips
2. **RaphaelConnectors.tsx** - Added Custom Health Plugin Builder
   - Beautiful violet-pink gradient card
   - Modal with dashboard templates
   - Connected sources visualization
   - Coming soon roadmap

---

## 📋 Maintenance Checklist

- ✅ All files documented
- ✅ File purposes identified
- ✅ Dependencies mapped
- ✅ Critical files flagged
- ✅ Recent changes logged
- ✅ Build output documented
- ✅ Security notes added

---

## 📞 File Organization Contact

For questions about file organization or to request changes to this structure, please refer to:
- `ARCHITECTURE.md` - System architecture
- `README.md` - Project overview
- Individual component files for specific features

---

**END OF FILE ORGANIZATION MAP**

*This document is automatically maintained and should be updated whenever files are added, moved, or deleted.*
