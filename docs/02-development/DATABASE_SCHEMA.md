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

FoodShare uses the `user_roles` junction table as the **single source of truth** for all role assignments:

1. **`user_roles` junction table** (source of truth) - Role assignments linking profiles to roles via the `roles` table. This is the authoritative source for all role checks including admin/superadmin.

2. **`roles` table** - Defines available roles:
   - `'user'` - Standard user (default)
   - `'admin'` - Administrator
   - `'superadmin'` - Super administrator
   - `'volunteer'` - Volunteer
   - `'moderator'` - Content moderator

> **Note:** The `role` column on the `profiles` table is deprecated and no longer used. Role data is exclusively managed via the `user_roles` junction table and accessed through the admin-auth module.

**Checking Admin Status (TypeScript):**

```typescript
// ✅ Recommended - Use getAdminAuth() from lib/data/admin-auth.ts
import { getAdminAuth } from "@/lib/data/admin-auth";

const { isAdmin, isSuperAdmin, userId, roles } = await getAdminAuth();
// isAdmin: true if user has admin or superadmin role
// isSuperAdmin: true if user has superadmin role
// userId: current user's ID or null
// roles: ['admin', 'volunteer'] - all roles from user_roles table

// For Server Actions that require admin access:
import { requireAdmin } from "@/lib/data/admin-auth";

const adminId = await requireAdmin(); // Throws if not admin
```

**Querying Admin Users (Supabase):**

```typescript
// ✅ Query via user_roles table (source of truth)
const { data: admins } = await supabase
  .from("user_roles")
  .select("profiles!inner(id, email, first_name, second_name), roles!inner(name)")
  .in("roles.name", ["admin", "superadmin"]);

// ✅ Query users with specific roles
const { data: volunteers } = await supabase
  .from("user_roles")
  .select("profiles!inner(*), roles!inner(name)")
  .eq("roles.name", "volunteer");
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
- `location_json` (jsonb) - Location as GeoJSON: `{ "type": "Point", "coordinates": [lng, lat] }`
- `gif_url` (text) - Primary image URL
- `gif_url_2` (text) - Second image URL
- `gif_url_3` (text) - Third image URL
- `available_hours` (text) - Availability schedule
- `transportation` (text) - Pickup/delivery options
- `condition` (text) - Item condition (new/like-new/good/fair) or food freshness
- `is_active` (boolean) - Whether post is active (default: true)
- `is_arranged` (boolean) - Whether item is reserved (default: false)
- `post_arranged_to` (uuid) - User who arranged the pickup
- `post_arranged_at` (timestamp) - When arrangement was made
- `post_views` (integer) - View counter
- `post_like_counter` (integer) - Like counter
- `created_at` (timestamp) - Post creation time
- `updated_at` (timestamp) - Last update time

> **Note:** Location data is stored as GeoJSON in `location_json`. The coordinates array follows GeoJSON convention: `[longitude, latitude]`. Legacy `latitude`/`longitude` columns may exist but `location_json` is the preferred source.

**Relationships:**

- Many-to-one with `profiles` (post owner)
- One-to-many with `reviews` (post reviews)
- One-to-many with `rooms` (conversations about this post)

**Indexes:**

- `idx_posts_profile_id` on profile_id
- `idx_posts_post_type` on post_type
- `idx_posts_is_active` on is_active
- `idx_posts_location_json` (GIN) for GeoJSON queries
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

### `post_activity_logs`

Comprehensive activity log for all post-related events. Supports analytics, debugging, audit trails, and user activity tracking.

**Columns:**

- `id` (uuid, PK) - Unique activity log identifier
- `post_id` (bigint, FK → posts.id) - The post this activity relates to
- `actor_id` (uuid, FK → profiles.id) - User who performed the action (null for system actions)
- `activity_type` (enum) - Type of activity (see Activity Types below)
- `previous_state` (jsonb) - Snapshot of post fields before the activity
- `new_state` (jsonb) - Snapshot of post fields after the activity
- `changes` (jsonb) - Diff of what changed (for updates)
- `metadata` (jsonb) - Additional context-specific data
- `reason` (text) - Reason for the action (e.g., moderation reason)
- `notes` (text) - Additional notes
- `ip_address` (inet) - IP address of the actor
- `user_agent` (text) - Browser/client user agent
- `request_id` (text) - Correlation ID for request tracing
- `related_post_id` (bigint, FK → posts.id) - Related post (if applicable)
- `related_profile_id` (uuid, FK → profiles.id) - Related user (if applicable)
- `related_room_id` (uuid, FK → rooms.id) - Related chat room (if applicable)
- `created_at` (timestamp) - When the activity occurred

**Activity Types:**

| Category    | Types                                                                                    |
| ----------- | ---------------------------------------------------------------------------------------- |
| Lifecycle   | `created`, `updated`, `deleted`, `restored`                                              |
| Status      | `activated`, `deactivated`, `expired`                                                    |
| Arrangement | `viewed`, `contacted`, `arranged`, `arrangement_cancelled`, `collected`, `not_collected` |
| Moderation  | `reported`, `flagged`, `unflagged`, `approved`, `rejected`, `hidden`, `unhidden`         |
| Engagement  | `liked`, `unliked`, `shared`, `bookmarked`, `unbookmarked`                               |
| Admin       | `admin_edited`, `admin_note_added`, `admin_status_changed`                               |
| System      | `auto_expired`, `auto_deactivated`, `location_updated`, `images_updated`                 |

**TypeScript Types:**

```typescript
import {
  PostActivityType,
  PostActivityLog,
  PostActivityTimelineItem,
  LogPostActivityInput,
  ACTIVITY_CATEGORIES,
  ACTIVITY_TYPE_LABELS,
} from "@/types/post-activity.types";
```

**Relationships:**

- Many-to-one with `posts` (the post being tracked)
- Many-to-one with `profiles` (the actor)
- Many-to-one with `rooms` (related chat room)

**RLS Policies:**

- Admins can read all activity logs
- Users can read activity logs for their own posts
- Only system/admins can insert activity logs

---

### `post_activity_daily_stats`

Aggregated daily statistics for post activities. Updated by scheduled jobs or triggers.

**Columns:**

- `id` (uuid, PK) - Unique stats record identifier
- `date` (date) - The date for these statistics
- `post_type` (text) - Post type filter ('all' for aggregate)
- `posts_created` (integer) - Count of posts created
- `posts_updated` (integer) - Count of posts updated
- `posts_deleted` (integer) - Count of posts deleted
- `posts_viewed` (integer) - Count of post views
- `posts_arranged` (integer) - Count of arrangements made
- `posts_collected` (integer) - Count of items collected
- `posts_reported` (integer) - Count of reports filed
- `posts_expired` (integer) - Count of expired posts
- `total_likes` (integer) - Total likes given
- `total_shares` (integer) - Total shares
- `total_contacts` (integer) - Total contact initiations
- `unique_posters` (integer) - Unique users who posted
- `unique_viewers` (integer) - Unique users who viewed
- `unique_arrangers` (integer) - Unique users who arranged
- `created_at` (timestamp) - Record creation time
- `updated_at` (timestamp) - Last update time

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
