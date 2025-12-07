# FoodShare Performance Audit Report

**Date:** December 6, 2025  
**Scope:** Database, Caching, Edge Functions, Server Components  
**Status:** RLS Optimization Complete ✅ | Other Items Pending

---

## Executive Summary

This audit identified **critical performance bottlenecks** in RLS policies, database indexes, and application code. Implementing these fixes will significantly improve query performance, reduce database load, and enhance user experience.

| Category | Issues Found | Severity | Status |
|----------|-------------|----------|--------|
| RLS Policy Performance | 90+ policies | 🔴 Critical | ✅ **FIXED** |
| Duplicate Indexes | 11 tables | 🟡 Medium | Pending |
| Unused Indexes | 170+ indexes | 🟡 Medium | Pending (monitor first) |
| Multiple Permissive Policies | 50+ cases | 🟡 Medium | Pending (often intentional) |
| Unindexed Foreign Keys | 5 tables | 🟢 Low | Pending |
| Code-Level Optimizations | 3 files | ✅ Fixed | ✅ **FIXED** |

---

## 1. RLS Policy Performance Issues ✅ COMPLETED

### Problem (RESOLVED)

Supabase's Row Level Security (RLS) policies were re-evaluating `auth.uid()` and other auth functions **for every row** in query results. This created an O(n) performance penalty where n = number of rows.

### Solution Applied

All RLS policies have been updated to wrap auth functions in a subquery:

```sql
-- ❌ BEFORE: Re-evaluated auth.uid() for each row
CREATE POLICY "Users can view own data" ON table_name
  FOR SELECT USING (auth.uid() = user_id);

-- ✅ AFTER: Evaluates auth.uid() once per query (InitPlan optimization)
CREATE POLICY "Users can view own data" ON table_name
  FOR SELECT USING ((SELECT auth.uid()) = user_id);
```

### Tables Fixed (All Complete)

**Core Tables:**
- ✅ `posts` - All user-specific policies
- ✅ `profiles` - Insert and update policies
- ✅ `comments` - Create, update, delete policies
- ✅ `likes` - Create and delete policies
- ✅ `reviews` - Create, update, delete policies
- ✅ `follows` - Insert and delete policies

**Forum Tables:**
- ✅ `forum` - All user-specific policies
- ✅ `forum_comments` - All user-specific policies
- ✅ `forum_likes` - Create and delete policies
- ✅ `forum_bookmarks` - User-specific policies
- ✅ `forum_drafts` - User-specific policies
- ✅ `forum_follows` - User-specific policies
- ✅ `forum_polls` - User-specific policies
- ✅ `forum_saved_posts` - User-specific policies
- ✅ `forum_series` - User-specific policies
- ✅ `forum_series_posts` - User-specific policies
- ✅ `forum_subscriptions` - User-specific policies
- ✅ `forum_user_preferences` - User-specific policies
- ✅ `forum_votes` - User-specific policies

**Challenge Tables:**
- ✅ `challenges` - Create, update, delete policies
- ✅ `challenge_participants` - Join, leave, update policies

**Other Tables:**
- ✅ `notifications` - User-specific policies
- ✅ `organization_members` - User-specific policies
- ✅ `post_saves` - User-specific policies
- ✅ `email_logs` - Admin read policy

### Migrations Applied

1. `fix_rls_initplan_posts`
2. `fix_rls_initplan_profiles`
3. `fix_rls_initplan_comments`
4. `fix_rls_initplan_likes`
5. `fix_rls_initplan_reviews`
6. `fix_rls_initplan_follows`
7. `fix_rls_initplan_forum`
8. `fix_rls_initplan_forum_comments`
9. `fix_rls_initplan_forum_likes`
10. `fix_rls_initplan_challenge_participants`
11. `fix_rls_initplan_challenges_v2`
12. `fix_rls_initplan_email_logs`

### Verification

The Supabase performance advisor now shows **0 `auth_rls_initplan` warnings**.

---

## 2. Duplicate Indexes

### Problem

Multiple identical indexes exist on the same columns, wasting storage and slowing INSERT/UPDATE operations.

### Affected Tables

| Table | Duplicate Indexes | Action |
|-------|------------------|--------|
| `posts` | `posts_id_key`, `posts_pkey` | Drop `posts_id_key` |
| `forum` | `forum_id_key`, `forum_pkey` | Drop `forum_id_key` |
| `profiles` | `profiles_duplicate_pkey`, `profiles_id_key` | Drop `profiles_id_key` |
| `comments` | `comments_id_key`, `comments_pkey` | Drop `comments_id_key` |
| `comments` | `idx_comments_depth`, `idx_comments_forum_depth` | Drop `idx_comments_depth` |
| `challenges` | `challenges_id_key`, `challenges_pkey` | Drop `challenges_id_key` |
| `challenge_activities` | `challenge_activities_id_key`, `challenge_activities_pkey` | Drop duplicate |
| `likes` | `likes_id_key`, `likes_pkey` | Drop `likes_id_key` |
| `reviews` | `reviews_id_key`, `reviews_pkey` | Drop `reviews_id_key` |
| `rooms` | `rooms_id_key`, `rooms_pkey` | Drop `rooms_id_key` |
| `room_participants` | `room_participants_idd_key`, `room_participants_pkey` | Drop duplicate |
| `handlers` | `handlers_id_key`, `handlers_pkey` | Drop `handlers_id_key` |
| `notifications` | `ff_push_notifications_id_key`, `ff_push_notifications_pkey` | Drop duplicate |
| `reports` | `reports_id_key`, `reports_pkey` | Drop `reports_id_key` |
| `languages` | `languages_id_key`, `languages_pkey` | Drop `languages_id_key` |
| `legal` | `legal_id_key`, `legal_pkey` | Drop `legal_id_key` |
| `address` | `address_pkey`, `address_profile_id_key` | Drop `address_profile_id_key` |

### Migration Required

See: `supabase/migrations/YYYYMMDD_remove_duplicate_indexes.sql`

---

## 3. Unused Indexes (170+)

### Problem

Indexes that have never been used consume storage and slow down write operations.

### High-Priority Removals (Core Tables)

```sql
-- Posts table
DROP INDEX IF EXISTS idx_posts_user_feed;
DROP INDEX IF EXISTS idx_posts_location_active;
DROP INDEX IF EXISTS idx_posts_post_arranged_at;

-- Profiles table
DROP INDEX IF EXISTS idx_profiles_is_active;
DROP INDEX IF EXISTS idx_profiles_last_seen_at;
DROP INDEX IF EXISTS idx_profiles_theme_preferences;
DROP INDEX IF EXISTS idx_profiles_location_gist;

-- Forum table
DROP INDEX IF EXISTS idx_forum_last_activity;
DROP INDEX IF EXISTS idx_forum_search;
DROP INDEX IF EXISTS idx_forum_hot_score;
DROP INDEX IF EXISTS idx_forum_series;
DROP INDEX IF EXISTS idx_forum_profile_created;
DROP INDEX IF EXISTS idx_forum_best_answer_id;

-- Comments table
DROP INDEX IF EXISTS idx_comments_user_id;
DROP INDEX IF EXISTS idx_comments_forum_id;
DROP INDEX IF EXISTS idx_comments_parent;
DROP INDEX IF EXISTS idx_comments_forum_created;
DROP INDEX IF EXISTS idx_comments_best_answer;
DROP INDEX IF EXISTS idx_comments_firebase_id;
```

### Recommendation

Review full list in migration file. Some indexes may be needed for future features - mark those for retention.

---

## 4. Multiple Permissive RLS Policies

### Problem

When multiple permissive policies exist for the same table/role/action, PostgreSQL evaluates ALL of them (OR logic). This is inefficient.

### Affected Tables

| Table | Role | Action | Policies to Merge |
|-------|------|--------|-------------------|
| `comment_likes` | authenticated | SELECT | "Anyone can read comment likes", "Users can view comment likes" |
| `comment_likes` | authenticated | DELETE | "Users can remove own likes", "Users can unlike comments" |
| `comments` | authenticated | DELETE | "Users can delete own comments", "Users can delete their own comments" |
| `forum` | authenticated | DELETE | "Users can delete own forum posts", "Users can delete their own posts" |
| `forum_bookmarks` | authenticated | SELECT | "Users can read their own bookmarks", "Users can view own bookmarks" |
| `posts` | authenticated | DELETE | "Admins can delete any post", "Users can delete own posts" |
| ... and 40+ more | | | |

### Solution

Consolidate into single policies with combined logic:

```sql
-- ❌ SLOW: Two separate policies
CREATE POLICY "Users can delete own posts" ON posts FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can delete any post" ON posts FOR DELETE USING (is_admin());

-- ✅ FAST: Single combined policy
CREATE POLICY "Users or admins can delete posts" ON posts FOR DELETE 
  USING ((SELECT auth.uid()) = user_id OR is_admin());
```

---

## 5. Code-Level Optimizations

### 5.1 Forum Page - Duplicate Data Fetching ✅ FIXED

**File:** `src/app/forum/[slug]/page.tsx`

**Issue:** `getForumPost()` was called twice - once in `generateMetadata()` and once in the page component.

**Solution Applied:** Wrapped with React's `cache()` to deduplicate:

```typescript
import { cache } from 'react';

const getForumPost = cache(async (slugOrId: string): Promise<ForumPost | null> => {
  // ... implementation
});
```

Also added `generateMetadata()` for SEO - both functions now share the cached result.

### 5.2 Challenge Page - Sequential Auth Check ✅ FIXED

**File:** `src/app/challenge/[id]/page.tsx`

**Issue:** `hasAcceptedChallenge()` was called after `Promise.all()`, creating a waterfall.

**Solution Applied:** Moved into parallel fetch:

```typescript
const [challenge, user, isAccepted] = await Promise.all([
  getChallengeById(challengeId),
  getUser(),
  hasAcceptedChallenge(challengeId), // Now parallel
]);
```

### 5.3 Forum Actions - Multiple Sequential Queries ✅ FIXED

**File:** `src/app/actions/forum.ts`

**Issue:** `deleteComment()` made 3 sequential DB calls.

**Solution Applied:** Parallelized comment and profile fetches:

```typescript
const [commentResult, profileResult] = await Promise.all([
  supabase.from('forum_comments').select('author_id, post_id').eq('id', commentId).single(),
  supabase.from('profiles').select('role').eq('id', user.id).single(),
]);
```

---

## 6. Current Edge Functions (Good State)

The existing Edge Functions are well-architected:

| Function | Purpose | Status |
|----------|---------|--------|
| `resize-tinify-upload-image` | Image optimization | ✅ Good |
| `update-coordinates` | Geocoding | ✅ Good |
| `search-functions` | Full-text search | ✅ Good |
| `telegram-bot-foodshare` | Notifications | ✅ Good |
| `smart-email-route` | Email routing | ✅ Good |
| `get-translations` | i18n | ✅ Good |

**Recommendation:** No changes needed. Consider adding:
- Rate limiting Edge Function for API protection
- Image CDN proxy for external images

---

## 7. Caching Strategy (Good State)

The `cache-keys.ts` implementation is solid:

- ✅ Centralized cache tags
- ✅ Proper duration tiers (SHORT/MEDIUM/LONG)
- ✅ Granular invalidation helpers
- ✅ Development logging

**Minor Enhancement:** Add cache warming for popular content on deploy.

---

## Implementation Plan

### Phase 1: Database (Week 1)
1. [x] Apply RLS policy fixes migration - ✅ **COMPLETED** (12 migrations applied)
2. [ ] Remove duplicate indexes migration (`20241206000002`)
3. [ ] Review and remove unused indexes (`20241206000003`)
4. [ ] Fix function search_path security (`20241206000004`)
5. [ ] Add moderation RLS policies (`20241206000005`)

### Phase 2: Code (Week 2) ✅ COMPLETED
1. [x] Add `cache()` wrapper to forum data fetching
2. [x] Optimize challenge page parallel fetching
3. [x] Consolidate forum action queries

### Phase 3: Monitoring (Ongoing)
1. [ ] Set up query performance monitoring
2. [ ] Track cache hit rates
3. [ ] Monitor RLS policy execution times

---

## Migrations Created

1. `20241206000001_fix_rls_initplan_performance.sql` - Fix auth function re-evaluation
2. `20241206000002_remove_duplicate_indexes.sql` - Remove duplicate indexes
3. `20241206000003_remove_unused_indexes.sql` - Remove 170+ unused indexes
4. `20241206000004_fix_function_search_path.sql` - Fix 90+ functions with mutable search_path (security)
5. `20241206000005_add_moderation_rls_policies.sql` - Add missing RLS policies for moderation tables

---

## 8. Security Findings (Added)

### 8.1 Function Search Path Vulnerability

**Severity:** 🟡 Medium (WARN)

**Issue:** 90+ functions have mutable `search_path`, making them vulnerable to search_path injection attacks.

**Solution:** Set `search_path = ''` for all public functions.

**Migration:** `20241206000004_fix_function_search_path.sql`

### 8.2 Missing RLS Policies

**Severity:** 🟢 Low (INFO)

**Issue:** Three moderation tables have RLS enabled but no policies:
- `forum_moderation_notes`
- `forum_moderation_queue`
- `forum_moderation_stats`

**Solution:** Added appropriate policies for moderators and admins.

**Migration:** `20241206000005_add_moderation_rls_policies.sql`

### 8.3 Security Definer View

**Severity:** 🔴 High (ERROR)

**Issue:** View `posts_with_location` uses SECURITY DEFINER, which bypasses RLS.

**Recommendation:** Review if this is intentional. If not, recreate as SECURITY INVOKER.

### 8.4 Cookie Resilience ✅ IMPLEMENTED

**Status:** ✅ Complete

The server Supabase client now includes a `getSafeCookies()` helper that:
- Filters out corrupted Supabase auth cookies (prefix `sb-`)
- Validates base64url encoding before passing to Supabase SSR
- Prevents "Invalid UTF-8 sequence" errors from crashing the app
- Logs warnings for debugging when cookies are filtered

**File:** `src/lib/supabase/server.ts`

### 8.5 Other Recommendations

- Enable leaked password protection in Supabase Auth settings
- Upgrade Postgres version to receive latest security patches

---

## References

- [Supabase RLS Performance Guide](https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select)
- [PostgreSQL Index Maintenance](https://www.postgresql.org/docs/current/indexes-examine.html)
- [Next.js Caching Best Practices](https://nextjs.org/docs/app/building-your-application/caching)
