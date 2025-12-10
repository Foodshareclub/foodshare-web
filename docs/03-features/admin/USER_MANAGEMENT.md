# Admin User Management

User management interface for administrators to view, filter, and manage platform users.

---

## Overview

The admin user management system provides:

- User listing with search and filters
- Role management (JSONB-based roles)
- User statistics dashboard
- Pagination and sorting
- Bulk operations

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    /admin/users (Page)                       │
│                    Server Component                          │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐   │
│  │              AdminUsersClient                        │   │
│  │              Client Component                        │   │
│  │  ┌─────────────────────────────────────────────┐    │   │
│  │  │ Stats Cards │ Filters │ User Table │ Roles  │    │   │
│  │  └─────────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  lib/data/admin-users.ts                     │
│                  Server-side data layer                      │
├─────────────────────────────────────────────────────────────┤
│  getAdminUsers()     - Paginated user list with filters     │
│  getUserStats()      - Dashboard statistics                  │
│  getAdminUserById()  - Single user details                  │
└─────────────────────────────────────────────────────────────┘
```

---

## Components

### AdminUsersClient

Client component handling user management UI.

**Location**: `src/components/admin/AdminUsersClient.tsx`

**Props**:

```typescript
interface Props {
  initialUsers: AdminUserProfile[];
  initialTotal: number;
  initialPage: number;
  totalPages: number;
  stats: UserStats;
  filters: AdminUsersFilter;
}
```

**Features**:

- URL-based filter state (shareable links)
- Debounced search
- Role badge display
- User avatar with initials fallback
- Role editing modal

### UserRolesModal

Modal for editing user roles.

**Location**: `src/components/admin/UserRolesModal.tsx`

---

## Data Types

### AdminUserProfile

```typescript
interface AdminUserProfile {
  id: string;
  first_name: string | null;
  second_name: string | null;
  email: string | null;
  avatar_url: string | null;
  role: Record<string, boolean> | null; // JSONB roles
  is_active: boolean;
  is_verified: boolean;
  created_time: string;
  last_seen_at: string | null;
}
```

### AdminUsersFilter

```typescript
interface AdminUsersFilter {
  search?: string;
  role?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
  sortBy?: "created_time" | "last_seen_at" | "first_name" | "email";
  sortOrder?: "asc" | "desc";
}
```

### UserStats

```typescript
interface UserStats {
  total: number;
  active: number;
  verified: number;
  admins: number;
  newThisWeek: number;
}
```

---

## Role System

Users have a JSONB `role` field with boolean flags:

| Role                   | Description                 |
| ---------------------- | --------------------------- |
| `admin`                | Full platform administrator |
| `volunteer`            | Community volunteer         |
| `organization`         | Business/charity account    |
| `subscriber`           | Regular user (default)      |
| `fridge_coordinator`   | Community fridge manager    |
| `foodbank_coordinator` | Food bank manager           |

**Role Badge Colors**:

- Admin: Red
- Volunteer: Blue
- Organization: Purple
- Fridge Coordinator: Cyan
- Foodbank Coordinator: Orange

---

## UI Layout

```
┌─────────────────────────────────────────────────────────────┐
│  User Management                           [Refresh] [Export]│
├─────────────────────────────────────────────────────────────┤
│  [Total: 1,234] [Active: 1,100] [Verified: 950] [Admins: 5] │
├─────────────────────────────────────────────────────────────┤
│  🔍 Search users...    [Role ▼]  [Status ▼]  [Sort ▼]      │
├─────────────────────────────────────────────────────────────┤
│  Avatar │ Name          │ Email           │ Roles  │ Actions│
│  ───────┼───────────────┼─────────────────┼────────┼────────│
│  [👤]   │ John Doe      │ john@email.com  │ Admin  │ [⋮]   │
│  [👤]   │ Jane Smith    │ jane@email.com  │ User   │ [⋮]   │
└─────────────────────────────────────────────────────────────┘
                         [< 1 2 3 ... 10 >]
```

---

## Data Flow

### Read Flow

```
1. Page loads → Server Component fetches data
2. getAdminUsers(filters) → Supabase query
3. getUserStats() → Parallel stats query
4. Data passed to AdminUsersClient
5. Client renders with initial data
```

### Filter Flow

```
1. User changes filter → updateFilters()
2. URL params updated → router.push()
3. Page re-renders with new searchParams
4. Server fetches filtered data
5. Client receives updated props
```

---

## Caching

Uses Next.js `unstable_cache` with tags:

```typescript
// Cache tags
CACHE_TAGS.PROFILES;
CACHE_TAGS.ADMIN;
CACHE_TAGS.ADMIN_STATS;

// Durations
CACHE_DURATIONS.SHORT; // User list
CACHE_DURATIONS.ADMIN_STATS; // Statistics
```

Invalidate on user updates:

```typescript
import { invalidateTag } from "@/lib/data/cache-keys";

invalidateTag(CACHE_TAGS.PROFILES);
invalidateTag(CACHE_TAGS.ADMIN);
```

---

## Usage

### Page Implementation

```typescript
// app/admin/users/page.tsx
import { getAdminUsers, getUserStats } from '@/lib/data/admin-users';
import { AdminUsersClient } from '@/components/admin/AdminUsersClient';

export default async function AdminUsersPage({ searchParams }) {
  const filters = {
    search: searchParams.search,
    role: searchParams.role,
    page: Number(searchParams.page) || 1,
  };

  const [usersResult, stats] = await Promise.all([
    getAdminUsers(filters),
    getUserStats(),
  ]);

  return (
    <AdminUsersClient
      initialUsers={usersResult.users}
      initialTotal={usersResult.total}
      initialPage={usersResult.page}
      totalPages={usersResult.totalPages}
      stats={stats}
      filters={filters}
    />
  );
}
```

---

## Related Files

- `src/app/admin/users/page.tsx` - Page component
- `src/components/admin/AdminUsersClient.tsx` - Client component
- `src/components/admin/UserRolesModal.tsx` - Role editing modal
- `src/lib/data/admin-users.ts` - Data layer
- `src/app/actions/admin-users.ts` - Server actions (mutations)
