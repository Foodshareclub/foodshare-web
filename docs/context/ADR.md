# FoodShare - Architecture Decision Records

**Project:** FoodShare - Community Food Sharing Platform
**Type:** Architecture Decision Records (ADR)
**Last Updated:** December 2025
**Version:** 2.0.0
**Status:** Living Document

---

## Table of Contents

1. [Introduction](#introduction)
2. [ADR-001: Next.js as Framework](#adr-001-nextjs-as-framework)
3. [ADR-002: React 19 with TypeScript](#adr-002-react-19-with-typescript)
4. [ADR-003: shadcn/ui for Component Library](#adr-003-shadcnui-for-component-library)
5. [ADR-004: Hybrid State Management](#adr-004-hybrid-state-management)
6. [ADR-005: Supabase as Backend Platform](#adr-005-supabase-as-backend-platform)
7. [ADR-006: Leaflet for Maps](#adr-006-leaflet-for-maps)
8. [ADR-007: Lingui for Internationalization](#adr-007-lingui-for-internationalization)
9. [ADR-008: File-Based Routing with App Router](#adr-008-file-based-routing-with-app-router)
10. [ADR-009: PostgreSQL via Supabase](#adr-009-postgresql-via-supabase)
11. [ADR-010: Row Level Security (RLS)](#adr-010-row-level-security-rls)
12. [ADR-011: Real-Time with Supabase Realtime](#adr-011-real-time-with-supabase-realtime)
13. [ADR-012: Feature-Based Folder Structure](#adr-012-feature-based-folder-structure)
14. [ADR-013: API Layer Abstraction](#adr-013-api-layer-abstraction)
15. [ADR-014: Server Components and SSR](#adr-014-server-components-and-ssr)
16. [ADR-015: Vercel for Hosting](#adr-015-vercel-for-hosting)

---

## Introduction

This document records the significant architectural decisions made during the development of FoodShare. Each decision includes context, the decision made, consequences, and current status.

**Purpose:**

- Document why decisions were made
- Provide context for future developers
- Track architectural evolution
- Enable informed decision-making

**Format:**
Each ADR follows this structure:

- **Status:** Accepted | Superseded | Deprecated
- **Context:** Why the decision was needed
- **Decision:** What was decided
- **Consequences:** Positive and negative outcomes
- **Alternatives Considered:** Other options evaluated
- **Date:** When the decision was made

---

## ADR-001: Next.js as Framework

**Status:** ✅ Accepted (Updated Q4 2025)

**Date:** Q3 2024 (Updated Q4 2025)

### Context

We needed a modern React framework for a full-stack application. The main contenders were:

- Vite (original choice)
- Next.js
- Remix
- Astro

**Requirements:**

- Fast development experience
- Hot Module Replacement (HMR)
- TypeScript support
- Server-side rendering capabilities
- SEO optimization
- API routes support
- Good plugin ecosystem

### Decision

**We chose Next.js 16+ with App Router and Turbopack.**

### Rationale

1. **Performance:**
   - Turbopack for fast development builds
   - Server Components reduce client bundle size
   - Automatic code splitting per route
   - Built-in image and font optimization

2. **Developer Experience:**
   - Zero-config TypeScript support
   - Fast refresh with Turbopack
   - File-based routing (App Router)
   - Excellent error messages

3. **Modern Architecture:**
   - React Server Components (RSC)
   - Streaming and Suspense support
   - Server Actions for mutations
   - Edge runtime support

4. **Full-Stack Capabilities:**
   - API routes for backend logic
   - Middleware for auth/routing
   - Built-in SSR/SSG/ISR
   - Optimized for Vercel deployment

### Consequences

**Positive:**

- ✅ Development server starts quickly with Turbopack
- ✅ Server Components reduce JavaScript sent to client
- ✅ Better SEO with SSR
- ✅ Simplified deployment to Vercel
- ✅ Built-in optimizations (images, fonts, scripts)

**Negative:**

- ⚠️ Learning curve for Server vs Client Components
- ⚠️ More complex mental model than pure SPA
- ⚠️ Some third-party libraries need 'use client'

### Alternatives Considered

**Vite (original):**

- Previously used but migrated for SSR capabilities
- No built-in server rendering

**Remix:**

- Considered but Next.js has larger ecosystem
- Better Vercel integration with Next.js

**Astro:**

- Better for content sites, not interactive apps

**Current Status:** Active. Migration from Vite completed Q4 2025.

---

## ADR-002: React 19 with TypeScript

**Status:** ✅ Accepted

**Date:** Q3 2024

### Context

We needed to choose a UI framework and whether to use TypeScript.

**Requirements:**

- Component-based architecture
- Strong ecosystem
- Good performance
- Type safety
- Good developer tools

### Decision

**We chose React 19 with TypeScript 5.9+ strict mode.**

### Rationale

**React 19:**

1. **Latest Features:**
   - Improved Suspense
   - Automatic batching
   - Transitions
   - Server components ready (future)

2. **Ecosystem:**
   - Largest component ecosystem
   - Best tooling support
   - Extensive documentation
   - Large talent pool

3. **Performance:**
   - Efficient reconciliation
   - Lazy loading support
   - Code splitting

**TypeScript:**

1. **Type Safety:**
   - Catch errors at compile time
   - Better refactoring support
   - Self-documenting code

2. **Developer Experience:**
   - Excellent IDE support
   - IntelliSense/autocomplete
   - Easier maintenance

3. **Team Efficiency:**
   - Fewer runtime errors
   - Better onboarding
   - Clearer interfaces

### Consequences

**Positive:**

- ✅ Type safety prevents many bugs
- ✅ Better IDE experience
- ✅ Self-documenting code
- ✅ Easier refactoring
- ✅ Latest React features available

**Negative:**

- ⚠️ Learning curve for TypeScript
- ⚠️ More verbose code
- ⚠️ Need to maintain type definitions

### Alternatives Considered

**Vue 3:**

- Rejected: Smaller ecosystem, less team experience

**Svelte:**

- Rejected: Smaller ecosystem, less mature tooling

**JavaScript (no TypeScript):**

- Rejected: Too error-prone for larger codebase

**Current Status:** Active. TypeScript has proven invaluable.

---

## ADR-003: shadcn/ui for Component Library

**Status:** ✅ Accepted (Updated Q4 2025)

**Date:** Q3 2024 (Updated Q4 2025)

### Context

We needed a component library for rapid UI development that works well with Next.js and Tailwind CSS.

**Requirements:**

- Comprehensive component set
- Accessibility built-in
- Customizable theming
- Good TypeScript support
- Responsive utilities
- Works with Server Components
- Active maintenance

### Decision

**We chose shadcn/ui with Radix UI primitives and Tailwind CSS 4.**

### Rationale

1. **Accessibility First:**
   - Built on Radix UI (WCAG compliant)
   - Keyboard navigation
   - Screen reader support
   - ARIA attributes built-in

2. **Developer Experience:**
   - Copy-paste components (own the code)
   - Tailwind CSS for styling
   - Full customization control
   - Excellent documentation

3. **Theming:**
   - CSS variables for theming
   - Built-in dark mode via next-themes
   - Design tokens via Tailwind
   - No runtime CSS-in-JS overhead

4. **Next.js Compatibility:**
   - Works with Server Components
   - No 'use client' needed for many components
   - Smaller bundle than CSS-in-JS solutions
   - Tree-shakeable

### Consequences

**Positive:**

- ✅ Full control over component code
- ✅ Works with Server Components
- ✅ Smaller bundle size than Chakra UI
- ✅ Tailwind CSS consistency
- ✅ Easy to customize and extend

**Negative:**

- ⚠️ Need to copy components into project
- ⚠️ Manual updates for new versions
- ⚠️ More initial setup required

### Alternatives Considered

**Chakra UI (original):**

- Previously used but migrated for Next.js compatibility
- CSS-in-JS doesn't work well with Server Components

**Material-UI (MUI):**

- Rejected: Larger bundle, CSS-in-JS limitations

**Mantine:**

- Considered but shadcn/ui better Tailwind integration

**Current Status:** Active. Migration from Chakra UI completed Q4 2025.

---

## ADR-004: Hybrid State Management

**Status:** ✅ Accepted (Updated Q4 2025)

**Date:** Q3 2024 (Updated Q4 2025)

### Context

We needed state management for:

- Server state (API data, caching)
- User authentication state
- Product listings and filters
- Chat conversations and messages
- UI state (modals, drawers)

**Requirements:**

- Predictable state updates
- Developer tools
- TypeScript support
- Easy async handling with caching
- Persist state across refreshes
- Works with Server Components

### Decision

**We chose a hybrid approach with three state management solutions:**

1. **TanStack React Query 5.90** - Server state (API data)
2. **Redux Toolkit 2.10** - Complex client state (auth, products)
3. **Zustand 5.0** - Lightweight feature state (chat, forum, UI)

### Rationale

1. **React Query for Server State:**
   - Automatic caching and revalidation
   - Background refetching
   - Optimistic updates
   - Deduplication of requests
   - Built-in loading/error states

2. **Redux Toolkit for Complex State:**
   - User authentication flow
   - Complex product filtering
   - Time-travel debugging
   - Well-documented patterns

3. **Zustand for Lightweight State:**
   - Simple API for feature-specific state
   - No boilerplate
   - Works with Server Components
   - Easy to create isolated stores

4. **Decision Tree:**
   - API data with caching → React Query
   - Complex cross-cutting state → Redux
   - Feature-specific UI state → Zustand

### Consequences

**Positive:**

- ✅ Right tool for each job
- ✅ Better caching with React Query
- ✅ Less Redux boilerplate needed
- ✅ Easier testing per feature
- ✅ Improved performance (less over-fetching)

**Negative:**

- ⚠️ Three libraries to learn
- ⚠️ Need to decide which to use
- ⚠️ Some overlap in capabilities

### Alternatives Considered

**Redux Only (original):**

- Previously used but needed better caching
- Too much boilerplate for simple state

**Zustand Only:**

- Too simple for auth flow complexity

**Jotai/Recoil:**

- Considered but React Query better for server state

**Current Status:** Active. Hybrid approach adopted Q4 2025.

---

## ADR-005: Supabase as Backend Platform

**Status:** ✅ Accepted

**Date:** Q3 2024

### Context

We needed a backend platform for:

- User authentication
- Database (PostgreSQL)
- Real-time subscriptions
- File storage
- API layer

**Requirements:**

- Fast development
- Real-time capabilities
- PostgreSQL database
- Authentication built-in
- Scalable
- Affordable for MVP

### Decision

**We chose Supabase as our Backend-as-a-Service (BaaS) platform.**

### Rationale

1. **Complete Platform:**
   - PostgreSQL database
   - Authentication service
   - Real-time subscriptions
   - Object storage
   - Auto-generated REST API
   - Row Level Security

2. **Real-Time:**
   - WebSocket subscriptions
   - Database change events
   - Essential for chat feature
   - Built-in, not add-on

3. **Developer Experience:**
   - Excellent documentation
   - TypeScript support
   - Dashboard for management
   - Local development tools

4. **Cost:**
   - Generous free tier
   - Predictable pricing
   - No cold starts
   - Pay-as-you-grow

5. **Open Source:**
   - Self-hostable if needed
   - Transparent codebase
   - Active community
   - Not vendor lock-in

### Consequences

**Positive:**

- ✅ Rapid backend development
- ✅ Real-time out of the box
- ✅ PostgreSQL (industry standard)
- ✅ Built-in authentication
- ✅ Excellent documentation
- ✅ Can self-host if needed

**Negative:**

- ⚠️ Younger platform (less mature than Firebase)
- ⚠️ Free tier limits (500MB storage)
- ⚠️ Some features still in beta

### Alternatives Considered

**Firebase:**

- Rejected: NoSQL database (we need relational)
- Real-time costs are higher

**AWS Amplify:**

- Rejected: More complex, steeper learning curve

**Custom Backend (Node.js + PostgreSQL):**

- Rejected: Too much development time for MVP

**Hasura:**

- Considered but Supabase more complete

**Current Status:** Active. Supabase exceeded expectations.

---

## ADR-006: Leaflet for Maps

**Status:** ✅ Accepted

**Date:** Q3 2024

### Context

Maps are core to FoodShare - users discover food through geographic browsing.

**Requirements:**

- Interactive map
- Custom markers
- Marker clustering
- Geosearch
- Mobile-friendly
- Free (no API keys)
- Open source

### Decision

**We chose Leaflet 1.9+ with React Leaflet for map functionality.**

### Rationale

1. **Open Source & Free:**
   - No API keys required
   - No usage limits
   - No costs at any scale

2. **Lightweight:**
   - ~40KB minified
   - Fast loading
   - Good mobile performance

3. **Customizable:**
   - Custom markers/icons
   - Full styling control
   - Plugin ecosystem
   - No branding requirements

4. **React Integration:**
   - react-leaflet provides React components
   - Declarative map building
   - Lifecycle management

5. **Plugin Ecosystem:**
   - Marker clustering (react-leaflet-cluster)
   - Geosearch (leaflet-geosearch)
   - Routing, heatmaps, etc.

### Consequences

**Positive:**

- ✅ No costs ever
- ✅ Lightweight and fast
- ✅ Full customization
- ✅ Good mobile experience
- ✅ Active community
- ✅ Plugin ecosystem

**Negative:**

- ⚠️ Need to provide own tile server
- ⚠️ Less polished than Google Maps
- ⚠️ Some features require plugins

### Alternatives Considered

**Google Maps:**

- Rejected: Expensive (requires credit card, usage fees)
- API key management
- Vendor lock-in

**Mapbox:**

- Rejected: Costs after 50K loads/month
- API key required

**OpenLayers:**

- Rejected: More complex API, heavier

**Current Status:** Active. Leaflet works perfectly for our needs.

---

## ADR-007: Lingui for Internationalization

**Status:** ✅ Accepted

**Date:** Q3 2024

### Context

FoodShare needs to support multiple languages to serve diverse communities.

**Requirements:**

- Multiple languages (EN, CS, FR, RU)
- Easy for developers to add strings
- Compiled catalogs (not runtime parsing)
- Plural/gender support
- Framework integration
- Good TypeScript support

### Decision

**We chose Lingui 5.6+ for internationalization (i18n).**

### Rationale

1. **Developer Experience:**
   - Macro system (`Trans`, `t`)
   - Automatic message extraction
   - Clear workflow
   - Good documentation

2. **Performance:**
   - Compiled message catalogs
   - Small runtime bundle
   - Fast language switching

3. **Features:**
   - ICU message format
   - Plural rules
   - Number/date formatting
   - Context support

4. **Tooling:**
   - CLI for extraction/compilation
   - Validation tools
   - Webpack/Vite integration

### Consequences

**Positive:**

- ✅ Clean developer API
- ✅ Compiled catalogs (fast)
- ✅ Type-safe messages
- ✅ Easy to add languages
- ✅ Good VS Code support

**Negative:**

- ⚠️ Build step required (extract → compile)
- ⚠️ Learning curve for ICU format
- ⚠️ .po file format less modern

### Alternatives Considered

**react-i18next:**

- Rejected: Runtime overhead, larger bundle

**FormatJS (react-intl):**

- Rejected: More verbose API

**Custom solution:**

- Rejected: Reinventing the wheel

**Current Status:** Active. Lingui is working great.

---

## ADR-008: File-Based Routing with App Router

**Status:** ✅ Accepted (Updated Q4 2025)

**Date:** Q3 2024 (Updated Q4 2025)

### Context

We need routing for a full-stack Next.js application.

**Requirements:**

- File-based routing
- Nested layouts
- Protected routes
- Dynamic parameters
- TypeScript support
- Server and Client Components

### Decision

**We chose Next.js App Router for routing.**

### Rationale

1. **Built-in to Next.js:**
   - No additional library needed
   - File-system based routing
   - Automatic code splitting
   - Optimized for performance

2. **Features:**
   - Nested layouts (layout.tsx)
   - Loading states (loading.tsx)
   - Error boundaries (error.tsx)
   - Route groups (parentheses)
   - Parallel routes
   - Intercepting routes

3. **Server Components:**
   - Routes are Server Components by default
   - Data fetching at route level
   - Reduced client bundle size
   - Better SEO

4. **Middleware:**
   - Protected routes via middleware
   - Redirects and rewrites
   - Authentication checks
   - Internationalization

### Consequences

**Positive:**

- ✅ No additional routing library needed
- ✅ Excellent TypeScript support
- ✅ Built-in layouts and loading states
- ✅ Server Components by default
- ✅ Automatic code splitting

**Negative:**

- ⚠️ Different mental model than React Router
- ⚠️ Some features require 'use client'
- ⚠️ Learning curve for nested layouts

### Alternatives Considered

**React Router (original):**

- Previously used with Vite
- Not needed with Next.js App Router

**TanStack Router:**

- Good but Next.js routing is built-in

**Current Status:** Active. Migration from React Router completed Q4 2025.

---

## ADR-009: PostgreSQL via Supabase

**Status:** ✅ Accepted

**Date:** Q3 2024

### Context

We need a database that supports:

- Relational data
- Geospatial queries
- Real-time subscriptions
- Complex queries with joins
- ACID transactions

### Decision

**We chose PostgreSQL (via Supabase) as our database.**

### Rationale

1. **Relational Model:**
   - Food items relate to users, reviews, chat
   - Foreign keys enforce integrity
   - Joins are efficient

2. **PostGIS:**
   - Geospatial extension
   - Distance queries
   - Point-in-polygon
   - Essential for map features

3. **JSON Support:**
   - Flexible for semi-structured data
   - JSONB type for efficient storage
   - Best of both worlds

4. **Reliability:**
   - ACID transactions
   - Proven at scale
   - Battle-tested
   - Industry standard

5. **Features:**
   - Full-text search
   - Triggers and functions
   - Row Level Security
   - Extensive datatypes

### Consequences

**Positive:**

- ✅ Relational integrity
- ✅ Complex queries supported
- ✅ Geospatial queries built-in
- ✅ Mature and reliable
- ✅ Great tooling

**Negative:**

- ⚠️ More complex than NoSQL
- ⚠️ Schema migrations needed
- ⚠️ Requires SQL knowledge

### Alternatives Considered

**MongoDB (NoSQL):**

- Rejected: Harder to model relationships
- No foreign keys

**Firebase Firestore:**

- Rejected: NoSQL, difficult joins

**MySQL:**

- Rejected: PostgreSQL has better features

**Current Status:** Active. PostgreSQL + PostGIS is perfect.

---

## ADR-010: Row Level Security (RLS)

**Status:** ✅ Accepted

**Date:** Q3 2024

### Context

We need to secure data at the database level.

**Requirements:**

- Users can only see their own data
- Public data is readable by all
- Secure by default
- No security logic in client

### Decision

**We use PostgreSQL Row Level Security (RLS) for all tables.**

### Rationale

1. **Database-Level Security:**
   - Cannot be bypassed by client
   - Single source of truth
   - Enforced by PostgreSQL

2. **User Context:**
   - JWT tokens contain user ID
   - RLS policies use auth.uid()
   - Automatic filtering

3. **Flexibility:**
   - Different policies per operation (SELECT, INSERT, UPDATE, DELETE)
   - Complex conditions supported
   - Easy to audit

4. **Supabase Integration:**
   - Built-in support
   - Dashboard for management
   - Policy templates

### Consequences

**Positive:**

- ✅ Secure by default
- ✅ Cannot bypass from client
- ✅ Simple to understand
- ✅ Auditable
- ✅ No security code in app

**Negative:**

- ⚠️ Need to understand policies
- ⚠️ Can be complex for some cases
- ⚠️ Performance impact (minimal)

### Example Policies

```sql
-- Users can only update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Anyone can view active food posts
CREATE POLICY "Anyone can view active posts"
  ON posts FOR SELECT
  USING (active = true);

-- Users can only see their own chats
CREATE POLICY "Users can see own chats"
  ON rooms FOR SELECT
  USING (requester = auth.uid() OR sharer = auth.uid());
```

**Current Status:** Active. RLS is fundamental to our security model.

---

## ADR-011: Real-Time with Supabase Realtime

**Status:** ✅ Accepted

**Date:** Q3 2024

### Context

Chat requires real-time message delivery.

**Requirements:**

- Instant message delivery (<500ms)
- Subscribe to database changes
- Scalable
- Easy to implement
- Reliable

### Decision

**We use Supabase Realtime for real-time subscriptions.**

### Rationale

1. **Built-In:**
   - Part of Supabase platform
   - No additional service needed
   - Same authentication

2. **Database-Driven:**
   - Subscribe to table changes
   - Filter by columns
   - Get full change payload
   - Perfect for chat

3. **WebSockets:**
   - Bi-directional communication
   - Low latency
   - Connection pooling

4. **Simple API:**
   ```typescript
   supabase
     .channel("messages")
     .on(
       "postgres_changes",
       {
         event: "INSERT",
         schema: "public",
         table: "room_participants",
       },
       handleNewMessage
     )
     .subscribe();
   ```

### Consequences

**Positive:**

- ✅ Real-time chat works perfectly
- ✅ Simple to implement
- ✅ Reliable delivery
- ✅ Automatic reconnection
- ✅ No separate service

**Negative:**

- ⚠️ Limited to 10 events/sec on free tier
- ⚠️ WebSocket overhead
- ⚠️ Need to manage subscriptions

**Current Status:** Active. Essential for chat feature.

---

## ADR-012: Feature-Based Folder Structure

**Status:** ✅ Accepted

**Date:** Q3 2024

### Context

We need to organize code in a maintainable way.

**Approaches:**

- Type-based (all components together, all APIs together)
- Feature-based (group by feature/domain)
- Hybrid approach

### Decision

**We use a hybrid approach with feature-based components and centralized services.**

```
src/
├── components/           # Feature-based component folders
│   ├── productCard/
│   ├── chatComponents/
│   └── header/
├── pages/               # Route-based pages
├── api/                 # Centralized API layer
├── store/               # Centralized Redux store
├── hook/                # Shared custom hooks
└── utils/               # Shared utilities
```

### Rationale

1. **Components by Feature:**
   - Related components grouped together
   - Easy to find feature code
   - Easier to extract to separate packages

2. **Centralized Services:**
   - API layer in one place
   - Store in one place
   - Shared utilities accessible

3. **Scalability:**
   - Easy to add new features
   - Clear separation of concerns
   - Reduces merge conflicts

### Consequences

**Positive:**

- ✅ Easy to locate code
- ✅ Feature isolation
- ✅ Scalable structure
- ✅ Clear organization

**Negative:**

- ⚠️ Some duplication possible
- ⚠️ Need discipline to maintain

**Current Status:** Active. Structure works well.

---

## ADR-013: API Layer Abstraction

**Status:** ✅ Accepted

**Date:** Q3 2024

### Context

We need consistent patterns for API calls.

### Decision

**All Supabase calls go through dedicated API modules (productAPI, chatAPI, etc.).**

### Rationale

1. **Separation of Concerns:**
   - Components don't know about Supabase
   - API details centralized
   - Easy to switch backend

2. **Consistency:**
   - Standard error handling
   - Type-safe responses
   - Predictable patterns

3. **Testability:**
   - Easy to mock API calls
   - Test components independently

### Pattern

```typescript
// src/api/productAPI.ts
export const productAPI = {
  async getProducts() {
    return await supabase.from("posts").select("*, reviews(*)");
  },
};

// Usage in Redux
export const fetchProducts = createAsyncThunk("products/fetch", async () => {
  const { data, error } = await productAPI.getProducts();
  if (error) throw error;
  return data;
});
```

**Current Status:** Active. Proven pattern.

---

## ADR-014: Server Components and SSR

**Status:** ✅ Accepted (Updated Q4 2025)

**Date:** Q3 2024 (Updated Q4 2025)

### Context

Should we use SSR (Server-Side Rendering) and React Server Components?

### Decision

**We use Next.js with Server Components and selective SSR/SSG.**

### Rationale

1. **Server Components Benefits:**
   - Reduced client JavaScript bundle
   - Direct database/API access
   - Better performance for data-heavy pages
   - Automatic code splitting

2. **Rendering Strategy:**
   - Public pages: SSG (Static Site Generation)
   - Dynamic pages: SSR (Server-Side Rendering)
   - Interactive features: Client Components
   - Real-time features: Client-side with Supabase

3. **SEO Benefits:**
   - Better search engine indexing
   - Social media previews work
   - Faster First Contentful Paint
   - Meta tags per route

4. **Performance:**
   - Streaming with Suspense
   - Partial hydration
   - Edge runtime support
   - Optimized for Core Web Vitals

### Consequences

**Positive:**

- ✅ Better SEO for public pages
- ✅ Smaller client bundles
- ✅ Faster initial page loads
- ✅ Direct data fetching in components

**Negative:**

- ⚠️ More complex mental model
- ⚠️ Need to understand Server vs Client
- ⚠️ Some libraries require 'use client'

### Migration from SPA

Previously a pure SPA, migrated to Next.js for:

- Better SEO for food listings
- Improved performance
- Server-side data fetching
- Simplified authentication flow

**Current Status:** Active. Migration from SPA completed Q4 2025.

---

## ADR-015: Vercel for Hosting

**Status:** ✅ Accepted

**Date:** Q3 2024

### Context

We need hosting for the production application.

**Requirements:**

- Static site hosting
- CDN distribution
- Automatic deployments
- Preview deployments for PRs
- HTTPS included
- Affordable

### Decision

**We deploy to Vercel for hosting.**

### Rationale

1. **Next.js Integration:**
   - Official support
   - Zero configuration
   - Automatic builds

2. **Developer Experience:**
   - GitHub integration
   - Automatic deployments
   - Preview URLs for PRs
   - Easy rollbacks

3. **Performance:**
   - Global CDN
   - Edge network
   - Fast response times
   - Automatic compression

4. **Cost:**
   - Free for hobby projects
   - Predictable pricing
   - Generous limits

5. **Features:**
   - Custom domains
   - Automatic HTTPS
   - Analytics (optional)
   - Environment variables

### Consequences

**Positive:**

- ✅ Automatic deployments
- ✅ Preview deployments
- ✅ Fast globally
- ✅ Free for MVP
- ✅ Excellent DX

**Negative:**

- ⚠️ Vendor-specific
- ⚠️ Costs after free tier

### Alternatives Considered

**Netlify:**

- Very similar to Vercel
- Acceptable alternative

**Cloudflare Pages:**

- Considered, good option
- Less mature at decision time

**GitHub Pages:**

- Too limited features

**Current Status:** Active. Vercel working great.

---

## Future ADRs

### Under Consideration

**ADR-016: Testing Strategy**

- Unit tests with Jest
- E2E tests with Playwright
- Component tests with Testing Library

**ADR-017: Error Monitoring**

- Sentry for error tracking
- Performance monitoring
- User session replay

**ADR-018: Analytics**

- Privacy-friendly analytics
- Plausible or Fathom
- User behavior tracking

**ADR-019: Mobile Apps**

- React Native
- Capacitor
- Progressive Web App only

---

## Appendix

### Decision Process

When making architectural decisions:

1. **Identify Need:** What problem are we solving?
2. **Research:** What solutions exist?
3. **Evaluate:** List pros/cons of each option
4. **Decide:** Choose best option for our context
5. **Document:** Create ADR
6. **Implement:** Build with decision
7. **Review:** Validate decision over time

### When to Create an ADR

Create an ADR for:

- ✅ Technology choices (frameworks, libraries)
- ✅ Architecture patterns
- ✅ Security decisions
- ✅ Data modeling approaches
- ✅ API design principles
- ✅ Deployment strategies

Don't create an ADR for:

- ❌ Coding style (use linter config)
- ❌ Naming conventions (use style guide)
- ❌ Temporary experiments
- ❌ Implementation details

### Status Definitions

- **Accepted:** Decision is active and in use
- **Superseded:** Replaced by newer decision
- **Deprecated:** Being phased out
- **Rejected:** Considered but not chosen

---

## Summary Table

| ADR | Title                     | Status      | Date              |
| --- | ------------------------- | ----------- | ----------------- |
| 001 | Next.js as Framework      | ✅ Accepted | Q3 2024 → Q4 2025 |
| 002 | React 19 with TypeScript  | ✅ Accepted | Q3 2024           |
| 003 | shadcn/ui for Components  | ✅ Accepted | Q3 2024 → Q4 2025 |
| 004 | Hybrid State Management   | ✅ Accepted | Q3 2024 → Q4 2025 |
| 005 | Supabase as Backend       | ✅ Accepted | Q3 2024           |
| 006 | Leaflet for Maps          | ✅ Accepted | Q3 2024           |
| 007 | Lingui for i18n           | ✅ Accepted | Q3 2024           |
| 008 | App Router for Routing    | ✅ Accepted | Q3 2024 → Q4 2025 |
| 009 | PostgreSQL Database       | ✅ Accepted | Q3 2024           |
| 010 | Row Level Security        | ✅ Accepted | Q3 2024           |
| 011 | Supabase Realtime         | ✅ Accepted | Q3 2024           |
| 012 | Feature-Based Structure   | ✅ Accepted | Q3 2024           |
| 013 | API Layer Abstraction     | ✅ Accepted | Q3 2024           |
| 014 | Server Components and SSR | ✅ Accepted | Q3 2024 → Q4 2025 |
| 015 | Vercel Hosting            | ✅ Accepted | Q3 2024           |

---

**Last Updated:** December 2025
**Document Owner:** FoodShare Architecture Team
**Status:** Living Document
**Next Review:** February 2026

---

## Quick Navigation

- [Product Requirements](PRD.md)
- [Development Workflows](WORKFLOWS.md)
- [Architecture Overview](ARCHITECTURE.md)
- [Technical Stack](TECH_STACK.md)
- [Feature Documentation](FEATURES.md)
- [Style Guide](STYLE_GUIDE.md)
- [Back to Index](INDEX.md)
