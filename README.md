# FoodShare

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
- **Redux Toolkit** + **React Query** for state management
- **Framer Motion** for animations
- **Radix UI** primitives with shadcn/ui components
- **Leaflet** for interactive maps

### Backend

- **Supabase** - Database, Authentication, Storage, Realtime
- **Supabase Edge Functions** (Deno) - Serverless functions
- **PostGIS** - Geospatial queries

### Infrastructure

- **Upstash** - Redis caching, Vector search, QStash queues
- **Vercel** - Hosting and deployment
- **AWS SES / Brevo / Resend** - Email services
- **Twilio** - Phone verification
- **OpenAI** - AI features

## Prerequisites

- Node.js 22+ (see `.nvmrc` for exact version)
- npm 10+
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
npm install
```

### 3. Set up environment variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your actual values. See the [Environment Variables](#environment-variables) section for details.

### 4. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Scripts

| Command                 | Description                             |
| ----------------------- | --------------------------------------- |
| `npm run dev`           | Start development server with Turbopack |
| `npm run build`         | Build for production                    |
| `npm run build:analyze` | Build with bundle analyzer              |
| `npm run start`         | Start production server                 |
| `npm run lint`          | Run ESLint                              |
| `npm run lint:fix`      | Fix ESLint errors                       |
| `npm run type-check`    | TypeScript type checking                |
| `npm run test:build`    | Run type-check, lint, and build         |
| `npm run clean`         | Clean build artifacts and cache         |

## Project Structure

```
foodshare/
├── public/                 # Static assets
│   ├── images/            # Image assets
│   ├── telegram-webapp/   # Telegram Mini App files
│   └── sw.js              # Service worker
├── src/
│   ├── api/               # API client functions
│   ├── app/               # Next.js App Router pages
│   │   ├── admin/         # Admin dashboard
│   │   ├── auth/          # Authentication pages
│   │   ├── map/           # Map view
│   │   ├── products/      # Product pages
│   │   ├── profile/       # User profile
│   │   └── settings/      # User settings
│   ├── assets/            # Static assets (SVGs, etc.)
│   ├── components/        # React components
│   │   ├── ui/            # Base UI components (shadcn)
│   │   ├── leaflet/       # Map components
│   │   ├── modals/        # Modal dialogs
│   │   └── ...            # Feature components
│   ├── constants/         # App constants
│   ├── features/          # Feature modules
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Utilities and configurations
│   ├── locales/           # Translation files (21 languages)
│   ├── store/             # Redux store and slices
│   ├── types/             # TypeScript type definitions
│   ├── utils/             # Helper functions
│   └── workers/           # Web Workers
├── supabase/
│   ├── functions/         # Supabase Edge Functions
│   └── migrations/        # Database migrations
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

| Variable              | Description             |
| --------------------- | ----------------------- |
| `KV_REST_API_URL`     | Upstash Redis URL       |
| `KV_REST_API_TOKEN`   | Upstash Redis token     |
| `BREVO_API_KEY`       | Brevo email API key     |
| `TWILIO_ACCOUNT_SID`  | Twilio account SID      |
| `AWS_ACCESS_KEY_ID`   | AWS credentials for SES |
| `NEXT_PUBLIC_APP_URL` | Public app URL          |

See `.env.local.example` for the complete list with documentation.

## Internationalization

FoodShare supports 21 languages using [next-intl](https://next-intl-docs.vercel.app/):

- English (en) - Source
- Czech (cs), German (de), Spanish (es), French (fr), Portuguese (pt), Russian (ru), Ukrainian (uk)
- Chinese (zh), Hindi (hi), Arabic (ar) - RTL
- Italian (it), Polish (pl), Dutch (nl)
- Japanese (ja), Korean (ko), Turkish (tr)

Translation files are located in `src/locales/{locale}/messages.po`.

### Adding translations

```bash
# Extract new strings
npx lingui extract

# Compile translations
npx lingui compile
```

## Supabase Edge Functions

Located in `supabase/functions/`:

| Function                     | Description                    |
| ---------------------------- | ------------------------------ |
| `telegram-bot-foodshare`     | Telegram bot webhooks          |
| `smart-email-route`          | Email routing and delivery     |
| `process-email-queue`        | Email queue processing         |
| `search-functions`           | Product search                 |
| `update-coordinates`         | Geocoding and location updates |
| `resize-tinify-upload-image` | Image processing               |
| `get-translations`           | Dynamic translations           |
| `cors-proxy-images`          | Image proxy for CORS           |

### Deploy functions

```bash
cd supabase/functions
supabase functions deploy <function-name>
```

## Deployment

### Vercel (Recommended)

1. Connect your repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy

### Docker

Build standalone output:

```bash
BUILD_STANDALONE=true npm run build
```

### Manual

```bash
npm run build
npm run start
```

## Documentation

Detailed documentation is available in the `/docs` directory:

- `docs/01-getting-started/` - Setup guides
- `docs/02-development/` - Development workflows
- `docs/03-features/` - Feature documentation
- `docs/04-deployment/` - Deployment guides
- `docs/05-reference/` - API and technical reference

## Security

- HTTPS enforced with HSTS
- CSP headers configured
- XSS protection enabled
- CSRF protection via Supabase Auth
- Row Level Security (RLS) on all tables

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is proprietary software. All rights reserved.
