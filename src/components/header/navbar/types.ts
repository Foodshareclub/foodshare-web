import type { CustomRoomType } from "@/api/chatAPI";

// ============================================================================
// Navbar Core Types
// ============================================================================

/**
 * Visual state variants for the navbar
 */
export type NavbarVariant = "expanded" | "compact" | "hidden";

/**
 * Page types for navigation
 */
export type PagesType = "productComponent" | "profileSettings";

/**
 * Category item definition
 */
export interface CategoryItem {
  /** Unique identifier for the category */
  id: string;
  /** Display label for the category */
  label: string;
  /** Icon path or SVG string */
  icon: string;
  /** ARIA label for accessibility */
  ariaLabel?: string;
  /** Route path for navigation */
  route?: string;
}

// ============================================================================
// Main Navbar Props
// ============================================================================

/**
 * Props for the main Navbar component
 */
export interface NavbarProps {
  /** Current user ID (if authenticated) */
  userId?: string;
  /** User authentication status */
  isAuth: boolean;
  /** Whether user is admin */
  isAdmin?: boolean;
  /** Current product type/category */
  productType: string;
  /** Route change handler */
  onRouteChange: (route: string) => void;
  /** Product type change handler */
  onProductTypeChange: (type: string) => void;
  /** User avatar image URL */
  imgUrl?: string;
  /** User first name */
  firstName?: string;
  /** User last name */
  secondName?: string;
  /** User email address */
  email?: string;
  /** Array of new message signals */
  signalOfNewMessage?: CustomRoomType[];
  /** Enable map mode - category clicks navigate to /map/{category} instead of /{category} */
  mapMode?: boolean;
}

/**
 * Internal state for the Navbar component
 */
export interface NavbarState {
  /** Current visual variant */
  variant: NavbarVariant;
  /** Search modal open state */
  isSearchOpen: boolean;
  /** Filter modal open state */
  isFilterOpen: boolean;
  /** Current scroll Y position */
  scrollY: number;
  /** Scroll direction */
  direction: "up" | "down" | "none";
}

// ============================================================================
// Menu Component Props
// ============================================================================

/**
 * Props for ProfileSettings/DesktopMenu component
 */
export interface ProfileSettingsProps {
  /** Array of new message/room signals */
  signalOfNewMessage: Array<CustomRoomType>;
  /** Navigate to About Us page */
  navigateToAboutUs: () => void;
  /** Navigate to My Lists page */
  navigateToMyLists: () => void;
  /** Logout handler */
  navigateToLogout: () => void;
  /** Navigate to Account Settings */
  navigateToAccSettings: () => void;
  /** Navigate to Help page */
  navigateToHelp: () => void;
  /** Navigate to Messages page */
  navigateToMyMessages: () => void;
  /** User avatar image URL */
  imgUrl: string;
  /** User authentication status */
  isAuth: boolean;
  /** Drawer size variant (for mobile) */
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "full";
  /** User first name */
  firstName?: string;
  /** User last name */
  secondName?: string;
  /** User email address */
  email?: string;
}

// ============================================================================
// Navigation Handler Props
// ============================================================================

/**
 * Common navigation handlers used across navbar components
 */
export interface NavigationHandlers {
  /** Navigate to My Lists page */
  onNavigateToMyLists: () => void;
  /** Logout handler */
  onNavigateToLogout: () => void;
  /** Navigate to Account Settings */
  onNavigateToAccSettings: () => void;
  /** Navigate to Help page */
  onNavigateToHelp: () => void;
  /** Navigate to About Us page */
  onNavigateToAboutUs: () => void;
  /** Navigate to Messages page */
  onNavigateToMyMessages: () => void;
}

/**
 * User information props
 */
export interface UserInfo {
  /** User authentication status */
  isAuth: boolean;
  /** User ID (optional) */
  userId?: string;
  /** User avatar image URL */
  imgUrl?: string;
  /** User first name */
  firstName?: string;
  /** User last name */
  secondName?: string;
  /** User email address */
  email?: string;
  /** Array of new message signals */
  signalOfNewMessage: CustomRoomType[];
}

// ============================================================================
// Responsive Breakpoints
// ============================================================================

/**
 * Breakpoint sizes for responsive design
 */
export type BreakpointSize = "mobile" | "tablet" | "desktop" | "largeDesktop";

/**
 * Navbar size variants for different screen sizes
 */
export type NavbarSize = "compact" | "full";

// ============================================================================
// Search Types
// ============================================================================

/**
 * Search suggestion types
 */
export type SearchSuggestionType = "history" | "popular" | "suggestion";

/**
 * Search suggestion item
 */
export interface SearchSuggestion {
  /** Unique identifier */
  id: string;
  /** Search text */
  text: string;
  /** Type of suggestion */
  type: SearchSuggestionType;
  /** Associated category */
  category?: string;
  /** Popularity count */
  count?: number;
}

// ============================================================================
// Accessibility Types
// ============================================================================

/**
 * ARIA role types for navbar components
 */
export type AriaRole = "navigation" | "menu" | "menuitem" | "tab" | "tablist" | "button";

/**
 * Keyboard navigation keys
 */
export type NavigationKey =
  | "ArrowUp"
  | "ArrowDown"
  | "ArrowLeft"
  | "ArrowRight"
  | "Enter"
  | "Escape"
  | "Home"
  | "End"
  | "Tab";
