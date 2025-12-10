---
inclusion: always
---

# Technology Stack

## Core Framework

- **Next.js 16** - App Router, React Compiler, Turbopack
- **React 19** - Server Components, Server Actions, `use` hook
- **TypeScript 5** - Strict mode enabled

## UI Layer

- **Tailwind CSS 4** - Utility-first styling
- **shadcn/ui (new-york style)** - Accessible component primitives
- **Radix UI** - Headless UI primitives (via shadcn)
- **Framer Motion 12** - Animations
- **react-icons** - Icon library

## Backend

- **Supabase** - PostgreSQL, Auth, Realtime, Storage
- **Server Actions** - Form mutations with `invalidateTag`/`revalidatePath`

## State Management

- **Server Components** - Primary data fetching (no client state needed)
- **Zustand** - UI state only (modals, preferences, filters)
- **Supabase Realtime** - For live updates (chat, notifications)

## Internationalization

- **next-intl** - Server and client translations

## Maps

- **Leaflet + React Leaflet** - Interactive maps (client-only, dynamic import)

## Developer Tooling

- **lefthook-rs** - Rust-based git hooks (fast, OWASP security coverage)
- **Lefthook** - Git hooks orchestration
- **ESLint + Prettier** - Code quality with auto-fix

## Commands

```bash
npm run dev          # Turbopack dev server (port 3000)
npm run build        # Production build
npm run lint         # ESLint
npm run type-check   # TypeScript check
npm test             # Jest tests

# Rust tools (build once)
cd tools && cargo build --release
```

## Key Points

- **React Compiler** - Auto-memoization, skip manual `React.memo`/`useCallback`
- **Server-first** - Fetch in Server Components, mutate with Server Actions
- **Path alias** - Use `@/` for imports from `src/`
- **Env vars** - `NEXT_PUBLIC_` prefix for client-side
- **Git hooks** - Auto-format, lint, security checks on commit
