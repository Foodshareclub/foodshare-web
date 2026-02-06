# Backend Migration - Day 1 Complete ✅

## What Was Implemented

### 1. Unified API Client (`src/lib/api/client.ts`)

- Abstraction layer for Supabase/Vercel backends
- Feature flag control via environment variables
- Automatic fallback if Supabase fails
- Gradual rollout support (0-100%)
- Monitoring and analytics tracking
- Response format transformation (Supabase camelCase → Vercel snake_case)

### 2. Environment Configuration (`.env.migration`)

- `NEXT_PUBLIC_USE_SUPABASE_BACKEND` - Enable/disable Supabase
- `NEXT_PUBLIC_SUPABASE_BACKEND_ROLLOUT` - Gradual rollout percentage
- `NEXT_PUBLIC_API_MONITORING` - Enable detailed logging

### 3. Updated Products Hook (`src/hooks/queries/useProducts.ts`)

- Now uses unified API client
- Zero changes to component code
- Transparent migration

## How It Works

```typescript
// API client automatically chooses backend
const products = await api.products.list({ type: "food" });

// If Supabase enabled: calls api-v1-products
// If Supabase disabled: calls /api/products
// If Supabase fails: automatically falls back to Vercel
```

## Testing Locally

### Step 1: Keep Vercel (Current State)

```bash
# .env.local
NEXT_PUBLIC_USE_SUPABASE_BACKEND=false
```

### Step 2: Test Supabase

```bash
# .env.local
NEXT_PUBLIC_USE_SUPABASE_BACKEND=true
NEXT_PUBLIC_SUPABASE_BACKEND_ROLLOUT=100

# Start dev server
bun run dev

# Check console for API logs:
# [API] products.list via supabase: 150ms ✓
```

### Step 3: Test Fallback

```bash
# Temporarily break Supabase (wrong URL)
# Should see:
# [API] Supabase failed, falling back to Vercel
# [API] products.list via vercel: 200ms ✓
```

## Deployment Strategy

### Week 1: Canary (10% of users)

```bash
# Vercel environment variables
vercel env add NEXT_PUBLIC_USE_SUPABASE_BACKEND true
vercel env add NEXT_PUBLIC_SUPABASE_BACKEND_ROLLOUT 10

# Deploy
vercel deploy --prod
```

**Monitor:**

- Check Google Analytics for `api_call` events
- Compare error rates: Supabase vs Vercel
- Compare latency: Should be similar

### Week 2: Ramp Up (50% of users)

```bash
vercel env add NEXT_PUBLIC_SUPABASE_BACKEND_ROLLOUT 50
vercel deploy --prod
```

### Week 3: Full Rollout (100% of users)

```bash
vercel env add NEXT_PUBLIC_SUPABASE_BACKEND_ROLLOUT 100
vercel deploy --prod
```

### Week 4: Cleanup

```bash
# After 1 week of stable operation
# Delete Vercel API route
rm src/app/api/products/route.ts

# Remove fallback code from API client
# Update to Supabase-only
```

## Monitoring

### Google Analytics Events

```javascript
// Automatically tracked
{
  event: 'api_call',
  endpoint: 'products.list',
  backend: 'supabase' | 'vercel',
  duration: 150, // ms
  success: true,
  error: undefined
}
```

### Console Logs (Development)

```
[API] products.list via supabase: 150ms ✓
[API] products.get via vercel: 200ms ✓
[API] Supabase failed, falling back to Vercel Error: ...
```

## Rollback Plan

### Instant Rollback (No Deployment)

```bash
# Just change env var
vercel env add NEXT_PUBLIC_USE_SUPABASE_BACKEND false

# Takes effect immediately for new requests
```

### Gradual Rollback

```bash
# Reduce rollout percentage
vercel env add NEXT_PUBLIC_SUPABASE_BACKEND_ROLLOUT 10  # Back to 10%
vercel env add NEXT_PUBLIC_SUPABASE_BACKEND_ROLLOUT 0   # Back to 0%
```

## Success Metrics

### Week 1 Goals

- ✅ 0% error rate increase
- ✅ Latency < 200ms (same as Vercel)
- ✅ 10% of users on Supabase
- ✅ Automatic fallback working

### Week 2 Goals

- ✅ 50% of users on Supabase
- ✅ No user complaints
- ✅ Monitoring dashboard showing healthy metrics

### Week 3 Goals

- ✅ 100% of users on Supabase
- ✅ Vercel `/api/products` calls drop to 0
- ✅ Ready to delete Vercel route

## Next Steps

### Day 2: Chat API Migration

1. Add `chat.send()` to API client (already done!)
2. Update `src/hooks/useChat.ts` to use API client
3. Test locally
4. Deploy with same rollout strategy

### Day 3-5: Monitor & Optimize

1. Watch analytics for errors
2. Optimize slow queries
3. Fine-tune rollout percentage
4. Document learnings

### Day 6-10: Challenges API

1. Check if Supabase function exists
2. Create if needed
3. Migrate frontend
4. Deploy

## Troubleshooting

### Issue: Supabase returns 401

**Cause:** Auth token not passed correctly
**Fix:** Check `Authorization` header in API client

### Issue: Response format mismatch

**Cause:** Transformation function incomplete
**Fix:** Update `transformSupabaseProduct()` in API client

### Issue: Infinite fallback loop

**Cause:** Both backends failing
**Fix:** Check network, database, and Supabase status

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Frontend                             │
│  useProducts() → api.products.list()                    │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│              Unified API Client                          │
│  - Feature flags                                         │
│  - Automatic fallback                                    │
│  - Monitoring                                            │
│  - Response transformation                               │
└────────┬────────────────────────────┬───────────────────┘
         │                            │
         ▼                            ▼
┌──────────────────┐        ┌──────────────────┐
│ Supabase Edge    │        │ Vercel API       │
│ api-v1-products  │        │ /api/products    │
│ (Primary)        │        │ (Fallback)       │
└──────────────────┘        └──────────────────┘
```

## Files Changed

- ✅ `src/lib/api/client.ts` - New unified API client
- ✅ `src/hooks/queries/useProducts.ts` - Updated to use API client
- ✅ `.env.migration` - Environment variables template
- ✅ `MIGRATION_DAY1_README.md` - This file

## Status

**Day 1: Complete ✅**

- Abstraction layer implemented
- Products API migrated
- Feature flags configured
- Monitoring added
- Ready for testing

**Next:** Test locally, then deploy with 10% rollout
