# EverAfter - Digital Legacy Platform

EverAfter helps families capture daily reflections, curate the stories that define their loved ones, and prepare for immersive memorial projections. The experience is powered by React, TypeScript, Tailwind CSS, and optional Supabase integration.

## Current Experience

### Daily Story Capture
- Time-aware daily prompt that adapts to morning, afternoon, evening, and night routines
- Personality-aware descriptions so storytellers understand why a question matters
- Inline encouragement and character counts to keep memories detailed

### Family Dashboard
- Overview tab with journey stats, recent activity, and the daily reflection workflow
- Family member roster with invitation flow and status badges
- Saints AI tab that explains each guardian assistant and their current workload
- Projection planning workspace featuring readiness indicators, a session console, and the full hologram blueprint
- Privacy and automation tabs summarising safeguards, reminders, and toggles

### Projection Blueprint
- Step-by-step guide outlining how Q&A data evolves into a holographic experience
- Technology pillars and readiness checks to keep families aligned on safety and operations

### Demo Mode & Supabase Integration
- Works offline with seeded demo data when Supabase credentials are missing
- Seamlessly switches to Supabase when credentials are provided, persisting memories and invites per-user

## Saints AI Engrams
- **St. Raphael (The Healer)**: Surfaces prompts centred on emotional wellness
- **St. Michael (The Protector)**: Watches privacy safeguards and policy automation
- **St. Martin of Tours (The Compassionate)**: Prepares charitable activations when enabled

## Tech Stack
- **Frontend**: React 18 + TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Backend (optional)**: Supabase (PostgreSQL + Auth + Storage)
- **Build Tool**: Vite

## Project Structure
```
src/
├── components/
│   ├── DailyQuestionCard.tsx
│   ├── Header.tsx
│   ├── HologramGuide.tsx
│   ├── LandingPage.tsx
│   ├── WheelOfSamsaraIcon.tsx
│   └── dashboard/
│       ├── FamilyDashboard.tsx
│       └── ProjectionControlPanel.tsx
├── data/
│   └── questions.ts
├── hooks/
│   ├── useAuth.ts
│   ├── useDashboard.ts
│   └── useMemories.ts
├── lib/
│   └── supabase.ts
├── types/
│   └── index.ts
├── App.tsx
└── main.tsx
```

## Getting Started

See [SETUP.md](./SETUP.md) for full instructions. For a quick start:

```bash
npm ci              # installs the locked dependency set (TypeScript 5.5.4)
cp .env.example .env
# supply Supabase credentials or leave empty for demo mode
npm run dev
```

## Environment Variables
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Database Tables (when Supabase is enabled)
- **profiles**: User information
- **memories**: Stored responses to daily prompts
- **family_members**: Invitation tracking and guardian permissions

Additional tables for saints, automation, and projection settings are scaffolded in `supabase_schema.sql` for future expansion.

## Development Scripts
```bash
npm run dev      # start Vite development server
npm run build    # create a production build
npm run preview  # serve the production build locally
npm run lint     # run ESLint with TypeScript support
```

## Accessibility & UX Notes
- High-contrast gradients and large typography for senior-friendly readability
- Button focus states and aria labels on navigation controls
- Copywriting designed to be reassuring and plain-language for families processing grief

## License
All rights reserved.

For additional context around implementation details, refer to [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md).
