# FoodShare Architecture Overview

> **Visual guide to the optimized FoodShare architecture**

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Interface                          │
│                    (React 19 + Tailwind 4)                      │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Presentation Layer                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Pages      │  │  Components  │  │    Hooks     │         │
│  │ (Server-First)│  │ (Actions)    │  │ (Client-Only)│         │
│  │ - /thing     │  │ - GlassCard  │  │ - useAuth    │         │
│  │ - /volunteer │  │ - Navbar     │  │ - useMap     │         │
│  │ - /profile   │  │ - Form       │  │ - usePosition│         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Application Layer                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ Auth Context │  │ Zustand Store│  │   Routing    │         │
│  │ (React 19)   │  │ (UI State)   │  │ (App Router) │         │
│  │ - AuthSession│  │ - Sidebar    │  │ - proxy.ts   │         │
│  │ - Roles      │  │ - Modals     │  │ - ROUTES.ts  │         │
│  │ - Session Mgr│  │ - Cache      │  │ - Navigation │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Data Layer                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ Server Funcs │  │  Validation  │  │   Utilities  │         │
│  │ (lib/data)   │  │ (Zod/Valibot)│  │ (next-intl)  │         │
│  │ - getProducts│  │ - Zod schemas│  │ - formatDate │         │
│  │ - getAuth    │  │ - Form rules │  │ - distance   │         │
│  │ - getStats   │  │ - Input check│  │ - i18n       │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Infrastructure Layer                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Supabase   │  │   Runtime    │  │   External   │         │
│  │ (Self-Hosted)│  │ (Bun/Node)   │  │ (Kingfisher) │         │
│  │ - PostGIS    │  │ - Edge Funcs │  │ - Mapbox     │         │
│  │ - Realtime   │  │ - Cron Jobs  │  │ - Sentry     │         │
│  │ - Storage    │  │ - Web Cache  │  │ - Attest     │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔗 URL Routing Configuration

The application uses Next.js 16 App Router with a centralized proxy in `src/proxy.ts`.

### Singular Category URLs

To simplify the user experience and SEO, we use singular top-level routes for all categories.

| URL             | Description             | Legacy (Redirected) |
| --------------- | ----------------------- | ------------------- |
| `/food`         | Food listings           | `/food?type=food`   |
| `/thing`        | Things to share         | `/food?type=thing`  |
| `/borrow`       | Items to borrow         | `/food?type=borrow` |
| `/wanted`       | Wanted items            | `/food?type=wanted` |
| `/fridge`       | Community fridges       | `/fridges`          |
| `/foodbank`     | Food banks              | `/foodbanks`        |
| `/organisation` | Organisations           | `/business`         |
| `/volunteer`    | Volunteer opportunities | `/volunteers`       |

#### Query Parameters

All singular routes support standardized location and search parameters:

| Parameter  | Type   | Description                                          |
| ---------- | ------ | ---------------------------------------------------- |
| `key_word` | string | Full-text search within category                     |
| `lat`      | number | Latitude for location-based filtering (-90 to 90)    |
| `lng`      | number | Longitude for location-based filtering (-180 to 180) |
| `radius`   | number | Search radius in meters (default: 5000)              |

**Standard Route Transition Policy:**

- Always use the singular form for new features (e.g., `/challenge` not `/challenges`).
- Plural forms are kept in `LEGACY_TYPE_MAP` in `src/app/food/page.tsx` for 301 redirection.

### Unified Navigation

The `NavbarWrapper.tsx` and `ROUTES.ts` are the source of truth for these paths. The `Navbar` automatically highlights the active category based on the current top-level path segment.

---

## 🔍 SEO & Metadata

### Dynamic Metadata

Each route can export a `generateMetadata` function for dynamic SEO metadata:

```typescript
// app/food/[id]/page.tsx
export async function generateMetadata({ params }: PageProps) {
  const product = await getProductById(params.id);
  return {
    title: `${product.post_name} | FoodShare`,
    description: product.post_description?.slice(0, 160),
    openGraph: {
      title: product.post_name,
      description: product.post_description,
      images: [{ url: product.images?.[0] }],
    },
  };
}
```

### Dynamic OpenGraph Images

Routes can generate custom OG images using Next.js Image Response:

| Route             | OG Image File         | Description                          |
| ----------------- | --------------------- | ------------------------------------ |
| `/food/[id]`      | `opengraph-image.tsx` | Dynamic food listing preview         |
| `/challenge/[id]` | `opengraph-image.tsx` | Challenge preview with event details |
| `/forum/[slug]`   | `opengraph-image.tsx` | Forum post preview                   |

**Implementation Pattern:**

```typescript
// app/food/[id]/opengraph-image.tsx
import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'FoodShare Listing';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getProductById(parseInt(id, 10));

  return new ImageResponse(
    (
      <div style={{ /* gradient background, emoji, title, location */ }}>
        {/* Dynamic content based on listing type */}
      </div>
    ),
    { ...size }
  );
}
```

**Features:**

- Type-specific gradients and emojis (food 🍽️, borrow 🤝, wanted 🔍, etc.)
- Background image overlay when listing has photos
- Location badge with 📍 icon
- "FREE" badge for food sharing
- FoodShare branding footer

### JSON-LD Structured Data

Pages include JSON-LD for rich search results. All JSON-LD output uses `safeJsonLdStringify()` to prevent XSS attacks by escaping `<`, `>`, and `&` characters:

```typescript
import { generateEventJsonLd, safeJsonLdStringify } from '@/lib/jsonld';

// Generate structured data
const eventJsonLd = generateEventJsonLd({
  name: challenge.challenge_title,
  description: challenge.challenge_description,
  image: challenge.challenge_image,
  url: `https://foodshare.club/challenge/${id}`,
});

// Render safely in page
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{ __html: safeJsonLdStringify(eventJsonLd) }}
/>
```

Available generators in `src/lib/jsonld.ts`:

- `generateOrganizationJsonLd()` - Site-wide organization info
- `generateWebsiteJsonLd()` - Website with search action
- `generateProductJsonLd()` - Food listings (Product schema)
- `generateArticleJsonLd()` - Forum posts
- `generateEventJsonLd()` - Challenges
- `generateBreadcrumbJsonLd()` - Navigation breadcrumbs
- `generateFAQJsonLd()` - Help pages
- `generateItemListJsonLd()` - Collection pages
- `generateCollectionPageJsonLd()` - Listing pages
- `generateSoftwareApplicationJsonLd()` - PWA discovery
- `generateLocalBusinessJsonLd()` - Location features

### Legacy Route Redirects

Old URLs are permanently redirected (301) to the correct routes:

| Legacy URL      | Redirects to     |
| --------------- | ---------------- |
| `/products/:id` | `/food/:id`      |
| `/thing/:id`    | `/things/:id`    |
| `/business`     | `/organisations` |
| `/volunteer`    | `/volunteers`    |
| `/community`    | `/forum`         |

### Route Constants

All application routes are defined in `src/utils/ROUTES.ts` for consistent navigation.

---

## 🔐 Authentication Flow

```
┌─────────────┐
│    User     │
└──────┬──────┘
       │
       │ 1. Any Request
       ▼
┌─────────────────┐
│   Middleware    │ ◄─── Edge-level auth (src/middleware.ts)
│                 │      • Validates/clears corrupted cookies
│                 │      • Refreshes session automatically
│                 │      • Protects /admin routes
└──────┬──────────┘
       │
       │ 2. Access Protected Route
       ▼
┌─────────────────┐
│   AuthGuard     │ ◄─── Component-level checks
└──────┬──────────┘
       │
       │ 3. Not Authenticated
       ▼
┌─────────────────┐
│  Login Page     │
└──────┬──────────┘
       │
       │ 4. Submit Credentials
       ▼
┌─────────────────┐
│  AuthProvider   │ ◄─── Centralized auth logic
└──────┬──────────┘
       │
       │ 5. Call Supabase Auth
       ▼
┌─────────────────┐
│   Supabase      │
│   Auth API      │
└──────┬──────────┘
       │
       │ 6. Return Session
       ▼
┌─────────────────┐
│ Session Manager │ ◄─── Auto-refresh, health checks
└──────┬──────────┘
       │
       │ 7. Update Context
       ▼
┌─────────────────┐
│  AuthProvider   │ ◄─── Broadcast to all components
└──────┬──────────┘
       │
       │ 8. Redirect to Original Route
       ▼
┌─────────────────┐
│ Protected Page  │
└─────────────────┘
```

### Middleware (Edge-Level Protection)

The `src/middleware.ts` provides defense-in-depth security:

| Feature           | Description                                               |
| ----------------- | --------------------------------------------------------- |
| Cookie Validation | Detects corrupted `sb-*` cookies and clears them          |
| Session Refresh   | Automatically refreshes expired sessions on every request |
| Admin Protection  | Multi-source role checking for `/admin/*` routes          |

Admin role checking uses the `user_roles` junction table as single source of truth (consistent with `checkIsAdmin()`):

- **`user_roles` table** - Queries `user_roles` joined with `roles` table for `'admin'` or `'superadmin'` role names

---

## 📦 State Management

```
┌─────────────────────────────────────────────────────────────┐
│                      Redux Store                            │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   Products   │  │     Chat     │  │      UI      │    │
│  │              │  │              │  │              │    │
│  │ - listings   │  │ - messages   │  │ - location   │    │
│  │ - filters    │  │ - rooms      │  │ - language   │    │
│  │ - loading    │  │ - typing     │  │ - theme      │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐                       │
│  │    Auth      │  │   Profile    │                       │
│  │              │  │              │                       │
│  │ - user       │  │ - data       │                       │
│  │ - session    │  │ - settings   │                       │
│  │ - isAdmin    │  │ - favorites  │                       │
│  └──────────────┘  └──────────────┘                       │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ Selectors
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                      Components                             │
│                                                             │
│  useAppSelector(selectProducts)                            │
│  useAppDispatch()(loadProducts())                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 Data Flow

### Product Listing Flow

```
User Action
    │
    │ 1. Navigate to /s/food
    ▼
┌─────────────┐
│   Router    │
└──────┬──────┘
       │
       │ 2. Render ProductPage
       ▼
┌─────────────┐
│ ProductPage │
└──────┬──────┘
       │
       │ 3. useEffect → dispatch(loadProducts())
       ▼
┌─────────────┐
│ Redux Thunk │
└──────┬──────┘
       │
       │ 4. Call productAPI.getAll()
       ▼
┌─────────────┐
│ Product API │
└──────┬──────┘
       │
       │ 5. Query Supabase
       ▼
┌─────────────┐
│  Supabase   │
│  Database   │
└──────┬──────┘
       │
       │ 6. Return data
       ▼
┌─────────────┐
│ Redux Store │ ◄─── Update state
└──────┬──────┘
       │
       │ 7. Trigger re-render
       ▼
┌─────────────┐
│ ProductGrid │ ◄─── Display products
└─────────────┘
```

### Real-time Chat Flow

```
User Types Message
    │
    │ 1. Submit form
    ▼
┌─────────────┐
│ ChatInput   │
└──────┬──────┘
       │
       │ 2. dispatch(sendMessage())
       ▼
┌─────────────┐
│ Redux Thunk │
└──────┬──────┘
       │
       │ 3. Call chatAPI.send()
       ▼
┌─────────────┐
│  Chat API   │
└──────┬──────┘
       │
       │ 4. Insert into Supabase
       ▼
┌─────────────┐
│  Supabase   │
│  Realtime   │
└──────┬──────┘
       │
       │ 5. Broadcast to subscribers
       ▼
┌─────────────┐
│ Subscription│ ◄─── All connected clients
└──────┬──────┘
       │
       │ 6. Update Redux store
       ▼
┌─────────────┐
│ ChatMessages│ ◄─── Display new message
└─────────────┘
```

---

## 🪝 Hooks & Data Patterns

### Server-First Architecture

FoodShare uses a **server-first architecture** with Next.js 16. Data fetching and mutations follow these patterns:

| Operation                | Approach                                 | Location               |
| ------------------------ | ---------------------------------------- | ---------------------- |
| **READ** (data fetching) | Server Components + `lib/data` functions | `src/lib/data/*.ts`    |
| **WRITE** (mutations)    | Server Actions                           | `src/app/actions/*.ts` |
| **Realtime**             | Supabase client subscriptions            | Client Components only |
| **UI state**             | Zustand or `useState`                    | `src/store/`           |

### Data Flow

```text
READ:  Server Component → lib/data function → Supabase → Render
WRITE: form action → Server Action → Supabase → revalidate → Re-render
REALTIME: Client Component → Supabase subscription → useState
```

### Usage Examples

```typescript
// ✅ Server Component for data fetching
// app/products/page.tsx
import { getProducts } from '@/lib/data/products';

export default async function ProductsPage() {
  const products = await getProducts();
  return <ProductGrid products={products} />;
}
```

```typescript
// ✅ Server Action for mutations
// app/actions/products.ts
'use server';

import { createClient } from '@/lib/supabase/server';
import { CACHE_TAGS, invalidateTag } from '@/lib/data/cache-keys';

export async function createProduct(formData: FormData) {
  const supabase = await createClient();
  await supabase.from('posts').insert({
    post_name: formData.get('name') as string,
  });
  invalidateTag(CACHE_TAGS.PRODUCTS);
}

// In component:
<form action={createProduct}>
  <input name="title" />
  <SubmitButton />
</form>
```

```typescript
// ✅ Client Component for realtime only
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

### Hooks Barrel Export

The `src/hooks/index.ts` barrel export includes:

- **Utility hooks** - `useDebounce`, `useMediaQuery`, `usePosition`, `useTheme`, etc.
- **Legacy query/mutation hooks** - Kept for backwards compatibility only

> **Important**: The legacy TanStack Query hooks in `src/hooks/queries/*` are kept for backwards compatibility during migration. **New code should use Server Components for data fetching and Server Actions for mutations.**

### Patterns to Avoid

```typescript
// ❌ Don't fetch in useEffect
"use client";
useEffect(() => {
  fetch("/api/data").then(setData);
}, []);

// ❌ Don't use TanStack Query for server data
const { data } = useProducts("food");

// ❌ Don't create Supabase server client without await
const supabase = createClient(); // Missing await!
```

---

## 📁 Directory Structure

```
src/
├── api/                    # API layer (Supabase calls)
│   ├── authAPI.ts
│   ├── productAPI.ts
│   ├── chatAPI.ts
│   └── profileAPI.ts
│
├── components/             # React components
│   ├── ui/                # UI primitives (shadcn/ui)
│   ├── layout/            # Layout components
│   ├── guards/            # Route guards
│   │   └── AuthGuard.tsx
│   └── [feature]/         # Feature-specific components
│
├── hooks/                  # Custom React hooks
│   ├── useAuth.ts
│   ├── useProducts.ts
│   ├── useRAFThrottle.ts
│   └── usePosition.ts
│
├── lib/                    # External service integrations
│   ├── auth/
│   │   └── AuthProvider.tsx
│   └── supabase/
│       ├── client.ts
│       └── session.ts
│
├── pages/                  # Page components
│   ├── auth/
│   ├── products/
│   ├── chat/
│   └── profile/
│
├── store/                  # Redux store
│   ├── slices/
│   │   ├── auth/
│   │   ├── products/
│   │   ├── chat/
│   │   └── profile/
│   └── redux-store.ts
│
├── types/                  # TypeScript types
│   ├── database.types.ts
│   └── global.d.ts
│
├── utils/                  # Utility functions
│   ├── format/
│   ├── validation/
│   └── helpers/
│
├── workers/                # Web Workers
│   └── distance.worker.ts
│
├── test/                   # Test utilities
│   └── setup.ts
│
├── App.tsx                 # Root component
└── index.tsx               # Entry point
```

---

## 🔌 API Integration

### Supabase Client Configuration

```typescript
// src/lib/supabase/client.ts
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: "pkce",
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});
```

### API Layer Pattern

```typescript
// src/api/productAPI.ts
export const productAPI = {
  async getAll() {
    const { data, error } = await supabase.from("products").select("*").eq("active", true);

    if (error) throw error;
    return data;
  },

  async getById(id: string) {
    const { data, error } = await supabase.from("products").select("*").eq("id", id).single();

    if (error) throw error;
    return data;
  },
};
```

---

## 🧪 Testing Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Test Pyramid                           │
│                                                             │
│                        /\                                   │
│                       /E2E\          10% - Critical flows   │
│                      /    \                                 │
│                     /      \                                │
│                    /  Integ  \      20% - API + Redux       │
│                   /          \                              │
│                  /            \                             │
│                 /     Unit     \    70% - Functions + Hooks │
│                /________________\                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘

Unit Tests (Vitest)
├── src/lib/auth/AuthProvider.test.tsx
├── src/hooks/useRAFThrottle.test.ts
├── src/utils/format/formatDate.test.ts
└── src/api/productAPI.test.ts

Integration Tests
├── src/features/auth/auth.integration.test.tsx
└── src/features/products/products.integration.test.tsx

E2E Tests (Future)
├── tests/e2e/auth-flow.spec.ts
└── tests/e2e/product-listing.spec.ts
```

---

## 🚀 Performance Optimization

### Code Splitting Strategy

```
Initial Bundle (< 100KB)
├── React core
├── Router
├── Auth provider
└── Critical CSS

Lazy Loaded Chunks
├── Product page (~50KB)
├── Chat page (~40KB)
├── Profile page (~30KB)
├── Map component (~80KB)
└── Admin panel (~60KB)

Vendor Chunks
├── react-vendor (~40KB)
├── chakra-ui (~60KB)
├── leaflet-vendor (~80KB)
├── redux-vendor (~30KB)
└── supabase (~40KB)
```

### Caching Strategy

```
Service Worker
├── Static assets (1 year)
├── API responses (5 minutes)
├── Images (1 month)
└── Fonts (1 year)

Browser Cache
├── LocalStorage (auth tokens)
├── SessionStorage (temp data)
└── IndexedDB (offline data)

CDN Cache
├── Static files (immutable)
└── Images (optimized)
```

---

## 🔒 Security Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Security Layers                        │
│                                                             │
│  1. HTTPS/TLS                                              │
│     └─ All traffic encrypted                               │
│                                                             │
│  2. Supabase Auth                                          │
│     ├─ JWT tokens                                          │
│     ├─ PKCE flow (OAuth)                                   │
│     └─ Auto token refresh                                  │
│                                                             │
│  3. Row Level Security (RLS)                               │
│     ├─ Database policies                                   │
│     └─ User-specific data access                           │
│                                                             │
│  4. Input Validation                                       │
│     ├─ Zod schemas                                         │
│     ├─ Form validation                                     │
│     └─ API request validation                              │
│                                                             │
│  5. XSS Prevention                                         │
│     ├─ React auto-escaping                                 │
│     ├─ Content Security Policy                             │
│     └─ Sanitized user input                                │
│                                                             │
│  6. CSRF Protection                                        │
│     ├─ OAuth state parameter                               │
│     └─ SameSite cookies                                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 📱 Responsive Design

```
Mobile First Approach

┌─────────────┐  ┌──────────────────┐  ┌─────────────────────┐
│   Mobile    │  │     Tablet       │  │      Desktop        │
│  < 768px    │  │  768px - 1024px  │  │      > 1024px       │
├─────────────┤  ├──────────────────┤  ├─────────────────────┤
│ - Stack     │  │ - 2 columns      │  │ - 3-4 columns       │
│ - Bottom    │  │ - Side drawer    │  │ - Full navigation   │
│   nav       │  │ - Larger cards   │  │ - Sidebar           │
│ - Touch     │  │ - Touch + mouse  │  │ - Mouse optimized   │
│   optimized │  │                  │  │ - Hover states      │
└─────────────┘  └──────────────────┘  └─────────────────────┘
```

---

## 🌐 Internationalization

### Frontend i18n (next-intl)

```
┌─────────────────────────────────────────────────────────────┐
│                    i18n Architecture                        │
│                                                             │
│  Source Code                                               │
│  ├── t('hello')            (useTranslations)               │
│  └── getTranslations()     (Server Components)             │
│                                                             │
│  Message Catalogs                                          │
│  ├── messages/en.json                                      │
│  ├── messages/cs.json                                      │
│  ├── messages/fr.json                                      │
│  ├── messages/ru.json                                      │
│  └── messages/{locale}.json  (21 locales)                  │
│                                                             │
│  Translate                                                 │
│  └── Edit JSON message files                               │
│                                                             │
│  Sync (bun run translations:sync)                          │
│  └── Push catalogs to Supabase                             │
│                                                             │
│  Runtime                                                   │
│  └── next-intl loads messages per locale                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Backend i18n (Supabase)

```
┌─────────────────────────────────────────────────────────────┐
│              Backend i18n Architecture                      │
│                                                             │
│  src/utils/i18n-backend.ts                                 │
│  ├── Extended locale support (17 languages)                │
│  │   └── en, cs, de, es, fr, pt, ru, uk + zh, hi, ar,     │
│  │       it, pl, nl, ja, ko, tr                            │
│  │                                                         │
│  ├── Mobile App Translation API                            │
│  │   ├── fetchTranslationsForMobile()                     │
│  │   └── syncTranslationsToBackend()                      │
│  │                                                         │
│  ├── User Locale Preferences (Supabase)                   │
│  │   ├── getUserLocalePreference()                        │
│  │   └── saveUserLocalePreference()                       │
│  │                                                         │
│  ├── Smart Locale Detection                                │
│  │   └── detectBestLocale()                               │
│  │       Priority: User pref > Device > Browser > IP > Default │
│  │                                                         │
│  └── RTL Language Support                                  │
│      └── Arabic (ar) with direction: "rtl"                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Supported Languages

| Code | Language   | Native Name | Direction | Region |
| ---- | ---------- | ----------- | --------- | ------ |
| en   | English    | English     | LTR       | Global |
| cs   | Czech      | Čeština     | LTR       | Europe |
| de   | German     | Deutsch     | LTR       | Europe |
| es   | Spanish    | Español     | LTR       | Global |
| fr   | French     | Français    | LTR       | Global |
| pt   | Portuguese | Português   | LTR       | Global |
| ru   | Russian    | Русский     | LTR       | Europe |
| uk   | Ukrainian  | Українська  | LTR       | Europe |
| zh   | Chinese    | 中文        | LTR       | Asia   |
| hi   | Hindi      | हिन्दी      | LTR       | Asia   |
| ar   | Arabic     | العربية     | RTL       | MENA   |
| it   | Italian    | Italiano    | LTR       | Europe |
| pl   | Polish     | Polski      | LTR       | Europe |
| nl   | Dutch      | Nederlands  | LTR       | Europe |
| ja   | Japanese   | 日本語      | LTR       | Asia   |
| ko   | Korean     | 한국어      | LTR       | Asia   |
| tr   | Turkish    | Türkçe      | LTR       | MENA   |

---

**Last Updated**: December 6, 2025
**Status**: ✅ Optimized Architecture
**Next Review**: After Phase 1 completion
