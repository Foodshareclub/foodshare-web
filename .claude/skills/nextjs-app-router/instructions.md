# Next.js 16 App Router

## Overview

Complete guide to Next.js 16 App Router: file-based routing, layouts, loading states, error boundaries, and streaming.

## File-Based Routing

### Route Structure

```
src/app/
├── layout.tsx          # Root layout (required)
├── page.tsx            # Home page (/)
├── loading.tsx         # Loading UI for /
├── error.tsx           # Error UI for /
├── not-found.tsx       # 404 page
├── food/
│   ├── page.tsx        # /food
│   ├── [id]/
│   │   └── page.tsx    # /food/[id] (dynamic)
│   └── loading.tsx     # Loading for /food/*
├── profile/
│   ├── layout.tsx      # Nested layout
│   └── page.tsx        # /profile
└── (auth)/             # Route group (no URL segment)
    ├── login/
    │   └── page.tsx    # /login
    └── register/
        └── page.tsx    # /register
```

### Page Component

```typescript
// src/app/food/page.tsx
import { getProducts } from '@/lib/data/products';
import { ProductGrid } from '@/components/products/ProductGrid';

// Route segment config
export const revalidate = 60; // Revalidate every 60 seconds

// Metadata
export const metadata = {
  title: 'Food Listings | FoodShare',
  description: 'Browse available food items',
};

export default async function FoodPage() {
  const products = await getProducts('food');
  return <ProductGrid products={products} />;
}
```

### Dynamic Routes

```typescript
// src/app/food/[id]/page.tsx
import { getProductById } from '@/lib/data/products';
import { notFound } from 'next/navigation';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ProductPage({ params }: Props) {
  const { id } = await params;
  const product = await getProductById(id);

  if (!product) {
    notFound();
  }

  return <ProductDetail product={product} />;
}

// Generate static params for SSG
export async function generateStaticParams() {
  const products = await getAllProducts();
  return products.map((p) => ({ id: p.id }));
}
```

## Layouts

### Root Layout

```typescript
// src/app/layout.tsx
import { Inter } from 'next/font/google';
import { Providers } from './providers';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'FoodShare',
  description: 'Community food sharing platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          <Header />
          <main>{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
```

### Nested Layout

```typescript
// src/app/profile/layout.tsx
import { ProfileSidebar } from '@/components/profile/ProfileSidebar';

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex">
      <ProfileSidebar />
      <div className="flex-1">{children}</div>
    </div>
  );
}
```

## Loading States

### loading.tsx

```typescript
// src/app/food/loading.tsx
import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="grid grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-48 w-full" />
      ))}
    </div>
  );
}
```

### Suspense Boundaries

```typescript
// src/app/food/page.tsx
import { Suspense } from 'react';
import { ProductList } from './ProductList';
import { ProductSkeleton } from './ProductSkeleton';

export default function FoodPage() {
  return (
    <div>
      <h1>Food Listings</h1>
      <Suspense fallback={<ProductSkeleton />}>
        <ProductList />
      </Suspense>
    </div>
  );
}
```

## Error Handling

### error.tsx

```typescript
// src/app/food/error.tsx
'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="text-center py-10">
      <h2 className="text-2xl font-bold">Something went wrong!</h2>
      <p className="text-muted-foreground">{error.message}</p>
      <button onClick={reset} className="mt-4">
        Try again
      </button>
    </div>
  );
}
```

### not-found.tsx

```typescript
// src/app/food/[id]/not-found.tsx
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="text-center py-10">
      <h2 className="text-2xl font-bold">Product Not Found</h2>
      <Link href="/food" className="text-primary">
        Back to listings
      </Link>
    </div>
  );
}
```

## Route Groups

```
src/app/
├── (marketing)/        # No URL prefix
│   ├── about/
│   └── contact/
├── (shop)/             # No URL prefix
│   ├── food/
│   └── cart/
└── (auth)/             # Separate layout for auth
    ├── layout.tsx      # Auth-specific layout
    ├── login/
    └── register/
```

## Parallel Routes

```typescript
// src/app/@modal/(.)food/[id]/page.tsx
// Intercepted route for modal

export default function ProductModal({ params }: Props) {
  return (
    <Modal>
      <ProductDetail id={params.id} />
    </Modal>
  );
}

// src/app/layout.tsx
export default function Layout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  return (
    <>
      {children}
      {modal}
    </>
  );
}
```

## Navigation

### Link Component

```typescript
import Link from 'next/link';

<Link href="/food">Food</Link>
<Link href={`/food/${id}`}>View Product</Link>
<Link href="/food" prefetch={false}>No Prefetch</Link>
```

### useRouter (Client Components)

```typescript
'use client';

import { useRouter } from 'next/navigation';

export function BackButton() {
  const router = useRouter();

  return (
    <button onClick={() => router.back()}>
      Go Back
    </button>
  );
}
```

### Redirect

```typescript
import { redirect } from "next/navigation";

// In Server Component or Server Action
if (!user) {
  redirect("/login");
}
```

## Metadata

### Static Metadata

```typescript
export const metadata = {
  title: "About | FoodShare",
  description: "Learn about our mission",
  openGraph: {
    title: "About FoodShare",
    images: ["/og-about.png"],
  },
};
```

### Dynamic Metadata

```typescript
export async function generateMetadata({ params }: Props) {
  const product = await getProductById(params.id);

  return {
    title: product.post_name,
    description: product.post_description,
  };
}
```

## When to Use This Skill

- Setting up new routes
- Creating layouts
- Implementing loading/error states
- Dynamic routing
- Route groups and parallel routes
- Navigation patterns
- Metadata and SEO
