---
inclusion: always
---

# Implementation Patterns

## Server Component (Default)

```typescript
// app/products/page.tsx
import { getProducts } from '@/lib/data/products';

export default async function ProductsPage() {
  const products = await getProducts();
  return <ProductGrid products={products} />;
}
```

## Data Function

```typescript
// lib/data/products.ts
import { createClient } from '@/lib/supabase/server';

export async function getProducts() {
  const supabase = await createClient();
  const { data, error } = await supabase.from('posts').select('*');
  if (error) throw error;
  return data;
}
```

## Server Action

```typescript
// app/actions/products.ts
'use server';

import { revalidateTag } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function createProduct(formData: FormData) {
  const supabase = await createClient();
  await supabase.from('posts').insert({
    post_name: formData.get('name') as string,
  });
  revalidateTag('products');
}
```

## Form with Pending State

```typescript
'use client';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';

export function SubmitButton() {
  const { pending } = useFormStatus();
  return <Button disabled={pending}>{pending ? 'Saving...' : 'Save'}</Button>;
}
```

## Client Component

```typescript
'use client';
import { useState } from 'react';

export function ProductFilter({ products }) {
  const [type, setType] = useState('all');
  const filtered = products.filter(p => type === 'all' || p.type === type);
  return <ProductGrid products={filtered} />;
}
```

## Realtime Subscription

```typescript
'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function RealtimeMessages({ roomId }) {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel('messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => setMessages(prev => [...prev, payload.new]))
      .subscribe();
    return () => channel.unsubscribe();
  }, [roomId]);

  return <MessageList messages={messages} />;
}
```

## Dynamic Import (No SSR)

```typescript
import dynamic from 'next/dynamic';

const Map = dynamic(() => import('@/components/leaflet/Map'), {
  ssr: false,
  loading: () => <MapSkeleton />,
});
```

## Quick Reference

| Need | Solution |
|------|----------|
| Fetch data | Server Component + lib/data function |
| Mutate data | Server Action + revalidateTag |
| Form submit | form action={serverAction} |
| Pending state | useFormStatus |
| Interactivity | Client Component |
| Realtime | Supabase client subscription |
| Maps | dynamic import with ssr: false |
