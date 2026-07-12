# EverAfter Production Deployment Checklist

Use this checklist before deploying to production. Complete all items marked CRITICAL first.

## 🔐 Security (CRITICAL - Do These First!)

### API Keys & Secrets

- [ ] **CRITICAL**: Rotate all API keys if any were exposed in Git history
- [ ] OpenAI API key set in **Supabase Dashboard → Functions → Secrets**
  - Name: `OPENAI_API_KEY`
  - Value: `sk-...` (NEVER commit to code)
- [ ] Verify `.env` is in `.gitignore`
- [ ] No service role keys in client-side code

### Authentication

- [ ] All Edge Functions call `supabase.auth.getUser()`
- [ ] JWT forwarded via `Authorization: Bearer <token>` header
- [ ] Structured error responses: `{ code, message, hint }`
- [ ] Session expiration configured (1 hour default)

### Database Security

- [ ] RLS enabled on ALL tables (verify with SQL below)
- [ ] All policies use `(select auth.uid())` pattern
- [ ] Foreign key indexes added for performance

**Verification SQL**:
```sql
-- Should return 0 rows
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
  AND tablename NOT LIKE 'pg_%'
  AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE pg_policies.tablename = pg_tables.tablename
  );
```

## 🚀 Edge Functions

### Deployment

- [ ] Supabase CLI installed: `npm install -g supabase`
- [ ] Linked to project: `supabase link --project-ref YOUR_REF`
- [ ] Functions deployed:
  ```bash
  supabase functions deploy raphael-chat
  supabase functions deploy task-create
  supabase functions deploy daily-progress
  ```
- [ ] Verify: `supabase functions list`

### Testing

- [ ] Smoke tests pass: `USER_JWT='...' ./scripts/smoke-test.sh`
- [ ] Manual cURL test successful (see EDGE_FUNCTIONS_SETUP.md)
- [ ] Error responses return structured JSON
- [ ] CORS headers allow production domain only

## 🗄️ Database

- [ ] All migrations applied
- [ ] `engram_ai_tasks` table exists
- [ ] `user_daily_progress` table exists
- [ ] RPC function `get_or_create_user_progress()` works
- [ ] Query performance <100ms (check Supabase Dashboard)

## 🎨 Frontend

- [ ] Production build: `npm run build` succeeds
- [ ] TypeScript: `npm run typecheck` passes
- [ ] ESLint: `npm run lint` passes
- [ ] Environment variables set in hosting:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`

### User Testing

- [ ] Login/logout works
- [ ] Chat with St. Raphael returns responses
- [ ] Task creation succeeds
- [ ] Mobile responsive (test iPhone SE, 12, 15 Pro Max)
- [ ] No horizontal scroll on 320px width

## 📱 Mobile (iPhone)

- [ ] Viewport includes `viewport-fit=cover`
- [ ] Safe area insets respected
- [ ] Touch targets ≥44x44px
- [ ] Text readable without zoom (min 15px)

## 🏥 Health & Safety

- [ ] Chat UI includes "Not medical advice" disclaimer
- [ ] Emergency situations direct to 911/local services
- [ ] St. Raphael never diagnoses conditions
- [ ] St. Raphael never prescribes medications

## 📊 Monitoring

- [ ] Function logs accessible (Dashboard → Functions → Logs)
- [ ] Error rate alerts configured (<5% threshold)
- [ ] OpenAI usage monitoring active
- [ ] No PHI or tokens in logs

## ✅ Post-Deployment (Within 1 Hour)

- [ ] Smoke tests pass in production
- [ ] Critical user flow works (signup → chat → task)
- [ ] Monitor error rates (should be <1%)
- [ ] Check Edge Function logs for issues

## 🆘 Emergency Rollback

If production breaks:

1. Check function logs: Dashboard → Functions → Logs
2. Verify JWT being sent: DevTools → Network → Headers
3. Check OpenAI key: `supabase secrets list`
4. Rollback: Redeploy previous working version

---

**Deployment Date**: ___________
**Deployed By**: ___________
**Version**: ___________
