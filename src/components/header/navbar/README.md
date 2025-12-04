# Navbar Components

Modern, componentized navbar implementation following Atomic Design principles.

## Structure

- **atoms/** - Smallest reusable components (Avatar, IconButton, MenuItem, CategoryItem)
- **organisms/** - Complex components (CategoryNavigation, MobileMenu, DesktopMenu, NavbarActions)
- **hooks/** - Custom hooks (useSearchSuggestions)
- **types.ts** - TypeScript definitions
- **constants.ts** - Design tokens

## Usage

```tsx
import { NavbarAvatar, MenuItem } from "@/components/header/navbar/atoms";
import { MobileMenu, DesktopMenu } from "@/components/header/navbar/organisms";
```

See full documentation in this file.
