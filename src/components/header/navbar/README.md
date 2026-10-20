# Navbar Components

Modern, componentized navbar implementation following Atomic Design principles.

## Structure

- **atoms/** - Smallest reusable components (Avatar, IconButton, MenuItem, CategoryItem)
- **organisms/** - Complex components (CategoryNavigation, MobileMenu, DesktopMenu, NavbarActions)
- **hooks/** - Custom hooks (useSearchSuggestions)
- **NavbarWrapper.tsx** - Client-side wrapper for Server Component layouts
- **types.ts** - TypeScript definitions
- **constants.ts** - Design tokens

## Usage

```tsx
import { NavbarAvatar, MenuItem } from "@/components/header/navbar/atoms";
import { MobileMenu, DesktopMenu } from "@/components/header/navbar/organisms";
```

## NavbarWrapper

Client-side wrapper that handles auth state and navigation, allowing parent layouts to remain Server Components for better SEO.

> **Note:** The `NavbarWrapper` is included in the **root layout** (`app/layout.tsx`). Most route-specific layouts should be simple pass-through components that just render `{children}`.

```tsx
// Most route layouts should be simple pass-through:
export default function MyRouteLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
```

### API Reference

If you need to use NavbarWrapper directly (e.g., in the root layout):

```tsx
import { NavbarWrapper } from "@/components/header/navbar/NavbarWrapper";
import { getAuthSession } from "@/lib/data/auth";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthSession(); // Fetch user on server for immediate avatar display

  return (
    <div className="min-h-screen">
      <NavbarWrapper defaultProductType="food" initialUser={user} />
      <main>{children}</main>
    </div>
  );
}
```

### Props

| Prop                 | Type               | Default     | Description                                         |
| -------------------- | ------------------ | ----------- | --------------------------------------------------- |
| `defaultProductType` | `string`           | `'food'`    | Initial product type for category filtering         |
| `initialUser`        | `AuthUser \| null` | `undefined` | Server-fetched user data to prevent loading flicker |

### Features

- Fetches current user auth state via `useAuth`
- Loads user profile and avatar via `useCurrentProfile`
- **Supports server-side initial user data** to prevent avatar loading flicker
- **Caches last known good avatar URL** to prevent flicker during navigation
- Handles route changes with `router.push()`
- Manages product type state internally
- Passes all required props to the underlying `Navbar` component
- Falls back gracefully from server data to client-fetched data

### Avatar URL Resolution

The component uses a server-first fallback chain to ensure the avatar is always displayed immediately without flicker:

1. **Server-provided avatar URL** - From `initialUser.profile.avatar_url` prop (displayed immediately on page load)
2. **Client-fetched profile avatar_url** - From `useCurrentProfile` hook (used after query loads; avatar URLs are stored as full URLs in the database)
3. **Default avatar** - The Avatar component handles empty/invalid URLs with a default fallback

This server-first approach ensures smooth transitions during:

- Initial page load (immediate display without waiting for client queries)
- Navigation between pages
- Auth state changes

> **Note:** Avatar URLs are stored as complete URLs in the database, so no URL resolution is needed at runtime.

See full documentation in `docs/03-features/navbar/README.md`.
