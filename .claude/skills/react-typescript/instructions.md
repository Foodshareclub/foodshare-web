# React 19 + TypeScript with Next.js 16

## Overview

Expert guidance for React 19 components in a Next.js 16 App Router application with TypeScript 5 and shadcn/ui.

## Tech Stack

- **React**: 19 with Server Components (default)
- **TypeScript**: 5.x with strict mode
- **Framework**: Next.js 16 App Router
- **UI**: shadcn/ui + Radix UI + Tailwind CSS 4
- **State**: Server Components + React Query + Zustand

## Server vs Client Components

### Server Components (Default)

```typescript
// src/app/products/page.tsx - NO 'use client' needed
import { getProducts } from '@/lib/data/products';

export default async function ProductsPage() {
  const products = await getProducts();
  return <ProductGrid products={products} />;
}
```

### Client Components (Only When Needed)

```typescript
// src/components/products/ProductCard.tsx
'use client';

import { useState, useTransition } from 'react';
import { deleteProduct } from '@/app/actions/products';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    startTransition(async () => {
      await deleteProduct(product.id);
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{product.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Button onClick={handleDelete} disabled={isPending}>
          {isPending ? 'Deleting...' : 'Delete'}
        </Button>
      </CardContent>
    </Card>
  );
}
```

## When to Use 'use client'

Add `'use client'` ONLY when you need:

- Event handlers (onClick, onChange, onSubmit)
- React hooks (useState, useEffect, useRef)
- Browser APIs (localStorage, window)
- React Query or Zustand
- Third-party client libraries

## TypeScript Patterns

### Component Props

```typescript
interface ComponentProps {
  title: string;
  onAction: (id: string) => void;
  children?: React.ReactNode;
  variant?: 'default' | 'destructive';
}

export function Component({ title, onAction, children, variant = 'default' }: ComponentProps) {
  return <div className={cn('p-4', variant === 'destructive' && 'bg-red-100')}>{children}</div>;
}
```

### Strict Typing Rules

- Never use `any` - use `unknown` if type is truly unknown
- Never use non-null assertions (`!`) - check existence first
- Use `satisfies` for type-checking object literals
- Define explicit return types for exported functions

### Database Types

```typescript
// Use generated Supabase types
import { Database } from "@/types/supabase";

type Product = Database["public"]["Tables"]["posts"]["Row"];
type InsertProduct = Database["public"]["Tables"]["posts"]["Insert"];
```

## React 19 Features

### useTransition for Mutations

```typescript
const [isPending, startTransition] = useTransition();

const handleSubmit = () => {
  startTransition(async () => {
    await serverAction(data);
  });
};
```

### useOptimistic for Immediate UI

```typescript
const [optimisticProducts, addOptimistic] = useOptimistic(products, (state, newProduct) => [
  ...state,
  newProduct,
]);
```

### use() Hook for Promises

```typescript
// In client component
const data = use(fetchPromise);
```

## Performance

### Code Splitting

```typescript
// Dynamic imports for heavy components
import dynamic from 'next/dynamic';

const Map = dynamic(() => import('@/components/leaflet/Map'), {
  ssr: false,
  loading: () => <MapSkeleton />
});
```

### Memoization (Use Sparingly)

```typescript
// Only when you have measured performance issues
const MemoizedComponent = memo(ExpensiveComponent);

// useMemo for expensive calculations
const filtered = useMemo(
  () => products.filter((p) => p.category === category),
  [products, category]
);
```

## File Organization

```
src/
  app/                    # Next.js App Router
    layout.tsx           # Root layout
    page.tsx             # Home (Server Component)
    actions/             # Server Actions
  components/
    ui/                  # shadcn/ui primitives
    [feature]/           # Feature components
  hooks/
    queries/             # React Query hooks
  lib/
    data/                # Data fetching (server-only)
    utils.ts             # Utilities (cn, formatDate)
  types/                 # TypeScript definitions
```

## When to Use This Skill

- Creating new React components
- Converting client to server components
- Implementing TypeScript types
- Optimizing component performance
- Integrating shadcn/ui components
