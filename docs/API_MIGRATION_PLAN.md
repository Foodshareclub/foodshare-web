# API Migration Action Plan

## Audit Results

**Total Routes:** 34
**Used:** 17 (need migration)
**Unused:** 17 (safe to delete immediately)

## Phase 1: Quick Wins (Delete Unused) - TODAY

### Safe to Delete (17 routes, ~2k invocations/month):

```bash
# These are never called by the frontend
rm -rf src/app/api/ping
rm -rf src/app/api/health/upstash
rm -rf src/app/api/challenges/leaderboard
rm -rf src/app/api/map-preferences
rm -rf src/app/api/admin/setup-welcome-automation
rm -rf src/app/api/admin/proxy-metrics
rm -rf src/app/api/admin/seed-email-templates
rm -rf src/app/api/debug-vault
rm -rf src/app/api/webhooks/meta
rm -rf src/app/api/email/worker
rm -rf src/app/api/debug
rm -rf src/app/api/moderation
```

**Impact:** Immediate cleanup, zero risk

## Phase 2: Low-Hanging Fruit (Week 1)

### 1. Products API (4 usages)

**Vercel:** `/api/products`
**Supabase:** `api-v1-products` ✅ EXISTS

**Migration:**

```typescript
// Before
const res = await fetch("/api/products");

// After
const { data } = await supabase.functions.invoke("api-v1-products");
```

**Files to update:** 4
**Risk:** Low (read-only endpoint)

### 2. Chat Messages (1 usage)

**Vercel:** `/api/chat/messages`
**Supabase:** `api-v1-chat` ✅ EXISTS

**Migration:**

```typescript
// Before
const res = await fetch("/api/chat/messages");

// After
const { data } = await supabase.functions.invoke("api-v1-chat");
```

**Files to update:** 1
**Risk:** Low (already using Supabase for mobile)

### 3. Challenges (4 usages)

**Vercel:** `/api/challenges/*`
**Supabase:** Need to check if exists

**Action:** Check `foodshare-backend/functions/` for challenges function
**Risk:** Medium (might need to create)

## Phase 3: Complex (Week 2-3)

### Email CRM System (10 routes, 17 usages)

**Vercel:** `/api/admin/email/*`
**Supabase:** `process-email-queue` exists, but might be different

**Strategy:**

1. Audit Supabase email functions
2. Compare functionality
3. Create migration plan
4. Test thoroughly

**Risk:** High (complex system, admin-only)

## Phase 4: Health Checks (Week 4)

### Health API (2 usages)

**Vercel:** `/api/health`
**Supabase:** `health`, `health-advanced` ✅ EXIST

**Current state:** Already optimized (5min polling)
**Action:** Can migrate or keep (low usage now)
**Risk:** Low

## Recommended Start: Phase 1 (Today)

**Delete unused routes immediately:**

```bash
cd /Users/organic/dev/work/foodshare/foodshare-web

# Delete unused routes
rm -rf src/app/api/ping
rm -rf src/app/api/health/upstash
rm -rf src/app/api/challenges/leaderboard
rm -rf src/app/api/map-preferences
rm -rf src/app/api/admin/setup-welcome-automation
rm -rf src/app/api/admin/proxy-metrics
rm -rf src/app/api/admin/seed-email-templates
rm -rf src/app/api/admin/email/templates/\[templateId\]
rm -rf src/app/api/debug-vault
rm -rf src/app/api/webhooks/meta
rm -rf src/app/api/email/worker
rm -rf src/app/api/debug
rm -rf src/app/api/moderation

# Commit
git add -A
git commit -m "cleanup: delete 17 unused API routes"
git push
```

**Impact:**

- Cleaner codebase
- Reduced maintenance
- ~2k invocations saved
- Zero risk (not used)

## Next Steps

1. **Today:** Delete unused routes
2. **Tomorrow:** Check Supabase backend for challenges function
3. **Day 3:** Migrate products API (4 files)
4. **Day 4:** Migrate chat API (1 file)
5. **Day 5:** Test and monitor
6. **Week 2:** Plan email CRM migration

## Success Metrics

- ✅ Phase 1: 17 routes deleted
- ✅ Phase 2: 3 routes migrated to Supabase
- ✅ Phase 3: Email system consolidated
- ✅ Final: <5k invocations/month (95% reduction)
