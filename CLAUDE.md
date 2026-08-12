# Foodshare Web

Next.js 16 App Router + React 19 + TypeScript 5 + Tailwind CSS 4 + Self-hosted Supabase + shadcn/ui

**Self-hosted Supabase:**

- Studio (dashboard): https://studio.foodshare.club
- API: https://api.foodshare.club

## Deployment

All deployments are **fully automated** via GitHub Actions in full scale. **Never SSH to run `docker build` or `docker compose` manually.**

1. **GitHub Secrets:** All build arguments (e.g., OAuth keys, `SITE_DOMAIN`) and environment variables are managed securely via GitHub Secrets. Manual builds omit these critical variables.
2. **Push to `main`**: Triggers the CI/CD pipeline which strictly injects these full scale secrets and automatically handles the `.env.production` file on the VPS.
3. **Monitor Build**: Use `gh run list --limit 3` to track progress.
4. **Automatic Deployment**: Docker images are rebuilt and deployed to the VPS automatically upon successful build.

## Commands

| Command                     | Purpose                           |
| --------------------------- | --------------------------------- |
| `bun run dev`               | Dev server (Turbopack, port 3000) |
| `bun run build`             | Production build                  |
| `bun run type-check`        | TypeScript checking (`bunx tsc`)  |
| `bun run lint:fix`          | ESLint with auto-fix              |
| `bun run test:ci`           | Run all tests with bun:test       |
| `bun run test:build`        | Type-check + lint + build         |
| `bun run translations:sync` | Sync translations to Supabase     |

## Critical Rules

1. **src/proxy.ts, NOT middleware.ts** -- Next.js 16 renamed middleware. Export `async function proxy()` from `src/proxy.ts`. Runtime is Node.js (not Edge), so direct imports work.
2. **Never re-export types from server action files** -- `'use server'` files cannot re-export types. Import `AuthUser` from `@/lib/data/auth`, never from `@/app/actions/auth`.
3. **Admin check requires service role client** -- `user_roles` table has RLS blocking anon reads. Always use `checkUserIsAdmin()` from `@/lib/data/admin-check.ts` (uses admin client internally). If modifying admin logic, update BOTH `admin-check.ts` and the inlined version in `proxy.ts`.
4. **No Redux** -- State: Server Components (fetch) + Server Actions (mutate) + React Query (client cache) + Zustand (UI only).
5. **Server Components by default** -- Only add `'use client'` when you need hooks, event handlers, browser APIs, or third-party client libs.
6. **Never use Chakra UI** -- Legacy, fully removed. All UI is shadcn/ui + Radix + Tailwind.
7. **Map components need dynamic import** -- Leaflet requires `'use client'` and `dynamic(() => import(...), { ssr: false })`.
8. **Supabase Vault is Primary** -- Sensitive secrets (API keys, etc.) must be stored in Supabase Vault and accessed via the admin client (`src/lib/supabase/admin.ts`).
9. **Use Structured Logger** -- Avoid `console.log`. Use the structured logger for all production-ready code to ensure observability.
10. **Singular Top-Level Routes** -- All category pages must use singular top-level routes (e.g., `/thing`, `/volunteer`, `/organisation`). Legacy plural query parameters (e.g., `?type=things`) are handled by redirects in `/food/page.tsx`.
11. **CI/CD Concurrency (Latest-Wins)** -- The pipeline is configured to cancel previous runs on the same branch. Only the latest commit is built and deployed.

## Architecture

| Layer          | Location                                 | Role                                                                                      |
| -------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------- |
| Presentation   | `src/app/**/page.tsx`, `src/components/` | Server + Client Components                                                                |
| Actions        | `src/app/actions/*.ts`                   | Mutations (`'use server'`), call `invalidateTag()`                                        |
| Data           | `src/lib/data/`                          | Cached fetching (`unstable_cache`)                                                        |
| Infrastructure | `src/lib/supabase/`                      | `server.ts` (Server Components/Actions), `client.ts` (browser), `admin.ts` (service role) |
| Shared Backend | `foodshare-backend/`                     | Edge Functions + PostgreSQL + RLS                                                         |

**Data flow**: READ: Server Component -> `lib/data/` -> Supabase -> Render. WRITE: Form -> Server Action -> Supabase -> `invalidateTag()` -> Re-render.

## State Management

| Pattern           | Use Case                                | Location                |
| ----------------- | --------------------------------------- | ----------------------- |
| Server Components | Data fetching, initial page load        | `src/app/**/page.tsx`   |
| Server Actions    | Mutations, form submissions             | `src/app/actions/*.ts`  |
| React Query       | Client-side caching, optimistic updates | `src/hooks/queries/`    |
| Zustand           | Lightweight client state (UI, chat)     | `src/store/zustand/`    |
| React Context     | Auth session, theme                     | `src/app/providers.tsx` |

## Project Structure

```
src/
  app/                  # App Router pages + layouts
    actions/            # Server Actions (products, auth, chat)
    admin/              # Admin routes (defense-in-depth layout protection)
    auth/, map/, food/, thing/, volunteer/, organisation/, profile/, settings/
  components/           # React components
    ui/                 # shadcn/ui primitives
    leaflet/            # Map components (client-only)
  hooks/queries/        # React Query hooks
  lib/
    data/               # Cached data functions (auth.ts defines AuthUser)
    supabase/           # server.ts, client.ts, admin.ts, middleware.ts
    utils.ts            # cn(), formatDate()
  store/zustand/        # UI stores
  types/                # TypeScript definitions

proxy.ts                # Next.js 16 Proxy (NOT middleware.ts)
messages/               # next-intl translations (21 languages)
supabase/ -> ../foodshare-backend  # SYMLINK
```

## Key Patterns

**i18n**: `next-intl` with 21 languages. Translations in `/messages/{locale}.json`. Locales: en, cs, de, es, fr, pt, ru, uk, zh, hi, ar (RTL), it, pl, nl, ja, ko, tr, vi, id, th, sv.

**OG Images**: `opengraph-image.tsx` files use edge runtime, fetch live stats via `getOGStats()`, apply seasonal theming.

**Admin check flow**: `checkUserIsAdmin()` (admin-check.ts) -> `createAdminClient()` (service role) -> bypasses RLS on `user_roles`. Used by: proxy.ts, auth.ts (getAuthSession), admin/layout.tsx.

## Backend Integration

`supabase/` is a **symlink** to `../foodshare-backend`. Changes to Edge Functions, migrations, or RLS policies affect ALL platforms (Web, iOS, Android).

| Task                                                | Where                |
| --------------------------------------------------- | -------------------- |
| Web UI, pages, components                           | This repo            |
| Server Actions, React Query hooks                   | This repo            |
| Edge Functions, migrations, RLS, push notifications | `foodshare-backend/` |

See `foodshare-backend/CLAUDE.md` for Edge Function patterns, security docs, and database schema.

## Common Pitfalls

- **Module not found** -- Check imports use `@/` alias (tsconfig paths)
- **Type errors with Supabase** -- Regenerate types: `supabase gen types typescript`
- **Hydration mismatch** -- Client-only code in Server Components
- **AuthUser import error** -- Import from `@/lib/data/auth`, NOT `@/app/actions/auth`
- **Edge Function not found** -- `supabase/` is a symlink; work in `foodshare-backend/` directly
- **Migration conflicts** -- Backend changes affect all platforms; coordinate across iOS/Android

## Architecture Decision Records

- **Parallel routes for admin**: Deferred. Current admin layout with separate pages works well. Parallel routes would add complexity without clear UX benefit.
- **Intercepting routes for product detail modal**: Planned for future sprint. Would allow opening product details in a modal from listing pages while preserving URL state.
- **Route groups for settings/auth**: Evaluated, low value. Current flat structure under `/settings` and `/auth` is clear enough without grouping.
