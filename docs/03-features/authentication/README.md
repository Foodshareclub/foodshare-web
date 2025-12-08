# Supabase Auth Optimization Guide

## Overview

This guide documents the authentication system for FoodShare, built with Supabase Auth. The codebase supports two patterns:

1. **Server Actions (Recommended)** - For new features, uses `src/app/actions/auth.ts`
2. **useAuth Hook (Legacy)** - Existing code uses Redux-based `useAuth` hook

New features should use Server Actions with `useTransition` for pending states.

---

## Architecture

### File Structure

```
src/
├── app/
│   └── actions/
│       └── auth.ts                # Server Actions (recommended)
├── lib/
│   └── supabase/
│       ├── client.ts              # Browser client (realtime, OAuth)
│       └── server.ts              # Server client (Server Actions)
├── api/
│   ├── authAPI.ts                 # Legacy auth API methods
│   └── profileAPI.ts              # Profile operations
├── hooks/
│   └── useAuth.ts                 # Legacy custom auth hook
├── components/
│   └── auth/
│       ├── AuthProvider.tsx       # Auth state provider
│       └── ProtectedRoute.tsx     # Route protection
└── store/
    └── slices/
        └── userReducer.ts         # Legacy auth state management
```

---

## Server Actions (Recommended Pattern)

### Available Actions

Located in `src/app/actions/auth.ts`:

| Action | Purpose |
|--------|---------|
| `getSession()` | Get current session |
| `getUser()` | Get user with profile |
| `checkIsAdmin()` | Check admin status via `user_roles` table |
| `signInWithPassword()` | Email/password login |
| `signUp()` | Register new user |
| `signOut()` | Sign out and redirect |
| `resetPassword()` | Request password reset |
| `updatePassword()` | Update password |
| `getOAuthSignInUrl()` | Get OAuth redirect URL |

> **Note on Admin Checking:** The `checkIsAdmin()` function queries the `user_roles` junction table (source of truth for role assignments) to check if the user has an `admin` or `superadmin` role. This is more flexible than the legacy JSONB `role` field in `profiles`.

### Password Reset Example (Server Action Pattern)

```tsx
// src/app/auth/forgot-password/page.tsx
'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { resetPassword } from '@/app/actions/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function ForgotPasswordPage() {
  const t = useTranslations();
  const [isPending, startTransition] = useTransition();
  
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await resetPassword(email);
      if (result.success) {
        setIsSuccess(true);
      } else {
        setError(result.error || t('ForgotPassword.error_generic'));
      }
    });
  };

  if (isSuccess) {
    return <SuccessMessage email={email} />;
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <Button type="submit" disabled={isPending || !email}>
        {isPending ? 'Sending...' : t('ForgotPassword.send_reset_link')}
      </Button>
    </form>
  );
}
```

### Key Benefits of Server Actions

- **No client-side API calls** - Auth logic runs on server
- **Automatic cache invalidation** - Uses `invalidateTag()` and `revalidatePath()`
- **Type-safe** - Full TypeScript support
- **i18n ready** - Works with `next-intl`
- **Better UX** - `useTransition` provides non-blocking pending states

---

## Legacy Pattern (useAuth Hook)

The following sections document the legacy `useAuth` hook pattern. Use this when working with existing code that already uses Redux for auth state.

---

## Key Improvements (Legacy)

### 1. Optimized Supabase Client

**Location**: `src/lib/supabase/client.ts`

**Features**:

- ✅ Storage health check (localStorage + IndexedDB)
- ✅ Safe storage wrapper with memory fallback
- ✅ PKCE flow for enhanced security
- ✅ Proper error handling
- ✅ TypeScript strict mode
- ✅ Development logging

**Benefits**:

- Prevents "IO error: Unable to create writable file" errors
- Graceful degradation when storage is unavailable
- Better security with PKCE flow
- Clear error messages for debugging

### 2. Centralized Auth API

**Location**: `src/api/authAPI.ts`

**Methods**:

- `register()` - Email/password registration
- `loginWithPassword()` - Email/password login
- `loginWithOtp()` - Magic link login
- `loginWithPhoneOtp()` - Phone OTP login
- `verifyOtp()` - OTP verification
- `loginWithProvider()` - OAuth (Google, GitHub, Facebook, Apple)
- `getSession()` - Get current session
- `getUser()` - Get current user
- `refreshSession()` - Refresh auth token
- `logout()` - Sign out user
- `requestPasswordRecovery()` - Password reset email
- `updatePassword()` - Update password
- `updateEmail()` - Update email
- `updateUserMetadata()` - Update user metadata
- `onAuthStateChange()` - Subscribe to auth events

**Benefits**:

- Single source of truth for auth operations
- Consistent error handling
- Easy to test and mock
- Type-safe with TypeScript

### 3. Custom useAuth Hook

**Location**: `src/hook/useAuth.ts`

**Features**:

```typescript
const {
  // State
  isAuth,
  isRegister,
  isAdmin,
  adminCheckStatus,
  user,
  session,
  userProfile,
  authError,

  // Actions
  loginWithPassword,
  loginWithOtp,
  loginWithProvider,
  register,
  logout,
  requestPasswordRecovery,
  setNewPassword,
  clearError,
  refreshProfile,
} = useAuth();
```

**Benefits**:

- Clean component API
- Automatic error handling
- Type-safe operations
- Easy to use in any component

### 4. Auth Provider Component

**Location**: `src/components/auth/AuthProvider.tsx`

**Features**:

- Initializes auth session on app load
- Subscribes to real-time auth state changes
- Automatically fetches user profile
- Checks admin status
- Handles token refresh

**Usage**:

```tsx
// In App.tsx or index.tsx
import { AuthProvider } from "@/components/auth/AuthProvider";

<Provider store={store}>
  <AuthProvider>
    <App />
  </AuthProvider>
</Provider>;
```

### 5. Protected Route Component

**Location**: `src/components/auth/ProtectedRoute.tsx`

**Features**:

- Redirects unauthenticated users to login
- Optional admin-only routes
- Loading state while checking auth
- Preserves intended destination

**Usage**:

```tsx
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

// Regular protected route
<Route
  path="/profile"
  element={
    <ProtectedRoute>
      <ProfilePage />
    </ProtectedRoute>
  }
/>

// Admin-only route
<Route
  path="/admin"
  element={
    <ProtectedRoute requireAdmin>
      <AdminDashboard />
    </ProtectedRoute>
  }
/>
```

---

## Migration Guide

### Step 1: Update Imports

Replace all old imports:

```typescript
// ❌ Old
import { supabase } from "@/supaBase.config";

// ✅ New
import { supabase } from "@/lib/supabase/client";
```

### Step 2: Wrap App with AuthProvider

```tsx
// src/index.tsx or App.tsx
import { AuthProvider } from "@/components/auth/AuthProvider";

<Provider store={store}>
  <AuthProvider>
    <RouterProvider router={router} />
  </AuthProvider>
</Provider>;
```

### Step 3: Use useAuth Hook in Components

```tsx
// ❌ Old way
import { useAppDispatch, useAppSelector } from "@/hook/hooks";
import { loginTC } from "@/store";

const LoginPage = () => {
  const dispatch = useAppDispatch();
  const { isAuth, authError } = useAppSelector((state) => state.user);

  const handleLogin = async () => {
    await dispatch(loginTC({ email, password }));
  };
};

// ✅ New way
import { useAuth } from "@/hook";

const LoginPage = () => {
  const { loginWithPassword, isAuth, authError } = useAuth();

  const handleLogin = async () => {
    const result = await loginWithPassword(email, password);
    if (result.success) {
      navigate("/dashboard");
    }
  };
};
```

### Step 4: Protect Routes

```tsx
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

const router = createBrowserRouter([
  {
    path: "/profile",
    element: (
      <ProtectedRoute>
        <ProfilePage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/admin",
    element: (
      <ProtectedRoute requireAdmin>
        <AdminDashboard />
      </ProtectedRoute>
    ),
  },
]);
```

---

## Usage Examples

### Login with Email/Password

```tsx
import { useAuth } from "@/hook";

const LoginForm = () => {
  const { loginWithPassword, authError, clearError } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    const result = await loginWithPassword(email, password);

    if (result.success) {
      navigate("/dashboard");
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {authError && <Alert status="error">{authError}</Alert>}
      <Input value={email} onChange={(e) => setEmail(e.target.value)} />
      <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <Button type="submit">Login</Button>
    </form>
  );
};
```

### Register New User

The `register` function supports both object and positional argument patterns:

```tsx
import { useAuth } from "@/hook";

const RegisterForm = () => {
  const { register, authError } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Recommended: Object pattern with firstName/lastName
    const result = await register({
      email,
      password,
      firstName,
      lastName,
    });

    // Legacy: Positional arguments (still supported)
    // const result = await register(email, password, name);

    if (result.success) {
      // Show success message
      toast({ title: "Check your email to verify your account" });
    }
  };

  return <form onSubmit={handleSubmit}>...</form>;
};
```

### Magic Link Login

```tsx
import { useAuth } from "@/hook";

const MagicLinkForm = () => {
  const { loginWithOtp } = useAuth();
  const [email, setEmail] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = await loginWithOtp(email);

    if (result.success) {
      toast({ title: "Check your email for the magic link!" });
    }
  };

  return <form onSubmit={handleSubmit}>...</form>;
};
```

### OAuth Login

Supported providers: `google`, `github`, `facebook`, `apple`

```tsx
import { useAuth } from "@/hook";

const SocialLogin = () => {
  const { loginWithProvider } = useAuth();

  const handleGoogleLogin = () => loginWithProvider("google");
  const handleAppleLogin = () => loginWithProvider("apple");

  return (
    <>
      <Button onClick={handleGoogleLogin}>Continue with Google</Button>
      <Button onClick={handleAppleLogin}>Continue with Apple</Button>
    </>
  );
};
```

### Password Recovery

```tsx
import { useAuth } from "@/hook";

const ForgotPasswordForm = () => {
  const { requestPasswordRecovery } = useAuth();
  const [email, setEmail] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = await requestPasswordRecovery(email);

    if (result.success) {
      toast({ title: "Check your email for reset instructions" });
    }
  };

  return <form onSubmit={handleSubmit}>...</form>;
};
```

### Check Auth Status

```tsx
import { useAuth } from "@/hook";

const Header = () => {
  const { isAuth, isAdmin, user, logout } = useAuth();

  return (
    <Box>
      {isAuth ? (
        <>
          <Text>Welcome, {user.email}</Text>
          {isAdmin && <Badge>Admin</Badge>}
          <Button onClick={logout}>Logout</Button>
        </>
      ) : (
        <Button onClick={() => navigate("/login")}>Login</Button>
      )}
    </Box>
  );
};
```

---

## Best Practices

### 1. Always Clear Errors

```tsx
const { loginWithPassword, clearError } = useAuth();

// Clear error before new attempt
const handleLogin = async () => {
  clearError();
  await loginWithPassword(email, password);
};
```

### 2. Handle Loading States

```tsx
const [isLoading, setIsLoading] = useState(false);

const handleLogin = async () => {
  setIsLoading(true);
  try {
    const result = await loginWithPassword(email, password);
    if (result.success) {
      navigate("/dashboard");
    }
  } finally {
    setIsLoading(false);
  }
};
```

### 3. Validate Input Before Submission

```tsx
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  // Validate
  if (!email || !password) {
    toast({ title: "Please fill in all fields", status: "error" });
    return;
  }

  if (password.length < 6) {
    toast({ title: "Password must be at least 6 characters", status: "error" });
    return;
  }

  // Submit
  await loginWithPassword(email, password);
};
```

### 4. Refresh Profile After Updates

```tsx
const { refreshProfile } = useAuth();

const handleProfileUpdate = async () => {
  await updateProfile(data);
  await refreshProfile(); // Fetch latest profile data
};
```

### 5. Use Protected Routes

```tsx
// Don't manually check auth in components
// ❌ Bad
const ProfilePage = () => {
  const { isAuth } = useAuth();

  if (!isAuth) {
    return <Navigate to="/login" />;
  }

  return <div>Profile</div>;
};

// ✅ Good - Use ProtectedRoute
<Route
  path="/profile"
  element={
    <ProtectedRoute>
      <ProfilePage />
    </ProtectedRoute>
  }
/>;
```

---

## Security Considerations

### 1. PKCE Flow

The new client uses PKCE (Proof Key for Code Exchange) flow, which is more secure than the implicit flow:

```typescript
auth: {
  flowType: 'pkce', // More secure than implicit flow
}
```

### 2. Secure Redirects

All auth redirects use the current origin:

```typescript
emailRedirectTo: `${window.location.origin}/auth/callback`;
```

### 3. Session Persistence

Sessions are only persisted if storage is healthy:

```typescript
persistSession: storageHealth.healthy;
```

### 4. Token Refresh

Tokens are automatically refreshed:

```typescript
autoRefreshToken: true;
```

---

## Troubleshooting

### Issue: "IO error: Unable to create writable file"

**Cause**: Browser storage (IndexedDB) is corrupted or unavailable

**Solution**: The new client automatically detects this and falls back to memory-only mode

### Issue: Sessions not persisting

**Check**:

1. Browser storage health (check console logs)
2. Clear browser cache and reload
3. Check if cookies are enabled

### Issue: Auth state not updating

**Solution**: Ensure `AuthProvider` wraps your app:

```tsx
<Provider store={store}>
  <AuthProvider>
    <App />
  </AuthProvider>
</Provider>
```

### Issue: Admin status not checking

**Solution**: `checkIsAdminTC` is automatically called after login by `AuthProvider`

---

## Performance Optimizations

### 1. Memoized Callbacks

All auth actions in `useAuth` are wrapped with `useCallback`:

```typescript
const loginWithPassword = useCallback(
  async (email, password) => {
    // ...
  },
  [dispatch, authError]
);
```

### 2. Selective Re-renders

Components only re-render when relevant auth state changes:

```typescript
const { isAuth, user } = useAuth(); // Only re-renders when these change
```

### 3. Lazy Admin Check

Admin status is only checked after successful authentication, not on every render.

---

## Testing

### Mock useAuth Hook

```typescript
import { vi } from "vitest";

vi.mock("@/hook", () => ({
  useAuth: () => ({
    isAuth: true,
    user: { id: "123", email: "test@example.com" },
    loginWithPassword: vi.fn(),
    logout: vi.fn(),
  }),
}));
```

### Test Protected Routes

```typescript
import { render } from '@testing-library/react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

test('redirects to login when not authenticated', () => {
  // Mock unauthenticated state
  vi.mock('@/hook/hooks', () => ({
    useAppSelector: () => ({ isAuth: false }),
  }));

  const { container } = render(
    <ProtectedRoute>
      <div>Protected Content</div>
    </ProtectedRoute>
  );

  // Should redirect to login
});
```

---

## Migration Checklist

- [ ] Replace all `@/supaBase.config` imports with `@/lib/supabase/client`
- [ ] Wrap app with `<AuthProvider>`
- [ ] Update login components to use `useAuth` hook
- [ ] Replace manual auth checks with `<ProtectedRoute>`
- [ ] Test all auth flows (login, register, logout, password reset)
- [ ] Test admin-only routes
- [ ] Test OAuth providers
- [ ] Verify session persistence
- [ ] Check error handling
- [ ] Update documentation

---

## Summary

The optimized auth system provides:

✅ **Better error handling** - Graceful degradation when storage fails  
✅ **Enhanced security** - PKCE flow, secure redirects  
✅ **Cleaner API** - `useAuth` hook for easy component integration  
✅ **Type safety** - Full TypeScript support  
✅ **Real-time updates** - Auth state changes propagate automatically  
✅ **Admin support** - Built-in admin role checking  
✅ **Route protection** - Easy-to-use `ProtectedRoute` component  
✅ **Performance** - Memoized callbacks, selective re-renders

The system is production-ready and follows React 19 and Supabase best practices.
