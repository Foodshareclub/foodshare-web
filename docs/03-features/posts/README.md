# 📝 Posts Management

User post management system for creating, editing, and deleting food sharing listings.

## Overview

The Posts feature provides authenticated users with a complete post management interface. Users can view all their listings, create new posts, edit existing ones, and delete posts they no longer need.

## Routes

| Route | Component | Description |
|-------|-----------|-------------|
| `/user-listings` | `UserListingsPage` | Main post management dashboard with stats overview |
| `/my-posts` | `MyPostsPage` | Alternative post management interface |

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

| Component | Type | Description |
|-----------|------|-------------|
| `UserListingsPage` | Server | Main page with auth check and data fetching |
| `UserListingsClient` | Client | Interactive post management UI with stats sidebar |
| `UserListingsSkeleton` | Server | Loading placeholder |
| `MyPostsClient` | Client | Alternative post management with Server Actions |
| `PostCard` | Client | Individual post card with image, status badge, and action buttons |
| `EmptyState` | Client | Empty state messaging with contextual prompts |

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
  food: { label: 'Food', emoji: '🍎' },
  thing: { label: 'Thing', emoji: '📦' },
  borrow: { label: 'Borrow', emoji: '🤝' },
  wanted: { label: 'Wanted', emoji: '🔍' },
  fridge: { label: 'Fridge', emoji: '🧊' },
  foodbank: { label: 'Food Bank', emoji: '🏦' },
  volunteer: { label: 'Volunteer', emoji: '💪' },
  challenge: { label: 'Challenge', emoji: '🏆' },
  vegan: { label: 'Vegan', emoji: '🌱' },
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

Updates an existing post with partial data.

```typescript
import { updateProduct } from '@/app/actions/products';

// Toggle post status
const formData = new FormData();
formData.set('is_active', String(!post.is_active));

const result = await updateProduct(post.id, formData);
if (result.success) {
  router.refresh(); // Re-fetch data from server
}
```

### `deleteProduct(id: number)`

Deletes a post by ID.

```typescript
import { deleteProduct } from '@/app/actions/products';

const result = await deleteProduct(post.id);
if (result.success) {
  router.refresh();
}
```

### `createProduct(formData: FormData)`

Creates a new post.

```typescript
import { createProduct } from '@/app/actions/products';

const result = await createProduct(formData);
if (result.success) {
  router.refresh();
}
```

## Data Functions

### `getUserProducts(userId: string)`

Fetches all posts belonging to a specific user (server-side only).

```typescript
import { getUserProducts } from '@/lib/data/products';

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
- Server-side validation of user ownership
- CSRF protection via Supabase Auth

## SEO

```typescript
export const metadata = {
  title: 'My Listings | FoodShare',
  description: 'Manage your food sharing listings - create, edit, and organize your posts',
};
```

## Related

- [Authentication](../authentication/README.md) - Auth system
- [Storage](../storage/README.md) - Image uploads for posts
- [Admin](../admin/README.md) - Admin post management

---

[← Back to Features](../README.md) | [← Back to Index](../../00-INDEX.md)
