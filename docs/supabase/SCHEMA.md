# Database Schema

## Overview

FoodShare uses PostgreSQL 15.8 with PostGIS for geographic data. All public tables have Row Level Security (RLS) enabled.

## Public Schema Tables

### Core Tables

#### `profiles`
User profile information linked to `auth.users`.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key (references auth.users) |
| `first_name` | text | User's first name |
| `second_name` | text | User's last name |
| `email` | text | Email address |
| `avatar_url` | text | Profile picture URL |
| `bio` | text | User biography |
| `created_at` | timestamptz | Account creation date |
| `updated_at` | timestamptz | Last update |

**Rows**: ~4,328

---

#### `posts`
Food and item listings (products).

| Column | Type | Description |
|--------|------|-------------|
| `id` | bigint | Primary key |
| `profile_id` | uuid | Owner (references profiles) |
| `post_name` | text | Listing title |
| `post_description` | text | Description |
| `post_type` | text | Category: food, thing, borrow, wanted, fridge, foodbank, etc. |
| `post_address` | text | Full address |
| `post_stripped_address` | text | Display address |
| `location` | geography | PostGIS point (lat/lng) |
| `images` | text[] | Array of image URLs |
| `available_hours` | text | Pickup availability |
| `transportation` | text | Transport method |
| `is_active` | boolean | Listing active status |
| `is_arranged` | boolean | Item has been claimed |
| `post_views` | integer | View count |
| `post_like_counter` | integer | Likes count |
| `created_at` | timestamptz | Creation date |

**Rows**: ~635

**PostGIS Note**: The `location` column returns WKB hex format. Apply migration `20251201192930_add_posts_location_json.sql` to enable the `location_json` computed column for GeoJSON format.

---

#### `rooms`
Chat conversation rooms between users.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `created_at` | timestamptz | Creation date |
| `participant_ids` | uuid[] | Array of user IDs |
| `post_id` | bigint | Related product (optional) |
| `last_message` | text | Preview of last message |
| `last_message_at` | timestamptz | Last activity |

**Real-time**: Enabled

---

#### `messages`
Chat messages within rooms.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `room_id` | uuid | Parent room |
| `sender_id` | uuid | Message author |
| `content` | text | Message text |
| `created_at` | timestamptz | Sent time |
| `read_at` | timestamptz | Read timestamp |

**Real-time**: Enabled

---

#### `reviews`
User reviews and ratings.

| Column | Type | Description |
|--------|------|-------------|
| `id` | bigint | Primary key |
| `post_id` | bigint | Related post |
| `reviewer_id` | uuid | Review author |
| `rating` | integer | Star rating (1-5) |
| `comment` | text | Review text |
| `created_at` | timestamptz | Creation date |

---

### Community Features

#### `forum`
Community forum posts.

| Column | Type | Description |
|--------|------|-------------|
| `id` | bigint | Primary key |
| `author_id` | uuid | Post author |
| `title` | text | Post title |
| `content` | text | Post content |
| `category` | text | Forum category |
| `created_at` | timestamptz | Creation date |

---

#### `comments`
Comments on forum posts.

| Column | Type | Description |
|--------|------|-------------|
| `id` | bigint | Primary key |
| `forum_id` | bigint | Parent forum post |
| `author_id` | uuid | Comment author |
| `content` | text | Comment text |
| `created_at` | timestamptz | Creation date |

---

#### `challenges`
Gamification challenges.

| Column | Type | Description |
|--------|------|-------------|
| `id` | bigint | Primary key |
| `challenge_title` | text | Challenge name |
| `challenge_description` | text | Challenge description |
| `challenge_image` | text | Challenge image URL |
| `challenge_difficulty` | text | Difficulty level |
| `challenge_action` | text | Action required |
| `challenge_score` | integer | Points awarded |
| `challenge_views` | integer | View count |
| `challenge_likes_counter` | integer | Likes count |
| `challenged_people` | integer | Participants count |
| `challenge_published` | boolean | Published status |
| `challenge_created_at` | timestamptz | Creation date |
| `challenge_updated_at` | timestamptz | Last update |
| `profile_id` | uuid | Creator (references profiles) |

---

### Reference Tables

#### `categories`
Product categories and metadata.

#### `countries`
Country codes and names.

#### `address`
Address lookups and geocoding cache.

---

## Auth Schema

Managed by Supabase Auth.

#### `auth.users`
Core authentication table.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `email` | text | User email |
| `encrypted_password` | text | Hashed password |
| `email_confirmed_at` | timestamptz | Email verification |
| `created_at` | timestamptz | Registration date |
| `last_sign_in_at` | timestamptz | Last login |

**Rows**: ~4,330

---

## Storage Schema

#### `storage.buckets`
Storage bucket definitions.

| Bucket | Purpose |
|--------|---------|
| `avatars` | Profile pictures |
| `post-images` | Product listing images |
| `attachments` | Chat attachments |

---

## Key Relationships

```
auth.users (1) ──── (1) profiles
     │
     └──── (n) posts
              │
              ├──── (n) reviews
              └──── (n) rooms ──── (n) messages
```

---

## Row Level Security

All public tables have RLS enabled with policies for:
- **SELECT**: Authenticated users can read public data
- **INSERT**: Users can create their own records
- **UPDATE**: Users can modify their own records
- **DELETE**: Users can delete their own records

---

*See migrations in `supabase/migrations/` for complete schema definitions.*
