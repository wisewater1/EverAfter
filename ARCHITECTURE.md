# EverAfter Architecture

## System Overview

EverAfter uses a **Supabase-First Architecture** with serverless edge functions for all backend operations. The Python FastAPI backend is available for advanced AI/ML operations but is optional.

## Architecture Decision

### Primary Stack: Supabase Edge Functions
- All authentication via Supabase Auth
- All database operations via Supabase PostgreSQL
- All API endpoints via Supabase Edge Functions
- Real-time subscriptions via Supabase Realtime

### Optional: Python FastAPI Backend
- Advanced NLP processing
- Custom ML model hosting
- Complex background tasks via Celery
- Only needed for enterprise features

## System Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React + Vite)                  │
│                    src/lib/api-client.ts                     │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      │ All API calls go through Supabase
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                   Supabase Platform                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Edge Functions (Deno)                    │  │
│  │  • engram-chat           • get-daily-question        │  │
│  │  • generate-embeddings   • submit-daily-response     │  │
│  │  • manage-agent-tasks    • sync-health-data          │  │
│  │  • stripe-checkout       • stripe-webhook            │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │          PostgreSQL Database (17+ tables)            │  │
│  │  • profiles              • archetypal_ais            │  │
│  │  • daily_question_pool   • agent_task_queue          │  │
│  │  • vector_embeddings     • subscriptions             │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Authentication System                    │  │
│  │  • Email/Password        • JWT Tokens                │  │
│  │  • Row Level Security    • Session Management        │  │
│  └──────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
                      │
                      │ Optional (Enterprise Only)
                      │
┌─────────────────────▼───────────────────────────────────────┐
│            Python FastAPI Backend (Optional)                 │
│  • Advanced NLP with Transformers                           │
│  • Custom ML model hosting                                  │
│  • Celery task queue for long-running jobs                 │
│  • Redis for caching and queue management                  │
└──────────────────────────────────────────────────────────────┘
```

## Data Flow

### User Authentication
1. User signs up/in via frontend
2. Supabase Auth creates session + JWT
3. JWT includes `user_id` and `email`
4. All subsequent requests include JWT in Authorization header
5. Supabase Edge Functions validate JWT automatically
6. Database RLS policies enforce access control

### Daily Questions Flow
1. Frontend calls `apiClient.getDailyQuestion(userId, engramId)`
2. Calls Supabase Edge Function: `get-daily-question`
3. Function queries `daily_question_pool` table
4. Returns next unanswered question for user's engram
5. User submits response via `submitDailyResponse()`
6. Calls Edge Function: `submit-daily-response`
7. Saves to `daily_question_responses` table
8. Updates engram readiness score
9. Generates embeddings if needed

### AI Chat Flow
1. Frontend calls `apiClient.sendChatMessage(engramId, message)`
2. Calls Supabase Edge Function: `engram-chat`
3. Function generates embedding for user message
4. Searches `vector_embeddings` table for relevant context
5. Retrieves engram personality traits from `archetypal_ais`
6. Builds system prompt with personality + context
7. Calls OpenAI API for response
8. Returns AI-generated response to frontend
9. All conversation stored in database

### Task Management Flow
1. User creates task via `apiClient.createTask()`
2. Task inserted directly into `agent_task_queue` table via Supabase client
3. Task execution triggered via `manage-agent-tasks` edge function
4. Background worker processes pending tasks
5. Results stored in task execution logs
6. Frontend polls or subscribes to task status

## Database Schema

### Core Tables
- `profiles` - User profiles (extends auth.users)
- `archetypal_ais` - Custom engram definitions
- `daily_question_pool` - 365 personality questions
- `daily_question_responses` - User responses
- `user_daily_progress` - Progress tracking

### AI & ML Tables
- `vector_embeddings` - Semantic embeddings for memory search
- `personality_dimensions` - Multi-layer personality model
- `agent_task_queue` - Autonomous task system

### Social Features
- `family_members` - Family access control
- `family_personality_questions` - Questions for family
- `family_member_invitations` - Invitation system

### Saints AI
- `saints_subscriptions` - Active Saints per user
- `saint_activities` - Activity logs

### Health Tracking
- `health_connections` - OAuth connections to health services
- `health_data_points` - Aggregated health metrics
- `health_sync_logs` - Sync history

### Payments
- `subscriptions` - Stripe subscription management
- `payment_history` - Payment records

## Security Model

### Row Level Security (RLS)
All tables have RLS enabled with policies:

1. **User Data Isolation**
   ```sql
   CREATE POLICY "Users can view own data"
   ON table_name FOR SELECT
   TO authenticated
   USING (auth.uid() = user_id);
   ```

2. **Family Sharing**
   ```sql
   CREATE POLICY "Family members can view shared data"
   ON memories FOR SELECT
   TO authenticated
   USING (
     user_id = auth.uid() OR
     EXISTS (
       SELECT 1 FROM family_members
       WHERE family_members.user_id = memories.user_id
       AND family_members.invited_user_id = auth.uid()
       AND family_members.status = 'active'
     )
   );
   ```

3. **Admin Access**
   Service role key bypasses RLS for background tasks

### Authentication Flow
1. Supabase manages all JWT tokens
2. Tokens include user metadata
3. Edge functions validate tokens automatically
4. Client uses anon key + user JWT for requests
5. Backend (if used) validates JWT with same secret

## API Endpoints

### Supabase Edge Functions
- `GET/POST /functions/v1/get-daily-question` - Fetch daily question
- `POST /functions/v1/submit-daily-response` - Submit answer
- `POST /functions/v1/engram-chat` - Chat with AI engram
- `POST /functions/v1/generate-embeddings` - Create vector embeddings
- `POST /functions/v1/manage-agent-tasks` - Execute autonomous tasks
- `POST /functions/v1/sync-health-data` - Sync health data
- `POST /functions/v1/stripe-checkout` - Create payment session
- `POST /functions/v1/stripe-webhook` - Handle payment webhooks

### Direct Database Access (via Supabase Client)
- All CRUD operations on tables
- Real-time subscriptions
- File storage operations

## Frontend Integration

### API Client (`src/lib/api-client.ts`)
Single unified client for all backend operations:

```typescript
import { apiClient } from './lib/api-client';

// Chat with AI
const response = await apiClient.sendChatMessage(engramId, message);

// Get daily question
const question = await apiClient.getDailyQuestion(userId, engramId);

// Submit response
await apiClient.submitDailyResponse(userId, questionId, answer);

// Manage tasks
const tasks = await apiClient.listTasks(engramId);
await apiClient.createTask(engramId, taskData);
await apiClient.executeTask(taskId);
```

### Direct Supabase Usage
For simple CRUD operations:

```typescript
import { supabase } from './lib/supabase';

// Query data
const { data, error } = await supabase
  .from('archetypal_ais')
  .select('*')
  .eq('user_id', userId);

// Insert data
await supabase
  .from('memories')
  .insert({ user_id: userId, content: 'Memory text' });

// Real-time subscription
supabase
  .channel('task-updates')
  .on('postgres_changes',
    { event: 'UPDATE', schema: 'public', table: 'agent_task_queue' },
    payload => console.log('Task updated:', payload)
  )
  .subscribe();
```

## Deployment

### Frontend
- Vercel, Netlify, or any static host
- Build command: `npm run build`
- Output directory: `dist`
- Environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

### Edge Functions
- Deployed via Supabase CLI or dashboard
- Automatically scaled and managed
- Environment variables configured in Supabase dashboard

### Backend (Optional)
- Deploy to Railway, Render, or any Python host
- Docker image available
- Requires: PostgreSQL connection, Redis, OpenAI API key
- Only needed for advanced ML features

## Development

### Local Development
```bash
# Frontend
npm install
npm run dev

# Supabase Edge Functions (optional local testing)
supabase functions serve

# Python Backend (optional)
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Environment Setup
1. Create Supabase project
2. Run migrations in `supabase/migrations/`
3. Copy `.env.example` to `.env`
4. Add Supabase credentials
5. Start frontend: `npm run dev`

## Scalability

### Current Capacity
- Frontend: Unlimited (static CDN)
- Edge Functions: Auto-scales with Supabase
- Database: 500GB included, scales to TB+
- Auth: Unlimited users

### Performance
- Edge Functions: ~50-200ms response time
- Database queries: ~10-50ms
- AI chat: ~1-3s (depends on OpenAI)
- Real-time: <100ms latency

## Monitoring

### Built-in Supabase Monitoring
- Function execution logs
- Database query performance
- Authentication metrics
- API usage stats

### Custom Monitoring (Optional)
- Frontend: Vercel Analytics
- Errors: Sentry integration
- Uptime: Betteruptime or similar

## Future Enhancements

### Phase 1: Current (Supabase-First)
- All features via Edge Functions
- Direct database access
- Real-time subscriptions

### Phase 2: Hybrid (Optional)
- Add FastAPI for advanced NLP
- Celery for background tasks
- Redis for caching

### Phase 3: Enterprise
- Multi-tenant architecture
- Custom ML models
- Advanced analytics
- White-label support

## Migration Path

If switching from FastAPI to Supabase Edge Functions:

1. ✅ Update `api-client.ts` to use edge functions
2. ✅ Migrate API endpoints to edge functions
3. ✅ Use direct Supabase client for simple queries
4. ✅ Remove Python backend dependency
5. ✅ Update documentation

## Support

For questions or issues:
- Frontend: React/TypeScript/Vite docs
- Supabase: https://supabase.com/docs
- Edge Functions: https://supabase.com/docs/guides/functions
- Backend (optional): FastAPI docs
