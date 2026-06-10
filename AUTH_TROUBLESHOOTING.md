# Authentication Troubleshooting Guide

## Issue Fixed: Login/Signup Infinite Loading

### Problem
Users were experiencing infinite loading when trying to sign in or sign up. The button would show "Signing In..." or "Creating Account..." indefinitely without redirecting to the dashboard.

### Root Cause
The authentication flow had several issues:

1. **State Update Timing**: The login/signup pages weren't properly handling the async auth state changes
2. **Missing Error Handling**: No try-catch blocks around auth calls
3. **State Management**: The `loading` state wasn't being managed correctly after successful auth
4. **Session Updates**: Manual session updates weren't happening immediately in AuthContext

### Solutions Implemented

#### 1. Enhanced AuthContext (`src/contexts/AuthContext.tsx`)

**Changes Made:**
- Added console logging for debugging
- Added manual state updates after successful auth
- Added proper error handling with try-catch blocks
- Set session and user state immediately after auth success

**Key Code Changes:**
```typescript
// Sign In - Now manually updates state
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password,
});

if (data?.user && data?.session) {
  setSession(data.session);
  setUser(data.user);  // Triggers useEffect in Login page
}

// Sign Up - Same pattern
if (data?.user && data?.session) {
  setSession(data.session);
  setUser(data.user);  // Triggers useEffect in Signup page
}
```

#### 2. Updated Login Page (`src/pages/Login.tsx`)

**Changes Made:**
- Added try-catch for error handling
- Removed premature `setLoading(false)` on success
- Added console logging
- Let useEffect handle navigation when user state updates

**Key Code Changes:**
```typescript
try {
  const { error } = await signIn(email, password);

  if (error) {
    // Handle error
    setLoading(false);
  } else {
    // Success - navigation via useEffect
    // Don't set loading false to avoid flicker
  }
} catch (err) {
  setError('An unexpected error occurred. Please try again.');
  setLoading(false);
}
```

#### 3. Updated Signup Page (`src/pages/Signup.tsx`)

**Changes Made:**
- Same pattern as Login page
- Added try-catch for error handling
- Improved error messages
- Added console logging

### How It Works Now

1. **User submits form**
   - Login/Signup page sets `loading = true`
   - Shows loading spinner

2. **Auth request made**
   - AuthContext calls Supabase auth
   - Logs progress to console

3. **On Success**
   - AuthContext manually updates `user` and `session` state
   - This triggers `onAuthStateChange` listener
   - Login/Signup page's useEffect detects `user` change
   - Automatic redirect to `/dashboard`
   - Loading spinner continues (no flicker)

4. **On Error**
   - Error displayed to user
   - Loading spinner stops
   - User can retry

### Console Logging

The following logs help debug auth flow:

```
[AuthContext] Starting sign in for: user@example.com
[AuthContext] Sign in successful: { hasUser: true, hasSession: true, userId: "..." }
[Login] User state changed: { hasUser: true, userId: "..." }
[Login] Navigating to dashboard
```

### Supabase Configuration

Ensure your Supabase project has:

1. **Email Auth Enabled**
   - Go to Authentication → Providers → Email
   - Enable "Email" provider
   - Confirm email can be disabled for testing

2. **Auto-Confirm Emails** (Optional, for development)
   - Emails are auto-confirmed by migration
   - See: `20251025080210_auto_confirm_user_emails.sql`

3. **Environment Variables**
   ```env
   VITE_SUPABASE_URL=your-project-url
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

### Testing

To test the auth flow:

1. **Sign Up Flow**
   ```
   1. Go to /signup
   2. Enter email and password
   3. Click "Create Account"
   4. Watch console for logs
   5. Should redirect to /dashboard
   ```

2. **Sign In Flow**
   ```
   1. Go to /login
   2. Enter email and password
   3. Click "Sign In"
   4. Watch console for logs
   5. Should redirect to /dashboard
   ```

3. **Error Handling**
   ```
   1. Try invalid credentials
   2. Should show error message
   3. Loading should stop
   4. User can retry
   ```

### Common Issues & Solutions

#### Issue: Still Loading Indefinitely

**Possible Causes:**
1. Supabase credentials incorrect
2. Network issues
3. CORS issues

**Solution:**
1. Check browser console for errors
2. Verify .env file has correct credentials
3. Test Supabase connection:
   ```typescript
   const { data, error } = await supabase.from('user_profiles').select('count');
   console.log('Supabase test:', { data, error });
   ```

#### Issue: "Invalid Login Credentials"

**Causes:**
- Email not registered
- Wrong password
- User not confirmed (if email confirmation enabled)

**Solution:**
- Check Supabase Dashboard → Authentication → Users
- Verify user exists
- Check if email is confirmed

#### Issue: Redirects but Shows Blank Page

**Cause:**
- Dashboard page error
- Missing data
- Auth state not fully loaded

**Solution:**
1. Check Dashboard component for errors
2. Add loading state to Dashboard
3. Verify user profile exists in database

### Migration Notes

The following migration ensures users are auto-confirmed:
```sql
-- 20251025080210_auto_confirm_user_emails.sql
UPDATE auth.users
SET email_confirmed_at = now()
WHERE email_confirmed_at IS NULL;
```

This eliminates email confirmation step for development.

### Debugging Checklist

When auth issues occur:

- [ ] Check browser console for errors
- [ ] Verify .env variables are loaded
- [ ] Check Network tab for API calls
- [ ] Look for auth-related console logs
- [ ] Verify user exists in Supabase Dashboard
- [ ] Check if email is confirmed
- [ ] Test with a new user account
- [ ] Clear browser cache and cookies
- [ ] Try incognito mode

### Additional Resources

- **Supabase Auth Docs**: https://supabase.com/docs/guides/auth
- **React Router**: https://reactrouter.com/
- **Auth Flow Diagram**: See ARCHITECTURE.md

### Status

✅ **FIXED** - Authentication now works correctly
- Sign up redirects to dashboard
- Sign in redirects to dashboard
- Error handling works properly
- Loading states managed correctly
- Console logging for debugging

Last Updated: October 25, 2025
