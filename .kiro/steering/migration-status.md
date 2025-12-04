---
inclusion: always
---

# Migration Status: Redux to Server-First Architecture

## Current State

The codebase is in transition from Redux to a server-first architecture. During this migration:

- **Redux is still active** - Legacy code uses Redux for auth, profile, products, chat, admin, forum
- **TanStack Query exists** - New queries in `src/hooks/queries/` use TanStack Query
- **Server Components not yet adopted** - Most pages still use `'use client'`

## Migration Target

| Area | Current | Target |
|------|---------|--------|
| Data fetching | Redux thunks | Server Components + data functions |
| Mutations | Redux actions | Server Actions |
| Auth state | Redux slice | Server-side session |
| UI state | Redux slice | Zustand (minimal) |
| Caching | Redux persist | `unstable_cache` + TanStack Query |

## Working with Legacy Code

### When Modifying Existing Features

1. **Don't break existing Redux patterns** - Keep working code functional
2. **Prefer TanStack Query for new queries** - Use hooks in `src/hooks/queries/`
3. **Use existing selectors** - Import from `@/store`

### When Creating New Features

Follow the server-first approach from steering rules:

```typescript
// NEW: Server Component with data function
// app/products/page.tsx
import { getProducts } from '@/lib/data/products';

export default async function ProductsPage() {
  const products = await getProducts();
  return <ProductGrid products={products} />;
}
```

## Key Files

### Redux (Legacy)

- `src/store/redux-store.ts` - Store configuration
- `src/store/slices/` - Redux slices
- `src/store/selectors.ts` - Memoized selectors
- `src/hooks/hooks.ts` - `useAppDispatch`, `useAppSelector`

### TanStack Query (Transitional)

- `src/hooks/queries/useProductQueries.ts` - Product queries
- `src/hooks/queries/useAdminQueries.ts` - Admin queries
- `src/api/*.ts` - API functions

### Supabase Clients

- `src/lib/supabase/client.ts` - Browser client (realtime, auth)
- `src/lib/supabase/server.ts` - Server client (API routes)

## Migration Priorities

1. **New features** - Use Server Components + Server Actions
2. **Product pages** - Migrate to server-side data fetching
3. **Auth** - Move to middleware + server-side session
4. **Chat** - Keep client-side (realtime requirement)
5. **Admin** - Migrate last (complex, low traffic)

## Patterns to Avoid in New Code

```typescript
// AVOID: Client component fetching on mount
'use client';
useEffect(() => {
  dispatch(fetchData());
}, []);

// PREFER: Server Component
export default async function Page() {
  const data = await getData();
  return <Component data={data} />;
}
```

```typescript
// AVOID: Redux for new features
dispatch(createProductTC(data));

// PREFER: Server Action
<form action={createProduct}>
```

## Coexistence Strategy

During migration, both patterns coexist:

```typescript
// providers.tsx wraps both
<QueryClientProvider>
  <ReduxProvider store={store}>
    <PersistGate>
      {children}
    </PersistGate>
  </ReduxProvider>
</QueryClientProvider>
```

Components can use either:
- `useAppSelector` for Redux state
- `useQuery` for TanStack Query
- Props from Server Components (preferred for new code)
