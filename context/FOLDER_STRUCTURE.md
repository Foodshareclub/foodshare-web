# FoodShare Frontend - Folder Structure

**Project:** FoodShare - Community Food Sharing Platform
**Type:** Next.js 16 App Router (NOT Vite SPA)
**Last Updated:** December 2025
**Version:** 3.0.0

---

## Table of Contents

- [Repository Overview](#repository-overview)
- [Root Directory Structure](#root-directory-structure)
- [Source Code Organization](#source-code-organization)
- [Configuration Files](#configuration-files)
- [Build Output](#build-output)
- [File Naming Conventions](#file-naming-conventions)
- [Navigation Guide](#navigation-guide)

---

## Repository Overview

```
foodshare-nextjs/
├── .claude/                    # Claude Code configuration
├── .github/                    # GitHub workflows and templates
├── .next/                      # Next.js build output (generated)
├── context/                    # Project documentation (this folder)
├── docs/                       # Additional documentation
├── messages/                   # next-intl translation JSON files
├── node_modules/               # npm dependencies (generated)
├── public/                     # Static assets
├── scripts/                    # Build and utility scripts
├── src/                        # Application source code
├── supabase/                   # Supabase migrations and functions
├── .env.local                  # Environment variables (not tracked)
├── .gitignore                  # Git ignore patterns
├── .nvmrc                      # Node.js version (24.11.1)
├── .prettierrc                 # Prettier configuration
├── components.json             # shadcn/ui configuration
├── eslint.config.mjs           # ESLint 9 flat config
├── lefthook.yml                # Git hooks configuration
├── next.config.ts              # Next.js configuration
├── package.json                # npm dependencies and scripts
├── package-lock.json           # Locked dependency versions
├── postcss.config.mjs          # PostCSS configuration
├── README.md                   # Project overview
└── tsconfig.json               # TypeScript configuration
```

---

## Root Directory Structure

### Configuration Files

| File                  | Purpose                           | Key Settings                                           |
| --------------------- | --------------------------------- | ------------------------------------------------------ |
| **next.config.ts**    | Next.js configuration             | React Compiler, optimized imports, security headers    |
| **tsconfig.json**     | TypeScript compiler settings      | Strict mode, path aliases (@/*), ES2017 target         |
| **package.json**      | Project metadata and dependencies | Scripts, React 19, Next.js 16, all dependencies        |
| **components.json**   | shadcn/ui configuration           | New York style, CSS variables, aliases                 |
| **eslint.config.mjs** | ESLint 9 flat config              | Next.js rules, TypeScript rules                        |
| **postcss.config.mjs**| PostCSS plugins                   | Tailwind CSS 4                                         |
| **.prettierrc**       | Prettier formatting               | Semicolons, double quotes, trailing commas             |
| **lefthook.yml**      | Git hooks                         | Pre-commit linting                                     |

### Directories

| Directory         | Purpose                          | Git Tracked        |
| ----------------- | -------------------------------- | ------------------ |
| **src/**          | Application source code          | Yes                |
| **messages/**     | next-intl translation JSON files | Yes                |
| **public/**       | Static assets (images, manifest) | Yes                |
| **context/**      | Project documentation            | Yes                |
| **docs/**         | Additional documentation         | Yes                |
| **scripts/**      | Build and utility scripts        | Yes                |
| **supabase/**     | DB migrations and Edge Functions | Yes                |
| **.github/**      | GitHub Actions workflows         | Yes                |
| **node_modules/** | npm dependencies                 | No (.gitignore)    |
| **.next/**        | Next.js build output             | No (.gitignore)    |

---

## Source Code Organization

### `/src` Directory Tree

```
src/
├── app/                         # Next.js App Router
│   ├── layout.tsx              # Root layout (providers, metadata)
│   ├── page.tsx                # Home page (/)
│   ├── globals.css             # Global Tailwind styles
│   ├── loading.tsx             # Global loading state
│   ├── error.tsx               # Global error boundary
│   ├── not-found.tsx           # 404 page
│   ├── providers.tsx           # Client-side providers wrapper
│   ├── manifest.ts             # PWA manifest generator
│   ├── robots.ts               # Robots.txt generator
│   ├── sitemap.ts              # Sitemap generator
│   │
│   ├── [category]/             # Category redirect handler
│   │   └── page.tsx            # Redirects /{category} → /s/{category}
│   │
│   ├── s/                      # Search/category routes (canonical)
│   │   └── [category]/page.tsx # Category listing page
│   │
│   ├── actions/                # Server Actions (mutations)
│   │   ├── auth.ts             # Auth actions (login, logout, signup)
│   │   ├── products.ts         # Product CRUD actions
│   │   ├── profile.ts          # Profile update actions
│   │   ├── chat.ts             # Chat/messaging actions
│   │   ├── reviews.ts          # Review actions
│   │   └── upload.ts           # File upload actions
│   │
│   ├── admin/                  # Admin dashboard
│   │   ├── layout.tsx
│   │   └── page.tsx
│   │
│   ├── auth/                   # Authentication pages
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   └── callback/page.tsx
│   │
│   ├── map/                    # Map view
│   │   └── page.tsx
│   │
│   ├── food/                   # Food listing routes
│   │   ├── page.tsx            # Food listing
│   │   └── [id]/page.tsx       # Food detail (dynamic)
│   │
│   ├── profile/                # User profile
│   │   └── page.tsx
│   │
│   └── settings/               # User settings
│       └── page.tsx
│
├── components/                  # Reusable UI components
│   ├── ui/                     # shadcn/ui primitives
│   │   ├── accordion.tsx
│   │   ├── avatar.tsx
│   │   ├── badge.tsx
│   │   ├── breadcrumb.tsx
│   │   ├── button.tsx
│   │   ├── checkbox.tsx
│   │   ├── dialog.tsx
│   │   ├── drawer.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── input.tsx
│   │   ├── label.tsx
│   │   ├── popover.tsx
│   │   ├── radio-group.tsx
│   │   ├── select.tsx
│   │   ├── separator.tsx
│   │   ├── slider.tsx
│   │   └── textarea.tsx
│   │
│   ├── header/                 # Header and navigation
│   │   ├── Header.tsx
│   │   ├── NavComponent.tsx
│   │   ├── ProfileSettings.tsx
│   │   └── LanguageSelector.tsx
│   │
│   ├── footer/                 # Footer component
│   │   └── Footer.tsx
│   │
│   ├── admin/                  # Admin-specific components
│   │   ├── UserManagement.tsx
│   │   ├── ListingManagement.tsx
│   │   └── AIInsights.tsx
│   │
│   ├── auth/                   # Auth-related components
│   │   ├── LoginForm.tsx
│   │   ├── SignupForm.tsx
│   │   └── AuthModal.tsx
│   │
│   ├── leaflet/                # Map components
│   │   ├── LeafletMap.tsx
│   │   ├── MarkerCluster.tsx
│   │   └── UserLocationMarker.tsx
│   │
│   ├── modals/                 # Modal dialogs
│   │   ├── FiltersModal.tsx
│   │   ├── PublishListingModal.tsx
│   │   └── ConfirmDeleteModal.tsx
│   │
│   ├── productCard/            # Product display
│   │   ├── ProductCard.tsx
│   │   └── ProductSkeleton.tsx
│   │
│   ├── profile/                # Profile components
│   │   ├── NameBlock.tsx
│   │   ├── EmailBlock.tsx
│   │   └── AddressBlock.tsx
│   │
│   ├── theme/                  # Theme components
│   │   └── ThemeToggle.tsx
│   │
│   └── [25+ more component directories]
│
├── hooks/                       # Custom React hooks
│   ├── queries/                # React Query hooks (client-side caching)
│   │   ├── useChatQueries.ts   # Real-time chat queries
│   │   └── useRealtimeQueries.ts
│   │
│   ├── useAuth.ts              # Main auth hook
│   ├── useDebounce.ts          # Debounce values
│   ├── useMediaQuery.ts        # Responsive breakpoints
│   ├── useAdvancedScroll.ts    # Scroll utilities
│   └── [30+ more hooks]
│
├── store/                       # Client-side state (Zustand only)
│   └── zustand/                # Zustand stores
│       ├── useChatStore.ts     # Chat UI state
│       ├── useUIStore.ts       # UI state (modals, sidebar)
│       └── useFilterStore.ts   # Filter state
│
├── api/                         # API client layer (for client components)
│   ├── productAPI.ts           # Product read operations
│   ├── profileAPI.ts           # Profile read operations
│   ├── chatAPI.ts              # Chat/messaging API
│   └── [more API files]
│
├── lib/                         # Utility libraries
│   ├── supabase/               # Supabase configuration
│   │   ├── client.ts           # Client-side Supabase
│   │   ├── server.ts           # Server-side Supabase
│   │   └── session.ts          # Session management
│   │
│   ├── auth/                   # Authentication utilities
│   │   ├── auth-client.ts      # Auth client config
│   │   ├── api.ts              # Auth API methods
│   │   └── types.ts            # Auth TypeScript types
│   │
│   ├── theme/                  # Theme configuration
│   │   └── themeConfig.ts      # Tailwind theme variables
│   │
│   ├── email/                  # Email system
│   │   └── [email utilities]
│   │
│   ├── security/               # Security utilities
│   │   └── [security helpers]
│   │
│   ├── performance/            # Performance utilities
│   │   └── [performance helpers]
│   │
│   ├── metadata.ts             # SEO metadata defaults
│   └── utils.ts                # General utilities (cn, etc.)
│
├── utils/                       # Utility functions
│   ├── advancedLogger.ts       # Logging utilities
│   ├── authErrors.ts           # Auth error handling
│   ├── categoryMapping.ts      # Category utilities
│   ├── globalErrorHandler.ts   # Global error handling
│   ├── getDistanceFromLatLonInKm.ts  # Distance calculation
│   └── [30+ more utilities]
│
├── types/                       # TypeScript type definitions
│   ├── admin.types.ts          # Admin types
│   ├── campaign.types.ts       # Campaign types
│   ├── product.types.ts        # Product types
│   └── crm.types.ts            # CRM types
│
├── i18n/                        # next-intl configuration
│   └── request.ts              # i18n request config
│
├── features/                    # Feature-specific modules
│   └── aboutUs/                # About page feature
│       ├── AboutUsPage.tsx
│       └── AnimatedContactButton.tsx
│
├── assets/                      # Static assets (images, icons)
├── constants/                   # App constants
├── workers/                     # Web workers
└── proxy.ts                     # Proxy configuration
```

---

## Translation Files

### `/messages` Directory (next-intl)

```
messages/
├── en.json                      # English (default)
├── cs.json                      # Czech
├── de.json                      # German
├── es.json                      # Spanish
├── fr.json                      # French
├── pt.json                      # Portuguese
├── ru.json                      # Russian
├── uk.json                      # Ukrainian
├── it.json                      # Italian
├── pl.json                      # Polish
├── nl.json                      # Dutch
├── zh.json                      # Chinese
├── hi.json                      # Hindi
├── ja.json                      # Japanese
├── ko.json                      # Korean
├── ar.json                      # Arabic (RTL)
└── tr.json                      # Turkish
```

---

## Configuration Files Detailed

### `next.config.ts`

```typescript
// Next.js configuration with React Compiler
const nextConfig: NextConfig = {
  experimental: {
    reactCompiler: true,            // Enable React Compiler
    webVitalsAttribution: ['CLS', 'LCP', 'FCP', 'FID', 'TTFB'],
  },
  optimizePackageImports: [
    '@radix-ui/react-icons',
    'react-icons',
    'framer-motion',
  ],
  images: {
    remotePatterns: [
      { hostname: '*.supabase.co' },
    ],
  },
  headers: async () => [
    // Security headers (CSP, HSTS, etc.)
  ],
};
```

**Key Features:**

- React Compiler for automatic optimizations
- Optimized package imports for smaller bundles
- Supabase CDN for images
- Security headers configured

### `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "module": "esnext",
    "moduleResolution": "bundler",
    "strict": true,
    "jsx": "preserve",
    "incremental": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

**Key Settings:**

- Strict mode enabled
- Path alias `@/` → `src/`
- Incremental compilation for faster builds
- React JSX transform

### `package.json` Scripts

```json
{
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "NODE_ENV=production next build",
    "build:analyze": "ANALYZE=true next build",
    "start": "next start",
    "lint": "eslint",
    "lint:fix": "eslint --fix",
    "type-check": "tsc --noEmit",
    "test:build": "npm run type-check && npm run lint && npm run build",
    "clean": "rm -rf .next out node_modules/.cache"
  }
}
```

### `components.json` (shadcn/ui)

```json
{
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/app/globals.css",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "hooks": "@/hooks"
  }
}
```

---

## Build Output

### Development (`npm run dev`)

```
http://localhost:3000/            # Next.js dev server
├── Turbopack HMR                 # Instant updates
├── Server Components             # Automatic RSC handling
├── Source maps                   # Debugging support
└── Fast refresh                  # React state preservation
```

### Production (`npm run build`)

```
.next/
├── cache/                        # Build cache
├── server/                       # Server-side bundles
│   ├── app/                     # App Router pages
│   └── chunks/                  # Code-split chunks
├── static/                       # Client-side assets
│   ├── chunks/                  # JS bundles
│   ├── css/                     # Compiled CSS
│   └── media/                   # Optimized images
└── BUILD_ID                      # Build identifier
```

**Build Optimizations:**

- Automatic code splitting (per-route)
- Tree shaking (unused code removed)
- Minification (SWC)
- Image optimization (Next.js Image)
- CSS extraction and optimization

---

## File Naming Conventions

### App Router Pages

```typescript
// Lowercase with hyphens for routes
src/app/user-profile/page.tsx    → /user-profile
src/app/food/[id]/page.tsx       → /food/:id

// Special files
layout.tsx                        // Route layout
page.tsx                          // Route page
loading.tsx                       // Loading UI
error.tsx                         // Error boundary
not-found.tsx                     // 404 page
```

### Category URL Routing

The app uses a two-tier routing pattern for category pages:

```typescript
// Canonical category routes (primary)
src/app/s/[category]/page.tsx    → /s/food, /s/things, /s/fridges, etc.

// Redirect handler (convenience)
src/app/[category]/page.tsx      → Redirects /{category} to /s/{category}
```

**Valid Categories:** `things`, `borrow`, `wanted`, `fridges`, `foodbanks`, `organisations`, `volunteers`, `challenges`, `zerowaste`, `vegan`, `community`

**Note:** Some categories have dedicated routes and are excluded from the redirect handler:
- `/food` → Has its own route at `src/app/food/`
- `/challenge` → Has its own route at `src/app/challenge/`
- `/forum` → Has its own route at `src/app/forum/`

**Special Redirects:**
- `/community` → Redirects to `/forum`
- `/s/challenges` → Redirects to `/challenge` (challenges use a dedicated table)

**Legacy Redirects:** Singular forms redirect to plural (e.g., `/thing` → `/s/things`, `/fridge` → `/s/fridges`)

### Server Actions

```typescript
// src/app/actions/[entity].ts
// camelCase function names, grouped by entity
src/app/actions/products.ts       // createProduct, updateProduct, deleteProduct
src/app/actions/auth.ts           // login, logout, signup
src/app/actions/profile.ts        // updateProfile, updateAvatar
```

### Components

```typescript
// PascalCase for component files
ComponentName.tsx                 // Component implementation
ComponentName.test.tsx            // Component tests (if any)
```

**Examples:**

- `ProductCard.tsx`
- `AuthModal.tsx`
- `UserLocationMarker.tsx`

### Utilities and Hooks

```typescript
// camelCase for utilities
functionName.ts                   // Utility function
useFunctionName.ts                // Custom hook (use prefix)
```

**Examples:**

- `getDistanceFromLatLonInKm.ts`
- `useDebounce.ts`
- `useAuth.ts`

### Zustand Stores

```typescript
// camelCase with use prefix
use[Name]Store.ts                 // Zustand store

// Examples:
useChatStore.ts
useUIStore.ts
useFilterStore.ts
```

---

## Navigation Guide

### "Where do I find...?"

| What You Need            | Where to Look                                        |
| ------------------------ | ---------------------------------------------------- |
| **Add a new page**       | `src/app/[route]/page.tsx`                          |
| **Add category page**    | `src/app/s/[category]/page.tsx` (add to CATEGORY_PATHS) |
| **Add a Server Action**  | `src/app/actions/[entity].ts`                       |
| **Add a component**      | `src/components/[category]/ComponentName.tsx`        |
| **Add shadcn component** | Run `npx shadcn@latest add [component]`             |
| **Add Zustand store**    | `src/store/zustand/use[Name]Store.ts`               |
| **Add React Query hook** | `src/hooks/queries/use[Entity]Queries.ts`           |
| **Add custom hook**      | `src/hooks/use[HookName].ts`                        |
| **Add utility function** | `src/utils/functionName.ts`                         |
| **Add translation**      | Edit `messages/{locale}.json`                       |
| **Configure Next.js**    | `next.config.ts`                                    |
| **Configure TypeScript** | `tsconfig.json`                                     |
| **Add npm dependency**   | `npm install package-name`                          |

### "How do I...?"

| Task                     | Steps                                                                |
| ------------------------ | -------------------------------------------------------------------- |
| **Create a new page**    | Create `src/app/[route]/page.tsx` with async default export         |
| **Create a mutation**    | Create Server Action in `src/app/actions/[entity].ts`               |
| **Create a new feature** | 1. Create page 2. Add Server Actions 3. Create components          |
| **Add a new language**   | Add JSON file to `messages/` → Update i18n config                   |
| **Add shadcn component** | `npx shadcn@latest add [component-name]`                            |
| **Change env vars**      | Update `.env.local` → Restart dev server                            |
| **Deploy to production** | `npm run build` → Deploy `.next/` to Vercel                         |
| **Debug client state**   | Install React Query DevTools / use Zustand devtools                 |

---

## Component Organization Patterns

### Server Component (Default)

```typescript
// src/app/food/page.tsx
import { createClient } from '@/lib/supabase/server';

export default async function FoodPage() {
  const supabase = await createClient();
  const { data: products } = await supabase.from('products').select('*');

  return (
    <div>
      {products?.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
```

### Server Action

```typescript
// src/app/actions/products.ts
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function createProduct(formData: FormData) {
  const supabase = await createClient();

  const { error } = await supabase.from('products').insert({
    title: formData.get('title') as string,
    description: formData.get('description') as string,
  });

  if (error) return { error: error.message };

  revalidatePath('/food');
  return { success: true };
}
```

### Client Component

```typescript
// src/components/productCard/ProductCard.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function ProductCard({ product }: ProductCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div>
      <h3>{product.title}</h3>
      <Button onClick={() => setIsExpanded(!isExpanded)}>
        {isExpanded ? 'Show Less' : 'Show More'}
      </Button>
    </div>
  );
}
```

### Layout Pattern

```typescript
// src/app/admin/layout.tsx
import { Header } from '@/components/header/Header';
import { AdminSidebar } from '@/components/admin/AdminSidebar';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex">
      <AdminSidebar />
      <main className="flex-1">
        <Header />
        {children}
      </main>
    </div>
  );
}
```

---

## State Management Organization

### Zustand Store (Client UI State Only)

```typescript
// src/store/zustand/useUIStore.ts
import { create } from 'zustand';

interface UIStore {
  sidebarOpen: boolean;
  modalOpen: boolean;
  toggleSidebar: () => void;
  openModal: () => void;
  closeModal: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  sidebarOpen: false,
  modalOpen: false,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  openModal: () => set({ modalOpen: true }),
  closeModal: () => set({ modalOpen: false }),
}));
```

### React Query (Client-Side Caching Only)

```typescript
// src/hooks/queries/useChatQueries.ts
'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

export function useRealtimeMessages(chatId: string) {
  return useQuery({
    queryKey: ['messages', chatId],
    queryFn: async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chatId);
      return data;
    },
    refetchInterval: 3000, // Poll for real-time
  });
}
```

---

## Supabase Organization

### Database Migrations

```
supabase/
├── migrations/                  # SQL migrations
│   ├── 20241201_email_system.sql
│   ├── 20241202_crm_tables.sql
│   └── [more migrations]
│
└── functions/                   # Edge Functions
    ├── telegram-bot-foodshare/
    ├── smart-email-route/
    ├── search-functions/
    └── resize-tinify-upload-image/
```

---

## Key Differences from Vite SPA

| Aspect           | FoodShare (Next.js 16)      | Vite SPA               |
| ---------------- | --------------------------- | ---------------------- |
| **Routing**      | File-based (App Router)     | React Router           |
| **Entry Point**  | `src/app/layout.tsx`        | `index.html`           |
| **Dev Server**   | Next.js + Turbopack (3000)  | Vite (5173)            |
| **Build Output** | `.next/`                    | `dist/`                |
| **SSR**          | Built-in SSR/RSC            | None (pure SPA)        |
| **Mutations**    | Server Actions              | API calls              |
| **Env Vars**     | `NEXT_PUBLIC_` prefix       | `VITE_` prefix         |
| **Config File**  | `next.config.ts`            | `vite.config.ts`       |
| **Components**   | Server + Client Components  | All Client Components  |

---

**Last Updated:** December 2025
**Maintained By:** FoodShare Development Team
**Status:** Living document - updated with project evolution

---

## Quick Navigation

- [Back to Index](INDEX.md)
- [Architecture Overview](ARCHITECTURE.md)
- [API Reference](API_REFERENCE.md)
- [Development Guide](DEVELOPMENT_GUIDE.md)
- [Tech Stack Details](TECH_STACK.md)
- [Database Schema](DATABASE_SCHEMA.md)
