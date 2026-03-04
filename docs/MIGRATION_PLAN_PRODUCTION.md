# Backend Consolidation Plan - Production Grade

## Executive Summary

**Goal:** Migrate web app from Vercel API routes to existing Supabase Edge Functions
**Timeline:** 2 weeks
**Risk:** Low (gradual rollout with feature flags)
**Impact:** 100% reduction in Vercel function costs, unified backend

## Current State Analysis

### Architecture Audit

```
Backend Infrastructure:
├── Supabase Edge Functions (59 functions)
│   ├── Used by: iOS, Android
│   ├── Runtime: Deno Deploy (global edge)
│   ├── Cost: Unlimited (included in Pro plan)
│   └── Status: Production, battle-tested
│
└── Vercel API Routes (17 active routes)
    ├── Used by: Web only
    ├── Runtime: Vercel Edge/Node
    ├── Cost: 100k limit → $20/month Pro
    └── Status: Hitting limits, needs migration
```

### Route Inventory

| Route                | Usages | Supabase Equivalent      | Complexity | Priority |
| -------------------- | ------ | ------------------------ | ---------- | -------- |
| `/api/products`      | 4      | `api-v1-products` ✅     | Low        | P0       |
| `/api/chat/messages` | 1      | `api-v1-chat` ✅         | Low        | P0       |
| `/api/challenges/*`  | 4      | TBD                      | Medium     | P1       |
| `/api/health`        | 2      | `health-advanced` ✅     | Low        | P2       |
| `/api/admin/email/*` | 10     | `process-email-queue` ⚠️ | High       | P3       |

**Legend:**

- ✅ Exists and compatible
- ⚠️ Exists but needs verification
- ❌ Needs creation

## Migration Strategy

### Phase 0: Foundation (Day 1-2)

#### 1. Create API Client Abstraction Layer

```typescript
// src/lib/api/client.ts
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export class APIClient {
  private useSupabase = process.env.NEXT_PUBLIC_USE_SUPABASE_API === "true";

  async products() {
    if (this.useSupabase) {
      const { data, error } = await supabase.functions.invoke("api-v1-products");
      if (error) throw error;
      return data;
    }
    // Fallback to Vercel
    const res = await fetch("/api/products");
    return res.json();
  }

  async chat(params: ChatParams) {
    if (this.useSupabase) {
      const { data, error } = await supabase.functions.invoke("api-v1-chat", {
        body: params,
      });
      if (error) throw error;
      return data;
    }
    const res = await fetch("/api/chat/messages", {
      method: "POST",
      body: JSON.stringify(params),
    });
    return res.json();
  }
}

export const api = new APIClient();
```

**Benefits:**

- Feature flag control
- Instant rollback capability
- A/B testing support
- Gradual migration

#### 2. Add Feature Flags

```typescript
// .env.local
NEXT_PUBLIC_USE_SUPABASE_API=false  # Start with false

// .env.production (after testing)
NEXT_PUBLIC_USE_SUPABASE_API=true   # Enable in prod
```

#### 3. Add Monitoring

```typescript
// src/lib/api/monitoring.ts
export function trackAPICall(
  endpoint: string,
  backend: "vercel" | "supabase",
  duration: number,
  success: boolean
) {
  // Send to analytics
  if (typeof window !== "undefined") {
    window.gtag?.("event", "api_call", {
      endpoint,
      backend,
      duration,
      success,
    });
  }
}
```

### Phase 1: Low-Risk Migration (Day 3-5)

#### Priority 0: Products API

**Day 3: Verify Supabase Function**

```bash
# Test Supabase function
cd /Users/organic/dev/work/foodshare/foodshare-backend
supabase functions serve api-v1-products

# Test locally
curl http://localhost:54321/functions/v1/api-v1-products \
  -H "Authorization: Bearer $ANON_KEY"
```

**Day 4: Update Frontend**

```typescript
// src/hooks/useProducts.ts
import { api } from "@/lib/api/client";

export function useProducts() {
  return useQuery({
    queryKey: ["products"],
    queryFn: () => api.products(), // Now uses abstraction layer
  });
}
```

**Files to update:**

1. `src/hooks/useProducts.ts`
2. `src/components/products/ProductList.tsx`
3. `src/app/products/page.tsx`
4. `src/app/api/products/route.ts` (keep as fallback)

**Day 5: Deploy & Monitor**

```bash
# Deploy with feature flag OFF
NEXT_PUBLIC_USE_SUPABASE_API=false vercel deploy

# Monitor for 24h, then enable
NEXT_PUBLIC_USE_SUPABASE_API=true vercel deploy --prod

# Monitor Vercel analytics - should see /api/products calls drop to 0
```

#### Priority 0: Chat API

**Day 5: Same process**

```typescript
// src/hooks/useChat.ts
import { api } from "@/lib/api/client";

export function useChat() {
  return useMutation({
    mutationFn: (params) => api.chat(params),
  });
}
```

**Files to update:**

1. `src/hooks/useChat.ts`

### Phase 2: Medium-Risk Migration (Day 6-10)

#### Priority 1: Challenges API

**Day 6: Audit Supabase Backend**

```bash
cd /Users/organic/dev/work/foodshare/foodshare-backend/functions
ls -la | grep challenge

# If not exists, create it
supabase functions new api-v1-challenges
```

**Day 7-8: Implement if Needed**

```typescript
// foodshare-backend/functions/api-v1-challenges/index.ts
import { createClient } from "@supabase/supabase-js";

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const url = new URL(req.url);

  // GET /challenges - List active
  if (req.method === "GET" && url.pathname === "/") {
    const { data, error } = await supabase.from("challenges").select("*").eq("is_active", true);

    return Response.json({ data, error });
  }

  // POST /challenges/complete
  if (req.method === "POST" && url.pathname === "/complete") {
    const body = await req.json();
    const authHeader = req.headers.get("Authorization");

    // Get user from JWT
    const {
      data: { user },
    } = await supabase.auth.getUser(authHeader?.replace("Bearer ", ""));

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use database function for atomic operation
    const { data, error } = await supabase.rpc("complete_challenge", {
      p_user_id: user.id,
      p_challenge_id: body.challengeId,
    });

    return Response.json({ data, error });
  }

  return Response.json({ error: "Not found" }, { status: 404 });
});
```

**Day 9: Deploy & Test**

```bash
supabase functions deploy api-v1-challenges
```

**Day 10: Migrate Frontend**

```typescript
// src/lib/api/client.ts
async challenges() {
  if (this.useSupabase) {
    const { data, error } = await supabase.functions.invoke('api-v1-challenges')
    if (error) throw error
    return data
  }
  const res = await fetch('/api/challenges')
  return res.json()
}

async completeChallenge(challengeId: string) {
  if (this.useSupabase) {
    const { data, error } = await supabase.functions.invoke('api-v1-challenges', {
      body: { challengeId },
      method: 'POST'
    })
    if (error) throw error
    return data
  }
  const res = await fetch('/api/challenges/complete', {
    method: 'POST',
    body: JSON.stringify({ challengeId })
  })
  return res.json()
}
```

### Phase 3: Complex Migration (Day 11-14)

#### Priority 2: Health API

**Day 11: Evaluate**

Current usage: 2 files, low frequency (5min polling)
Supabase equivalent: `health-advanced`

**Decision:** Keep on Vercel for now

- Already optimized (5min polling)
- Low invocation count
- Web-specific (maintenance banner)
- Not worth migration effort

#### Priority 3: Email CRM

**Day 12-14: Deep Audit**

```bash
# Check Supabase email functions
cd /Users/organic/dev/work/foodshare/foodshare-backend/functions
ls -la | grep email

# Found:
# - process-email-queue
# - send-push-notification (might handle email too)
```

**Evaluation Matrix:**

| Feature          | Vercel Routes                | Supabase Functions    | Compatible? |
| ---------------- | ---------------------------- | --------------------- | ----------- |
| Queue Management | `/api/admin/email/queue`     | `process-email-queue` | ⚠️ Check    |
| Templates        | `/api/admin/email/templates` | TBD                   | ❌ Missing  |
| Campaigns        | `/api/admin/email/campaigns` | TBD                   | ❌ Missing  |
| Stats            | `/api/admin/email/stats`     | TBD                   | ❌ Missing  |

**Decision:** Defer to Phase 4

- Complex system (10 routes)
- Admin-only (low usage)
- May need new Supabase functions
- Not blocking free tier goal

## Rollout Strategy

### Canary Deployment

```typescript
// Progressive rollout
const ROLLOUT_PERCENTAGE = {
  week1: 10, // 10% of users
  week2: 50, // 50% of users
  week3: 100, // All users
};

function shouldUseSupabase(userId: string): boolean {
  const hash = hashCode(userId);
  const percentage = ROLLOUT_PERCENTAGE[getCurrentWeek()];
  return hash % 100 < percentage;
}
```

### Monitoring Dashboard

```typescript
// Track migration progress
interface MigrationMetrics {
  endpoint: string;
  vercelCalls: number;
  supabaseCalls: number;
  errorRate: number;
  avgLatency: number;
}

// Alert thresholds
const ALERTS = {
  errorRate: 5, // Alert if >5% errors
  latencyIncrease: 2, // Alert if 2x slower
};
```

## Rollback Plan

### Instant Rollback

```bash
# If issues detected, instant rollback via env var
vercel env add NEXT_PUBLIC_USE_SUPABASE_API false --prod
vercel deploy --prod

# Takes effect immediately (no code deploy needed)
```

### Gradual Rollback

```typescript
// Rollback specific endpoints
export const ENDPOINT_FLAGS = {
  products: true, // Using Supabase
  chat: true, // Using Supabase
  challenges: false, // Rolled back to Vercel
};
```

## Success Metrics

### Week 1 (Products + Chat)

- ✅ 0 errors in Supabase calls
- ✅ Latency < 200ms (same as Vercel)
- ✅ `/api/products` calls drop to 0
- ✅ `/api/chat/messages` calls drop to 0

### Week 2 (Challenges)

- ✅ Challenge completion works
- ✅ Leaderboard updates correctly
- ✅ `/api/challenges/*` calls drop to 0

### Final State

- ✅ 90% of API calls via Supabase
- ✅ <5k Vercel invocations/month
- ✅ Unified backend across platforms
- ✅ $0 additional costs

## Risk Mitigation

### Technical Risks

| Risk                 | Probability | Impact | Mitigation                     |
| -------------------- | ----------- | ------ | ------------------------------ |
| API incompatibility  | Medium      | High   | Test thoroughly, keep fallback |
| Auth token issues    | Low         | High   | Use same Supabase client       |
| Latency increase     | Low         | Medium | Monitor, optimize if needed    |
| Data format mismatch | Medium      | High   | Add transformation layer       |

### Business Risks

| Risk               | Probability | Impact   | Mitigation                      |
| ------------------ | ----------- | -------- | ------------------------------- |
| User-facing errors | Low         | High     | Feature flags, instant rollback |
| Data loss          | Very Low    | Critical | Read-only migration first       |
| Downtime           | Very Low    | High     | Zero-downtime deployment        |

## Testing Strategy

### Pre-Migration Tests

```typescript
// Test Supabase function compatibility
describe("Supabase API Compatibility", () => {
  it("products API returns same format", async () => {
    const vercelData = await fetch("/api/products").then((r) => r.json());
    const supabaseData = await supabase.functions.invoke("api-v1-products");

    expect(supabaseData.data).toMatchSchema(vercelData);
  });

  it("handles auth correctly", async () => {
    const { data } = await supabase.functions.invoke("api-v1-products", {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(data).toBeDefined();
  });
});
```

### Post-Migration Monitoring

```typescript
// Synthetic monitoring
setInterval(async () => {
  const start = Date.now();
  try {
    await api.products();
    trackMetric("api.products.success", Date.now() - start);
  } catch (error) {
    trackMetric("api.products.error", 1);
    alertTeam("Products API failing", error);
  }
}, 60000); // Every minute
```

## Timeline

```
Week 1: Foundation + Products + Chat
├── Day 1-2: Setup abstraction layer, feature flags
├── Day 3-4: Migrate products API
└── Day 5: Migrate chat API, monitor

Week 2: Challenges + Evaluation
├── Day 6-8: Audit/create challenges function
├── Day 9-10: Migrate challenges API
├── Day 11: Evaluate health API (defer)
├── Day 12-14: Audit email CRM (defer to Phase 4)
└── Day 14: Final review, documentation

Week 3: Monitoring & Optimization
├── Monitor all migrated endpoints
├── Optimize slow queries
├── Delete Vercel fallback routes
└── Document final architecture
```

## Deliverables

### Code

- ✅ API client abstraction layer
- ✅ Feature flag system
- ✅ Monitoring & alerting
- ✅ Integration tests
- ✅ Rollback mechanisms

### Documentation

- ✅ API migration guide
- ✅ Architecture diagrams
- ✅ Runbook for incidents
- ✅ Performance benchmarks

### Infrastructure

- ✅ Supabase functions deployed
- ✅ Environment variables configured
- ✅ Monitoring dashboards
- ✅ Alert rules configured

## Post-Migration

### Cleanup (Week 3)

```bash
# After 1 week of stable operation, delete Vercel routes
rm -rf src/app/api/products
rm -rf src/app/api/chat
rm -rf src/app/api/challenges

# Remove feature flags
# Remove fallback code
# Update documentation
```

### Optimization

```typescript
// Add caching layer
const cache = new Map()

async products() {
  const cached = cache.get('products')
  if (cached && Date.now() - cached.timestamp < 60000) {
    return cached.data
  }

  const data = await supabase.functions.invoke('api-v1-products')
  cache.set('products', { data, timestamp: Date.now() })
  return data
}
```

## Conclusion

**This is a production-grade migration plan with:**

- ✅ Zero downtime
- ✅ Instant rollback capability
- ✅ Gradual rollout
- ✅ Comprehensive monitoring
- ✅ Risk mitigation
- ✅ Clear success metrics

**Expected outcome:**

- 90% reduction in Vercel function costs
- Unified backend architecture
- Better developer experience
- Easier maintenance

**Start:** Day 1 - Setup abstraction layer
**Ship:** Day 5 - First migration (products)
**Complete:** Day 14 - All P0/P1 migrations done
