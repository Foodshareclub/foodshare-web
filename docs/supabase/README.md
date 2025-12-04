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

- **API URL**: `https://***REMOVED***.supabase.co`
- **Database Host**: `db.***REMOVED***.supabase.co`

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
NEXT_PUBLIC_SUPABASE_URL=https://***REMOVED***.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

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
