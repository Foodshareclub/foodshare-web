---
inclusion: always
---

# Code Style

## TypeScript

- Strict mode enabled
- Explicit return types for functions
- No `any` - use `unknown` or proper types
- Prefix unused vars with `_`

## Component Patterns

### Server Component (Default)

```typescript
// No 'use client' - runs on server
import { getProducts } from '@/lib/data/products';

export default async function ProductsPage() {
  const products = await getProducts();
  return <ProductGrid products={products} />;
}
```

### Client Component

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function Counter() {
  const [count, setCount] = useState(0);
  return <Button onClick={() => setCount(c => c + 1)}>{count}</Button>;
}
```

### Server Action

```typescript
// app/actions/products.ts
'use server';

import { revalidateTag } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function createProduct(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from('posts').insert({
    post_name: formData.get('name') as string,
  });
  if (error) return { error: error.message };
  revalidateTag('products');
  return { success: true };
}
```

### Form with Server Action

```typescript
// Server Component
import { createProduct } from '@/app/actions/products';
import { SubmitButton } from './SubmitButton';

export function CreateForm() {
  return (
    <form action={createProduct}>
      <input name="name" required />
      <SubmitButton />
    </form>
  );
}

// Client Component for pending state
'use client';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';

export function SubmitButton() {
  const { pending } = useFormStatus();
  return <Button disabled={pending}>{pending ? 'Saving...' : 'Save'}</Button>;
}
```

## React Compiler (Next.js 16)

Auto-memoization is enabled. Skip manual optimization:

```typescript
// ✅ Just write normal code - compiler optimizes
export function ProductCard({ product, onSelect }) {
  const handleClick = () => onSelect(product.id);
  return <button onClick={handleClick}>{product.name}</button>;
}

// ❌ Unnecessary - compiler does this
const ProductCard = React.memo(({ product, onSelect }) => {
  const handleClick = useCallback(() => onSelect(product.id), [product.id, onSelect]);
  return <button onClick={handleClick}>{product.name}</button>;
});
```

## Styling

Use Tailwind + `cn()` utility:

```typescript
import { cn } from '@/lib/utils';

<div className={cn(
  'flex items-center gap-4 p-4 rounded-lg',
  isActive && 'bg-primary text-white',
  className
)}>
```

## Internationalization

```typescript
// Server Component
import { getTranslations } from 'next-intl/server';

export default async function Page() {
  const t = await getTranslations('HomePage');
  return <h1>{t('title')}</h1>;
}

// Client Component
'use client';
import { useTranslations } from 'next-intl';

export function Greeting() {
  const t = useTranslations('Common');
  return <span>{t('hello')}</span>;
}
```

## Supabase

```typescript
// Server-side (Server Components, Actions, Route Handlers)
import { createClient } from '@/lib/supabase/server';
const supabase = await createClient();

// Client-side (only for realtime subscriptions)
import { createClient } from '@/lib/supabase/client';
const supabase = createClient();
```

## Naming

- `camelCase` - variables, functions
- `PascalCase` - components, types
- `UPPER_CASE` - constants
- Boolean: `is*`, `has*`, `should*`, `can*`

## Commits

```text
feat: add user profile page
fix: resolve chat message duplication
refactor: simplify product card
docs: update API documentation
```
