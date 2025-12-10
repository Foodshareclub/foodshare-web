---
inclusion: always
---

# Architecture Overview

## Current State

The codebase uses a **server-first architecture** with Next.js 16. No Redux.

| Area | Implementation |
|------|----------------|
| Data fetching | Server Components + `lib/data` functions |
| Mutations | Server Actions with `revalidatePath`/`invalidateTag` |
| Auth | Middleware + server-side session |
| UI state | Zustand (minimal - modals, preferences) |
| Caching | `unstable_cache` with centralized cache keys |
| Realtime | Supabase client subscriptions (client-only) |
| Git hooks | Rust-based `lefthook-rs` (security, quality, format) |

## Data Flow

```text
READ:  Server Component → lib/data function → Supabase → Render
WRITE: form action → Server Action → Supabase → revalidate → Re-render
REALTIME: Client Component → Supabase subscription → useState
```

## Key Files

### Data Layer

- `src/lib/data/*.ts` - Data fetching functions (server-only)
- `src/app/actions/*.ts` - Server Actions for mutations
- `src/lib/data/cache-keys.ts` - Centralized cache tags

### Supabase Clients

- `src/lib/supabase/server.ts` - Server client (Components, Actions, Route Handlers)
- `src/lib/supabase/client.ts` - Browser client (realtime subscriptions only)

### State (Minimal)

- `src/store/` - Zustand stores for UI state only (modals, preferences)
- No Redux, no TanStack Query for data fetching

### Developer Tooling

- `tools/` - Rust-based git hooks binary (`lefthook-rs`)
- `lefthook.yml` - Hook orchestration config

## When to Use What

| Need | Solution |
|------|----------|
| Fetch data for page | Server Component + `lib/data` function |
| Create/update/delete | Server Action |
| Form submission | `<form action={serverAction}>` |
| Pending state | `useFormStatus` in Client Component |
| Realtime updates | Supabase subscription in Client Component |
| UI state (modal open) | Zustand or `useState` |
| Client interactivity | Client Component with `'use client'` |

## Patterns to Follow

```typescript
// ✅ Server Component fetching data
export default async function Page() {
  const data = await getData();
  return <Component data={data} />;
}

// ✅ Server Action for mutations
'use server';
export async function createItem(formData: FormData) {
  await supabase.from('items').insert({ ... });
  invalidateTag(CACHE_TAGS.ITEMS);
}

// ✅ Client Component for interactivity
'use client';
export function Filter({ items }) {
  const [filter, setFilter] = useState('all');
  return <List items={items.filter(...)} />;
}
```

## Patterns to Avoid

```typescript
// ❌ Don't fetch in useEffect
'use client';
useEffect(() => {
  fetch('/api/data').then(setData);
}, []);

// ❌ Don't use Redux/TanStack Query for server data
const data = useQuery(['items'], fetchItems);

// ❌ Don't create Supabase server client without await
const supabase = createClient(); // Missing await!
```
