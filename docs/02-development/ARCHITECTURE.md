# FoodShare Architecture Overview

> **Visual guide to the optimized FoodShare architecture**

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Interface                          │
│                    (React 19 + Chakra UI)                       │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Presentation Layer                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Pages      │  │  Components  │  │    Hooks     │         │
│  │              │  │              │  │              │         │
│  │ - ProductPage│  │ - ProductCard│  │ - useAuth    │         │
│  │ - ChatPage   │  │ - Header     │  │ - useProducts│         │
│  │ - ProfilePage│  │ - Footer     │  │ - usePosition│         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Application Layer                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ Auth Context │  │ Redux Store  │  │   Routing    │         │
│  │              │  │              │  │              │         │
│  │ - AuthProvider│ │ - Products   │  │ - AuthGuard  │         │
│  │ - useAuth    │  │ - Chat       │  │ - Routes     │         │
│  │ - Session Mgr│  │ - Profile    │  │ - Navigation │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Data Layer                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   API Layer  │  │  Validation  │  │   Utilities  │         │
│  │              │  │              │  │              │         │
│  │ - authAPI    │  │ - Zod schemas│  │ - formatDate │         │
│  │ - productAPI │  │ - Form rules │  │ - distance   │         │
│  │ - chatAPI    │  │ - Input check│  │ - storage    │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Infrastructure Layer                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Supabase   │  │   Browser    │  │   External   │         │
│  │              │  │              │  │              │         │
│  │ - Auth       │  │ - LocalStorage│ │ - Leaflet    │         │
│  │ - Database   │  │ - Geolocation│  │ - Analytics  │         │
│  │ - Realtime   │  │ - IndexedDB  │  │ - i18n       │         │
│  │ - Storage    │  │ - Service SW │  │              │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔗 URL Routing Configuration

The application uses Next.js routing with custom configuration in `next.config.ts`:

### Category URLs

Category pages use the `/s/[category]` route pattern:

| URL | Description |
| --- | ----------- |
| `/s/food` | Food listings |
| `/s/things` | Things to share |
| `/s/borrow` | Items to borrow |
| `/s/wanted` | Wanted items |
| `/s/fridges` | Community fridges |
| `/s/foodbanks` | Food banks |
| `/s/organisations` | Organisations |
| `/s/volunteers` | Volunteer opportunities |
| `/s/zerowaste` | Zero waste listings |
| `/s/vegan` | Vegan listings |

The `/s/[category]` route also supports search via query params: `/s/food?key_word=apples`

### Dedicated Feature Routes

Some features have their own dedicated routes instead of using the `/s/[category]` pattern:

| Route | Description |
| ----- | ----------- |
| `/food` | Food listings page |
| `/food/[id]` | Individual food listing detail |
| `/challenge` | Challenges listing page |
| `/challenge/[id]` | Individual challenge detail page |
| `/forum` | Community forum |
| `/forum/[slug]` | Individual forum post |

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

| Route | OG Image File | Description |
| ----- | ------------- | ----------- |
| `/food/[id]` | `opengraph-image.tsx` | Dynamic food listing preview |
| `/challenge/[id]` | `opengraph-image.tsx` | Challenge preview with event details |
| `/forum/[slug]` | `opengraph-image.tsx` | Forum post preview |

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

| Legacy URL | Redirects to |
|-----------|--------------|
| `/products/:id` | `/food/:id` |
| `/thing/:id` | `/things/:id` |
| `/business` | `/organisations` |
| `/volunteer` | `/volunteers` |
| `/community` | `/forum` |

### Route Constants

All application routes are defined in `src/utils/ROUTES.ts` for consistent navigation.

---

## 🔐 Authentication Flow

```
┌─────────────┐
│    User     │
└──────┬──────┘
       │
       │ 1. Access Protected Route
       ▼
┌─────────────────┐
│   AuthGuard     │ ◄─── Checks authentication
└──────┬──────────┘
       │
       │ 2. Not Authenticated
       ▼
┌─────────────────┐
│  Login Page     │
└──────┬──────────┘
       │
       │ 3. Submit Credentials
       ▼
┌─────────────────┐
│  AuthProvider   │ ◄─── Centralized auth logic
└──────┬──────────┘
       │
       │ 4. Call Supabase Auth
       ▼
┌─────────────────┐
│   Supabase      │
│   Auth API      │
└──────┬──────────┘
       │
       │ 5. Return Session
       ▼
┌─────────────────┐
│ Session Manager │ ◄─── Auto-refresh, health checks
└──────┬──────────┘
       │
       │ 6. Update Context
       ▼
┌─────────────────┐
│  AuthProvider   │ ◄─── Broadcast to all components
└──────┬──────────┘
       │
       │ 7. Redirect to Original Route
       ▼
┌─────────────────┐
│ Protected Page  │
└─────────────────┘
```

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

### Frontend i18n (Lingui)

```
┌─────────────────────────────────────────────────────────────┐
│                    i18n Architecture                        │
│                                                             │
│  Source Code                                               │
│  ├── <Trans>Hello</Trans>                                  │
│  └── t`Welcome`                                            │
│                                                             │
│  Extract (npm run extract)                                 │
│  ├── src/locales/en/messages.po                           │
│  ├── src/locales/cs/messages.po                           │
│  ├── src/locales/fr/messages.po                           │
│  ├── src/locales/ru/messages.po                           │
│  └── src/locales/uk/messages.po                           │
│                                                             │
│  Translate                                                 │
│  └── Edit .po files                                        │
│                                                             │
│  Compile (npm run compile)                                 │
│  ├── src/locales/{locale}/messages.mjs                    │
│                                                             │
│  Runtime                                                   │
│  └── Load compiled catalogs dynamically                    │
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
