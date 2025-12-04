# Database Migrations

## Overview

FoodShare has 116 migrations from October 2024 to December 2024.

## Migration History

### December 2024

| Version | Name | Description |
|---------|------|-------------|
| 20251201192930 | add_posts_location_json | Computed column for PostGIS GeoJSON |
| 20251201185219 | fix_location_geography | Fix location column type |
| 20251201172829 | add_location_column_to_posts | Add geography column |
| 20251130230654 | fix_posts_rls_complete | Complete RLS policy fix |
| 20251130191512 | add_insert_policy_for_posts | INSERT policy for posts |
| 20251130191405 | posts_rls_policies | RLS policies for posts |

### November 2024 (Selected)

| Version | Name | Description |
|---------|------|-------------|
| 20251130* | Multiple RLS fixes | Row Level Security policies |
| 20251129* | Forum features | Forum and comments tables |
| 20251128* | Chat improvements | Messages and rooms updates |
| 20251127* | Profile updates | User profile enhancements |
| 20251126* | Search functions | Full-text search setup |

### October 2024 (Initial Setup)

| Version | Name | Description |
|---------|------|-------------|
| 20251029* | Initial schema | Core tables creation |
| 20251029* | Auth setup | Authentication configuration |
| 20251029* | Storage buckets | File storage setup |

## Running Migrations

### Via Supabase CLI

```bash
# Apply all pending migrations
supabase db push

# Create a new migration
supabase migration new migration_name

# List migrations
supabase migration list
```

### Via SQL Editor

Apply migrations directly in Supabase Dashboard > SQL Editor.

## Key Migration: PostGIS Location

The most recent migration adds a computed column for location data:

```sql
-- Migration: 20251201192930_add_posts_location_json.sql

CREATE OR REPLACE FUNCTION posts_location_json(posts)
RETURNS json
LANGUAGE sql
STABLE
AS $$
  SELECT ST_AsGeoJSON($1.location)::json;
$$;
```

This enables querying location as GeoJSON instead of WKB hex format:

```sql
-- Before (returns WKB hex)
SELECT location FROM posts;

-- After (returns GeoJSON)
SELECT posts_location_json(posts.*) as location_json FROM posts;
```

## Migration Files Location

Local migrations are stored in:
```
supabase/migrations/
```

## Applying Pending Migrations

If the map markers aren't working, apply the location migration:

```sql
-- Run in Supabase SQL Editor
CREATE OR REPLACE FUNCTION posts_location_json(posts)
RETURNS json
LANGUAGE sql
STABLE
AS $$
  SELECT ST_AsGeoJSON($1.location)::json;
$$;

COMMENT ON FUNCTION posts_location_json(posts) IS
  'Computed column: converts PostGIS geography to GeoJSON for API consumption';
```

---

*Total Migrations: 116*
*Last Migration: December 1, 2024*
