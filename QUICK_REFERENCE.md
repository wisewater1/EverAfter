# EverAfter Quick Reference Guide

**Fast access to key information** | Updated: October 25, 2025

---

## 🎯 Need Something? Find It Here

### 📁 Looking for a File?
- **Component:** `/src/components/[ComponentName].tsx`
- **Page:** `/src/pages/[PageName].tsx`
- **Edge Function:** `/supabase/functions/[function-name]/index.ts`
- **Migration:** `/supabase/migrations/[timestamp]_[name].sql`
- **Backend API:** `/backend/app/api/[endpoint].py`

### 📚 Need Documentation?
- **Project Overview:** `README.md`
- **Complete File Map:** `FILE_ORGANIZATION.md`
- **Backup Status:** `BACKUP_VERIFICATION.md`
- **Project Status:** `PROJECT_STATUS.md`
- **This Guide:** `QUICK_REFERENCE.md`

---

## 🚀 Common Commands

### Development
```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

### File Management
```bash
# Find all TypeScript files
find . -name "*.tsx" -o -name "*.ts" | grep -v node_modules

# Count files by type
find . -name "*.tsx" | wc -l

# View file inventory
cat FILE_INVENTORY.txt
```

### Git Operations
```bash
git log --oneline    # View commit history
git status           # Check status
git add -A           # Stage all changes
git commit -m "msg"  # Commit changes
```

---

## 📊 File Locations Quick Map

### Frontend (44 files)
```
src/
├── components/      # 22 React components
├── pages/          # 7 page components
├── contexts/       # Auth context
├── hooks/          # Custom hooks
└── lib/            # Utilities
```

### Backend (20 files)
```
backend/app/
├── ai/             # LLM & prompts
├── api/            # API endpoints
├── auth/           # Authentication
├── services/       # Business logic
└── models/         # Data models
```

### Supabase (63 files)
```
supabase/
├── functions/      # 26 edge functions
└── migrations/     # 37 SQL migrations
```

---

## 🔍 Find a Component

### Health & Medical
- `HealthAnalytics.tsx` - Analytics dashboard
- `HealthTips.tsx` - Rotating health tips ⭐ NEW
- `MedicationTracker.tsx` - Medication tracking
- `HealthGoals.tsx` - Goal tracking
- `AppointmentManager.tsx` - Appointments

### Raphael AI
- `RaphaelChat.tsx` - Main chat interface
- `RaphaelConnectors.tsx` - Health connectors ⭐ WITH CUSTOM PLUGIN BUILDER
- `RaphaelInsights.tsx` - AI insights
- `RaphaelHealthInterface.tsx` - Health dashboard

### User Management
- `FamilyMembers.tsx` - Family management
- `EmergencyContacts.tsx` - Emergency contacts
- `ProtectedRoute.tsx` - Route protection

---

## 🗄️ Database Tables

### Core Tables
- `users` - User accounts
- `user_profiles` - User profiles
- `family_members` - Family relationships

### Health Tables
- `health_metrics` - All health data
- `glucose_readings` - CGM data
- `medications` - Medication logs
- `health_goals` - User goals
- `provider_accounts` - Connected devices

### AI Tables
- `daily_questions` - Question bank
- `daily_responses` - User responses
- `engrams` - Memory fragments
- `agent_tasks` - AI tasks
- `embeddings` - Vector embeddings

---

## 🔗 Edge Functions

### Health Data
- `sync-health-data` - Scheduled sync
- `sync-health-now` - Manual sync
- `cgm-manual-upload` - File upload

### Connectors
- `connect-start` - OAuth initiation
- `connect-callback` - OAuth callback
- `webhook-[provider]` - Provider webhooks

### AI & Chat
- `raphael-chat` - Main chat endpoint
- `engram-chat` - Engram-based chat
- `generate-embeddings` - Vector generation

### Daily Progress
- `get-daily-question` - Question retrieval
- `submit-daily-response` - Response submission
- `daily-progress` - Progress tracking

---

## 🎨 Design Tokens

### Colors
```css
Teal/Cyan:    from-teal-600 to-cyan-600
Orange/Red:   from-orange-600 to-red-600
Violet/Pink:  from-violet-600 to-pink-600 (NEW)
Blue/Indigo:  from-blue-600 to-indigo-600
Green/Emerald: from-green-600 to-emerald-600
```

### Common Classes
```css
Card:         bg-gray-800/50 rounded-xl border border-gray-700/50
Button:       px-6 py-3 bg-gradient-to-r ... rounded-xl
Glass:        backdrop-blur-sm bg-white/5
Shadow:       shadow-lg
Hover Scale:  hover:scale-[1.02]
```

---

## 🔐 Security Quick Check

### RLS Policies (Must Have)
```sql
-- All tables must have:
ALTER TABLE tablename ENABLE ROW LEVEL SECURITY;

-- Policy structure:
CREATE POLICY "policy_name"
  ON tablename
  FOR SELECT/INSERT/UPDATE/DELETE
  TO authenticated
  USING (auth.uid() = user_id);
```

### Authentication Check
```typescript
// In components:
const { user } = useAuth();

// In edge functions:
const { data: { user }, error } = await supabase.auth.getUser(
  req.headers.get('Authorization')?.replace('Bearer ', '')
);
```

---

## 📦 Package Management

### Add Package
```bash
npm install package-name
```

### Remove Package
```bash
npm uninstall package-name
```

### Update Dependencies
```bash
npm update
```

---

## 🐛 Debugging

### Common Issues

**Build Fails**
```bash
# Clear cache and rebuild
rm -rf node_modules dist
npm install
npm run build
```

**TypeScript Errors**
```bash
# Check TypeScript
npx tsc --noEmit
```

**Edge Function Issues**
```bash
# Check function logs in Supabase dashboard
# Test locally with curl:
curl -X POST https://[project].supabase.co/functions/v1/[function-name] \
  -H "Authorization: Bearer [token]"
```

---

## 📝 Code Snippets

### Create New Component
```typescript
import React from 'react';

interface Props {
  // Define props
}

export default function ComponentName({ }: Props) {
  return (
    <div className="bg-gray-800/50 rounded-xl p-6">
      {/* Component content */}
    </div>
  );
}
```

### Create New Edge Function
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Function logic here

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});
```

### Add Database Migration
```sql
/*
  # Migration Title

  1. New Tables
    - `table_name`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `table_name`
    - Add policies for authenticated users
*/

CREATE TABLE IF NOT EXISTS table_name (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own data"
  ON table_name FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
```

---

## 🎯 Feature Locations

### Health Tips Carousel
- **Component:** `src/components/HealthTips.tsx`
- **Used in:** `src/components/RaphaelHealthInterface.tsx`
- **Features:** 10 tips, auto-rotate, manual controls

### Custom Plugin Builder
- **Component:** `src/components/RaphaelConnectors.tsx`
- **Location:** Bottom of connectors page
- **Features:** Modal with templates, connected sources display

### Daily Questions
- **Component:** `src/components/DailyQuestionCard.tsx`
- **Backend:** `supabase/functions/get-daily-question/index.ts`
- **Database:** `daily_questions`, `daily_responses`

---

## 📊 Metrics

### Performance
- **Bundle Size:** 542.56 kB (137.85 kB gzipped)
- **Build Time:** ~3-5 seconds
- **Modules:** 1,576 transformed

### Files
- **Total Tracked:** 148 files
- **Components:** 22
- **Pages:** 7
- **Edge Functions:** 26
- **Migrations:** 37

---

## 🚨 Critical Files (Never Delete)

### Must Protect
- `.env` - All API keys and secrets
- `package.json` - Dependencies
- `vite.config.ts` - Build config
- All files in `/supabase/migrations/`
- `src/main.tsx` - App entry point
- `backend/app/main.py` - Backend entry

---

## 💡 Tips & Tricks

### Fast Component Creation
```bash
# Copy existing similar component as template
cp src/components/HealthGoals.tsx src/components/NewComponent.tsx
# Then edit the new file
```

### Find Component Usage
```bash
# Find where a component is imported
grep -r "import.*ComponentName" src/
```

### Count Lines of Code
```bash
find src -name "*.tsx" -o -name "*.ts" | xargs wc -l
```

---

## 🔗 Useful Links

### Project Documentation
- File Organization: `FILE_ORGANIZATION.md`
- Backup Status: `BACKUP_VERIFICATION.md`
- Project Status: `PROJECT_STATUS.md`
- Architecture: `ARCHITECTURE.md`

### External Resources
- [Supabase Docs](https://supabase.com/docs)
- [React Docs](https://react.dev)
- [TypeScript Docs](https://www.typescriptlang.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Lucide Icons](https://lucide.dev)

---

## ✅ Quick Checklist

### Before Making Changes
- [ ] Read relevant documentation
- [ ] Check existing similar code
- [ ] Understand file organization
- [ ] Plan your changes

### After Making Changes
- [ ] Run `npm run build` to verify
- [ ] Test functionality manually
- [ ] Update documentation if needed
- [ ] Commit with descriptive message

### Before Deployment
- [ ] All builds successful
- [ ] Environment variables set
- [ ] Database migrations applied
- [ ] Edge functions deployed

---

**Last Updated:** October 25, 2025
**For detailed information, see:** `FILE_ORGANIZATION.md`, `PROJECT_STATUS.md`

---

**END OF QUICK REFERENCE**
