---
inclusion: always
---

# Best Practices

## Next.js 16 Rules

1. **Server Components are default** - No directive needed
2. **Client Components** - Add `'use client'` at top
3. **Server Actions** - Add `'use server'` for mutations
4. **React Compiler** - Auto-memoization, skip manual `React.memo`/`useCallback`

## Data Fetching

### Server Components (Preferred)

```typescript
export default async function Page({ params }) {
  const data = await getData(params.id);
  if (!data) notFound();
  return <Component data={data} />;
}
```

### Server Actions (Mutations)

```typescript
'use server';
import { CACHE_TAGS, invalidateTag } from '@/lib/data/cache-keys';

export async function createItem(formData: FormData) {
  await supabase.from('items').insert({ name: formData.get('name') });
  invalidateTag(CACHE_TAGS.PRODUCTS); // Use centralized cache helper
}
```

### Form Usage

```tsx
<form action={createItem}>
  <input name="name" />
  <SubmitButton />
</form>
```

## Environment Variables

- Server-only: `SUPABASE_SERVICE_ROLE_KEY`
- Client-side: `NEXT_PUBLIC_SUPABASE_URL`

## Supabase

```typescript
// Server (Components, Actions, Route Handlers)
const supabase = await createClient(); // from @/lib/supabase/server

// Client (only for realtime)
const supabase = createClient(); // from @/lib/supabase/client
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Hooks in Server Component | Add `'use client'` |
| Missing `NEXT_PUBLIC_` | Add prefix for client vars |
| Not awaiting `createClient()` | Always `await` on server |
| Hydration mismatch | Use `useEffect` for client-only |
| Re-exporting from `'use server'` file | Only async actions allowed; import data from `@/lib/data/*` |

## Checklist

- [ ] Server/Client separation correct
- [ ] Environment variables prefixed correctly
- [ ] Supabase client correct (server vs client)
- [ ] Error handling in async operations
- [ ] Images use Next.js Image component
- [ ] No console.log in production
- [ ] TypeScript types explicit
- [ ] Use `invalidateTag` from `@/lib/data/cache-keys` for cache invalidation
