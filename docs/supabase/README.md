# FoodShare Supabase Documentation

## Project Overview

| Property | Value |
|----------|-------|
| **Project Name** | Foodshare |
| **Project ID** | `***REMOVED***` |
| **Region** | eu-central-1 (Frankfurt) |
| **Status** | Active |
| **Database Version** | PostgreSQL 15.8 |

## API Endpoints

- **API URL**: `https://api.foodshare.club`
- **Database Host**: `db.api.foodshare.club`

## Documentation Index

| Document | Description |
|----------|-------------|
| [SCHEMA.md](./SCHEMA.md) | Database tables and structure |
| [EXTENSIONS.md](./EXTENSIONS.md) | PostgreSQL extensions |
| [MIGRATIONS.md](./MIGRATIONS.md) | Migration history |
| [EDGE_FUNCTIONS.md](./EDGE_FUNCTIONS.md) | Edge Functions |

## Quick Stats

| Metric | Count |
|--------|-------|
| Public Tables | 15+ |
| Migrations | 116 |
| Edge Functions | 17 |
| Active Extensions | 80+ |

## Key Tables

| Table | Rows | Purpose |
|-------|------|---------|
| `profiles` | 4,328 | User profiles |
| `posts` | 635 | Food/item listings |
| `rooms` | Chat rooms |
| `messages` | Chat messages |
| `reviews` | User reviews |
| `challenges` | Gamification challenges |
| `forum` | Community forum posts |

## Environment Variables

Required environment variables for connecting:

```env
NEXT_PUBLIC_SUPABASE_URL=https://api.foodshare.club
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

## Supabase Clients

The codebase provides multiple Supabase clients for different use cases:

| Client | Location | Use Case |
|--------|----------|----------|
| `createClient()` | `@/lib/supabase/server` | Server Components, Server Actions, Route Handlers (with cookies) |
| `createCachedClient()` | `@/lib/supabase/server` | Inside `unstable_cache()` where cookies cannot be called |
| `createClient()` | `@/lib/supabase/client` | Client-side realtime subscriptions only |
| `createEdgeClient()` | `@/lib/supabase/edge` | Edge Runtime (OG images, edge functions) |
| `createAdminClient()` | `@/lib/supabase/admin` | Service role operations (Vault access, bypassing RLS) |

### Usage Examples

```typescript
// Server Component / Server Action (most common)
import { createClient } from '@/lib/supabase/server';
const supabase = await createClient();

// Admin operations (Vault secrets, bypass RLS)
import { createAdminClient } from '@/lib/supabase/admin';
const supabase = createAdminClient(); // No await needed

// Client-side realtime only
import { createClient } from '@/lib/supabase/client';
const supabase = createClient();
```

### Admin Client Security

The admin client uses `SUPABASE_SERVICE_ROLE_KEY` and should only be used in:
- Route Handlers that need Vault access
- Server Actions requiring RLS bypass
- Background jobs and webhooks

**Never expose the admin client to client-side code.**

## Key Features

### PostGIS Geography
The `posts` table uses PostGIS geography type for location data. See migration `20251201192930_add_posts_location_json.sql` for the computed column that converts WKB to GeoJSON.

### Row Level Security (RLS)
All public tables have RLS enabled for secure data access.

### Real-time Subscriptions
Enabled for `rooms` and `messages` tables for live chat functionality.

### Edge Functions
17 Deno-based serverless functions for:
- Telegram bot integration
- Email routing
- Image processing
- Geocoding
- Search functionality

---

*Generated: December 2024*
