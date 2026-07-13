# Deployment Checklist

## Pre-Deployment Steps

### 1. Supabase Setup
- [ ] Create Supabase project at https://supabase.com
- [ ] Copy project URL and anon key
- [ ] Run `supabase_schema.sql` in SQL Editor
- [ ] Verify all tables created successfully
- [ ] Test RLS policies
- [ ] Enable email auth in Authentication settings

### 2. Environment Configuration
- [ ] Create `.env` file from `.env.example`
- [ ] Add `VITE_SUPABASE_URL`
- [ ] Add `VITE_SUPABASE_ANON_KEY`
- [ ] Verify environment variables load correctly
- [ ] Test demo mode fallback works

### 3. Code Quality
- [ ] Run `npm run lint` - no errors
- [ ] Run `npm run build` - successful
- [ ] Check for TypeScript errors
- [ ] Verify all imports resolve
- [ ] Test all components render
- [ ] Check console for errors

### 4. Functionality Testing
- [ ] Test user authentication (sign up/in/out)
- [ ] Test daily question flow
- [ ] Test memory creation
- [ ] Test memory timeline display
- [ ] Test family dashboard navigation
- [ ] Test all Settings tab inputs
- [ ] Test Saints AI display
- [ ] Test projection settings
- [ ] Verify data persists to Supabase
- [ ] Test family member management

### 5. UI/UX Verification
- [ ] Test responsive design (mobile, tablet, desktop)
- [ ] Verify all icons display
- [ ] Check color contrast (accessibility)
- [ ] Test keyboard navigation
- [ ] Verify loading states
- [ ] Check error messages display
- [ ] Test form validation

### 6. Security Audit
- [ ] Verify RLS policies active
- [ ] Test unauthorized access blocked
- [ ] Check API keys not exposed
- [ ] Verify HTTPS in production
- [ ] Test CORS settings
- [ ] Check authentication flows

### 7. Performance
- [ ] Run Lighthouse audit
- [ ] Check bundle size (< 500KB)
- [ ] Verify lazy loading works
- [ ] Test page load times
- [ ] Check image optimization
- [ ] Verify caching headers

### 8. Documentation
- [ ] README.md complete
- [ ] SETUP.md clear and accurate
- [ ] API documentation (if needed)
- [ ] Comment complex code
- [ ] Environment variables documented
- [ ] Deployment steps documented

## Deployment Options

### Option 1: Vercel
```bash
npm install -g vercel
vercel login
vercel --prod
```
- Add environment variables in Vercel dashboard
- Configure custom domain (optional)

### Option 2: Netlify
```bash
npm install -g netlify-cli
netlify login
netlify deploy --prod
```
- Add environment variables in Netlify dashboard
- Configure custom domain (optional)

### Option 3: Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "preview"]
```

## Post-Deployment

### 1. Smoke Testing
- [ ] Visit production URL
- [ ] Test user registration
- [ ] Create test memory
- [ ] Verify data saves
- [ ] Test on mobile device
- [ ] Check all pages load

### 2. Monitoring Setup
- [ ] Set up error tracking (Sentry)
- [ ] Configure analytics (Google Analytics)
- [ ] Set up uptime monitoring
- [ ] Configure email alerts
- [ ] Set up performance monitoring

### 3. Backup Strategy
- [ ] Configure Supabase backups
- [ ] Test backup restore
- [ ] Document backup procedures
- [ ] Set backup schedule
- [ ] Store backups securely

### 4. User Communication
- [ ] Prepare launch announcement
- [ ] Create user onboarding guide
- [ ] Set up support email
- [ ] Create FAQ page
- [ ] Prepare demo video

## Emergency Procedures

### If Something Breaks
1. Check Supabase dashboard for errors
2. Review browser console logs
3. Check server logs (Vercel/Netlify)
4. Verify environment variables set
5. Test database connection
6. Roll back to previous deployment if needed

### Contact Information
- Supabase Support: support@supabase.io
- Hosting Support: (Vercel/Netlify contact)
- Database Issues: Check Supabase status page

## Success Criteria
- ✅ Application accessible via URL
- ✅ Users can sign up and sign in
- ✅ Memories save to database
- ✅ All pages load < 3 seconds
- ✅ No console errors
- ✅ Mobile responsive
- ✅ Data persists correctly
- ✅ Settings save properly

## Rollback Plan
If deployment fails:
1. Revert to previous Git commit
2. Redeploy known working version
3. Investigate issue in development
4. Fix and redeploy

---

**Status**: Ready for deployment
**Last Updated**: [Current Date]
**Deployed By**: [Your Name]
