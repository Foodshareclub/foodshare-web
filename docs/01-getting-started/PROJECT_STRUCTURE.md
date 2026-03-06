# FoodShare Project Structure

> Last Updated: November 30, 2024

## 📁 Root Directory

```
foodshare/
├── .github/              # GitHub Actions & workflows
├── .kiro/               # Kiro AI steering rules & settings
├── docs/                # 📚 All project documentation (164 files)
├── public/              # Static assets (images, icons, manifest)
├── scripts/             # Build, deploy, and utility scripts
├── src/                 # 💻 Application source code
├── supabase/            # Supabase backend configuration
├── .env.local.example   # Environment variables template
├── .gitignore           # Git ignore rules
├── .prettierrc          # Code formatting config
├── components.json      # Chakra UI component config
├── eslint.config.js     # ESLint configuration
├── index.html           # Entry HTML file
├── lefthook.yml         # Git hooks configuration
├── lingui.config.js     # i18n configuration
├── package.json         # Dependencies & scripts
├── postcss.config.js    # PostCSS configuration
├── README.md            # Main project README
├── tsconfig.json        # TypeScript configuration
├── vite.config.ts       # Vite build configuration
└── vitest.config.ts     # Vitest testing configuration
```

## 📚 Documentation (`/docs`)

Comprehensive documentation organized into 19 categories:

- **guides/** - Getting started & quick references (4 files)
- **architecture/** - System design & diagrams (2 files)
- **localization/** - i18n documentation (15 files)
- **authentication/** - Auth system docs (6 files)
- **features/** - Feature documentation (25 files)
- **implementation/** - Implementation guides (10 files)
- **optimization/** - Performance docs (17 files)
- **email-setup/** - Email system (14 files)
- **deployment/** - Deployment guides
- **security/** - Security documentation (5 files)
- **supabase/** - Backend documentation
- **migrations/** - Database migrations (5 files)
- **migration-reports/** - Migration reports (13 files)
- **qa/** - Quality assurance (5 files)
- **fixes/** - Bug fixes (17 files)
- **summaries/** - Project summaries (15 files)
- **tools/** - Development tools (2 files)
- **archive/** - Historical documents (8 files)
- **context-archive/** - Archived context files

**Start here**: `docs/README.md` or `docs/INDEX.md`

## 💻 Source Code (`/src`)

```
src/
├── api/                 # API layer (Supabase queries)
│   ├── chatAPI.ts
│   ├── productAPI.ts
│   ├── profileAPI.ts
│   └── ...
├── assets/              # Images, icons, media
├── components/          # React components
│   ├── Glass/          # Glassmorphism components
│   ├── header/         # Header components
│   ├── leaflet/        # Map components
│   ├── product/        # Product components
│   └── ui/             # Chakra UI components
├── hook/                # Custom React hooks
│   ├── hooks.ts        # Typed Redux hooks
│   ├── useDebounce.ts
│   └── ...
├── lib/                 # Libraries & utilities
│   └── supabase/
│       └── client.ts   # Supabase client
├── locales/             # i18n translations
│   ├── cs/             # Czech
│   ├── en/             # English
│   ├── fr/             # French
│   └── ru/             # Russian
├── pages/               # Page components
│   ├── HomePage.tsx
│   ├── ProductPage.tsx
│   └── ...
├── store/               # Redux state management
│   ├── slices/         # Redux slices
│   │   ├── chatReducer.ts
│   │   ├── productReducer.ts
│   │   ├── userReducer.ts
│   │   └── *Selectors.ts
│   └── redux-store.ts  # Store configuration
├── theme/               # Chakra UI theme
├── types/               # TypeScript types
├── utils/               # Utility functions
│   ├── constants.ts
│   ├── getDistance.ts
│   └── ...
├── App.tsx              # Main App component
├── index.tsx            # Entry point
└── routes.tsx           # Route definitions
```

## 🗄️ Backend (`/supabase`)

```
supabase/
├── functions/           # Edge Functions
│   ├── localization/   # Translation edge function
│   └── ...
├── migrations/          # Database migrations
└── config.toml          # Supabase configuration
```

## 🛠️ Scripts (`/scripts`)

```
scripts/
├── archive-firebase/    # Firebase migration scripts
├── build/              # Build scripts
├── database/           # Database utilities
├── deploy/             # Deployment scripts
├── git-hooks/          # Git hook scripts
├── lefthook/           # Lefthook configurations
├── monitoring/         # Monitoring scripts
├── setup-env.sh         # Environment variables setup
├── sync-translations-to-db.ts
└── test-localization-edge-function.ts
```

## 🎨 Public Assets (`/public`)

```
public/
├── apple-touch-icon.png
├── favicon.ico
├── favicon-16x16.png
├── favicon-32x32.png
├── logo192.png
├── logo512.png
├── logo1024.png
├── manifest.json        # PWA manifest
├── robots.txt
├── straw.svg
├── sw.js               # Service worker
└── sw-translations.js  # Translation service worker
```

## 🔧 Configuration Files

### Build & Development

- **next.config.ts** - Next.js configuration (Turbopack, path aliases)
- **vitest.config.ts** - Testing configuration
- **tsconfig.json** - TypeScript compiler settings
- **postcss.config.js** - PostCSS configuration

### Code Quality

- **eslint.config.js** - ESLint rules (strict TypeScript)
- **.prettierrc** - Code formatting (2 spaces, double quotes)
- **lefthook.yml** - Git hooks (pre-commit, pre-push)

### Internationalization

- **lingui.config.js** - i18n configuration (4 languages)

### Deployment

- **.env.local.example** - Environment variables template

### UI Framework

- **components.json** - Chakra UI component configuration

## 🌍 Supported Languages

- **English (en)** - Default
- **Czech (cs)** - Čeština
- **French (fr)** - Français
- **Russian (ru)** - Русский

Translation files: `src/locales/{locale}/messages.po`

## 🚀 Key Technologies

- **Next.js 16.0.0** - Framework
- **React 19.2.0** - UI library
- **TypeScript 5.9.3** - Type safety
- **Tailwind CSS 4.0.0** - Styling
- **shadcn/ui 2.0.0** - Component library
- **Zustand 5.0.1** - State management
- **Supabase 2.81.1** - Backend (PostgreSQL, Auth, Realtime, Storage)
- **next-intl 3.25.0** - Internationalization
- **Leaflet 1.9.4** - Interactive maps
- **Framer Motion 12.0.0** - Animations

## 📦 Build Output

- **Development**: `bun run dev` → http://localhost:3000
- **Production**: `bun run build` → `build/` directory
- **Preview**: `bun run preview` → Preview production build

## 🔐 Environment Variables

Required variables (see `.env.local.example`):

```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_MAPBOX_TOKEN=your_mapbox_token
```

**Note**: All client-side variables must use `VITE_` prefix.

## 📊 Project Statistics

- **Total Files**: ~1,000+ files
- **Documentation**: 164 markdown files
- **Source Code**: TypeScript/TSX
- **Languages**: 4 supported locales
- **Components**: 50+ React components
- **Build Size**: ~30MB (production)

## 🗂️ Ignored Directories

The following are not tracked in git:

- `node_modules/` - Dependencies
- `build/` - Production build
- `.next/` - Next.js cache (legacy)
- `.env*` - Environment files
- `.history/` - Editor history
- `.snapshots/` - Test snapshots
- `white-screen-test/` - Test directory

## 📝 Common Commands

```bash
# Development
bun run dev              # Start dev server (port 3000)
bun run build            # Production build
bun run preview          # Preview production build

# Internationalization
bun run extract          # Extract translatable strings
bun run compile          # Compile translations (required before dev)

# Code Quality
bun run lint             # Run ESLint
bun run format           # Format with Prettier
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
