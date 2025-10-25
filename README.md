# EverAfter - Digital Legacy Platform

A compassionate platform for preserving memories, stories, and wisdom through daily reflections. Built with React, TypeScript, Tailwind CSS, and Supabase.

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

The application will be available at `http://localhost:5173`

## Features

### Core Functionality
- **Saints AI Dashboard**: Autonomous AI assistants (St. Raphael free, premium Saints available)
- **Custom Engrams**: Create archetypal AI personalities through daily questions
- **Daily Questions System**: 365-day journey to build complete AI personalities
- **Family Members**: Invite family to contribute memories and insights
- **AI Chat**: Converse with your trained AI personalities
- **Autonomous Tasks**: Let AI agents handle tasks in the background
- **Raphael Agent Mode**: Specialized health management assistant

### Authentication & Security
- Secure Supabase authentication with email/password
- Protected routes with automatic redirects
- Row Level Security (RLS) on all database tables
- Automatic user initialization on signup

### User Experience
- Beautiful gradient-based dark theme
- Fully responsive design for all devices
- Smooth transitions and animations
- Loading states and error handling
- Production-ready interface

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Routing**: React Router v6
- **Backend**: Supabase (PostgreSQL + Auth + Edge Functions)
- **State Management**: React Hooks + Context API

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
└── functions/         # Edge functions (7 serverless functions)
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
