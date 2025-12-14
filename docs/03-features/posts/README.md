# 📝 Posts Management

User post management system for creating, editing, and deleting food sharing listings.

## Overview

The Posts feature provides authenticated users with a complete post management interface. Users can view all their listings, create new posts, edit existing ones, and delete posts they no longer need.

## Routes

| Route            | Component          | Description                                        |
| ---------------- | ------------------ | -------------------------------------------------- |
| `/user-listings` | `UserListingsPage` | Main post management dashboard with stats overview |
| `/my-posts`      | `MyPostsPage`      | Alternative post management interface              |

## Architecture

### Server Component (`page.tsx`)

```typescript
// src/app/user-listings/page.tsx
export default async function UserListingsPage() {
  const user = await getUser();

  if (!user) {
    redirect('/auth/login?from=/user-listings');
  }

  const listings = await getUserProducts(user.id);

  return (
    <Suspense fallback={<UserListingsSkeleton />}>
      <UserListingsClient listings={listings} user={user} />
    </Suspense>
  );
}
```

### Key Features

- **Authentication Required** - Redirects unauthenticated users to login
- **Server-Side Data Fetching** - Posts loaded via `getUserProducts()`
- **Suspense Boundary** - Loading skeleton while data loads
- **Caching** - 60-second revalidation for optimal performance
- **Server Actions** - Mutations (create, update, delete) use Server Actions

## Components

| Component              | Type   | Description                                                       |
| ---------------------- | ------ | ----------------------------------------------------------------- |
| `UserListingsPage`     | Server | Main page with auth check and data fetching                       |
| `UserListingsClient`   | Client | Interactive post management UI with stats sidebar                 |
| `UserListingsSkeleton` | Server | Loading placeholder                                               |
| `MyPostsClient`        | Client | Alternative post management with Server Actions                   |
| `PostCard`             | Client | Individual post card with image, status badge, and action buttons |
| `EmptyState`           | Client | Empty state messaging with contextual prompts                     |
| `PostActivityTimeline` | Client | Chronological activity history with icons and actor info          |

## User Listings Client Features

The `UserListingsClient` component provides a streamlined management interface:

### Responsive Design

- **Desktop** - Sticky sidebar with stats and filters, main content grid
- **Mobile** - Sidebar hidden, mobile filter drawer accessible via button
- **Animations** - Entrance transitions, hover effects, and pulse animations for visual polish

### Stats Overview

The sidebar displays an animated stats grid showing:

- **Total** - Total number of listings
- **Active** - Currently active listings (emerald highlight)
- **Inactive** - Deactivated listings

Stats cards feature hover animations with scale effects and gradient overlays.

### Mobile Filters

On mobile devices, filters are accessible via a drawer component with:

- Type filter buttons
- Status filter (All/Active/Inactive)
- Sort options
- Clear filters action

### Post Type Configuration

```typescript
const POST_TYPE_CONFIG = {
  food: { label: "Food", emoji: "🍎" },
  thing: { label: "Thing", emoji: "📦" },
  borrow: { label: "Borrow", emoji: "🤝" },
  wanted: { label: "Wanted", emoji: "🔍" },
  fridge: { label: "Fridge", emoji: "🧊" },
  foodbank: { label: "Food Bank", emoji: "🏦" },
  volunteer: { label: "Volunteer", emoji: "💪" },
  challenge: { label: "Challenge", emoji: "🏆" },
  vegan: { label: "Vegan", emoji: "🌱" },
};
```

### Layout

- **Sidebar** - Compact stats overview with filters (fixed on desktop `lg:w-56`, hidden on mobile)
- **Main Content** - Responsive grid of listing cards with left padding to accommodate fixed sidebar
- **Mobile Filter Drawer** - Slide-up drawer with filter options on mobile
- **Empty States** - Helpful prompts when no listings
- **Animations** - Entrance transitions (`translate-x`, `opacity`) and hover effects (`scale-105`)

## Data Flow

### Read Flow (Server Component)

```
User visits /user-listings or /my-posts
    ↓
Server Component checks auth (getUser)
    ↓
If not authenticated → redirect to /auth/login
    ↓
Fetch user's posts (getUserProducts)
    ↓
Render Client Component with listings data
```

### Mutation Flow (Server Actions)

```
User clicks Edit/Delete/Toggle
    ↓
Client Component calls Server Action
    ↓
Server Action validates and executes mutation
    ↓
Cache invalidation via invalidateTag()
    ↓
router.refresh() triggers re-render with fresh data
```

## Server Actions

Post mutations use Server Actions from `@/app/actions/products`:

### `updateProduct(id: number, formData: FormData)`

Updates an existing post with partial data. Requires authentication and ownership verification.

```typescript
import { updateProduct } from "@/app/actions/products";

// Toggle post status
const formData = new FormData();
formData.set("is_active", String(!post.is_active));

const result = await updateProduct(post.id, formData);
if (result.success) {
  router.refresh(); // Re-fetch data from server
}
// Returns error if user is not authenticated or doesn't own the post
```

### `deleteProduct(id: number)`

Deletes a post by ID.

```typescript
import { deleteProduct } from "@/app/actions/products";

const result = await deleteProduct(post.id);
if (result.success) {
  router.refresh();
}
```

### `createProduct(formData: FormData)`

Creates a new post.

```typescript
import { createProduct } from "@/app/actions/products";

const result = await createProduct(formData);
if (result.success) {
  router.refresh();
}
```

## Data Functions

### `getUserProducts(userId: string)`

Fetches all posts belonging to a specific user (server-side only).

```typescript
import { getUserProducts } from "@/lib/data/products";

const posts = await getUserProducts(user.id);
```

## User Capabilities

- ✅ View all personal posts with stats (total, active, inactive)
- ✅ Create new posts
- ✅ Edit existing posts
- ✅ Delete posts
- ✅ Toggle post active/inactive status

## Security

- Route protected by authentication check
- Users can only access their own posts
- **Server-side ownership validation** - All mutation actions (`updateProduct`, `deleteProduct`) verify:
  1. User is authenticated via `supabase.auth.getUser()`
  2. User owns the post by comparing `profile_id` with authenticated user ID
- Unauthorized attempts return descriptive error messages
- CSRF protection via Supabase Auth

## SEO

```typescript
export const metadata = {
  title: "My Listings | FoodShare",
  description: "Manage your food sharing listings - create, edit, and organize your posts",
};
```

## Post Activity Timeline

The `PostActivityTimeline` component displays a chronological history of all activities for a post. Used in post detail pages and admin dashboards for audit trails and debugging.

Supports streaming with Suspense and optimistic updates for a responsive UX.

### Available Components

| Component                      | Type   | Description                                               |
| ------------------------------ | ------ | --------------------------------------------------------- |
| `PostActivityTimeline`         | Client | Interactive timeline with real-time updates               |
| `PostActivityStats`            | Client | Activity statistics and metrics                           |
| `PostActivityTimelineSkeleton` | Client | Loading skeleton for Suspense fallback                    |
| `PostActivityTimelineServer`   | Server | Server Component for streaming                            |
| `PostEngagementButtons`        | Client | Like, bookmark, and share buttons with optimistic updates |

### Component Usage

```typescript
// Client Component (interactive)
import { PostActivityTimeline } from '@/components/post-activity';

<PostActivityTimeline
  activities={activities}
  showActor={true}    // Show user avatars and names
  compact={false}     // Full view with notes and changes
  className="mt-4"
/>

// Server Component with Suspense streaming
import { Suspense } from 'react';
import {
  PostActivityTimelineServer,
  PostActivityTimelineSkeleton
} from '@/components/post-activity';

<Suspense fallback={<PostActivityTimelineSkeleton />}>
  <PostActivityTimelineServer postId={post.id} />
</Suspense>

// Engagement buttons (like, bookmark, share)
import { PostEngagementButtons } from '@/components/post-activity';

<PostEngagementButtons
  postId={post.id}
  initialIsLiked={isLiked}
  initialLikeCount={likeCount}
  initialIsBookmarked={isBookmarked}
  showCounts={true}
  size="default"      // "sm" | "default" | "lg"
/>
```

### Props

#### PostActivityTimeline

| Prop         | Type                         | Default  | Description                        |
| ------------ | ---------------------------- | -------- | ---------------------------------- |
| `activities` | `PostActivityTimelineItem[]` | required | Array of activity items            |
| `showActor`  | `boolean`                    | `true`   | Display actor avatar and name      |
| `compact`    | `boolean`                    | `false`  | Compact view (hides notes/changes) |
| `className`  | `string`                     | -        | Additional CSS classes             |

#### PostEngagementButtons

| Prop                  | Type                        | Default     | Description                    |
| --------------------- | --------------------------- | ----------- | ------------------------------ |
| `postId`              | `number`                    | required    | Post ID for engagement actions |
| `initialIsLiked`      | `boolean`                   | `false`     | Initial like state             |
| `initialLikeCount`    | `number`                    | `0`         | Initial like count             |
| `initialIsBookmarked` | `boolean`                   | `false`     | Initial bookmark state         |
| `showCounts`          | `boolean`                   | `true`      | Show like count next to button |
| `size`                | `"sm" \| "default" \| "lg"` | `"default"` | Button size variant            |
| `className`           | `string`                    | -           | Additional CSS classes         |

### Activity Types

Activities are categorized into groups:

| Category        | Activities                                                                   |
| --------------- | ---------------------------------------------------------------------------- |
| **Lifecycle**   | created, updated, deleted, restored                                          |
| **Status**      | activated, deactivated, expired                                              |
| **Arrangement** | viewed, contacted, arranged, arrangement_cancelled, collected, not_collected |
| **Moderation**  | reported, flagged, unflagged, approved, rejected, hidden, unhidden           |
| **Engagement**  | liked, unliked, shared, bookmarked, unbookmarked                             |
| **Admin**       | admin_edited, admin_note_added, admin_status_changed                         |
| **System**      | auto_expired, auto_deactivated, location_updated, images_updated             |

### Data Fetching

```typescript
// Server Component
import { getPostActivityTimeline } from "@/lib/data/post-activity";

const activities = await getPostActivityTimeline({
  postId: post.id,
  limit: 50,
  activityTypes: ["created", "updated", "arranged", "collected"],
});
```

### Logging Activities

```typescript
// Server Action
import { logPostActivity } from "@/app/actions/post-activity";

await logPostActivity({
  postId: post.id,
  activityType: "updated",
  changes: { post_name: "New Title" },
  reason: "User edited post",
});
```

## Related

- [Authentication](../authentication/README.md) - Auth system
- [Storage](../storage/README.md) - Image uploads for posts
- [Admin](../admin/README.md) - Admin post management

---

[← Back to Features](../README.md) | [← Back to Index](../../00-INDEX.md)
