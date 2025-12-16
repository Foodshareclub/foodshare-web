# Supabase with Next.js 16

## Overview

Supabase integration using Next.js 16 patterns: Server Components for reading, Server Actions for mutations.

## Client Setup

### Server-Side (Server Components & Actions)

```typescript
// src/lib/supabase/server.ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );
}
```

### Client-Side (Client Components)

```typescript
// src/lib/supabase/client.ts
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

## Data Fetching Pattern

### Data Layer (lib/data/)

```typescript
// src/lib/data/products.ts
import { unstable_cache } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { CACHE_TAGS, CACHE_DURATIONS } from "./cache-keys";

export const getProducts = unstable_cache(
  async (productType: string) => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("posts_with_location")
      .select("*")
      .eq("post_type", productType)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return data ?? [];
  },
  ["products-list"],
  { revalidate: CACHE_DURATIONS.PRODUCTS, tags: [CACHE_TAGS.PRODUCTS] }
);

export const getProductById = unstable_cache(
  async (id: string) => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("posts_with_location")
      .select("*, profiles(*)")
      .eq("id", id)
      .single();

    if (error) throw new Error(error.message);
    return data;
  },
  ["product-by-id"],
  { revalidate: CACHE_DURATIONS.PRODUCT_DETAIL, tags: [CACHE_TAGS.PRODUCTS] }
);
```

### Server Component Usage

```typescript
// src/app/food/page.tsx
import { getProducts } from '@/lib/data/products';
import { ProductGrid } from '@/components/products/ProductGrid';

export default async function FoodPage() {
  const products = await getProducts('food');
  return <ProductGrid products={products} />;
}
```

## Mutations with Server Actions

### Server Action Pattern

```typescript
// src/app/actions/products.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/data/cache-keys";

export async function createProduct(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase.from("posts").insert({
    user_id: user.id,
    post_name: formData.get("post_name") as string,
    post_description: formData.get("post_description") as string,
    post_type: formData.get("post_type") as string,
  });

  if (error) throw new Error(error.message);

  revalidateTag(CACHE_TAGS.PRODUCTS);
}

export async function deleteProduct(productId: string) {
  const supabase = await createClient();

  const { error } = await supabase.from("posts").delete().eq("id", productId);

  if (error) throw new Error(error.message);

  revalidateTag(CACHE_TAGS.PRODUCTS);
}
```

### Using Server Actions in Client Components

```typescript
'use client';

import { useTransition } from 'react';
import { createProduct } from '@/app/actions/products';

export function CreateProductForm() {
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      await createProduct(formData);
    });
  };

  return (
    <form action={handleSubmit}>
      <input name="post_name" required />
      <Button type="submit" disabled={isPending}>
        {isPending ? 'Creating...' : 'Create Product'}
      </Button>
    </form>
  );
}
```

## Authentication

### Get Current User (Server)

```typescript
// In Server Component or Server Action
const supabase = await createClient();
const {
  data: { user },
} = await supabase.auth.getUser();
```

### Auth in Middleware

```typescript
// src/middleware.ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && request.nextUrl.pathname.startsWith("/profile")) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  return response;
}
```

## Real-time (Client Only)

```typescript
"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export function useRealtimeProducts(onUpdate: () => void) {
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("products-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, () => onUpdate())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [onUpdate]);
}
```

## Geospatial Queries

```typescript
// Using PostGIS via RPC
const { data } = await supabase.rpc("find_nearby_posts", {
  user_lat: latitude,
  user_lng: longitude,
  radius_km: 10,
});
```

## Error Handling

```typescript
export async function safeQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: Error | null }>
): Promise<T> {
  const { data, error } = await queryFn();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("No data returned");
  return data;
}
```

## When to Use This Skill

- Setting up Supabase with Next.js SSR
- Creating cached data fetching functions
- Writing Server Actions for mutations
- Implementing authentication
- Real-time subscriptions
- Geospatial queries with PostGIS
