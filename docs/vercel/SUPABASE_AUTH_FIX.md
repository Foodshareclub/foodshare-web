# Supabase Authentication Fix for Next.js 16

## Problem
After OAuth login (Google), the user session was not being properly recognized on server-side rendered pages. The navbar would not show the user's profile image and `getUser()` would return `null` even after successful login.

## Root Causes Identified

1. **Missing NEXT_PUBLIC_SITE_URL**: OAuth callback `redirectTo` parameter was using an undefined environment variable
2. **Proxy not configured correctly**: The `proxy.ts` file existed but wasn't properly set up for Next.js 16
3. **Incorrect route handler directive**: Auth callback had `'use server'` which is invalid for route handlers
4. **Missing revalidation**: After code exchange, the app wasn't revalidating to reflect the new auth state
5. **Using getUser() instead of getSession()**: Less reliable for session refresh in proxy/middleware

## Changes Made

### 1. Added NEXT_PUBLIC_SITE_URL to `.env.local`

```bash
# Site URL for OAuth callbacks (development)
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

**Production**: Set this to your production domain (e.g., `https://yourapp.com`)

### 2. Updated `/src/proxy.ts`

**Important**: In Next.js 16, use `proxy.ts` directly (NOT `middleware.ts`). Next.js 16 automatically detects and uses `proxy.ts` as middleware.

Key improvements:
- Changed from `getUser()` to `getSession()` for more reliable session refresh
- Added comprehensive documentation
- Improved cookie handling
- Better error handling for admin routes

### 3. Fixed `/src/app/auth/callback/route.ts`

Changes:
- Removed incorrect `'use server'` directive (route handlers should NOT use this)
- Added `revalidatePath('/', 'layout')` to refresh the entire app after login
- Improved error logging in development
- Added comprehensive documentation

## How It Works

### OAuth Login Flow

```
1. User clicks "Login with Google"
   ↓
2. Server Action (getOAuthSignInUrl) generates OAuth URL
   redirectTo: http://localhost:3000/auth/callback
   ↓
3. User authorizes on Google
   ↓
4. Google redirects to: /auth/callback?code=AUTH_CODE
   ↓
5. Route handler exchanges code for session (sets cookies)
   ↓
6. revalidatePath('/', 'layout') is called
   ↓
7. User redirected to home page
   ↓
8. Middleware refreshes session on every request
   ↓
9. Server components can now access user via getUser()
```

### Session Refresh (Middleware)

On every request:

```
1. Request arrives
   ↓
2. Middleware creates Supabase client with cookie handlers
   ↓
3. supabase.auth.getSession() refreshes session if needed
   ↓
4. Updated session cookies are set in response
   ↓
5. Request continues to page/API route
   ↓
6. Server components have fresh session data
```

## Testing the Fix

### 1. Start the development server

```bash
npm run dev
```

### 2. Test OAuth Login

1. Navigate to `http://localhost:3000`
2. Click "Login" or "Sign in with Google"
3. Complete the Google OAuth flow
4. You should be redirected back to the home page
5. **Verify**: Your profile image appears in the navbar
6. **Verify**: No console errors about undefined user

### 3. Test Session Persistence

1. After logging in, refresh the page multiple times
2. **Verify**: You remain logged in (profile image still shows)
3. Open DevTools → Application → Cookies
4. **Verify**: You see cookies like `sb-***REMOVED***-auth-token`

### 4. Test Admin Routes (if applicable)

1. Navigate to `/admin`
2. **If not admin**: Should redirect to home page
3. **If admin**: Should show admin dashboard

### 5. Test Sign Out

1. Click "Sign Out"
2. **Verify**: Profile image disappears
3. **Verify**: Redirected appropriately
4. **Verify**: Session cookies are cleared

## Debugging

### Enable Detailed Logging

Add this to your `.env.local`:

```bash
NODE_ENV=development
```

The auth callback will now log errors:

```typescript
console.error('[Auth Callback] Error exchanging code for session:', error);
```

### Check Supabase Dashboard

1. Go to Supabase Dashboard → Authentication → Users
2. Verify the user was created after OAuth login
3. Check the user's metadata for OAuth provider info

### Check Middleware Execution

Add temporary logging to `/src/proxy.ts`:

```typescript
export async function proxy(request: NextRequest) {
  console.log('[Middleware] Request:', request.nextUrl.pathname);

  const { data: { session } } = await supabase.auth.getSession();
  console.log('[Middleware] Session:', session?.user?.id || 'No session');

  // ... rest of code
}
```

### Common Issues

**Issue**: Still showing "null" user after login
**Solution**:
- Clear cookies and cache
- Restart dev server
- Check that NEXT_PUBLIC_SITE_URL matches your dev URL exactly

**Issue**: Timeout errors
**Solution**:
- Check Supabase project is not paused
- Verify network connection
- Check Supabase status page

**Issue**: "Invalid code" error
**Solution**:
- Make sure OAuth redirect URL in Supabase matches NEXT_PUBLIC_SITE_URL
- Check that OAuth provider (Google) is configured in Supabase

## Supabase OAuth Configuration

### Google OAuth Setup

1. Go to Supabase Dashboard → Authentication → Providers → Google
2. Enable Google provider
3. Add OAuth Client ID and Secret from Google Cloud Console
4. Add authorized redirect URIs:
   - Development: `http://localhost:3000/auth/callback`
   - Production: `https://yourapp.com/auth/callback`

### Update Site URL in Supabase

1. Go to Authentication → URL Configuration
2. Set **Site URL** to match your `NEXT_PUBLIC_SITE_URL`
3. Add redirect URLs to the allow list:
   - `http://localhost:3000/**` (development)
   - `https://yourapp.com/**` (production)

## Production Deployment

Before deploying to production:

1. **Update environment variables on Vercel**:
   ```bash
   NEXT_PUBLIC_SITE_URL=https://yourapp.com
   ```

2. **Update Supabase redirect URLs**:
   - Add production callback URL to OAuth provider settings
   - Update Site URL in Supabase settings

3. **Test in production**:
   - Verify OAuth login works on production domain
   - Check that cookies are set with correct domain and secure flags
   - Test session persistence across page reloads

## Architecture

### File Structure

```
src/
├── proxy.ts                   # Session refresh (Next.js 16 automatically uses this)
├── lib/
│   └── supabase/
│       ├── server.ts          # Server Supabase client (cookies)
│       └── client.ts          # Client Supabase client (localStorage)
├── app/
│   ├── auth/
│   │   └── callback/
│   │       └── route.ts       # OAuth callback handler
│   └── actions/
│       └── auth.ts            # Auth server actions (getUser, signOut, etc.)
```

### Client Types

- **Server Components**: Use `createClient()` from `@/lib/supabase/server`
- **Server Actions**: Use `createClient()` from `@/lib/supabase/server`
- **Client Components**: Use `supabase` from `@/lib/supabase/client`
- **Proxy (Middleware)**: Creates its own client with cookie handlers in `proxy.ts`

### Cookie Resilience

The server client includes built-in protection against corrupted cookies:

- **`getSafeCookies()` helper**: Filters out corrupted Supabase auth cookies (those starting with `sb-`)
- **Validation**: Checks that cookie values contain valid base64url characters
- **Graceful degradation**: Invalid cookies are filtered out with a warning, preventing "Invalid UTF-8 sequence" crashes
- **Error handling**: If cookie reading fails entirely, returns empty array to allow the app to continue

This prevents edge cases where browser storage corruption or malformed cookies could crash the entire application.

## Further Reading

- [Supabase Auth with Next.js App Router](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Next.js Middleware Documentation](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [OAuth Flow in Supabase](https://supabase.com/docs/guides/auth/social-login)
