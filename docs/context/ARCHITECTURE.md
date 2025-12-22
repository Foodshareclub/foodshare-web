# FoodShare Architecture

**Last Updated:** December 2025

## System Architecture Overview

FoodShare follows a modern **Next.js 16 App Router** architecture with **React Server Components** as the foundation. Data flows through Server Components and Server Actions, with Supabase as the backend.

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Browser / Client                              │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │               Next.js 16 Application (App Router)              │ │
│  │  ┌──────────────────┐  ┌──────────────────┐                   │ │
│  │  │ Server Components │  │ Client Components │                   │ │
│  │  │ (Data Fetching)   │  │ (Interactivity)   │                   │ │
│  │  └────────┬─────────┘  └────────┬─────────┘                   │ │
│  │           │                     │                              │ │
│  │  ┌────────▼─────────────────────▼─────────┐                   │ │
│  │  │            Server Actions               │                   │ │
│  │  │  (Mutations, Form Handling, Auth)       │                   │ │
│  │  └────────────────────┬───────────────────┘                   │ │
│  │                       │                                        │ │
│  │  ┌────────────────────▼───────────────────┐                   │ │
│  │  │      React Query (Client Caching)       │                   │ │
│  │  │  + Zustand (UI State)                   │                   │ │
│  │  └────────────────────┬───────────────────┘                   │ │
│  └───────────────────────┼────────────────────────────────────────┘ │
└──────────────────────────┼──────────────────────────────────────────┘
                           │ HTTPS / WebSocket
                           │
┌──────────────────────────▼──────────────────────────────────────────┐
│                        Supabase Backend                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │  PostgreSQL  │  │   Realtime   │  │   Storage    │              │
│  │   Database   │  │  WebSockets  │  │   (Images)   │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │     Auth     │  │  Row Level   │  │    Edge      │              │
│  │    (PKCE)    │  │   Security   │  │  Functions   │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Next.js 16 Core Concepts

### Server Components (Default)

Every component is a Server Component by default. They:

- Run only on the server
- Can directly access databases, file systems
- Have zero JavaScript sent to the client
- Support async/await natively

```typescript
// src/app/products/page.tsx - Server Component
import { getProducts } from '@/lib/data/products';  // Data from lib/data/

export const revalidate = 60; // Route segment config for time-based revalidation

export default async function ProductsPage() {
  const products = await getProducts('food'); // Cached data fetching

  return (
    <main className="container mx-auto">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </main>
  );
}
```

### Client Components

Add `'use client'` only when you need:

- Event handlers (onClick, onChange)
- React hooks (useState, useEffect)
- Browser APIs (localStorage, geolocation)
- Third-party client libraries

```typescript
// src/components/products/AddToFavorites.tsx
'use client';

import { useState, useTransition } from 'react';
import { toggleFavorite } from '@/app/actions/favorites';

export function AddToFavorites({ productId }: { productId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      onClick={() => startTransition(() => toggleFavorite(productId))}
      disabled={isPending}
    >
      {isPending ? 'Saving...' : 'Add to Favorites'}
    </button>
  );
}
```

### Data Functions (lib/data/)

Cached data fetching functions live in `lib/data/`. They use `unstable_cache` for server-side caching with tag-based invalidation.

```typescript
// src/lib/data/products.ts - Cached data fetching
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
      .eq("is_active", true);
    if (error) throw new Error(error.message);
    return data ?? [];
  },
  ["products-by-type"],
  { revalidate: CACHE_DURATIONS.PRODUCTS, tags: [CACHE_TAGS.PRODUCTS] }
);
```

### Server Actions (Mutations)

Server Actions handle mutations only. They live in `app/actions/` and use `invalidateTag` from `@/lib/data/cache-keys` to invalidate caches (wrapper for Next.js 16's `revalidateTag` with default profile).

```typescript
// src/app/actions/products.ts - Mutations only
"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CACHE_TAGS, invalidateTag } from "@/lib/data/cache-keys";

// Mutation with cache invalidation
export async function createProduct(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { error } = await supabase.from("posts").insert({
    post_name: formData.get("post_name") as string,
    post_description: formData.get("post_description") as string,
    post_type: formData.get("post_type") as string,
    profile_id: user.id,
  });

  if (error) throw new Error(error.message);

  invalidateTag(CACHE_TAGS.PRODUCTS); // Invalidate cache
  redirect("/food");
}

// Delete with cache invalidation
export async function deleteProduct(id: number) {
  const supabase = await createClient();

  const { error } = await supabase.from("posts").delete().eq("id", id);
  if (error) throw new Error(error.message);

  invalidateTag(CACHE_TAGS.PRODUCTS);
}
```

---

## Application Architecture

### Layer Structure

```
┌─────────────────────────────────────────────────────────────────┐
│                    Presentation Layer                            │
│  Server Components + Client Components + shadcn/ui               │
│  • Pages (src/app/**/page.tsx)                                  │
│  • Layouts (src/app/**/layout.tsx)                              │
│  • Components (src/components/**)                                │
├─────────────────────────────────────────────────────────────────┤
│                      Action Layer                                │
│  Server Actions (src/app/actions/*.ts)                          │
│  • Data fetching functions                                       │
│  • Mutation functions                                            │
│  • Form handlers                                                 │
├─────────────────────────────────────────────────────────────────┤
│                   Client State Layer                             │
│  React Query + Zustand (when needed)                            │
│  • Client-side caching (src/hooks/queries/)                     │
│  • UI state (src/store/zustand/)                                │
├─────────────────────────────────────────────────────────────────┤
│                      Data Layer                                  │
│  Supabase Clients                                               │
│  • Server client (src/lib/supabase/server.ts)                   │
│  • Client client (src/lib/supabase/client.ts)                   │
├─────────────────────────────────────────────────────────────────┤
│                  Infrastructure Layer                            │
│  External Services                                               │
│  • Supabase (DB, Auth, Storage, Realtime)                       │
│  • Vercel (Hosting, Edge)                                       │
│  • Email providers (Brevo, SES)                                 │
└─────────────────────────────────────────────────────────────────┘
```

### App Router Structure

```
src/app/
├── layout.tsx              # Root layout (providers, metadata)
├── page.tsx                # Home page (Server Component)
├── loading.tsx             # Global loading UI
├── error.tsx               # Global error boundary
├── not-found.tsx           # 404 page
├── providers.tsx           # Client providers (React Query, Theme)
│
├── actions/                # Server Actions (centralized)
│   ├── products.ts         # Product CRUD
│   ├── auth.ts             # Authentication
│   ├── chat.ts             # Messaging
│   ├── profile.ts          # Profile management
│   └── admin.ts            # Admin operations
│
├── (auth)/                 # Auth route group (shared layout)
│   ├── login/page.tsx
│   ├── signup/page.tsx
│   └── callback/page.tsx
│
├── (main)/                 # Main app route group
│   ├── layout.tsx          # Main layout with header/footer
│   ├── map/page.tsx        # Map view
│   ├── food/
│   │   ├── page.tsx        # Food listings
│   │   └── [id]/page.tsx   # Food detail
│   └── profile/page.tsx    # User profile
│
└── admin/                  # Admin section
    ├── layout.tsx          # Admin layout
    └── page.tsx            # Admin dashboard
```

---

## Data Flow Patterns

### Pattern 1: Server Component Data Fetching

The primary pattern for data display. No client-side JavaScript needed.

```typescript
// src/app/food/page.tsx
import { getProducts } from '@/lib/data/products';  // Data functions from lib/data/
import { ProductGrid } from '@/components/products/ProductGrid';

export default async function FoodPage() {
  const products = await getProducts();

  return <ProductGrid products={products} />;
}
```

### Pattern 2: Server Action Mutations

For creating, updating, or deleting data.

```typescript
// src/components/products/CreateProductForm.tsx
'use client';

import { createProduct } from '@/app/actions/products';
import { useFormStatus } from 'react-dom';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending}>
      {pending ? 'Creating...' : 'Create Product'}
    </button>
  );
}

export function CreateProductForm() {
  return (
    <form action={createProduct}>
      <input name="title" required />
      <textarea name="description" />
      <SubmitButton />
    </form>
  );
}
```

### Pattern 3: useTransition for Client Mutations

For mutations triggered by events (not forms).

```typescript
// src/components/products/DeleteButton.tsx
'use client';

import { useTransition } from 'react';
import { deleteProduct } from '@/app/actions/products';

export function DeleteButton({ productId }: { productId: string }) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    startTransition(async () => {
      await deleteProduct(productId);
    });
  };

  return (
    <button onClick={handleDelete} disabled={isPending}>
      {isPending ? 'Deleting...' : 'Delete'}
    </button>
  );
}
```

### Pattern 4: React Query for Client Caching

When you need client-side caching, polling, or optimistic updates.

**Important:** TanStack Query hooks run on the client and cannot import server-only functions from `lib/data/`. Use API routes for data fetching in client hooks.

```typescript
// src/hooks/queries/useProducts.ts
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createProduct } from "@/app/actions/products"; // Mutations via Server Actions

// Fetch via API route (client-safe)
async function fetchProducts(type: string) {
  const res = await fetch(`/api/products?type=${encodeURIComponent(type)}`);
  if (!res.ok) throw new Error("Failed to fetch products");
  return res.json();
}

export function useProducts(type: string) {
  return useQuery({
    queryKey: ["products", type],
    queryFn: () => fetchProducts(type),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}
```

### Pattern 5: Zustand for UI State

For ephemeral client state that doesn't need server sync.

```typescript
// src/store/zustand/useUIStore.ts
import { create } from "zustand";

interface UIStore {
  sidebarOpen: boolean;
  filterModalOpen: boolean;
  toggleSidebar: () => void;
  openFilterModal: () => void;
  closeFilterModal: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  sidebarOpen: false,
  filterModalOpen: false,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  openFilterModal: () => set({ filterModalOpen: true }),
  closeFilterModal: () => set({ filterModalOpen: false }),
}));
```

---

## Real-time Architecture

### Supabase Realtime Subscriptions

For live updates (chat, notifications).

```typescript
// src/hooks/useRealtimeMessages.ts
"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

export function useRealtimeMessages(chatId: string) {
  const queryClient = useQueryClient();
  const supabase = createClient();

  useEffect(() => {
    const channel = supabase
      .channel(`chat:${chatId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `chat_id=eq.${chatId}`,
        },
        () => {
          // Invalidate React Query cache to refetch
          queryClient.invalidateQueries({ queryKey: ["messages", chatId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId, queryClient, supabase]);
}
```

---

## Authentication Architecture

### Auth Flow (PKCE)

```
User Request
    ↓
Middleware (src/middleware.ts)
    ├── Validates/clears corrupted cookies
    ├── Refreshes session automatically
    └── Protects /admin routes (defense-in-depth)
    ↓
Supabase Auth (PKCE OAuth)
    ↓
Session stored in cookies (via @supabase/ssr)
    ↓
Server Components read session
    ↓
Server Actions validate session before mutations
```

### Middleware Protection

The middleware (`src/middleware.ts`) provides edge-level authentication:

- **Cookie Validation** - Detects and clears corrupted Supabase cookies
- **Session Refresh** - Automatically refreshes expired sessions on every request
- **Admin Protection** - Multi-source role checking for `/admin/*` routes (JSONB role, legacy user_role, user_roles table)

### Server-Side Auth Check

```typescript
// src/app/actions/auth.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function requireAuth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  return user;
}

export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
```

### Protected Pages

```typescript
// src/app/profile/page.tsx
import { requireAuth } from '@/app/actions/auth';
import { getProfile } from '@/lib/data/profiles';

export default async function ProfilePage() {
  const user = await requireAuth(); // Redirects if not authenticated
  const profile = await getProfile(user.id);

  return <ProfileView profile={profile} />;
}
```

---

## Streaming & Suspense

### Streaming with Suspense Boundaries

```typescript
// src/app/food/page.tsx
import { Suspense } from 'react';
import { ProductList } from '@/components/products/ProductList';
import { ProductSkeleton } from '@/components/products/ProductSkeleton';
import { Recommendations } from '@/components/products/Recommendations';

export default function FoodPage() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Main content streams first */}
      <div className="lg:col-span-2">
        <Suspense fallback={<ProductSkeleton count={6} />}>
          <ProductList />
        </Suspense>
      </div>

      {/* Sidebar streams independently */}
      <aside>
        <Suspense fallback={<div>Loading recommendations...</div>}>
          <Recommendations />
        </Suspense>
      </aside>
    </div>
  );
}
```

### Async Components with Suspense

```typescript
// src/components/products/ProductList.tsx
import { getProducts } from '@/lib/data/products';  // Data functions from lib/data/

export async function ProductList() {
  const products = await getProducts();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
```

---

## Caching Strategy

### Next.js Cache

FoodShare uses a centralized cache key system in `src/lib/data/cache-keys.ts` for consistency across all caching operations.

```typescript
// src/lib/data/cache-keys.ts - Centralized cache tags
import { CACHE_TAGS, CACHE_DURATIONS } from "@/lib/data/cache-keys";

// Available tags:
// CACHE_TAGS.PRODUCTS, CACHE_TAGS.PRODUCT(id), CACHE_TAGS.PRODUCTS_BY_TYPE(type)
// CACHE_TAGS.PROFILES, CACHE_TAGS.PROFILE(id), CACHE_TAGS.PROFILE_STATS(id)
// CACHE_TAGS.FORUM, CACHE_TAGS.FORUM_POST(id), CACHE_TAGS.CHAT, etc.

// Available durations (in seconds):
// CACHE_DURATIONS.SHORT (60s), CACHE_DURATIONS.MEDIUM (300s)
// CACHE_DURATIONS.LONG (3600s), CACHE_DURATIONS.PRODUCTS (60s), etc.
```

```typescript
// src/lib/data/products.ts - Cached data fetching
import { unstable_cache } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { CACHE_TAGS, CACHE_DURATIONS } from "@/lib/data/cache-keys";

// Cached data fetching with centralized tags
export const getProducts = unstable_cache(
  async (filters?: ProductFilters) => {
    const supabase = await createClient();
    const { data } = await supabase.from("products").select("*");
    return data ?? [];
  },
  [CACHE_TAGS.PRODUCTS],
  {
    tags: [CACHE_TAGS.PRODUCTS],
    revalidate: CACHE_DURATIONS.PRODUCTS,
  }
);

// src/app/actions/products.ts - Mutations only
("use server");

import { CACHE_TAGS, invalidateTag, getProductTags } from "@/lib/data/cache-keys";

// Revalidate after mutation using helper
export async function createProduct(formData: FormData) {
  // ... create product
  const tags = getProductTags(); // Returns all product-related tags
  tags.forEach((tag) => invalidateTag(tag));
}
```

### React Query Client Cache

```typescript
// src/app/providers.tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,     // 5 minutes
        gcTime: 30 * 60 * 1000,        // 30 minutes
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

---

## Error Handling

### Route Error Boundaries

```typescript
// src/app/food/error.tsx
'use client';

import { Button } from '@/components/ui/button';

export default function FoodError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh]">
      <h2 className="text-2xl font-bold mb-4">Something went wrong!</h2>
      <p className="text-muted-foreground mb-4">{error.message}</p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
```

### Server Action Error Handling

```typescript
// src/app/actions/products.ts
"use server";

import { z } from "zod";

const productSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
});

export async function createProduct(formData: FormData) {
  // Validate input
  const validatedFields = productSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
  });

  if (!validatedFields.success) {
    return {
      success: false,
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  try {
    const supabase = await createClient();
    await supabase.from("products").insert(validatedFields.data);

    revalidatePath("/products");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      errors: { _form: ["Failed to create product"] },
    };
  }
}
```

---

## Performance Architecture

### Optimization Strategies

1. **Server Components** - Zero client JS for data display
2. **Streaming** - Progressive page loading with Suspense
3. **React Compiler** - Automatic memoization (enabled in next.config.ts)
4. **Turbopack** - Fast development builds
5. **Dynamic Imports** - Code splitting for heavy components
6. **Image Optimization** - Next.js Image with Supabase CDN

### Dynamic Import Pattern

```typescript
// Lazy load heavy components
import dynamic from 'next/dynamic';

const LeafletMap = dynamic(
  () => import('@/components/leaflet/LeafletMap'),
  {
    ssr: false,
    loading: () => <div className="h-96 bg-muted animate-pulse" />,
  }
);
```

---

## Security Architecture

### Defense in Depth

1. **Server Actions** - All mutations run server-side
2. **Input Validation** - Zod schemas for all user input
3. **Row Level Security** - Supabase RLS on all tables
4. **PKCE Auth** - Secure OAuth flow
5. **CSRF Protection** - Built into Server Actions
6. **Content Security Policy** - Configured in next.config.ts

### Supabase RLS Example

```sql
-- Users can only read their own profile
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

-- Users can only update their own profile
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id);
```

---

## Deployment Architecture

### Build & Deploy Pipeline

```
Source Code
    ↓
TypeScript Check (tsc --noEmit)
    ↓
ESLint Validation
    ↓
Next.js Build
    ↓
Server Components compiled
    ↓
Client bundles optimized
    ↓
Deploy to Vercel
    ↓
Edge Network Distribution
```

### Environment Configuration

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx  # Server-only
```

---

**Next Steps:**

- [Tech Stack](TECH_STACK.md) - Technology details
- [Database Schema](DATABASE_SCHEMA.md) - Data structure
- [Development Guide](DEVELOPMENT_GUIDE.md) - Workflows
