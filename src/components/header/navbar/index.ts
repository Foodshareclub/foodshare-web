/**
 * Navbar Components - Main Export
 *
 * Modern, componentized navbar following Atomic Design principles.
 *
 * Structure:
 * - atoms/      - Smallest reusable components (Avatar, IconButton, MenuItem, CategoryItem)
 * - molecules/  - Combinations of atoms (not yet implemented)
 * - organisms/  - Complex feature components (CategoryNavigation, MobileMenu, DesktopMenu, NavbarActions)
 * - hooks/      - Custom hooks for navbar functionality
 * - types.ts    - TypeScript type definitions
 * - constants.ts - Design tokens and constants
 *
 * @example
 * ```tsx
 * import { Navbar, NavbarLogo } from '@/components/header/navbar';
 * import { CategoryNavigation } from '@/components/header/navbar/organisms';
 * import { NavbarAvatar } from '@/components/header/navbar/atoms';
 * ```
 */

// ============================================================================
// Main Components
// ============================================================================

export { default as Navbar } from "./Navbar";
export { default as NavbarLogo } from "./NavbarLogo";

// SearchBar (enhanced version with real-time suggestions)
export { default as SearchBar } from "./SearchBar";

// ============================================================================
// Atomic Components
// ============================================================================

export { NavbarAvatar, IconButton, MenuItem, CategoryItem } from "./atoms";
export type { NavbarAvatarProps, IconButtonProps, MenuItemProps, CategoryItemProps } from "./atoms";

// ============================================================================
// Organism Components
// ============================================================================

export { CategoryNavigation, MobileMenu, DesktopMenu, NavbarActions } from "./organisms";
export type {
  CategoryNavigationProps,
  MobileMenuProps,
  DesktopMenuProps,
  NavbarActionsProps,
} from "./organisms";

// ============================================================================
// Hooks
// ============================================================================

export { useSearchSuggestions, clearSearchHistory } from "./hooks";
export type { SearchSuggestion } from "./hooks";

// ============================================================================
// Types
// ============================================================================

export type {
  NavbarProps,
  NavbarVariant,
  NavbarState,
  CategoryItem as CategoryItemType,
  ProfileSettingsProps,
  NavigationHandlers,
  UserInfo,
  PagesType,
  BreakpointSize,
  NavbarSize,
  SearchSuggestionType,
  AriaRole,
  NavigationKey,
} from "./types";

// ============================================================================
// Constants
// ============================================================================

export {
  COLORS,
  TYPOGRAPHY,
  SPACING,
  SHADOWS,
  TRANSITIONS,
  BREAKPOINTS,
  Z_INDEX,
  ANIMATION,
} from "./constants";
