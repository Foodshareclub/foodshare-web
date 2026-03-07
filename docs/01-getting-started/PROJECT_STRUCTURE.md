# FoodShare Project Structure

> Last Updated: March 2026

## 📁 Root Directory

```
foodshare-web/
├── .github/              # GitHub Actions (CI/CD with GHCR & Concurrency)
├── docs/                # 📚 Comprehensive project documentation
├── public/              # Static assets (images, PWA manifest, sw.js)
├── scripts/             # Utility scripts (translation sync, etc.)
├── src/                 # 💻 Application source code (Next.js 16)
├── messages/            # 🌍 i18n translation files (21 languages)
├── supabase/ -> ../foodshare-backend  # SYMLINK to shared backend
├── .env.example         # Environment variables template
├── .dockerignore        # Docker build ignore rules
├── .gitignore           # Git ignore rules
├── .prettierrc          # Prettier configuration
├── bun.lock             # Bun lockfile
├── bunfig.toml          # Bun configuration
├── components.json      # shadcn/ui configuration
├── docker-compose.yml   # Production deployment setup
├── Dockerfile           # Standardized multi-stage build
├── eslint.config.mjs    # ESLint configuration
├── next.config.ts       # Next.js configuration
├── package.json         # Dependencies & Bun scripts
├── playwright.config.ts # E2E testing configuration
├── postcss.config.mjs   # PostCSS configuration
├── README.md            # Main entry point documentation
├── tsconfig.json        # TypeScript configuration
└── proxy.ts             # Next.js 16 Proxy (Core Routing Middleware)
```

## 📚 Documentation (`/docs`)

Documentation is organized for developer onboarding and operations:

- **01-getting-started/** - Installation and structure (this file)
- **02-development/** - Architecture, Style Guide, Testing, i18n
- **03-features/** - Admin, Auth, Map, Comms, Posts
- **04-deployment/** - VPS, Docker, Secret Management
- **05-reference/** - API, Utilities, Tech Stack
- **SENTRY_INTEGRATION.md** - Monitoring setup

## 💻 Source Code (`/src`)

The application follows the Next.js 16 App Router pattern:

```
src/
├── app/                 # 🚀 App Router (Server-First)
│   ├── food/           # Legacy /food route (handles redirects)
│   ├── thing/          # Singular category route
│   ├── volunteer/      # Singular category route
│   ├── organisation/   # Singular category route
│   ├── borrow/         # Singular category route
│   ├── auth/           # Authentication flows
│   ├── admin/          # Admin CRM (protected layout)
│   ├── profile/        # User profiles
│   ├── settings/       # User settings
│   ├── actions/        # Server Actions (Mutations)
│   ├── layout.tsx      # Global layout & Providers
│   └── page.tsx        # Home page (Client + Server)
├── api/                 # API client definitions
├── components/          # 🧩 UI Components
│   ├── ui/             # shadcn/ui primitives
│   ├── header/         # Global navigation
│   ├── leaflet/        # Map components (dynamic)
│   └── product/        # Item card & detail components
├── hooks/               # Custom React hooks (React Query/Zustand)
├── lib/                 # 🛠️ Infrastructure & Data
│   ├── data/           # Server-side data fetching (unstable_cache)
│   ├── supabase/       # Client, Server, and Admin instances
│   └── testing/        # Enterprise test utilities
├── store/               # Zustand stores (UI state)
├── types/               # TypeScript definitions
└── utils/               # Shared helper functions
```

## 🗄️ Backend Integration (`/supabase`)

The `supabase/` directory is a symlink to `foodshare-backend`. The web repo interacts with:

- **Migrations**: Database schema (RLS, PostGIS, Tables)
- **Edge Functions**: REST API endpoints (Deno)
- **Seed Data**: Deployment & testing initial state

## 🛠️ Key Scripts (`package.json`)

| Command                | Description                                       |
| ---------------------- | ------------------------------------------------- |
| `bun run dev`          | Local development with Turbopack                  |
| `bun run build`        | Production build with bundle analysis             |
| `bun run test:ci`      | Run full test suite with bun:test                 |
| `bun run lint:fix`     | Linting with automatic fixing                     |
| `bun run type-check`   | Global TypeScript checking                        |
| `bun run translations:sync` | Synchronize local JSON files to Supabase      |
| `bun run build:check`  | Full project audit (build + size check)           |

## 🎨 Design System

We use **shadcn/ui** built on top of **Tailwind CSS 4** and **Radix UI**. The design system is standardized in `src/components/ui`.

## 🌍 Localization (i18n)

Handled via `next-intl`.
- **Source**: `messages/en.json`
- **Supported**: 21 languages (including Arabic RTL)
- **Sync**: `bun run translations:sync` moves local translations to the database for Edge Functions.

## 🚀 Key Technologies

- **Next.js 16** (App Router, Server Components)
- **React 19** (React Compiler enabled)
- **Bun** (Runtime, Package Manager, Test Runner)
- **Tailwind CSS 4** (Modern utility-first styling)
- **Supabase** (Auth, PostGIS DB, Edge Functions)
- **Zustand** (Client State)
- **React Query** (Server Sync/Caching)

---

**Architecture Note**: This project prioritizes **singular top-level routes**. Avoid adding query-parameter based navigation for primary categories. See `src/app/food/page.tsx` for how legacy `/food?type=...` URLs are handled.
r
bun run type-check       # TypeScript type checking

# Testing
bun test                 # Run tests
```

## 🔗 Quick Links

- **Main README**: `/README.md`
- **Documentation**: `/docs/README.md`
- **Getting Started**: `/docs/guides/START_HERE.md`
- **Quick Start**: `/docs/guides/QUICK_START_GUIDE.md`
- **Architecture**: `/docs/architecture/ARCHITECTURE.md`
- **Steering Rules**: `/.kiro/steering/`

## 📞 Support

For questions or issues:

1. Check documentation in `/docs`
2. Review steering rules in `/.kiro/steering`
3. Check issue tracker on GitHub

---

**This IS a Next.js 16 project** - It uses the App Router, Server Components, and Server Actions for a hybrid SSR/client experience.
