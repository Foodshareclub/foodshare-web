# Foodshare Web

Next.js 16 App Router + React 19 + TypeScript 7 + Tailwind CSS 4 + Self-hosted Supabase + shadcn/ui

Bun is the only runtime: package manager, script runner, TypeScript executor,
type checker, test runner and Next.js runtime. Node.js is not part of this
project's toolchain — `bun scripts/check-no-node.ts` fails the build if it
creeps back in, and it scans the CI workflows as well as the source tree.

**The type surface is Bun's, not Node's.** `tsconfig.json` sets
`"types": ["bun"]`. The Node-compat globals this code uses (`process`,
`Buffer`) are declared by `bun-types` itself, so they are in scope — but
listing `"node"` would let a Node-only global type-check by accident, and a
project that runs on Bun should not be able to reach for Node's API without
someone noticing. `@types/node` is not a direct dependency: `bun-types`
brings it in, and the guard fails the build if a manifest declares it.

**Environment variables come from Bun.** `bun` reads `.env`, `.env.{NODE_ENV}`
and `.env.local` before the script runs, with `.env.local` taking precedence
and an already-set shell variable beating both. There is no `dotenv` package
in this tree, and a script that needs an environment variable just reads
`process.env`.

**Biome and Oxlint are the linters and the formatter.** ESLint and Prettier
are not part of the toolchain and their configuration files are gone. Biome
is a locked devDependency, so the version that formats the code is the
version the repository pinned — and `bun run biome` runs it on Bun, where
`bunx @biomejs/biome` would not: Biome's npm entry point is a
`#!/usr/bin/env node` launcher that spawns the real binary, and `bunx`
honours that shebang.

**Type checking is `tsrs`, not `tsc`.** `tsrs` is the Rust port of the
TypeScript 7 compiler, from the Oxc project, incubated with Cloudflare
and VoidZero. `bun run type-check` runs it, and it runs in CI on every
push. There is no second opinion here: a bug in the checker would be a
bug in the gate, and the gate is what stands between a change and
production.

The speed is not the reason on this tree, and a figure from elsewhere is
not this tree's figure. Measured here, over the 1,222 TypeScript files
in `src/`, `tsrs` takes about 0.3 seconds and TypeScript 7.1 beta takes
about 0.4 — close to each other, because TypeScript 7.1 already carries
optimisations that were upstreamed from `tsrs`. Cloudflare's comparison,
at the same worker count, has `tsrs` up to 8x faster than TypeScript 7.0
and using about 70% less memory. Those are the numbers worth reading: a
figure taken with a different configuration, or against TypeScript 5, is
not a comparison.

`tsrs` is a faithful port rather than a fork, so the TypeScript team
stays in control of the language. It differs from upstream in small ways
today — the order diagnostics are printed in is one — and upstream is
reducing those differences towards a stable release.

The `typescript` package is still a dependency, and it is not a checker
here: Next.js refuses to build a project that has a `tsconfig.json` without
it, and it will try to install it with npm, which this toolchain does not
have. It is there so the build can run; `tsrs` is what checks.

TypeScript 7 has no JavaScript compiler API, so the guard scripts that read
the *shape* of the source — `scripts/lib/ts-ast.ts` and the four that use it
— get their AST from `tsrs/unstable/ast` instead of `typescript`. The
synchronous channel of `tsrs` reads the compiler's stdout through
`stdout._handle.fd`, a Node internal Bun does not implement, so the
asynchronous API is the one that works here.

**Playwright runs on Bun too.** `bunx --bun playwright test` works because
`patches/playwright@1.62.1.patch` stops Playwright from overwriting Bun's
native `require.extensions[".ts"]` handler — without the patch, every spec
file containing a TypeScript annotation fails to parse. The patch is applied
by `bun install` through `patchedDependencies`; never delete `patches/`.

**Self-hosted Supabase:**

- Studio (dashboard): https://studio.foodshare.club
- API: https://api.foodshare.club

## Deployment

All deployments are **fully automated** via GitHub Actions in full scale. **Never SSH to run `podman build` or the deployment script manually.**

1. **GitHub Secrets:** All build arguments (e.g., OAuth keys, `SITE_DOMAIN`) and environment variables are managed securely via GitHub Secrets. Manual builds omit these critical variables.
2. **Push to `main`**: Triggers the CI/CD pipeline which strictly injects these full scale secrets and automatically handles the `.env.production` file on the VPS.
3. **Monitor Build**: Use `gh run list --limit 3` to track progress.
4. **Automatic Deployment**: Container images are rebuilt and deployed to the VPS automatically upon successful build.

## Commands

| Command                     | Purpose                                                         |
| --------------------------- | --------------------------------------------------------------- |
| `bun run dev`               | Dev server (Turbopack, port 3000)                               |
| `bun run build`             | Production build                                                |
| `bun run type-check`        | TypeScript checking (`tsrs`, the Rust port of `tsc`)            |
| `bun run check:no-node`     | Fail if Node.js creeps back into the toolchain                 |
| `bun run check:no-docker`   | Fail if the Docker product creeps back into the toolchain      |
| `bun run lint:fix`          | oxlint (primary) + biome format; runs both                      |
| `bun run test:ci`           | Run all tests with bun:test                                     |
| `bun run e2e`               | Playwright end-to-end tests (`bunx --bun playwright test`)      |
| `bun run test:build`        | Type-check + lint + build                                       |
| `bun run translations:sync` | Sync translations to Supabase                                   |

## Critical Rules

1. **src/proxy.ts, NOT middleware.ts** -- Next.js 16 renamed middleware. Export `async function proxy()` from `src/proxy.ts`. Runtime is the Node.js-compatible server runtime (Bun, not Edge), so direct imports work.
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

| Pattern           | Use Case                                                                                                                                  | Location                |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| Server Components | Data fetching, initial page load                                                                                                          | `src/app/**/page.tsx`   |
| Server Actions    | Mutations, form submissions                                                                                                               | `src/app/actions/*.ts`  |
| React Query       | Client-side caching, optimistic updates (deprecated — legacy admin/realtime only; new data fetching = Server Components + Server Actions) | `src/hooks/queries/`    |
| Zustand           | Lightweight client state (UI, chat)                                                                                                       | `src/store/zustand/`    |
| React Context     | Auth session, theme                                                                                                                       | `src/app/providers.tsx` |

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
supabase/               # Vendored copy — canonical source lives in foodshare-backend/supabase; re-sync after backend schema/function changes
```

## Key Patterns

**i18n**: `next-intl` with 21 languages. Translations in `/messages/{locale}.json`. Locales: en, cs, de, es, fr, pt, ru, uk, zh, hi, ar (RTL), it, pl, nl, ja, ko, tr, vi, id, th, sv.

**Admin check flow**: `checkUserIsAdmin()` (admin-check.ts) -> `createAdminClient()` (service role) -> bypasses RLS on `user_roles`. Used by: proxy.ts, auth.ts (getAuthSession), admin/layout.tsx.

## Backend Integration

`supabase/` is a **vendored copy** — canonical source lives in `foodshare-backend/supabase`; re-sync after backend schema/function changes. Changes to Edge Functions, migrations, or RLS policies affect ALL platforms (Web, iOS, Android).

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
- **Edge Function not found** -- `supabase/` is a stale vendored copy; work in `foodshare-backend/` directly
- **Migration conflicts** -- Backend changes affect all platforms; coordinate across iOS/Android

## Architecture Decision Records

- **Parallel routes for admin**: Deferred. Current admin layout with separate pages works well. Parallel routes would add complexity without clear UX benefit.
- **Intercepting routes for product detail modal**: Planned for future sprint. Would allow opening product details in a modal from listing pages while preserving URL state.
- **Route groups for settings/auth**: Evaluated, low value. Current flat structure under `/settings` and `/auth` is clear enough without grouping.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
