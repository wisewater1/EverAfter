# EverAfter - Setup Instructions

## Prerequisites
- Node.js 18+
- npm 9+
- Optional: Supabase project for persistent storage

## Supabase (Optional)
1. Create a Supabase project at https://supabase.com
2. Run the SQL in `supabase_schema.sql` to provision tables for memories, family members, saints activity, and projection settings
3. Copy your project URL and anon key from **Settings → API**

## Environment Configuration
1. Create a `.env` file in the project root:
   ```bash
   cp .env.example .env
   ```
2. Provide your Supabase credentials (or leave blank to use demo mode):
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

## Install & Run
```bash
npm ci
npm run dev
```
Visit http://localhost:5173

## Demo Mode
- When no Supabase credentials are supplied, the dashboard boots with seeded metrics, members, and recent activity
- Memory submissions and invitations update in-memory state so flows can be previewed without a backend

## Enabled Features
- Daily reflection workflow with adaptive prompts and inline encouragement
- Dashboard analytics summarising journey progress, weekly momentum, and privacy score
- Guardian management with invitations and status indicators
- Saints AI overview card deck describing each assistant’s remit
- Projection readiness workspace combining hardware checks, session configuration console, and hologram blueprint
- Privacy and automation summaries with simple toggle controls

## Database Entities (Supabase)
- `profiles`: created automatically by Supabase Auth (tracks user onboarding date)
- `memories`: responses to daily prompts
- `family_members`: invitations and guardian metadata
- `saints_ai`, `saint_activities`, `user_settings`, `projection_settings`: optional tables prepared for future enhancements

## Security Notes
- Supabase Row Level Security policies in `supabase_schema.sql` ensure tenants only read/write their own rows
- Client gracefully falls back to demo mode when credentials are absent or invalid

## Next Steps
- Connect Supabase and replace demo copy with your family’s data
- Extend `ProjectionControlPanel` callbacks to persist session plans
- Integrate the saints automation tables once AI backends are ready
- Configure analytics or monitoring in your deployment platform
