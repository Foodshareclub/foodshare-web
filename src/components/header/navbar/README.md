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

```tsx
import { NavbarWrapper } from '@/components/header/navbar/NavbarWrapper';

// In a layout file
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <NavbarWrapper defaultProductType="food" />
      <main>{children}</main>
    </div>
  );
}
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `defaultProductType` | `string` | `'food'` | Initial product type for category filtering |

### Features

- Fetches current user auth state via `useAuth`
- Loads user profile and avatar via `useCurrentProfile`
- Handles route changes with `router.push()`
- Manages product type state internally
- Passes all required props to the underlying `Navbar` component

See full documentation in `docs/03-features/navbar/README.md`.
