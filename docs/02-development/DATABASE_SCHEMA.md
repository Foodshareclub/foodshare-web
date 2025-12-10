# FoodShare Database Schema

**Database:** Supabase PostgreSQL
**Last Updated:** December 2025

## Overview

FoodShare uses Supabase PostgreSQL with Row Level Security (RLS) policies to ensure data privacy and security. The schema is designed to support food sharing, real-time chat, user profiles, and geospatial queries.

## Core Tables

### `profiles`

User profile information linked to Supabase Auth users.

**Columns:**

- `id` (uuid, PK) - User identifier (matches auth.users.id)
- `created_time` (timestamp) - Account creation time
- `updated_at` (timestamp) - Last profile update
- `email` (text) - User's email address
- `first_name` (text) - User's first name
- `second_name` (text) - User's last name
- `nickname` (text) - Username/display name
- `avatar_url` (text) - Profile picture URL
- `about_me` (text) - User biography
- `bio` (text) - Short bio
- `birth_date` (text) - User's birth date
- `phone` (text) - Phone number
- `location` (geography) - User's location (PostGIS point)
- `user_role` (text) - User role: 'admin', 'volunteer', 'user', etc.
- `dietary_preferences` (jsonb) - User dietary preferences
- `notification_preferences` (jsonb) - Notification settings
- `theme_preferences` (jsonb) - UI theme settings
- `search_radius_km` (numeric) - Default search radius in kilometers
- `is_verified` (boolean) - Email verification status
- `is_active` (boolean) - Account active status
- `email_verified` (boolean) - Email verified flag
- `last_seen_at` (timestamp) - Last activity timestamp
- `facebook` (text) - Facebook profile link
- `instagram` (text) - Instagram profile link
- `twitter` (text) - Twitter profile link
- `telegram_id` (bigint) - Linked Telegram account ID
- `transportation` (text) - Preferred transportation method
- `language` (varchar) - Preferred language code

**User Role System:**

FoodShare supports multiple role sources for backwards compatibility:

1. **JSONB `role` field** (recommended) - Flexible role object in `profiles.role`:

   ```json
   { "admin": true, "volunteer": false, "subscriber": true }
   ```

2. **Legacy `user_role` field** - Simple string in `profiles.user_role`:
   - `'user'` - Standard user (default)
   - `'admin'` - Administrator
   - `'superadmin'` - Super administrator
   - `'volunteer'` - Volunteer

3. **`user_roles` junction table** - Role assignments linking profiles to roles

**Checking Admin Status (TypeScript):**

```typescript
// ✅ Recommended - Use checkIsAdmin() from lib/data/auth.ts
import { checkIsAdmin } from "@/lib/data/auth";

const { isAdmin, roles, jsonbRoles } = await checkIsAdmin(userId);
// isAdmin: true if admin in ANY source
// roles: ['admin', 'volunteer'] - all roles from all sources
// jsonbRoles: { admin: true, volunteer: true } - raw JSONB role object

// Manual check (if needed)
const isJsonbAdmin = profile?.role?.admin === true;
const isLegacyAdmin = profile?.user_role === "admin" || profile?.user_role === "superadmin";
```

**Querying by JSONB Role (Supabase):**

```typescript
// ✅ Query users with a specific role using JSONB arrow operator
const { data: volunteers } = await supabase
  .from('profiles')
  .select('*')
  .eq('role->>volunteer', 'true')  // JSONB text extraction
  .order('first_name');

// ❌ Legacy approach (deprecated)
const { data } = await supabase
  .from('profiles')
  .select('*')
  .eq('user_role', 'volunteer');
```

**Relationships:**

- One-to-many with `posts` (user's listings)
- One-to-many with `rooms` (user's conversations)
- One-to-many with `reviews` (reviews written)

**RLS Policies:**

- Users can read all profiles (public info)
- Users can only update their own profile
- Users can only delete their own profile

---

### `posts`

Food listings and volunteer opportunities.

**Columns:**

- `id` (serial, PK) - Unique post identifier
- `profile_id` (uuid, FK → profiles.id) - Post creator
- `post_name` (text) - Item/opportunity name
- `post_description` (text) - Detailed description
- `post_type` (text) - Type: 'food', 'volunteer', 'community_fridge', 'food_bank'
- `post_address` (text) - Full address
- `post_stripped_address` (text) - Simplified address for display
- `latitude` (float8) - Geographic latitude
- `longitude` (float8) - Geographic longitude
- `locations` (geography) - PostGIS point for geospatial queries
- `gif_url` (text) - Primary image URL
- `gif_url_2` (text) - Second image URL
- `gif_url_3` (text) - Third image URL
- `available_hours` (text) - Availability schedule
- `transportation` (text) - Pickup/delivery options
- `condition` (text) - Item condition (new/like-new/good/fair) or food freshness
- `active` (boolean) - Whether post is active (default: true)
- `post_arranged` (boolean) - Whether item is reserved
- `post_views` (integer) - View counter
- `post_like_counter` (integer) - Like counter
- `created_at` (timestamp) - Post creation time
- `updated_at` (timestamp) - Last update time

**Relationships:**

- Many-to-one with `profiles` (post owner)
- One-to-many with `reviews` (post reviews)
- One-to-many with `rooms` (conversations about this post)

**Indexes:**

- `idx_posts_profile_id` on profile_id
- `idx_posts_post_type` on post_type
- `idx_posts_active` on active
- `idx_posts_locations` (GIST) for geospatial queries
- Full-text search on `post_name` for search functionality

**RLS Policies:**

- Anyone can read active posts
- Only authenticated users can create posts
- Users can only update/delete their own posts

---

### `rooms`

Chat room/conversation metadata between users.

**Columns:**

- `id` (uuid, PK) - Unique room identifier
- `requester` (uuid, FK → profiles.id) - User requesting food
- `sharer` (uuid, FK → profiles.id) - User sharing food
- `post_id` (integer, FK → posts.id) - Associated post
- `last_message` (text) - Preview of last message
- `last_message_sent_by` (uuid) - Last message sender
- `last_message_seen_by` (uuid) - Last user to read
- `last_message_time` (timestamp) - Last message timestamp
- `created_at` (timestamp) - Room creation time

**Relationships:**

- Many-to-one with `profiles` (requester)
- Many-to-one with `profiles` (sharer)
- Many-to-one with `posts` (related post)
- One-to-many with `room_participants` (messages)

**RLS Policies:**

- Users can only see rooms they're part of (requester or sharer)
- Only room participants can create/update room data

---

### `room_participants`

Individual messages within chat rooms.

**Columns:**

- `id` (uuid, PK) - Unique message identifier
- `room_id` (uuid, FK → rooms.id) - Parent room
- `profile_id` (uuid, FK → profiles.id) - Message sender
- `text` (text) - Message content
- `image` (text) - Optional image URL
- `timestamp` (timestamp) - Message send time

**Relationships:**

- Many-to-one with `rooms` (parent conversation)
- Many-to-one with `profiles` (message author)

**RLS Policies:**

- Users can only see messages in rooms they're part of
- Only room participants can send messages

---

### `reviews`

User reviews and ratings for posts.

**Columns:**

- `id` (serial, PK) - Unique review identifier
- `profile_id` (uuid, FK → profiles.id) - Reviewer
- `post_id` (integer, FK → posts.id) - Reviewed post
- `forum_id` (integer) - Related forum (if applicable)
- `challenge_id` (integer) - Related challenge (if applicable)
- `feedback` (text) - Review text
- `rating` (integer) - Star rating (1-5)
- `created_at` (timestamp) - Review creation time

**Relationships:**

- Many-to-one with `profiles` (reviewer)
- Many-to-one with `posts` (reviewed item)

**RLS Policies:**

- Anyone can read reviews
- Only authenticated users can create reviews
- Users can only update/delete their own reviews

---

## Database Views

### `posts_with_location`

A view that wraps the `posts` table and converts PostGIS geography data to GeoJSON format for easier client-side consumption.

**Purpose:** Provides location data as proper GeoJSON via `ST_AsGeoJSON()`, avoiding WKB hex format issues on the client.

**Key Columns:**

- All columns from `posts` table
- `location_json` (jsonb) - Location as GeoJSON: `{ "type": "Point", "coordinates": [lng, lat] }`

**Usage:**

```typescript
// Product API uses this view for all read operations
const { data } = await supabase.from("posts_with_location").select("*");

// Access coordinates from location_json
const coords = data[0].location_json?.coordinates; // [longitude, latitude]
```

**Note:** Write operations (INSERT, UPDATE, DELETE) should still target the `posts` table directly. The view is read-only.

---

## Geospatial Features

The `posts` table uses PostGIS for geospatial queries:

```sql
-- Find posts within 10km of a location
SELECT * FROM posts
WHERE ST_DWithin(
  locations,
  ST_MakePoint(longitude, latitude)::geography,
  10000 -- meters
);
```

## Realtime Subscriptions

Supabase Realtime is configured for:

- `rooms` - Chat room updates
- `room_participants` - New messages
- `posts` - New/updated listings

Example subscription:

```typescript
supabase
  .channel("room-messages")
  .on(
    "postgres_changes",
    {
      event: "INSERT",
      schema: "public",
      table: "room_participants",
      filter: `room_id=eq.${roomId}`,
    },
    (payload) => {
      // Handle new message
    }
  )
  .subscribe();
```

## Authentication

Authentication is handled by Supabase Auth:

- Email/password authentication
- Social auth (Google, Apple) - configurable
- JWT-based sessions
- Automatic token refresh

User IDs in the database match `auth.users.id` from Supabase Auth.

## Security

### Row Level Security (RLS)

All tables have RLS enabled with policies ensuring:

1. **Profiles**: Users can view all, edit only their own
2. **Posts**: Public read, authenticated create, owner update/delete
3. **Rooms**: Only participants can access
4. **Messages**: Only room participants can access
5. **Reviews**: Public read, authenticated create, owner edit

### Data Privacy

- Email and phone numbers are private (not exposed in API)
- User locations are stored as points, not exact addresses
- Chat messages are encrypted in transit (TLS)
- Passwords are never stored (handled by Supabase Auth)

## Migrations

Database migrations should be managed via Supabase Dashboard or CLI:

```bash
# Create migration
supabase migration new add_feature_x

# Apply migrations
supabase db push
```

## Backup and Recovery

- Supabase provides automatic daily backups
- Point-in-time recovery available
- Export full database via pg_dump if needed

---

**Next Steps:**

- Review [API Reference](API_REFERENCE.md) for querying patterns
- See [Architecture](ARCHITECTURE.md) for data flow
