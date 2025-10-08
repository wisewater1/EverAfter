# Deployment Checklist

## Pre-Deployment

### 1. Environment & Credentials
- [ ] Confirm `.env` contains Supabase URL and anon key (or note demo-only deployment)
- [ ] Run `npm ci` to ensure the pinned dependency tree is installed
- [ ] Verify `npm run lint` passes without TypeScript compatibility warnings
- [ ] Verify `npm run build` succeeds

### 2. Supabase Setup (if using backend)
- [ ] Run `supabase_schema.sql` to provision tables and RLS policies
- [ ] Enable Email auth in Supabase Authentication settings
- [ ] Confirm `profiles`, `memories`, and `family_members` tables exist
- [ ] Configure storage/edge policies if media uploads are added later

### 3. Functional Smoke Test
- [ ] Landing page loads with hero CTA and supporting sections
- [ ] Dashboard overview tab shows seeded stats and daily question card
- [ ] Submit a memory (demo or Supabase) and see success toast/state update
- [ ] Invite a guardian and confirm status chip updates
- [ ] Review Saints AI tab for accurate copy and activity counts
- [ ] Configure a projection session and observe staged status badge
- [ ] Read through hologram guide and readiness checklist for clarity
- [ ] Inspect privacy and settings tabs for accurate copy and toggles

### 4. Accessibility & UX
- [ ] Validate keyboard navigation on buttons, tabs, and form controls
- [ ] Check focus outlines are visible on primary actions
- [ ] Review copy for tone and clarity with stakeholders

### 5. Performance & Monitoring
- [ ] Optional: run `npm run preview` and perform a Lighthouse audit
- [ ] Configure analytics and error tracking on the hosting platform
- [ ] Establish uptime alerts for Supabase (if used)

## Deployment Options

### Vercel
```bash
npm install -g vercel
vercel login
vercel --prod
```
- Set environment variables in the Vercel dashboard

### Netlify
```bash
npm install -g netlify-cli
netlify login
netlify deploy --prod
```
- Configure build command `npm run build` and publish directory `dist`

### Static Hosting
1. Run `npm run build`
2. Upload the `dist/` folder to your static host of choice (e.g. S3 + CloudFront, Firebase Hosting)
3. Configure SPA fallback to `index.html`

## Post-Deployment
- [ ] Verify production URL loads without console errors
- [ ] Test memory submission and guardian invitation against production Supabase
- [ ] Confirm projection console interactions still respond as expected
- [ ] Share documentation links (README, setup, hologram guide) with stakeholders
- [ ] Schedule regular dependency audits and Supabase policy reviews

## Emergency Procedures
1. Roll back to the previous deployment if critical issues occur
2. Check Supabase logs/dashboard for API or policy errors
3. Inspect hosting provider logs for build/runtime failures
4. Disable projection invites temporarily if safeguards misbehave

## Success Criteria
- ✅ Landing and dashboard render on desktop and mobile
- ✅ Daily prompt submission succeeds (demo or Supabase)
- ✅ Guardian invitations provide confirmation feedback
- ✅ Projection session staging displays success badge
- ✅ Hologram guide renders all steps, pillars, and readiness checks
- ✅ No critical accessibility issues
- ✅ Lint and build pipelines remain green
