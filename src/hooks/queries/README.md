# ⚠️ DEPRECATED - TanStack Query Hooks

These hooks are **deprecated** and should not be used in new code.

## Migration Guide

The codebase has been refactored to use **Server Components** and **Server Actions** instead of TanStack Query.

### New Architecture

| Old Pattern | New Pattern |
|-------------|-------------|
| `useQuery` for data fetching | Server Component + `lib/data/*` function |
| `useMutation` for mutations | Server Action in `app/actions/*` |
| `QueryClientProvider` | Not needed |

### Examples

**Before (TanStack Query):**
```typescript
'use client';
import { useProducts } from '@/hooks/queries/useProductQueries';

function ProductList() {
  const { data: products, isLoading } = useProducts();
  // ...
}
```

**After (Server Component):**
```typescript
// Server Component - no 'use client'
import { getProducts } from '@/lib/data/products';

async function ProductList() {
  const products = await getProducts();
  // ...
}
```

### Files to Use Instead

- **Data fetching**: `src/lib/data/*.ts`
- **Mutations**: `src/app/actions/*.ts`
- **Auth**: `src/hooks/useAuth.ts` (uses Server Actions internally)
- **UI State**: Zustand stores in `src/store/zustand/`

### Timeline

These hooks will be removed in a future release. Please migrate to the new patterns.
