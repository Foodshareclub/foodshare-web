---
inclusion: always
---

# Performance

## Server Components

Default - zero client JS. Fetch on server:

```typescript
export default async function Page() {
  const data = await getData();
  return <Component data={data} />;
}
```

## React Compiler

Auto-memoization. Skip manual `React.memo`, `useMemo`, `useCallback`.

## Streaming

```typescript
<Suspense fallback={<Skeleton />}>
  <ProductList />
</Suspense>
```

## Parallel Fetching

```typescript
const [a, b] = await Promise.all([getA(), getB()]);
```

## Images

```typescript
<Image src={url} alt="desc" width={400} height={300} priority />
```

## Code Splitting

```typescript
const Map = dynamic(() => import("@/components/leaflet/Map"), { ssr: false });
```

## Caching

Use centralized cache keys from `@/lib/data/cache-keys`:

```typescript
import { unstable_cache } from "next/cache";
import { CACHE_TAGS, CACHE_DURATIONS } from "@/lib/data/cache-keys";

export const getData = unstable_cache(
  async () => {
    /* fetch */
  },
  [CACHE_TAGS.PRODUCTS],
  { revalidate: CACHE_DURATIONS.PRODUCTS, tags: [CACHE_TAGS.PRODUCTS] }
);
```

## Revalidation

```typescript
import { revalidatePath } from "next/cache";
import { CACHE_TAGS, invalidateTag, getProductTags } from "@/lib/data/cache-keys";

invalidateTag(CACHE_TAGS.PRODUCTS);
revalidatePath("/products");

// Bulk invalidation
getProductTags(productId, type).forEach((tag) => invalidateTag(tag));
```

## Checklist

- [ ] Server Components for data
- [ ] `priority` on above-fold images
- [ ] `dynamic()` for heavy components
- [ ] `Promise.all()` for parallel fetch
- [ ] Suspense for streaming
- [ ] Cleanup subscriptions
