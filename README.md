# FoodShare

[![CI/CD](https://github.com/Foodshareclub/foodshare-web/actions/workflows/web.yml/badge.svg)](https://github.com/Foodshareclub/foodshare-web/actions/workflows/web.yml)

A modern food sharing platform that connects people to reduce food waste by enabling users to share surplus food with their local community.

## Features

- **Product Listings** - Share and discover food items in your area
- **Interactive Map** - View food listings on a map powered by Leaflet/OpenStreetMap
- **Real-time Chat** - Message other users about food items
- **User Profiles** - Manage your profile and track your sharing activity
- **Admin Dashboard** - CRM and administrative tools for platform management
- **Multi-language Support** - 21 languages including RTL support (Arabic)
- **Dark/Light Theme** - Full theme support via next-themes
- **PWA Ready** - Progressive Web App with service worker support
- **Telegram Bot Integration** - Notifications and interactions via Telegram

## Tech Stack

### Frontend

- **Next.js 16** with App Router and Turbopack
- **React 19** with React Compiler
- **TypeScript 5**
- **Tailwind CSS 4**
- **Zustand** + **React Query** for state management
- **Framer Motion** for animations
- **Radix UI** primitives with shadcn/ui components
- **Leaflet** for interactive maps

### Backend

- **Supabase** - Database, Authentication, Storage, Realtime
- **Supabase Edge Functions** (Deno) - Serverless functions
- **PostGIS** - Geospatial queries

### Infrastructure

- **Upstash** - Redis caching, Vector search, QStash queues
- **Self-hosted VPS** - Hosting and deployment (Docker Compose + Caddy)
- **Sentry** - Error tracking and performance monitoring
- **AWS SES / Brevo / Resend** - Email services
- **Twilio** - Phone verification
- **OpenAI** - AI features

## Prerequisites

- Bun 1.2+ (Primary runtime and package manager)
- Supabase CLI (for local development)
- Git

## Getting Started

### 1. Clone the repository

```bash
git clone <repository-url>
cd foodshare
```

### 2. Install dependencies

```bash
bun install
```

### 3. Set up environment variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your actual values. See the [Environment Variables](#environment-variables) section for details.

### 4. Start the development server

```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

> [!NOTE]
> This project uses `src/proxy.ts` and `src/instrumentation.ts` for core middleware and observability. The `proxy.ts` file handles routing, security, and session management.

## Scripts

| Command                 | Description                             |
| ----------------------- | --------------------------------------- |
| `bun run dev`           | Start development server with Turbopack |
| `bun run build`         | Build for production                    |
| `bun run build:analyze` | Build with bundle analyzer              |
| `bun run start`         | Start production server                 |
| `bun run lint:fix`      | Fix ESLint errors                       |
| `bun run type-check`    | TypeScript type checking                |
| `bun run test:ci`       | Run all tests with bun:test (CI)        |
| `bun run test:build`    | Run type-check + lint + build           |
| `bun run translations:sync` | Sync translations to Supabase       |
| `bun run clean`         | Clean build artifacts and cache         |

## Project Structure

```
foodshare/
├── public/                 # Static assets
│   ├── images/            # Image assets
│   ├── telegram-webapp/   # Telegram Mini App files
│   └── sw.js              # Service worker
├── src/
│   ├── proxy.ts           # Next.js 16 Proxy (Core Routing)
│   ├── instrumentation.ts # Observability & Early Init
│   ├── api/               # API client functions
│   ├── app/               # Next.js App Router pages
│   │   ├── admin/         # Admin dashboard
│   │   ├── auth/          # Authentication pages
│   │   ├── map/           # Map view
│   │   ├── food/          # Food category
│   │   ├── thing/         # Things category (singular)
│   │   ├── volunteer/     # Volunteer category (singular)
│   │   ├── organisation/  # Organisations category (singular)
│   │   ├── profile/       # User profile
│   │   └── settings/      # User settings
│   ├── components/        # React components
│   │   ├── ui/            # Base UI components (shadcn)
│   │   ├── leaflet/       # Map components
│   │   └── ...            # Feature components
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Utilities and configurations
│   ├── store/             # Zustand stores
│   ├── types/             # TypeScript type definitions
│   └── utils/             # Helper functions
├── messages/              # Translation files (21 languages)
├── supabase/ -> ../foodshare-backend  # SYMLINK
└── docs/                  # Documentation
```

## Environment Variables

Copy `.env.local.example` to `.env.local` and configure:

### Required

| Variable                        | Description                             |
| ------------------------------- | --------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase project URL                    |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key                  |
| `SUPABASE_SERVICE_ROLE_KEY`     | Supabase service role key (server-side) |

### Optional Services

| Variable                 | Description               |
| ------------------------ | ------------------------- |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry error tracking DSN |
| `KV_REST_API_URL`        | Upstash Redis URL         |
| `KV_REST_API_TOKEN`      | Upstash Redis token       |
| `BREVO_API_KEY`          | Brevo email API key       |
| `TWILIO_ACCOUNT_SID`     | Twilio account SID        |
| `AWS_ACCESS_KEY_ID`      | AWS credentials for SES   |
| `NEXT_PUBLIC_APP_URL`    | Public app URL            |

See `.env.local.example` for the complete list with documentation.

## Internationalization

FoodShare supports 21 languages using [next-intl](https://next-intl-docs.vercel.app/):

- English (en) - Source
- Czech (cs), German (de), Spanish (es), French (fr), Portuguese (pt), Russian (ru), Ukrainian (uk)
- Chinese (zh), Hindi (hi), Arabic (ar) - RTL
- Italian (it), Polish (pl), Dutch (nl)
- Japanese (ja), Korean (ko), Turkish (tr)
- Indonesian (id), Thai (th), Swedish (sv), Vietnamese (vi)

Translation files are located in `messages/{locale}.json`.

### Adding translations

```bash
# Extract new strings
bunx lingui extract

# Compile translations
bunx lingui compile
```

## Supabase Edge Functions

All Edge Functions are maintained in the `foodshare-backend` repository. Locally, the `supabase/` directory is a symlink.

| Category | Functions |
| -------- | --------- |
| Core API | `api-v1-admin`, `api-v1-auth`, `api-v1-products`, `api-v1-chat`, etc. |
| Comms    | `api-v1-notifications`, `api-v1-email` |
| Bots     | `telegram-bot-foodshare`, `whatsapp-bot-foodshare` |

**Total: 28 functions.** See `foodshare-backend/README.md` for the full list and deployment guides.

## Deployment

The application is fully self-hosted on a VPS using Docker Compose.

### VPS Deployment (CI/CD)

The application is deployed automatically via GitHub Actions. The pipeline:
1.  **Builds** the Docker image locally on the runner.
2.  **Pushes** the image to **GitHub Container Registry (GHCR)**.
3.  **Deploys** by pulling the new image on the VPS, ensuring no heavy build processing occurs on production.

### Manual Deploys

```bash
# Deploy (latest tags from GHCR)
docker compose pull && docker compose up -d
```

### Docker Build

The Dockerfile uses a multi-stage build to create a small production image. Build-time environment variables (like `NEXT_PUBLIC_SUPABASE_URL`) must be passed as `--build-arg` if they are not in the `.env` file at build time.

```bash
docker compose build --build-arg NEXT_PUBLIC_SUPABASE_URL=https://backend.foodshare.club
```

### Local Manual Build

```bash
bun run build
bun run start
```

## Documentation

Detailed documentation is available in the `/docs` directory:

- `docs/01-getting-started/` - Setup guides
- `docs/02-development/` - Development workflows
- `docs/03-features/` - Feature documentation
- `docs/04-deployment/` - Deployment guides
- `docs/05-reference/` - API and technical reference
- `docs/SENTRY_INTEGRATION.md` - Error tracking and monitoring setup

## Security

- HTTPS enforced with HSTS
- CSP headers configured
- XSS protection enabled
- CSRF protection via Supabase Auth
- Row Level Security (RLS) on all tables

## Secret Management

We use a tiered approach to secret management:

1. **GitHub Actions / Environment Variables**: Used for Next.js build-time and runtime web secrets (e.g., `NEXT_PUBLIC_SUPABASE_URL`, `SENTRY_DSN`).
2. **Supabase Vault**: Primary encrypted storage for sensitive backend credentials. Accessed via `src/lib/supabase/admin.ts` using the service role key.
3. **.env.production**: Local fallback for non-sensitive configuration on the VPS.

> [!IMPORTANT]
> Never store plain-text secrets in the repository. Use Supabase Vault for any sensitive API keys or credentials.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is proprietary software. All rights reserved.

## VPS Access

To access the self-hosted web VPS:

```bash
autossh -M 0 -o ServerAliveInterval=6000 -o ServerAliveCountMax=6000 -o ConnectTimeout=10 -o ConnectionAttempts=6000 -i ~/.ssh/foodshare_id_ed25519 organic@web.foodshare.club
```
