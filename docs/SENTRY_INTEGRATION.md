# Sentry Integration Guide

## Overview

Foodshare uses [Sentry](https://sentry.io) for error tracking, performance monitoring, and session replay across client, server, and edge runtimes. This guide covers setup, configuration, testing, and best practices.

## Features

- **Error Tracking**: Automatic capture of unhandled errors and exceptions
- **Performance Monitoring**: Track page loads, API calls, and database queries
- **Session Replay**: Video-like reproductions of user sessions when errors occur
- **Source Maps**: Readable stack traces with original source code
- **Release Tracking**: Link errors to specific Git commits
- **Environment Separation**: Development errors stay local, production errors go to Sentry

## Configuration

### Environment Variables

Add to `.env.local`:

```bash
# Sentry DSN (Data Source Name)
NEXT_PUBLIC_SENTRY_DSN=https://your-key@your-org.ingest.sentry.io/your-project-id

# Optional: Git commit SHA for release tracking (auto-set by Vercel)
NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA=abc123...
```

### Configuration Files

Sentry is configured in three separate files for different Next.js runtimes:

#### 1. Client Configuration (`sentry.client.config.ts`)

Handles browser-side errors:

```typescript
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1, // 10% of transactions
  replaysSessionSampleRate: 0.1, // 10% of sessions
  replaysOnErrorSampleRate: 1.0, // 100% of error sessions
  enabled: process.env.NODE_ENV === "production",
  integrations: [Sentry.replayIntegration(), Sentry.browserTracingIntegration()],
});
```

**Features**:

- Session replay with privacy masking (text/media blocked)
- Browser performance tracing
- Filters out browser extension errors
- Ignores network errors and third-party scripts

#### 2. Server Configuration (`sentry.server.config.ts`)

Handles server-side errors:

```typescript
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  enabled: process.env.NODE_ENV === "production",
});
```

**Features**:

- Filters expected Next.js redirects (`NEXT_REDIRECT`, `NEXT_NOT_FOUND`)
- Ignores Supabase auth session errors (expected flow)
- Lower sample rate for high-volume server requests

#### 3. Edge Configuration (`sentry.edge.config.ts`)

Handles edge runtime errors (middleware, edge functions):

```typescript
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.05, // 5% for high-volume edge
  enabled: process.env.NODE_ENV === "production",
});
```

**Features**:

- Minimal configuration for edge runtime constraints
- Lower sample rate due to high request volume

## Testing Sentry Integration

### Test Page

Visit `/sentry-example-page` to test error tracking:

```typescript
// Trigger test error
throw new Error("Sentry Test Error - This is a test error from the example page");

// Call undefined function
myUndefinedFunction();
```

### API Test Route (Bypasses Development Mode)

For testing in development without switching to production mode, use the API test route:

```bash
# Send a test event directly to Sentry
curl http://localhost:3000/api/sentry-test
```

**Response (success)**:

```json
{
  "success": true,
  "message": "Test event sent to Sentry!",
  "eventId": "abc123...",
  "checkAt": "https://foodshare.sentry.io/issues/"
}
```

**Response (invalid DSN)**:

```json
{
  "error": "Invalid DSN format",
  "message": "The NEXT_PUBLIC_SENTRY_DSN appears to be an auth token, not a DSN.",
  "hint": "Get your DSN from: https://foodshare.sentry.io/settings/projects/foodshare-web/keys/"
}
```

This route sends events directly to the Sentry Store API, bypassing the SDK's development mode check. Useful for verifying your DSN is configured correctly.

### Expected Behavior

**Development Mode** (`NODE_ENV=development`):

- ✅ Errors logged to browser console
- ✅ Console shows: `[Sentry] Would send event: <error message>`
- ❌ No events sent to Sentry dashboard (via SDK)
- ✅ `/api/sentry-test` sends events directly (bypasses SDK)

**Production Mode** (`NODE_ENV=production`):

- ✅ Errors sent to Sentry dashboard
- ✅ Session replay captured for errors
- ✅ Stack traces with source maps
- ✅ View at: https://foodshare.sentry.io/issues/

### Manual Testing

```typescript
// In any component or page
import * as Sentry from "@sentry/nextjs";

// Capture exception
try {
  riskyOperation();
} catch (error) {
  Sentry.captureException(error);
}

// Capture message
Sentry.captureMessage("Something went wrong", "warning");

// Add context
Sentry.setUser({ id: userId, email: userEmail });
Sentry.setTag("feature", "food-listing");
Sentry.setContext("listing", { id: listingId, title: listingTitle });
```

## Usage Patterns

### Error Boundaries

Wrap components with error boundaries:

```typescript
'use client';

import { ErrorBoundary } from '@sentry/nextjs';

export default function MyPage() {
  return (
    <ErrorBoundary
      fallback={<ErrorFallback />}
      showDialog
    >
      <MyComponent />
    </ErrorBoundary>
  );
}

function ErrorFallback() {
  return (
    <div>
      <h2>Something went wrong</h2>
      <button onClick={() => window.location.reload()}>
        Reload page
      </button>
    </div>
  );
}
```

### API Route Errors

```typescript
// app/api/listings/route.ts
import * as Sentry from "@sentry/nextjs";

export async function GET(request: Request) {
  try {
    const listings = await fetchListings();
    return Response.json(listings);
  } catch (error) {
    Sentry.captureException(error, {
      tags: { api: "listings" },
      extra: { url: request.url },
    });
    return Response.json({ error: "Failed to fetch listings" }, { status: 500 });
  }
}
```

### Server Actions

```typescript
"use server";

import * as Sentry from "@sentry/nextjs";

export async function createListing(formData: FormData) {
  try {
    const listing = await db.listings.create({
      data: parseFormData(formData),
    });
    return { success: true, listing };
  } catch (error) {
    Sentry.captureException(error, {
      tags: { action: "create-listing" },
      user: { id: userId },
    });
    return { success: false, error: "Failed to create listing" };
  }
}
```

### User Context

```typescript
// Set user context after authentication
import * as Sentry from "@sentry/nextjs";

function onUserLogin(user: User) {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.username,
  });
}

function onUserLogout() {
  Sentry.setUser(null);
}
```

### Custom Tags and Context

```typescript
// Add custom tags for filtering
Sentry.setTag("feature", "messaging");
Sentry.setTag("user_type", "premium");

// Add structured context
Sentry.setContext("listing", {
  id: listing.id,
  title: listing.title,
  category: listing.category,
  status: listing.status,
});

// Add breadcrumbs for debugging
Sentry.addBreadcrumb({
  category: "user-action",
  message: "User clicked create listing",
  level: "info",
});
```

## Performance Monitoring

### Automatic Instrumentation

Sentry automatically tracks:

- Page loads and navigation
- API route performance
- Database query duration (via integrations)
- External HTTP requests

### Custom Transactions

```typescript
import * as Sentry from "@sentry/nextjs";

async function processLargeDataset() {
  const transaction = Sentry.startTransaction({
    op: "task",
    name: "Process Large Dataset",
  });

  try {
    const span1 = transaction.startChild({
      op: "db",
      description: "Fetch data",
    });
    const data = await fetchData();
    span1.finish();

    const span2 = transaction.startChild({
      op: "process",
      description: "Transform data",
    });
    const result = transformData(data);
    span2.finish();

    return result;
  } finally {
    transaction.finish();
  }
}
```

## Session Replay

### Privacy Configuration

Session replay is configured with privacy-first defaults:

```typescript
Sentry.replayIntegration({
  maskAllText: true, // Mask all text content
  blockAllMedia: true, // Block images and videos
});
```

### Replay Sampling

- **Normal sessions**: 10% sampled (`replaysSessionSampleRate: 0.1`)
- **Error sessions**: 100% sampled (`replaysOnErrorSampleRate: 1.0`)

### Viewing Replays

1. Go to Sentry dashboard
2. Navigate to **Replays** section
3. Filter by error, user, or time range
4. Watch video-like reproduction of user session

## Source Maps

Source maps are automatically uploaded to Sentry during build:

```bash
# Production build with source maps
npm run build

# Vercel automatically uploads source maps
# For other platforms, configure in next.config.ts
```

Configuration in `next.config.ts`:

```typescript
const nextConfig = {
  sentry: {
    hideSourceMaps: true, // Hide source maps from public
    widenClientFileUpload: true, // Upload more files
    disableLogger: true, // Reduce bundle size
  },
};
```

## Filtering and Ignoring Errors

### Client-Side Filters

```typescript
ignoreErrors: [
  // Browser extensions
  /^chrome-extension:\/\//,
  /^moz-extension:\/\//,

  // Network errors (user connectivity issues)
  "NetworkError",
  "Failed to fetch",
  "Load failed",

  // User-initiated navigation
  "AbortError",

  // Third-party scripts
  /^Script error\.?$/,
];
```

### Server-Side Filters

```typescript
ignoreErrors: [
  // Expected Next.js behavior
  "NEXT_REDIRECT",
  "NEXT_NOT_FOUND",

  // Network timeouts
  "ECONNRESET",
  "ETIMEDOUT",
];
```

### Custom Filtering

```typescript
beforeSend(event, hint) {
  // Filter by error message
  if (event.message?.includes('expected error')) {
    return null;
  }

  // Filter by user
  if (event.user?.email?.endsWith('@test.com')) {
    return null;
  }

  // Modify event before sending
  if (event.request?.cookies) {
    delete event.request.cookies; // Remove sensitive data
  }

  return event;
}
```

## Best Practices

### Do's ✅

- **Set user context** after authentication
- **Add custom tags** for filtering (feature, user_type, etc.)
- **Use breadcrumbs** to track user actions leading to errors
- **Capture expected errors** with `captureException()` in try-catch
- **Add context** to errors (listing ID, search query, etc.)
- **Test in production** mode before deploying
- **Review errors weekly** and fix high-frequency issues

### Don'ts ❌

- **Don't log sensitive data** (passwords, tokens, credit cards)
- **Don't capture expected user behavior** (404s, validation errors)
- **Don't set sample rate to 100%** in production (expensive)
- **Don't ignore all errors** - be selective with filters
- **Don't forget to test** the integration before going live

## Troubleshooting

### Errors Not Appearing in Sentry

**Check**:

1. Is `NEXT_PUBLIC_SENTRY_DSN` set correctly?
2. Is `NODE_ENV=production`?
3. Is the error filtered by `ignoreErrors`?
4. Is the error caught and not re-thrown?
5. Check browser console for `[Sentry]` messages

**Solution**:

```bash
# Verify DSN format (should be https://<key>@<host>/<project_id>)
echo $NEXT_PUBLIC_SENTRY_DSN

# Quick test without production mode (bypasses SDK)
curl http://localhost:3000/api/sentry-test

# Test in production mode
NODE_ENV=production npm run build
NODE_ENV=production npm run start

# Visit /sentry-example-page and trigger test error
```

### Source Maps Not Working

**Check**:

1. Are source maps uploaded during build?
2. Is the release version matching?
3. Are source maps hidden from public?

**Solution**:

```typescript
// next.config.ts
const nextConfig = {
  sentry: {
    hideSourceMaps: true,
    widenClientFileUpload: true,
  },
};
```

### Too Many Events

**Check**:

1. Is sample rate too high?
2. Are noisy errors being captured?

**Solution**:

```typescript
// Reduce sample rate
tracesSampleRate: 0.05,  // 5% instead of 10%

// Add more filters
ignoreErrors: [
  'ResizeObserver loop limit exceeded',
  'Non-Error promise rejection',
]
```

### Session Replays Not Recording

**Check**:

1. Is replay integration enabled?
2. Is sample rate > 0?
3. Is user on supported browser?

**Solution**:

```typescript
// Increase sample rate for testing
replaysSessionSampleRate: 1.0,  // 100% for testing
replaysOnErrorSampleRate: 1.0,
```

## Dashboard and Alerts

### Viewing Errors

1. Go to https://foodshare.sentry.io
2. Navigate to **Issues** → **All Issues**
3. Filter by:
   - Environment (production, staging)
   - Release version
   - User, tag, or custom filter

### Setting Up Alerts

1. Go to **Alerts** → **Create Alert**
2. Choose alert type:
   - **Issues**: New error, regression, spike
   - **Performance**: Slow transactions, high error rate
3. Configure conditions and notifications (email, Slack, etc.)

### Recommended Alerts

- **New Issue**: Alert when a new error type appears
- **Regression**: Alert when a resolved error reappears
- **Spike**: Alert when error rate increases 2x
- **Performance**: Alert when p95 response time > 3s

## Resources

- [Sentry Next.js Documentation](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Sentry Dashboard](https://foodshare.sentry.io)
- [Session Replay Guide](https://docs.sentry.io/product/session-replay/)
- [Performance Monitoring](https://docs.sentry.io/product/performance/)
- [Source Maps Guide](https://docs.sentry.io/platforms/javascript/sourcemaps/)

## Support

For issues with Sentry integration:

1. Check this documentation
2. Review [Sentry troubleshooting guide](https://docs.sentry.io/platforms/javascript/guides/nextjs/troubleshooting/)
3. Test with `/sentry-example-page`
4. Contact the development team
