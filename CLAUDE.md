# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FoodShare is a community food sharing platform built with **Next.js 16 App Router**. Users share surplus food, discover local offerings on an interactive map, and coordinate via real-time chat.

**Stack**: Next.js 16 + React 19 + TypeScript 5 + Tailwind CSS 4 + Supabase + shadcn/ui

## Cross-Platform Architecture

FoodShare uses a **shared backend** serving multiple client applications:

| Repository           | Purpose                     | Stack                            |
| -------------------- | --------------------------- | -------------------------------- |
| `foodshare/`         | Web app (this repo)         | Next.js 16 + React 19            |
| `foodshare-ios/`     | iOS app                     | Swift + SwiftUI                  |
| `foodshare-android/` | Android app                 | Kotlin + Jetpack Compose         |
| `foodshare-backend/` | **Shared Supabase backend** | Deno Edge Functions + PostgreSQL |

### Backend Integration

The `supabase/` folder in this repo is a **symlink** to the shared backend:

```
supabase/ → ../foodshare-backend
```

**Important**: When working with Edge Functions or database migrations:

- The actual code lives in `/Users/organic/dev/work/foodshare/foodshare-backend`
- Changes affect ALL platforms (Web, iOS, Android)
- See backend's `CLAUDE.md` for Edge Function patterns and security documentation

### When to Work Where

| Task                        | Repository               |
| --------------------------- | ------------------------ |
| Web UI, pages, components   | `foodshare/` (this repo) |
| Server Actions, React Query | `foodshare/` (this repo) |
| Edge Functions (Deno)       | `foodshare-backend/`     |
| Database migrations         | `foodshare-backend/`     |
| Push notifications, email   | `foodshare-backend/`     |
| iOS/Android attestation     | `foodshare-backend/`     |

## Critical Information

### This is Next.js 16 with App Router

| Aspect        | FoodShare                            | NOT                           |
| ------------- | ------------------------------------ | ----------------------------- |
| Routing       | File-based App Router (`src/app/`)   | React Router, Pages Router    |
| Entry Point   | `src/app/layout.tsx`                 | `index.html`, `_app.tsx`      |
| Data Fetching | Server Components + Server Actions   | getServerSideProps, useEffect |
| Mutations     | Server Actions (`'use server'`)      | API routes, Redux thunks      |
| Caching       | React Query + Next.js cache          | Redux, localStorage           |
| Dev Server    | `npm run dev` (Turbopack, port 3000) | `vite dev`                    |
| Build Output  | `.next/`                             | `dist/`                       |
| Env Vars      | `NEXT_PUBLIC_` prefix (client)       | `VITE_`, `REACT_APP_`         |

### UI: shadcn/ui + Radix UI + Tailwind CSS 4

- Components in `src/components/ui/` (copy-paste model)
- Use Tailwind CSS utility classes with CSS variables
- Dark mode via `next-themes` (class strategy)
- NEVER use Chakra UI (legacy, removed)

## State Management (Next.js 16 Best Practices)

**NO REDUX** - We use Next.js 16 native patterns:

| Pattern               | Use Case                                | Location                |
| --------------------- | --------------------------------------- | ----------------------- |
| **Server Components** | Data fetching, initial page load        | `src/app/**/page.tsx`   |
| **Server Actions**    | Mutations, form submissions             | `src/app/actions/*.ts`  |
| **React Query**       | Client-side caching, optimistic updates | `src/hooks/queries/`    |
| **Zustand**           | Lightweight client state (UI, chat)     | `src/store/zustand/`    |
| **React Context**     | Auth session, theme                     | `src/app/providers.tsx` |

### Data Flow Pattern

```
Server Component (fetch data)
    ↓
Pass to Client Component (via props)
    ↓
User Action → Server Action (mutation)
    ↓
revalidatePath() / revalidateTag()
    ↓
Server Component re-renders with fresh data
```

### Server Components (Default)

```typescript
// src/app/products/page.tsx - Server Component (no 'use client')
import { getProducts } from '@/lib/data/products';  // Data fetching from lib/data/
import { ProductGrid } from '@/components/products/ProductGrid';

export const revalidate = 60; // Route segment config for time-based revalidation

export default async function ProductsPage() {
  const products = await getProducts('food'); // Direct async/await
  return <ProductGrid products={products} />;
}
```

### Data Functions (lib/data/)

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

```typescript
// src/app/actions/products.ts - Mutations only
"use server";

import { createClient } from "@/lib/supabase/server";
import { CACHE_TAGS, invalidateTag } from "@/lib/data/cache-keys";

export async function createProduct(formData: FormData) {
  const supabase = await createClient();

  const { error } = await supabase.from("posts").insert({
    post_name: formData.get("post_name"),
    post_description: formData.get("post_description"),
  });

  if (error) throw new Error(error.message);

  invalidateTag(CACHE_TAGS.PRODUCTS); // Invalidate cache
}
```

### Client Components (When Needed)

```typescript
// src/components/products/ProductCard.tsx
'use client';

import { useState, useTransition } from 'react';
import { deleteProduct } from '@/app/actions/products';

export function ProductCard({ product }: { product: Product }) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    startTransition(async () => {
      await deleteProduct(product.id);
    });
  };

  return (
    <div className="p-4 border rounded-lg">
      <h3>{product.title}</h3>
      <button onClick={handleDelete} disabled={isPending}>
        {isPending ? 'Deleting...' : 'Delete'}
      </button>
    </div>
  );
}
```

### React Query (Client-Side Caching)

```typescript
// src/hooks/queries/useProducts.ts
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createProduct } from "@/app/actions/products"; // Mutations from actions/

// Client hooks fetch via API routes, not lib/data (server-only)
const fetchProducts = (type: string) =>
  fetch(`/api/products?type=${type}`).then((res) => res.json());

export function useProducts(type: string) {
  return useQuery({
    queryKey: ["products", type],
    queryFn: () => getProducts(type),
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

### Zustand (UI State Only)

```typescript
// src/store/zustand/useUIStore.ts
import { create } from "zustand";

interface UIStore {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  sidebarOpen: false,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
}));
```

## i18n: next-intl (21 languages)

Translation files: `/messages/{locale}.json`

```typescript
import { useTranslations } from 'next-intl';

function MyComponent() {
  const t = useTranslations('namespace');
  return <p>{t('key')}</p>;
}
```

Supported locales: en, cs, de, es, fr, pt, ru, uk, zh, hi, ar (RTL), it, pl, nl, ja, ko, tr, vi, id, th, sv

## Development Commands

### Web App (this repo)

```bash
npm run dev          # Start dev server with Turbopack
npm run build        # Production build
npm run type-check   # TypeScript checking
npm run lint         # ESLint
npm run lint:fix     # Fix lint errors
npm run test:build   # Type-check + lint + build
npm run clean        # Clean .next and cache
```

### Backend (foodshare-backend/)

```bash
cd ../foodshare-backend
supabase start                    # Start local Supabase stack
supabase functions serve          # Serve Edge Functions locally
supabase functions deploy         # Deploy all functions
supabase db push                  # Apply migrations
supabase migration new <name>     # Create migration
```

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Root layout (providers, metadata)
│   ├── page.tsx           # Home page (Server Component)
│   ├── opengraph-image.tsx # Dynamic OG image (edge runtime)
│   ├── twitter-image.tsx  # Dynamic Twitter card image
│   ├── actions/           # Server Actions
│   │   ├── products.ts
│   │   ├── auth.ts        # Auth actions (don't re-export types from here!)
│   │   └── chat.ts
│   ├── admin/             # Admin routes
│   ├── auth/              # Auth routes
│   ├── map/               # Map view
│   ├── food/              # Food listings
│   │   └── [id]/
│   │       └── opengraph-image.tsx  # Food-specific OG image
│   ├── profile/           # User profile
│   └── settings/          # Settings
├── components/             # React components
│   ├── ui/                # shadcn/ui primitives
│   ├── leaflet/           # Map components (client)
│   └── modals/            # Modal dialogs
├── hooks/                  # Custom hooks
│   └── queries/           # React Query hooks
├── lib/                    # Utilities
│   ├── data/              # Data fetching functions
│   │   ├── auth.ts        # AuthUser type defined here
│   │   ├── og-stats.ts    # OG image stats fetching
│   │   └── products.ts    # Product queries
│   ├── supabase/          # Supabase clients
│   │   ├── client.ts      # Client-side (browser)
│   │   ├── server.ts      # Server-side (Server Components, Actions)
│   │   └── middleware.ts  # Supabase session update helper
│   └── utils.ts           # cn(), formatDate(), etc.
├── store/                  # State (Zustand only)
│   └── zustand/           # UI stores
├── types/                  # TypeScript definitions
└── utils/                  # Helper functions

proxy.ts                    # Next.js 16 Proxy (formerly middleware.ts)
messages/                   # next-intl translations
supabase/ → ../foodshare-backend  # SYMLINK to shared backend
context/                   # Documentation
```

## Architecture

### Layered Architecture (Next.js 16)

```
┌─────────────────────────────────────────────────────┐
│              Presentation Layer                      │
│  Server Components → Client Components → UI          │
├─────────────────────────────────────────────────────┤
│                 Action Layer                         │
│  Server Actions (mutations with revalidation)        │
├─────────────────────────────────────────────────────┤
│                  Data Layer                          │
│  lib/data/ (cached fetching with unstable_cache)     │
├─────────────────────────────────────────────────────┤
│              Infrastructure Layer                    │
│  Supabase Client (server.ts, client.ts)             │
├─────────────────────────────────────────────────────┤
│         Shared Backend (foodshare-backend)           │
│  Edge Functions (Deno) + PostgreSQL + RLS            │
│  [Serves: Web, iOS, Android]                         │
└─────────────────────────────────────────────────────┘
```

**Data Flow**:

- READ: Server Component → `lib/data/` function → Supabase → Render
- WRITE: Form action → Server Action → Supabase → `invalidateTag()` → Re-render
- EDGE: Client → Edge Function (shared backend) → Database

### Key Patterns

**Supabase Client**:

```typescript
// Server Components & Server Actions
import { createClient } from "@/lib/supabase/server";
const supabase = await createClient();

// Client Components
import { createClient } from "@/lib/supabase/client";
const supabase = createClient();
```

**Loading States (Suspense)**:

```typescript
// src/app/products/page.tsx
import { Suspense } from 'react';
import { ProductList } from '@/components/products/ProductList';
import { ProductSkeleton } from '@/components/products/ProductSkeleton';

export default function ProductsPage() {
  return (
    <Suspense fallback={<ProductSkeleton />}>
      <ProductList />
    </Suspense>
  );
}
```

**Error Handling**:

```typescript
// src/app/products/error.tsx
'use client';

export default function Error({ error, reset }: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div>
      <h2>Something went wrong!</h2>
      <button onClick={reset}>Try again</button>
    </div>
  );
}
```

## Database

Key tables (all have RLS enabled):

- `profiles` - User profiles
- `products` - Food listings (with PostGIS coordinates)
- `chats` - Chat conversations
- `messages` - Chat messages
- `reviews` - User reviews

See `context/DATABASE_SCHEMA.md` for complete schema.

**Database changes** (migrations, RLS policies, triggers) are managed in `foodshare-backend/`:

```bash
cd ../foodshare-backend
supabase migration new <name>   # Create migration
supabase db push                # Apply migrations
```

## Code Standards

### Next.js 16 Rules

1. **Server Components by default** - Only add `'use client'` when needed
2. **Server Actions for mutations** - Never call Supabase directly from client
3. **No Redux** - Use Server Components + React Query + Zustand
4. **Streaming with Suspense** - Wrap async components in Suspense
5. **Type everything** - No `any`, proper TypeScript interfaces

### TypeScript Rules

- No non-null assertions (`!`) - check existence first
- No `any` types - use proper TypeScript
- Explicit error handling with try/catch
- Use `satisfies` for type checking object literals

### When to Use `'use client'`

Use `'use client'` ONLY when you need:

- Event handlers (onClick, onChange)
- React hooks (useState, useEffect, useRef)
- Browser APIs (localStorage, window)
- React Query hooks
- Zustand stores
- Third-party client libraries

## Documentation

Detailed docs in `context/`:

- `INDEX.md` - Documentation hub
- `ARCHITECTURE.md` - System design
- `TECH_STACK.md` - Technology details
- `DATABASE_SCHEMA.md` - Database structure
- `WORKFLOWS.md` - Development workflows
- `ultrathink.md` - Architecture principles

**Backend documentation** (Edge Functions, security, push notifications):

- `../foodshare-backend/CLAUDE.md` - Backend patterns and utilities
- `../foodshare-backend/functions/PLATFORM_GUIDE.md` - Platform categorization

## Next.js 16 Specific: Proxy (formerly Middleware)

In Next.js 16, `middleware.ts` was renamed to `proxy.ts`:

```typescript
// proxy.ts (root level) - NOT middleware.ts!
import { type NextRequest, NextResponse } from "next/server";

export async function proxy(request: NextRequest) {
  // Rate limiting, auth session refresh, security
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
```

**Key differences from middleware:**

- File: `proxy.ts` (not `middleware.ts`)
- Function: `export async function proxy()` (not `middleware()`)
- Runtime: Node.js (not Edge) - direct imports work, no dynamic import needed

## Next.js 16 Specific: Type Exports from Server Actions

**CRITICAL**: Next.js 16 does NOT allow type re-exports from server action files (`'use server'`).

```typescript
// ❌ WRONG - Don't do this in src/app/actions/auth.ts
"use server";
import type { AuthUser } from "@/lib/data/auth";
export type { AuthUser }; // This BREAKS the build!

// ✅ CORRECT - Import AuthUser directly from lib/data/auth
import type { AuthUser } from "@/lib/data/auth";
```

The `AuthUser` type is defined in `src/lib/data/auth.ts`. Always import it from there, never from `src/app/actions/auth.ts`.

## Dynamic OpenGraph Images

OG images use edge runtime and fetch live stats:

```typescript
// src/app/opengraph-image.tsx
import { ImageResponse } from "next/og";
import { getOGStats, getSeasonalTheme } from "@/lib/data/og-stats";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };

export default async function Image() {
  const stats = await getOGStats(); // Live stats from Supabase
  const seasonal = getSeasonalTheme(); // Winter/Spring/Summer/Fall theming

  return new ImageResponse(/* JSX */);
}
```

## Common Issues

**Module not found**: Check imports use `@/` alias (tsconfig paths)

**Map not rendering**: Leaflet needs `'use client'` and dynamic import:

```typescript
const Map = dynamic(() => import("@/components/leaflet/Map"), { ssr: false });
```

**Type errors with Supabase**: Regenerate types: `supabase gen types typescript`

**Server Action errors**: Ensure `'use server'` is at top of file or function

**Hydration mismatch**: Check for client-only code in Server Components

**AuthUser import error**: Import from `@/lib/data/auth`, NOT from `@/app/actions/auth`

**Middleware build error**: Use `proxy.ts` instead of `middleware.ts` in Next.js 16

**Edge Function not found**: Remember `supabase/` is a symlink - work in `foodshare-backend/` directly

**Migration conflicts**: Coordinate backend changes across platforms - they affect iOS/Android too
