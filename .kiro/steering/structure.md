---
inclusion: always
---

# Project Structure

## Directory Layout

```text
src/
├── app/                    # Next.js App Router
│   ├── (routes)/           # Route groups
│   ├── actions/            # Server Actions
│   ├── api/                # Route Handlers
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Home page
│   ├── loading.tsx         # Loading UI
│   ├── error.tsx           # Error boundary
│   └── not-found.tsx       # 404 page
├── components/
│   ├── ui/                 # shadcn/ui primitives (don't modify)
│   └── [feature]/          # Feature components
├── lib/
│   ├── supabase/           # Supabase clients (server/client)
│   ├── data/               # Data fetching functions
│   └── utils.ts            # cn() and helpers
├── hooks/                  # Client-side hooks (useMediaQuery, etc.)
├── store/                  # Zustand stores - UI state only (modals, preferences)
├── types/                  # TypeScript definitions
├── i18n/                   # next-intl config
├── locales/                # Translation JSON files
├── utils/                  # Helper functions
├── assets/                 # Static images
└── workers/                # Web Workers

tools/                      # Rust-based git hooks (lefthook-rs)
├── src/
│   ├── main.rs             # CLI entry point
│   ├── utils.rs            # Shared utilities
│   └── checks/             # Individual check modules
│       ├── security.rs     # Secrets/credentials detection
│       ├── nextjs_security.rs  # OWASP security scanner
│       ├── complexity.rs   # Code complexity analysis
│       ├── accessibility.rs    # A11y checks for JSX/TSX
│       └── ...             # Other checks
├── Cargo.toml              # Rust dependencies
└── target/release/         # Compiled binary (lefthook-rs)
```

## File Conventions

| File | Purpose |
|------|---------|
| `page.tsx` | Route UI (Server Component) |
| `layout.tsx` | Shared layout |
| `loading.tsx` | Suspense fallback |
| `error.tsx` | Error boundary (Client) |
| `not-found.tsx` | 404 page |
| `route.ts` | API Route Handler |

## Naming

- Components: `PascalCase.tsx`
- Hooks: `use*.ts`
- Utils: `camelCase.ts`
- Types: `*.types.ts`

## Imports

Always use `@/` alias:

```typescript
import { Button } from '@/components/ui/button';
import { getProducts } from '@/lib/data/products';
import { cn } from '@/lib/utils';
```

## Data Flow

```text
READ:  Server Component → lib/data function → Supabase → Render
WRITE: form action → Server Action → Supabase → revalidate → Re-render
```
