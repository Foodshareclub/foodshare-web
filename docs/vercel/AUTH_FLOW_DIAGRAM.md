# OAuth Authentication Flow - Visual Guide

## Complete OAuth Login Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER CLICKS LOGIN                           │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  useAuth hook calls browser Supabase client directly:               │
│  supabase.auth.signInWithOAuth({ provider, options })              │
│  Location: /src/hooks/useAuth.ts                                   │
│                                                                     │
│  Options:                                                           │
│  - redirectTo: ${window.location.origin}/auth/callback              │
│  - skipBrowserRedirect: false (ensures same-tab redirect)           │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Browser redirects to Google OAuth (same tab)                       │
│  User authorizes the app                                            │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Google redirects back to:                                          │
│  http://localhost:3000/auth/callback?code=AUTH_CODE_HERE            │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Route Handler: /src/app/auth/callback/route.ts                    │
│                                                                     │
│  1. Extract code from URL params                                    │
│  2. Create Supabase server client                                   │
│  3. Exchange code for session:                                      │
│     supabase.auth.exchangeCodeForSession(code)                      │
│  4. Sets cookies: sb-*-auth-token                                   │
│  5. Revalidate app: revalidatePath('/', 'layout')                  │
│  6. Redirect to home page                                           │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Browser navigates to: http://localhost:3000/                      │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  PROXY (Middleware): /src/proxy.ts                                 │
│                                                                     │
│  Runs on EVERY request before page loads:                           │
│  1. Creates Supabase client with cookie handlers                    │
│  2. Calls: supabase.auth.getSession()                              │
│  3. Refreshes session if expired                                    │
│  4. Updates cookies in response                                     │
│  5. Continues to page                                               │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Server Component: /src/app/page.tsx                               │
│                                                                     │
│  1. Calls: getUser() server action                                  │
│  2. Creates Supabase server client (reads cookies)                  │
│  3. Returns user + profile data                                     │
│  4. Passes to client components as props                            │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Navbar shows user profile image ✓                                 │
│  User is authenticated ✓                                            │
└─────────────────────────────────────────────────────────────────────┘
```

## Key Components and Their Roles

### 1. useAuth Hook: loginWithOAuth()

**File**: `/src/hooks/useAuth.ts`

```typescript
const loginWithOAuth = useCallback(
  async (provider: "google" | "github" | "facebook" | "apple") => {
    // Use browser client directly for OAuth - ensures same-tab redirect
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        skipBrowserRedirect: false, // Ensure redirect happens in same tab
      },
    });
    // ...
  },
  [supabase]
);
```

> **Note:** The `getOAuthSignInUrl` server action in `/src/app/actions/auth.ts` is kept for backward compatibility but is no longer used by the `useAuth` hook. Using the browser client directly ensures same-tab redirect behavior.

### 2. OAuth Callback Route Handler

**File**: `/src/app/auth/callback/route.ts`

```typescript
export async function GET(request: Request) {
  const code = requestUrl.searchParams.get("code");
  const supabase = await createClient();

  // Exchange code for session (sets cookies)
  await supabase.auth.exchangeCodeForSession(code);

  // Revalidate to reflect new auth state
  revalidatePath("/", "layout");

  // Redirect home
  return NextResponse.redirect(new URL("/", request.url));
}
```

### 3. Proxy (Middleware)

**File**: `/src/proxy.ts`

```typescript
export async function proxy(request: NextRequest) {
  const supabase = createServerClient(url, key, {
    cookies: {
      // Modern getAll/setAll pattern (recommended by Supabase)
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // Refresh session on every request using getUser() (validates JWT)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return response; // with updated cookies
}
```

### 4. Server Component

**File**: `/src/app/page.tsx`

```typescript
export default async function Home() {
  const products = await getProducts('food');
  return <HomeClient initialProducts={products} />;
}
```

> **Note:** User authentication is handled by the Navbar component (rendered in root layout), which fetches user data independently. Page components like `HomeClient` focus on displaying content data.

### 5. Server Action: getUser()

**File**: `/src/app/actions/auth.ts`

```typescript
export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch profile from database
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();

  return { id: user.id, email: user.email, profile };
}
```

## Session Management

### Cookie Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                        After OAuth Login                            │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Cookies Set (by exchangeCodeForSession):                           │
│  - sb-***REMOVED***-auth-token                              │
│  - sb-***REMOVED***-auth-token-code-verifier               │
│                                                                     │
│  Domain: localhost                                                  │
│  Path: /                                                            │
│  HttpOnly: true                                                     │
│  Secure: true (production)                                          │
│  SameSite: lax                                                      │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     On Every Subsequent Request                     │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  1. Browser sends cookies automatically                             │
│  2. Proxy reads all cookies via: getAll() pattern                   │
│  3. Proxy calls: supabase.auth.getUser() (validates JWT)           │
│  4. If expired: Supabase refreshes token                            │
│  5. Proxy updates cookies via: setAll() pattern                     │
│  6. Server components read fresh session                            │
└─────────────────────────────────────────────────────────────────────┘
```

## Why It Works Now

### Before the Fix

```
❌ No NEXT_PUBLIC_SITE_URL → OAuth redirect fails
❌ proxy.ts not registered → Session never refreshes
❌ 'use server' in route handler → Build error
❌ No revalidatePath() → App doesn't update after login
❌ Using getUser() in proxy → Less reliable session refresh
```

### After the Fix

```
✓ NEXT_PUBLIC_SITE_URL set → OAuth redirects correctly
✓ proxy.ts auto-detected by Next.js 16 → Session refreshes on every request
✓ Route handler fixed → Code exchange works properly
✓ revalidatePath() called → App updates immediately after login
✓ Using getSession() in proxy → Reliable session refresh
```

## Request Flow Comparison

### Before (Broken)

```
User logs in → OAuth callback → Sets cookies → Redirects home
                                                    ↓
                                              Page loads (SSR)
                                                    ↓
                                        NO proxy to refresh session
                                                    ↓
                                        getUser() reads stale/no cookies
                                                    ↓
                                              Returns null ❌
```

### After (Fixed)

```
User logs in → OAuth callback → Sets cookies → revalidatePath() → Redirects home
                                                                        ↓
                                                                  Page loads (SSR)
                                                                        ↓
                                                            Proxy refreshes session
                                                                        ↓
                                                          Proxy updates cookies
                                                                        ↓
                                                      getUser() reads fresh cookies
                                                                        ↓
                                                        Returns user + profile ✓
```

## Debugging Checklist

When auth doesn't work:

1. **Check cookies in DevTools**
   - Should see: `sb-*-auth-token`
   - Should be HttpOnly, Secure (prod)

2. **Check proxy is running**
   - Build output shows: `ƒ Proxy (Middleware)`
   - Check: `/src/proxy.ts` exists

3. **Check environment variables**

   ```bash
   echo $NEXT_PUBLIC_SITE_URL  # Should match your dev URL
   ```

4. **Check Supabase redirect URLs**
   - Development: `http://localhost:3000/**`
   - Production: `https://yourapp.com/**`

5. **Check browser console**
   - No errors about undefined user
   - No CORS errors

6. **Test with fresh session**
   ```bash
   # Clear cookies and cache
   # Restart dev server
   npm run dev
   ```
