# Caching Architecture

## Overview

FoodShare uses a multi-layer caching strategy optimized for Next.js 16:

1. **Server-side caching** via `unstable_cache` with tag-based invalidation
2. **Route segment caching** via `revalidate` exports
3. **Client-side caching** via TanStack Query
4. **Image caching** via Next.js Image optimization (30-day TTL)
5. **Redis caching** via Upstash Redis for distributed cache and rate limiting

## Cache Tags

All cache tags are centralized in `src/lib/data/cache-keys.ts`:

```typescript
import { CACHE_TAGS, invalidateTag } from "@/lib/data/cache-keys";

// Available tags
CACHE_TAGS.PRODUCTS; // 'products'
CACHE_TAGS.PRODUCT(id); // 'product-{id}'
CACHE_TAGS.PRODUCTS_BY_TYPE(type); // 'products-{type}'
CACHE_TAGS.PRODUCT_LOCATIONS; // 'product-locations'
CACHE_TAGS.PRODUCT_LOCATIONS_BY_TYPE(type); // 'product-locations-{type}'
CACHE_TAGS.USER_PRODUCTS(userId); // 'user-products-{userId}'
CACHE_TAGS.PROFILES; // 'profiles'
CACHE_TAGS.PROFILE(id); // 'profile-{id}'
CACHE_TAGS.CHALLENGES; // 'challenges'
CACHE_TAGS.CHALLENGE(id); // 'challenge-{id}'
CACHE_TAGS.USER_CHALLENGES(userId); // 'user-challenges-{userId}'
CACHE_TAGS.FORUM; // 'forum'
CACHE_TAGS.CHATS; // 'chats'
CACHE_TAGS.ADMIN; // 'admin'
CACHE_TAGS.AUTH; // 'auth'
CACHE_TAGS.POST_ACTIVITY; // 'post-activity'
CACHE_TAGS.POST_ACTIVITY_LOGS(postId); // 'post-activity-{postId}'
CACHE_TAGS.POST_ACTIVITY_STATS; // 'post-activity-stats'
CACHE_TAGS.USER_ACTIVITY(userId); // 'user-activity-{userId}'

// CRM tags (from @/lib/data/crm)
import { CRM_CACHE_TAGS } from "@/lib/data/crm";
CRM_CACHE_TAGS.CUSTOMERS; // 'crm-customers'
CRM_CACHE_TAGS.CUSTOMER(id); // 'crm-customer-{id}'
CRM_CACHE_TAGS.CUSTOMER_NOTES(customerId); // 'crm-customer-notes-{customerId}'
CRM_CACHE_TAGS.TAGS; // 'crm-tags'
CRM_CACHE_TAGS.DASHBOARD; // 'crm-dashboard'
```

## Cache Durations

```typescript
import { CACHE_DURATIONS } from "@/lib/data/cache-keys";

CACHE_DURATIONS.SHORT; // 60s - frequently changing
CACHE_DURATIONS.MEDIUM; // 300s - moderate changes
CACHE_DURATIONS.LONG; // 3600s - rarely changing
CACHE_DURATIONS.PRODUCTS; // 60s
CACHE_DURATIONS.PRODUCT_LOCATIONS; // 300s
CACHE_DURATIONS.PROFILES; // 300s
CACHE_DURATIONS.VOLUNTEERS; // 3600s
```

## Data Layer Usage

### Fetching Data (Server Components)

```typescript
// app/food/page.tsx
import { getProducts } from '@/lib/data/products';

export const revalidate = 60; // Route-level cache

export default async function FoodPage() {
  const products = await getProducts('food'); // Cached with unstable_cache
  return <ProductGrid products={products} />;
}
```

### Invalidating Cache (Server Actions)

The `products.ts` actions use a consolidated `invalidateProductCaches` helper for cleaner cache invalidation:

```typescript
// app/actions/products.ts
"use server";

import { CACHE_TAGS, invalidateTag, getProductTags } from "@/lib/data/cache-keys";

/**
 * Batch invalidate product-related caches
 */
function invalidateProductCaches(productId?: number, postType?: string, profileId?: string): void {
  // Use helper for consistent tag invalidation
  getProductTags(productId, postType).forEach((tag) => invalidateTag(tag));

  // Invalidate user-specific cache
  if (profileId) {
    invalidateTag(CACHE_TAGS.USER_PRODUCTS(profileId));
  }

  // Invalidate activity caches
  if (productId && profileId) {
    invalidatePostActivityCaches(productId, profileId);
  }
}

export async function createProduct(formData: FormData) {
  // ... create product with post_type

  // Batch invalidate all product caches
  invalidateProductCaches(undefined, post_type, user.id);
}

export async function updateProduct(id: number, data: ProductData) {
  // Verify user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You must be signed in to update a listing");

  // Fetch current product to get type and owner for cache invalidation + ownership check
  const { data: currentProduct } = await supabase
    .from("posts")
    .select("post_type, profile_id")
    .eq("id", id)
    .single();

  // Verify ownership
  if (currentProduct?.profile_id && currentProduct.profile_id !== user.id) {
    throw new Error("Unauthorized: You can only edit your own listings");
  }

  // ... update product

  // Batch invalidate all product caches
  invalidateProductCaches(id, currentProduct?.post_type, currentProduct?.profile_id);
}

export async function deleteProduct(id: number) {
  // ... verify auth and ownership

  // Soft delete: set is_active = false
  await supabase.from("posts").update({ is_active: false }).eq("id", id);

  // Batch invalidate all product caches
  invalidateProductCaches(id, product.post_type, product.profile_id);
}
```

## Available Data Functions

### Products (`@/lib/data/products`)

| Function                      | Cache Duration | Tags                                            |
| ----------------------------- | -------------- | ----------------------------------------------- |
| `getProducts(type)`           | 60s            | `products`, `products-{type}`                   |
| `getAllProducts()`            | 60s            | `products`                                      |
| `getProductById(id)`          | 120s           | `products`, `product-{id}`                      |
| `getProductLocations(type)`   | 300s           | `product-locations`, `product-locations-{type}` |
| `getUserProducts(userId)`     | 60s            | `products`, `user-products-{userId}`            |
| `searchProducts(query, type)` | 60s            | `product-search`, `products`                    |
| `getPopularProductIds(limit)` | 3600s          | `products`                                      |

### Maps (`@/lib/data/maps`)

| Function                            | Cache Duration | Tags                                            |
| ----------------------------------- | -------------- | ----------------------------------------------- |
| `getMapLocations(type)`             | 300s           | `product-locations`, `product-locations-{type}` |
| `getAllMapLocations()`              | 300s           | `product-locations`                             |
| `getNearbyLocations(bounds, type?)` | 60s            | `product-locations`                             |
| `getLocationCountsByType()`         | 300s           | `product-locations`                             |

### Profiles (`@/lib/data/profiles`)

| Function                    | Cache Duration | Tags                                   |
| --------------------------- | -------------- | -------------------------------------- |
| `getProfile(userId)`        | 300s           | `profiles`, `profile-{userId}`         |
| `getPublicProfile(userId)`  | 300s           | `profiles`, `profile-{userId}`         |
| `getUserStats(userId)`      | 600s           | `profiles`, `profile-stats-{userId}`   |
| `getVolunteers()`           | 3600s          | `volunteers`, `profiles`               |
| `getProfileReviews(userId)` | 300s           | `profiles`, `profile-reviews-{userId}` |
| `hasUserRole(userId, role)` | N/A            | Direct query (no caching)              |
| `getUserRoles(userId)`      | N/A            | Direct query (no caching)              |

### Forum (`@/lib/data/forum`)

| Function                     | Cache Duration | Tags                              |
| ---------------------------- | -------------- | --------------------------------- |
| `getForumPosts(options?)`    | 120s           | `forum`                           |
| `getForumCategories()`       | 120s           | `forum`                           |
| `getForumTags(limit?)`       | 120s           | `forum`                           |
| `getForumPageData(options?)` | N/A            | Aggregates above (parallel fetch) |

### Admin (`@/lib/data/admin`)

| Function               | Cache Duration | Tags | Notes                                        |
| ---------------------- | -------------- | ---- | -------------------------------------------- |
| `getDashboardStats()`  | None           | -    | Cannot cache - uses `cookies()` via Supabase |
| `getAuditLogs(limit?)` | None           | -    | Cannot cache - uses `cookies()` via Supabase |
| `getPendingListings()` | None           | -    | Cannot cache - uses `cookies()` via Supabase |

> **Note:** Admin data functions cannot use `unstable_cache` because `createClient()` uses `cookies()` which is incompatible with caching. These functions make direct database queries on each request.

### Admin Listings (`@/lib/data/admin-listings`)

| Function                           | Cache Duration | Tags                      |
| ---------------------------------- | -------------- | ------------------------- |
| `getAdminListings(filters?)`       | None           | -                         |
| `getCachedAdminListings(filters?)` | 60s            | `admin-listings`, `admin` |
| `getAdminListingById(id)`          | None           | -                         |
| `getListingStats()`                | 300s           | `admin-stats`, `admin`    |
| `checkAdminRole(userId)`           | None           | -                         |

### Admin Reports (`@/lib/data/admin-reports`)

| Function                 | Cache Duration | Tags                     |
| ------------------------ | -------------- | ------------------------ |
| `getReportsData()`       | None           | -                        |
| `getCachedReportsData()` | 300s           | `admin-reports`, `admin` |

> **Note:** `getReportsData()` uses `createClient()` which calls `cookies()`, so it cannot be cached directly. The `getCachedReportsData()` wrapper provides caching when the caller context allows it (e.g., when not dependent on user-specific cookies).

### CRM (`@/lib/data/crm`)

| Function                          | Cache Duration | Tags | Notes                                        |
| --------------------------------- | -------------- | ---- | -------------------------------------------- |
| `getCRMCustomersCached(filters?)` | None           | -    | Cannot cache - uses `cookies()` via Supabase |
| `getCustomerSummary(customerId)`  | None           | -    | Cannot cache - uses `cookies()` via Supabase |
| `getCustomerNotes(customerId)`    | None           | -    | Cannot cache - uses `cookies()` via Supabase |
| `getCustomerTagsCached()`         | None           | -    | Cannot cache - uses `cookies()` via Supabase |
| `getCRMDashboardStatsCached()`    | None           | -    | Cannot cache - uses `cookies()` via Supabase |
| `getAdminCustomersCached(limit?)` | None           | -    | Cannot cache - uses `cookies()` via Supabase |
| `getAdminCRMStatsCached()`        | None           | -    | Cannot cache - uses `cookies()` via Supabase |

> **Note:** CRM data functions cannot use `unstable_cache` because `createClient()` uses `cookies()` which is incompatible with caching. These functions make direct database queries on each request. The `CRM_CACHE_TAGS` constants are still defined in `@/lib/data/crm.ts` for potential future use with cache invalidation.

### Post Activity (`@/lib/data/post-activity`)

| Function                          | Cache Duration | Tags                                      |
| --------------------------------- | -------------- | ----------------------------------------- |
| `getPostActivityTimeline(postId)` | 60s            | `post-activity`, `post-activity-{postId}` |
| `getPostActivityLogs(postId)`     | 60s            | `post-activity`, `post-activity-{postId}` |
| `getUserActivitySummary(userId)`  | 300s           | `post-activity`, `user-activity-{userId}` |
| `getActivityCountsByType(postId)` | 60s            | `post-activity`, `post-activity-{postId}` |
| `getDailyActivityStats(options?)` | 300s           | `post-activity`, `post-activity-stats`    |
| `getActivityOverviewStats()`      | 300s           | `post-activity`, `post-activity-stats`    |
| `getRecentActivities(options?)`   | None           | -                                         |

> **Note:** `getRecentActivities` is not cached as it's used for real-time admin monitoring. All other functions use `unstable_cache` for dashboard performance.

### Email Preferences (`@/lib/data/email-preferences`)

| Function                                | Cache Duration       | Tags |
| --------------------------------------- | -------------------- | ---- |
| `getEmailPreferences()`                 | None (user-specific) | -    |
| `getEmailPreferencesForUser(profileId)` | None (admin use)     | -    |

> **Note:** Email preferences are not cached because they are user-specific and should always reflect the current state. These functions require authentication.

## Next.js 16 Changes

Next.js 16 changed `revalidateTag` to require a second `profile` argument. We use the `invalidateTag` helper to abstract this:

```typescript
// DON'T use revalidateTag directly
import { revalidateTag } from "next/cache";
revalidateTag("products", "default"); // Requires profile in Next.js 16

// DO use invalidateTag helper
import { invalidateTag } from "@/lib/data/cache-keys";
invalidateTag(CACHE_TAGS.PRODUCTS); // Handles profile automatically
```

## Redis Caching (Upstash)

For distributed caching across serverless functions, use the Redis client from `@/lib/storage/redis`:

### Cache Operations

```typescript
import {
  cache,
  REDIS_KEYS,
  CACHE_TTL,
  type RateLimitResult,
  type CacheTTL,
} from "@/lib/storage/redis";

// Get cached value (returns null on error)
const product = await cache.get<Product>(REDIS_KEYS.PRODUCT("123"));

// Set with TTL (returns boolean success)
const success = await cache.set(REDIS_KEYS.PRODUCT("123"), product, CACHE_TTL.MEDIUM);

// Cache-aside pattern (get or fetch)
const data = await cache.getOrSet(
  REDIS_KEYS.PRODUCTS_LIST("food"),
  () => fetchProducts("food"),
  CACHE_TTL.SHORT
);

// Delete operations (return count of deleted keys)
await cache.del("key"); // Single key
await cache.delMany(["key1", "key2"]); // Multiple keys
await cache.delByPattern("products:*"); // By pattern

// Counter operations
const views = await cache.incr(REDIS_KEYS.COUNTER("page-views"));

// TTL management
await cache.expire("key", 3600); // Set expiration
const remaining = await cache.ttl("key"); // Get remaining TTL (-1 if no expiry)
```

All cache methods include built-in error handling and return sensible defaults on failure.

### Redis Key Prefixes

```typescript
import { REDIS_KEYS } from "@/lib/storage/redis";

REDIS_KEYS.PRODUCT(id); // 'product:{id}'
REDIS_KEYS.PRODUCTS_LIST(type); // 'products:list:{type}' or 'products:list:all'
REDIS_KEYS.USER_PROFILE(id); // 'user:profile:{id}'
REDIS_KEYS.USER_SESSION(id); // 'user:session:{id}'
REDIS_KEYS.SEARCH_RESULTS(query); // 'search:{query}'
```

### Redis TTL Values

```typescript
import { CACHE_TTL } from "@/lib/storage/redis";

CACHE_TTL.SHORT; // 60s - frequently changing
CACHE_TTL.MEDIUM; // 300s - moderate changes
CACHE_TTL.LONG; // 3600s - rarely changing
CACHE_TTL.DAY; // 86400s - static content
```

### Rate Limiting

```typescript
import { rateLimiter, type RateLimitResult } from "@/lib/storage/redis";

// Check rate limit (sliding window)
const result: RateLimitResult = await rateLimiter.check(
  `api:${userId}`, // identifier
  100, // max requests
  60 // window in seconds
);

if (!allowed) {
  return new Response("Too Many Requests", {
    status: 429,
    headers: { "Retry-After": String(reset) },
  });
}
```

## Development Cache Logging

In development mode, cache operations are automatically logged to the console:

```
✅ [12:34:56.789] CACHE HIT products
❌ [12:34:56.790] CACHE MISS product-123
💾 [12:34:56.791] CACHE SET products
🗑️ [12:34:56.792] CACHE INVALIDATE products
```

The `logCacheOperation` function is exported from `@/lib/data/cache-keys` for use in custom caching scenarios:

```typescript
import { logCacheOperation } from "@/lib/data/cache-keys";

// Log custom cache operations
logCacheOperation("hit", "my-custom-key", { duration: 100 });
```

## API Route Caching

API routes include optimized `Cache-Control` headers for CDN/browser caching with stale-while-revalidate for instant responses:

```typescript
// src/app/api/products/route.ts
const CACHE_DURATIONS = {
  PRODUCTS_PAGINATED: 60, // Paginated products (1 min)
  PRODUCTS_FIRST_PAGE: 120, // First page - longer cache (2 min)
  PRODUCT_DETAIL: 180, // Single product (3 min)
  LOCATIONS: 300, // Map locations (5 min)
  SEARCH: 30, // Search results (30 sec)
  USER_PRODUCTS: 60, // User's products (1 min)
};

// Stale-while-revalidate multiplier (2x cache duration)
const SWR_MULTIPLIER = 2;

// Response with optimized cache headers
function jsonWithCache(data: unknown, maxAge: number, options?: { etag?: string }) {
  const swr = maxAge * SWR_MULTIPLIER;

  const headers: HeadersInit = {
    // CDN caching with stale-while-revalidate
    "Cache-Control": `public, s-maxage=${maxAge}, stale-while-revalidate=${swr}`,
    // Vary by query params for proper cache differentiation
    Vary: "Accept-Encoding",
  };

  // Add ETag for conditional requests (reduces bandwidth)
  if (options?.etag) {
    headers["ETag"] = options.etag;
  }

  return NextResponse.json(data, { headers });
}
```

### Caching Strategy

| Endpoint            | Cache Duration | SWR Duration | Notes                    |
| ------------------- | -------------- | ------------ | ------------------------ |
| First page products | 120s           | 240s         | Most frequently accessed |
| Paginated products  | 60s            | 120s         | Subsequent pages         |
| Product detail      | 180s           | 360s         | Individual product       |
| Map locations       | 300s           | 600s         | Less frequent updates    |
| Search results      | 30s            | 60s          | Dynamic content          |
| User products       | 60s            | 120s         | User-specific            |

### ETag Support

The API generates ETags for paginated responses to enable conditional requests:

```typescript
// Client can send If-None-Match header
// Server returns 304 Not Modified if content unchanged
// Reduces bandwidth for unchanged data
```

## Client-Side Data (Server-First Pattern)

The app follows a **server-first architecture**. Data is fetched in Server Components and passed to Client Components as props:

```typescript
// ✅ Server Component fetches data
// app/food/page.tsx
import { getProducts } from '@/lib/data/products';

export default async function FoodPage() {
  const products = await getProducts('food');
  return <HomeClient initialProducts={products} />;
}

// ✅ Client Component receives data as props
// Location filtering uses URL searchParams (server-first pattern)
'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';

export function HomeClient({
  initialProducts,
  nearbyPosts,
  isLocationFiltered,
  radiusMeters,
}: HomeClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Use nearby posts if location filter is active
  const products = isLocationFiltered && nearbyPosts ? nearbyPosts : initialProducts;

  // Update URL params for location filtering (triggers server-side fetch)
  const handleLocationChange = (params: LocationParams | null) => {
    const newParams = new URLSearchParams(searchParams.toString());
    if (params) {
      newParams.set('lat', params.latitude.toFixed(6));
      newParams.set('lng', params.longitude.toFixed(6));
      newParams.set('radius', params.radiusMeters.toString());
    } else {
      newParams.delete('lat');
      newParams.delete('lng');
      newParams.delete('radius');
    }
    startTransition(() => router.push(`?${newParams.toString()}`));
  };

  return <ProductGrid products={products} isLoading={isPending} />;
}
```

For real-time updates (chat, notifications), use Supabase Realtime subscriptions in Client Components.

## Image Caching

Images are cached for 30 days via Next.js Image optimization:

```typescript
// next.config.ts
images: {
  minimumCacheTTL: 2592000, // 30 days
}
```

## Development Cache Logging

In development mode, cache operations are logged to the console with color-coded output:

```
✅ [12:34:56.789] CACHE HIT products
❌ [12:34:56.790] CACHE MISS profile-abc123
💾 [12:34:56.791] CACHE SET products {"duration":60}
🗑️ [12:34:56.792] CACHE INVALIDATE products
```

Use `logCacheOperation` in data functions to track cache behavior:

```typescript
import { logCacheOperation } from "@/lib/data/cache-keys";

// In your cached data function
logCacheOperation("hit", "products");
logCacheOperation("miss", "products");
logCacheOperation("set", "products", { duration: 60 });
```

The `invalidateTag` helper automatically logs invalidations. Logging is disabled in production.

## Best Practices

1. **Use data layer functions** - Import from `@/lib/data/*` for cached queries
2. **Use invalidateTag** - Always use the helper, not raw `revalidateTag`
3. **Use CACHE_TAGS constants** - Ensures consistency across the codebase
4. **Add route-level revalidate** - For pages with mostly static content
5. **Invalidate granularly** - Only invalidate affected tags, not everything

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Server Components                        │
│                    (pages, layouts)                          │
└─────────────────────┬───────────────────────────────────────┘
                      │ import
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                   lib/data/*.ts                              │
│              (unstable_cache wrapped)                        │
│                                                              │
│  getProducts() ──► unstable_cache ──► Supabase              │
│  getProfile()  ──► unstable_cache ──► Supabase              │
└─────────────────────────────────────────────────────────────┘
                      │
                      │ tags
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                  Cache Tags Store                            │
│                                                              │
│  'products' ◄──────────────────────► invalidateTag()        │
│  'profiles' ◄──────────────────────► (Server Actions)       │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   Upstash Redis                              │
│              (lib/storage/redis.ts)                          │
│                                                              │
│  cache.get/set ──► Distributed cache across edge            │
│  rateLimiter   ──► Sliding window rate limiting             │
└─────────────────────────────────────────────────────────────┘
```

## Static Generation

Product detail pages use `generateStaticParams` to pre-render popular products at build time:

```typescript
// app/food/[id]/page.tsx
import { getPopularProductIds } from "@/lib/data/products";

export async function generateStaticParams(): Promise<{ id: string }[]> {
  const productIds = await getPopularProductIds(50); // Top 50 products
  return productIds.map((id) => ({ id: String(id) }));
}
```

This pre-generates the top 50 most popular product pages at build time, improving initial load performance for frequently accessed listings.

## Future Improvements

### High Priority

- ✅ Add `revalidate` to `/profile` (300s), `/map` (300s), `/admin` (300s) pages
- ✅ Create `src/lib/data/forum.ts` with cached forum queries
- ✅ Create `src/lib/data/admin.ts` with cached admin queries
- ✅ Add `generateStaticParams` for popular product detail pages

### Medium Priority

- ✅ Implement hover prefetch for product cards (100ms debounce in `ProductCard`)
- ✅ Add `placeholderData` in TanStack Query (implemented in `useProductQueries.ts`)
- Create cache dashboard for admin
- ✅ Add Cache-Control headers to API routes

### Low Priority

- ✅ Static generate `/terms`, `/privacy` pages (using `force-static`)
- ✅ Add cache hit/miss logging in development (via `logCacheOperation` in `cache-keys.ts`)
- Database materialized views for complex aggregations
