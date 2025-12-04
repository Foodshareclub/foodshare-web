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
const Map = dynamic(() => import('@/components/leaflet/Map'), { ssr: false });
```

## Caching

```typescript
import { unstable_cache } from 'next/cache';

export const getData = unstable_cache(
  async () => { /* fetch */ },
  ['key'],
  { revalidate: 60, tags: ['data'] }
);
```

## Revalidation

```typescript
revalidateTag('products');
revalidatePath('/products');
```

## Checklist

- [ ] Server Components for data
- [ ] `priority` on above-fold images
- [ ] `dynamic()` for heavy components
- [ ] `Promise.all()` for parallel fetch
- [ ] Suspense for streaming
- [ ] Cleanup subscriptions
