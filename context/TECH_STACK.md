# FoodShare Technology Stack

**Last Updated:** December 2025

## Frontend Framework

### **Next.js 16**

- **Purpose**: Full-stack React framework with App Router
- **Why**: Server Components, Server Actions, file-based routing, built-in optimizations, Turbopack
- **Config**: `next.config.ts`
- **Features**:
  - App Router (not Pages Router)
  - React Server Components (default)
  - Server Actions for mutations
  - Turbopack for fast development
  - Built-in image optimization
  - Middleware support
  - Streaming and Suspense
  - Built-in caching (`revalidatePath`, `revalidateTag`)

### **React 19.2.0**

- **Purpose**: UI library for building components
- **Features**: Server Components, Server Actions, Suspense, Concurrent rendering, `useTransition`, `useFormStatus`
- **Why**: Industry standard, large ecosystem, excellent performance
- **React Compiler**: Enabled via `babel-plugin-react-compiler`

### **TypeScript 5**

- **Purpose**: Type-safe JavaScript
- **Config**: `tsconfig.json`
- **Why**: Catch errors early, better IDE support, self-documenting code
- **Strict mode**: Enabled

---

## Server-First Data Flow (Next.js 16 Patterns)

### **Server Components (Default)**

- **Purpose**: Data fetching at the server, zero client JavaScript
- **Location**: All components in `src/app/` are Server Components by default
- **Features**:
  - Direct database access via Supabase server client
  - No hydration overhead
  - Automatic code splitting
  - Can pass data to Client Components as props

```typescript
// src/app/products/page.tsx (Server Component)
import { createClient } from '@/lib/supabase/server';

export default async function ProductsPage() {
  const supabase = await createClient();
  const { data: products } = await supabase.from('products').select('*');

  return <ProductList products={products} />;
}
```

### **Server Actions**

- **Purpose**: Mutations, form submissions, data updates
- **Location**: `src/app/actions/*.ts`
- **Features**:
  - Type-safe RPC from client to server
  - Automatic serialization
  - Works with forms (`<form action={...}>`)
  - Works with `useTransition` for programmatic calls
  - Cache invalidation via `revalidatePath()` / `invalidateTag()`

```typescript
// src/app/actions/products.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { CACHE_TAGS, invalidateTag } from "@/lib/data/cache-keys";

export async function createProduct(formData: FormData) {
  const supabase = await createClient();

  const { error } = await supabase.from("products").insert({
    title: formData.get("title") as string,
    description: formData.get("description") as string,
  });

  if (error) throw new Error(error.message);

  invalidateTag(CACHE_TAGS.PRODUCTS);
  revalidatePath("/products");
}
```

### **Caching & Revalidation**

- **`revalidatePath(path)`**: Invalidate cache for a specific route
- **`invalidateTag(tag)`**: Invalidate cache for tagged fetches (use from `@/lib/data/cache-keys`)
- **`unstable_cache()`**: Cache function results with tags
- **Route Segment Config**: `export const revalidate = 3600` for time-based revalidation

---

## Client-Side State (When Needed)

### **TanStack React Query 5.90**

- **Purpose**: Client-side caching, optimistic updates, real-time sync
- **When to Use**:
  - Real-time data that changes frequently
  - Optimistic updates for better UX
  - Polling or WebSocket-driven updates
- **Location**: `src/hooks/queries/`
- **Features**:
  - Stale-while-revalidate pattern
  - Background refetching
  - Devtools for debugging
  - Mutations with rollback

```typescript
// Use React Query only when client-side caching is needed
import { useQuery } from "@tanstack/react-query";

export function useRealtimeMessages(chatId: string) {
  return useQuery({
    queryKey: ["messages", chatId],
    queryFn: () => fetchMessages(chatId),
    refetchInterval: 5000, // Polling for real-time
  });
}
```

### **Zustand 5.0.9**

- **Purpose**: Lightweight client state for UI interactions
- **When to Use**:
  - Modal/drawer open states
  - Sidebar toggle
  - Local form state across components
  - Client-only preferences
- **Stores**:
  - `useChatStore` - Chat UI state
  - `useUIStore` - Sidebar, modals, theme
- **Location**: `src/store/zustand/`

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

---

## State Management Decision Tree

```
Need data from database?
├─ Yes → Server Component (fetch directly)
│        └─ Need to mutate? → Server Action
│
└─ No → Client state needed?
         ├─ Real-time/polling data? → React Query
         ├─ UI state (modals, toggles)? → Zustand
         └─ Form state? → React Hook Form or local useState
```

**Key Principle**: Server Components and Server Actions handle 90% of data needs. Only use client state libraries for genuine client-side requirements.

---

## UI Framework

### **shadcn/ui + Radix UI**

- **Purpose**: Component library and design system
- **Style**: New York variant with CSS variables
- **Features**:
  - Pre-built accessible components (via Radix UI primitives)
  - Dark mode support (via next-themes)
  - Tailwind CSS integration
  - Copy-paste component model (components live in your codebase)
- **Why**: WCAG compliant, composable, highly customizable
- **Location**: `src/components/ui/`

### **Radix UI Primitives**

Full suite of headless UI components:

- **Layout**: Accordion, Aspect Ratio, Collapsible, Scroll Area, Separator
- **Navigation**: Navigation Menu, Menubar, Tabs
- **Overlays**: Dialog, Alert Dialog, Popover, Hover Card, Tooltip, Context Menu
- **Forms**: Checkbox, Radio Group, Select, Slider, Switch, Toggle, Toggle Group
- **Feedback**: Progress, Toast
- **Data Display**: Avatar

### **Tailwind CSS 4**

- **Purpose**: Utility-first CSS framework
- **Config**: Uses `@tailwindcss/postcss` plugin
- **Features**:
  - CSS variables for theming
  - Dark mode via class strategy
  - Custom theme configuration
- **Utilities**: `clsx`, `tailwind-merge`, `class-variance-authority (CVA)`

### **Framer Motion 12.23**

- **Purpose**: Animation library
- **Features**: Declarative animations, gesture support, layout animations
- **Use Cases**: Page transitions, modal animations, interactive elements

### **next-themes 0.4.6**

- **Purpose**: Theme management for Next.js
- **Features**: System/light/dark mode, SSR-safe, persistence

---

## Backend & Database

### **Supabase 2.84**

- **Purpose**: Backend-as-a-Service
- **Packages**: `@supabase/supabase-js`, `@supabase/ssr`
- **Features**:
  - PostgreSQL database
  - Authentication (PKCE OAuth flow)
  - Real-time subscriptions (rate limited: 10 events/sec)
  - Storage for images
  - Row Level Security (RLS)
  - Edge Functions
- **Config**: `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`
- **Environment Variables**:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`

### **Cloudflare R2**

- **Purpose**: S3-compatible object storage with zero egress fees
- **Config**: `src/lib/r2/client.ts`
- **Features**:
  - AWS Signature V4 authentication
  - Zero egress fees (great for high-traffic images)
  - Cloudflare CDN integration
- **Environment Variables**:
  - `R2_ACCOUNT_ID`
  - `R2_ACCESS_KEY_ID`
  - `R2_SECRET_ACCESS_KEY`
  - `R2_BUCKET_NAME`
  - `NEXT_PUBLIC_R2_PUBLIC_URL`

### **Supabase Client Patterns**

```typescript
// Server-side (Server Components, Server Actions, Route Handlers)
import { createClient } from "@/lib/supabase/server";

export default async function Page() {
  const supabase = await createClient();
  const { data } = await supabase.from("products").select("*");
}

// Client-side (Client Components with 'use client')
import { createClient } from "@/lib/supabase/client";

function ClientComponent() {
  const supabase = createClient();
  // Use in useEffect or event handlers
}
```

### **Cookie Resilience**

The server client (`@/lib/supabase/server`) includes built-in protection against corrupted cookies:

- Filters out malformed Supabase auth cookies (prefix `sb-`) that could cause "Invalid UTF-8 sequence" errors
- Validates base64url encoding of cookie values
- Logs warnings for filtered cookies (useful for debugging)
- Gracefully degrades if cookie reading fails entirely

---

## Routing

### **Next.js App Router**

- **Purpose**: File-based routing with Server Components
- **Features**:
  - Nested layouts
  - Server Components by default
  - Loading and error boundaries
  - Route groups
  - Parallel routes
  - Streaming with Suspense
- **Location**: `src/app/`
- **Routes**:
  - `/` - Home page
  - `/map` - Map view
  - `/food/[id]` - Product detail
  - `/profile` - User profile
  - `/settings` - User settings
  - `/admin` - Admin dashboard
  - `/auth` - Authentication pages

### **Route Segment Config**

```typescript
// src/app/products/page.tsx
export const dynamic = "force-dynamic"; // Always fetch fresh
export const revalidate = 3600; // Revalidate every hour
export const runtime = "edge"; // Use Edge Runtime
```

---

## Maps & Geolocation

### **Leaflet 1.9.4**

- **Purpose**: Interactive maps
- **Why**: Open-source, no API keys required, extensive plugins
- **Note**: Requires `'use client'` and dynamic import (no SSR)

### **React Leaflet 5.0**

- **Purpose**: React bindings for Leaflet
- **Components**: Map, Marker, Popup, TileLayer

```typescript
// Client Component with dynamic import
'use client';

import dynamic from 'next/dynamic';

const Map = dynamic(() => import('@/components/leaflet/Map'), {
  ssr: false,
  loading: () => <div>Loading map...</div>
});
```

### **React Leaflet Cluster 4.0**

- **Purpose**: Marker clustering for performance
- **Why**: Improves map performance with many markers

### **Leaflet Geosearch 4.2.2**

- **Purpose**: Address search and geocoding
- **Features**: Multiple provider support (OpenStreetMap, Google, etc.)

---

## Internationalization (i18n)

### **next-intl**

- **Purpose**: Next.js-native internationalization
- **Location**: `/messages/{locale}.json`
- **Features**:
  - Server Component support
  - Type-safe translations
  - ICU MessageFormat
  - Pluralization support
- **Supported Locales** (17 languages):
  - **European**: English (en), Czech (cs), German (de), Spanish (es), French (fr), Portuguese (pt), Russian (ru), Ukrainian (uk), Italian (it), Polish (pl), Dutch (nl)
  - **Asian**: Chinese (zh), Hindi (hi), Japanese (ja), Korean (ko)
  - **Other**: Arabic (ar) with RTL support, Turkish (tr)

```typescript
// Server Component
import { getTranslations } from 'next-intl/server';

export default async function Page() {
  const t = await getTranslations('products');
  return <h1>{t('title')}</h1>;
}

// Client Component
'use client';
import { useTranslations } from 'next-intl';

function ClientComponent() {
  const t = useTranslations('products');
  return <p>{t('description')}</p>;
}
```

---

## Email & Messaging

### **Brevo API 3.0**

- **Purpose**: Primary email delivery service
- **Package**: `@getbrevo/brevo`

### **AWS SES**

- **Purpose**: Alternative/backup email delivery
- **Package**: `@aws-sdk/client-ses`

---

## AI Integration

### **OpenAI 6.9**

- **Purpose**: AI features (insights, recommendations)
- **Use Cases**: Admin AI insights, content analysis

---

## Icons

### **React Icons 5.5**

- **Purpose**: Comprehensive icon library
- **Icon Sets**: Font Awesome, Material Icons, Heroicons, Feather, and more
- **Why**: Single package for all icon needs

---

## Additional UI Libraries

### **React Alice Carousel 2.9.1**

- **Purpose**: Image carousel/slider component
- **Use Cases**: Product image galleries
- **Features**: Touch support, autoplay, responsive

### **Vaul 1.1.2**

- **Purpose**: Drawer component with smooth animations
- **Why**: Mobile-friendly drawer interactions

---

## Analytics & Monitoring

### **Vercel Analytics 1.5**

- **Purpose**: Web analytics
- **Features**: Pageviews, user tracking, performance metrics

### **Vercel Speed Insights 1.2**

- **Purpose**: Performance monitoring
- **Metrics**: Core Web Vitals, real user monitoring

---

## Build & Development Tools

### **Turbopack**

- **Purpose**: Next.js development bundler
- **Why**: Extremely fast HMR and builds

### **ESLint 9**

- **Purpose**: Code linting
- **Config**: `eslint.config.mjs` (flat config)
- **Extends**: `eslint-config-next`

### **PostCSS**

- **Purpose**: CSS processing
- **Plugin**: `@tailwindcss/postcss`

### **Webpack Bundle Analyzer**

- **Purpose**: Analyze production bundles
- **Command**: `npm run build:analyze`

### **React Compiler (Babel Plugin)**

- **Purpose**: Automatic memoization and optimizations
- **Package**: `babel-plugin-react-compiler`
- **Why**: Reduces need for manual useMemo/useCallback

---

## Development Dependencies

### **TypeScript Types**

- `@types/node` - Node.js types
- `@types/react` - React types
- `@types/react-dom` - React DOM types
- `@types/leaflet` - Leaflet types

---

## Environment Variables

Required environment variables (`.env.local`):

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_JWT_SECRET=your_jwt_secret

# Optional: OpenAI
OPENAI_API_KEY=your_openai_key

# Optional: Email (Brevo)
BREVO_API_KEY=your_brevo_key

# Optional: Email (AWS SES)
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
```

---

## NPM Scripts

```bash
npm run dev          # Start dev server with Turbopack (port 3000)
npm run build        # Production build
npm run build:analyze # Build with bundle analyzer
npm run start        # Start production server
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues
npm run type-check   # TypeScript type checking
npm run test:build   # Type check + lint + build
npm run clean        # Clean build artifacts
```

---

## Browser Targets

### Production

- > 0.2% market share
- Not dead browsers
- Not Opera Mini

### Development

- Latest Chrome
- Latest Firefox
- Latest Safari

---

## Performance Optimizations

1. **Server Components**: Zero client JavaScript for data-fetching components
2. **Server Actions**: No API routes needed, direct database mutations
3. **Streaming**: Progressive page loading with Suspense
4. **React Compiler**: Automatic memoization
5. **Turbopack**: Fast development builds
6. **Image Optimization**: Next.js built-in optimization with Supabase CDN
7. **Code Splitting**: Automatic with App Router
8. **Caching**: Next.js cache with `revalidatePath`/`revalidateTag`
9. **Bundle Analysis**: Available via `npm run build:analyze`

---

## Security Measures

1. **Server Actions**: Mutations never expose sensitive logic to client
2. **Environment Variables**: Sensitive data not in code
3. **Row Level Security**: Database access control via Supabase RLS
4. **PKCE OAuth**: Secure authentication flow
5. **HTTPS**: Enforced in production
6. **Security Headers**: Configured in `next.config.ts`
7. **XSS Protection**: React escapes by default
8. **Content Security Policy**: Configured for production

---

**Next Steps:**

- Review [Architecture](ARCHITECTURE.md) for system design
- See [Database Schema](DATABASE_SCHEMA.md) for data structure
- Read [Development Guide](DEVELOPMENT_GUIDE.md) for workflows
