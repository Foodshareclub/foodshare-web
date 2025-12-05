# Caching Architecture

## Overview

FoodShare uses a multi-layer caching strategy optimized for Next.js 16:

1. **Server-side caching** via `unstable_cache` with tag-based invalidation
2. **Route segment caching** via `revalidate` exports
3. **Client-side caching** via TanStack Query
4. **Image caching** via Next.js Image optimization (30-day TTL)

## Cache Tags

All cache tags are centralized in `src/lib/data/cache-keys.ts`:

```typescript
import { CACHE_TAGS, invalidateTag } from '@/lib/data/cache-keys';

// Available tags
CACHE_TAGS.PRODUCTS           // 'products'
CACHE_TAGS.PRODUCT(id)        // 'product-{id}'
CACHE_TAGS.PRODUCT_LOCATIONS  // 'product-locations'
CACHE_TAGS.PROFILES           // 'profiles'
CACHE_TAGS.PROFILE(id)        // 'profile-{id}'
CACHE_TAGS.FORUM              // 'forum'
CACHE_TAGS.CHATS              // 'chats'
CACHE_TAGS.ADMIN              // 'admin'
CACHE_TAGS.AUTH               // 'auth'
```

## Cache Durations

```typescript
import { CACHE_DURATIONS } from '@/lib/data/cache-keys';

CACHE_DURATIONS.SHORT          // 60s - frequently changing
CACHE_DURATIONS.MEDIUM         // 300s - moderate changes
CACHE_DURATIONS.LONG           // 3600s - rarely changing
CACHE_DURATIONS.PRODUCTS       // 60s
CACHE_DURATIONS.PRODUCT_LOCATIONS // 300s
CACHE_DURATIONS.PROFILES       // 300s
CACHE_DURATIONS.VOLUNTEERS     // 3600s
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

```typescript
// app/actions/products.ts
'use server';

import { CACHE_TAGS, invalidateTag } from '@/lib/data/cache-keys';

export async function createProduct(formData: FormData) {
  // ... create product
  
  // Invalidate relevant caches
  invalidateTag(CACHE_TAGS.PRODUCTS);
  invalidateTag(CACHE_TAGS.PRODUCT_LOCATIONS);
}
```

## Available Data Functions

### Products (`@/lib/data/products`)

| Function | Cache Duration | Tags |
|----------|---------------|------|
| `getProducts(type)` | 60s | `products` |
| `getAllProducts()` | 60s | `products` |
| `getProductById(id)` | 120s | `products` |
| `getProductLocations(type)` | 300s | `product-locations` |
| `getUserProducts(userId)` | 60s | `products` |
| `searchProducts(query, type)` | 60s | `product-search`, `products` |

### Profiles (`@/lib/data/profiles`)

| Function | Cache Duration | Tags |
|----------|---------------|------|
| `getProfile(userId)` | 300s | `profiles` |
| `getPublicProfile(userId)` | 300s | `profiles` |
| `getUserStats(userId)` | 600s | `profiles` |
| `getVolunteers()` | 3600s | `volunteers`, `profiles` |
| `getProfileReviews(userId)` | 300s | `profiles` |

## Next.js 16 Changes

Next.js 16 changed `revalidateTag` to require a second `profile` argument. We use the `invalidateTag` helper to abstract this:

```typescript
// DON'T use revalidateTag directly
import { revalidateTag } from 'next/cache';
revalidateTag('products', 'default'); // Requires profile in Next.js 16

// DO use invalidateTag helper
import { invalidateTag } from '@/lib/data/cache-keys';
invalidateTag(CACHE_TAGS.PRODUCTS); // Handles profile automatically
```

## Client-Side Caching (TanStack Query)

For client components needing real-time updates:

```typescript
import { useProducts } from '@/hooks/queries/useProductQueries';

function ProductList() {
  const { data, isLoading } = useProducts('food');
  // staleTime: 5 minutes
  // gcTime: 30 minutes
}
```

## Image Caching

Images are cached for 30 days via Next.js Image optimization:

```typescript
// next.config.ts
images: {
  minimumCacheTTL: 2592000, // 30 days
}
```

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
```

## Future Improvements

### High Priority
- Add `revalidate` to `/profile`, `/map`, `/admin` pages
- Create `src/lib/data/forum.ts` with cached forum queries
- Create `src/lib/data/admin.ts` with cached admin queries
- Add `generateStaticParams` for popular product detail pages

### Medium Priority
- Implement hover prefetch for product cards
- Add `placeholderData` in TanStack Query
- Create cache dashboard for admin
- Add ETags to API routes

### Low Priority
- Static generate `/terms`, `/privacy` pages
- Add cache hit/miss logging in development
- Database materialized views for complex aggregations
