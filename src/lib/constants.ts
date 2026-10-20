/**
 * Application-wide constants
 */

/**
 * Supabase Storage Bucket Names
 */
export const STORAGE_BUCKETS = {
  PROFILES: "profiles",
  POSTS: "posts",
  AVATARS: "avatars", // Legacy - if still in use
  USERS: "users", // Legacy - if still in use
} as const;

/**
 * Image Configuration
 */
export const IMAGE_CONFIG = {
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_TYPES: ["image/png", "image/jpeg", "image/webp"] as const,
  ALLOWED_EXTENSIONS: [".png", ".jpg", ".jpeg", ".webp"] as const,
} as const;

/**
 * API Configuration
 */
export const API_CONFIG = {
  TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
} as const;

/**
 * Pagination
 */
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;

/**
 * Routes
 */
export const ROUTES = {
  HOME: "/",
  PROFILE: "/profile",
  SETTINGS: "/settings",
  // Add other routes as needed
} as const;

/**
 * User Role IDs (from database roles table)
 * Use these constants instead of hardcoding role IDs
 */
export const ROLE_IDS = {
  /** Standard user role */
  USER: 1,
  /** Verified user role */
  VERIFIED_USER: 2,
  /** Moderator role */
  MODERATOR: 3,
  /** Admin role */
  ADMIN: 6,
  /** Superadmin role (full access) */
  SUPERADMIN: 7,
} as const;

/**
 * React Query Cache Times (milliseconds)
 * Centralized staleTime values for consistent caching across queries
 */
export const CACHE_TIMES = {
  /** 1 minute - for real-time data (search results, live updates) */
  INSTANT: 1 * 60 * 1000,
  /** 2 minutes - for frequently changing data */
  SHORT: 2 * 60 * 1000,
  /** 5 minutes - default for most queries */
  MEDIUM: 5 * 60 * 1000,
  /** 10 minutes - for stable data */
  LONG: 10 * 60 * 1000,
  /** 15 minutes - for semi-static data */
  EXTENDED: 15 * 60 * 1000,
  /** 30 minutes - for rarely changing data (avatars, categories) */
  STATIC: 30 * 60 * 1000,
  /** 1 hour - for static reference data */
  HOUR: 60 * 60 * 1000,
} as const;

/**
 * Post Type Configuration
 *
 * Centralized configuration for all post types in the application.
 * Used for badges, filters, category displays, and styling.
 */
export type PostTypeKey =
  | "food"
  | "thing"
  | "borrow"
  | "wanted"
  | "fridge"
  | "foodbank"
  | "volunteer"
  | "challenge"
  | "vegan"
  | "zerowaste"
  | "community"
  | "business";

export interface PostTypeConfig {
  /** Display label */
  label: string;
  /** Emoji icon */
  emoji: string;
  /** Tailwind classes for badge/text coloring (light + dark) */
  color: string;
  /** Tailwind classes for active/selected state backgrounds */
  bgActive: string;
  /** Primary color name for dynamic styling */
  primaryColor: string;
}

export const POST_TYPE_CONFIG: Record<string, PostTypeConfig> = {
  food: {
    label: "Food",
    emoji: "🍎",
    color: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
    bgActive: "bg-orange-500/20 border-orange-500/50",
    primaryColor: "orange",
  },
  thing: {
    label: "Thing",
    emoji: "📦",
    color: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    bgActive: "bg-blue-500/20 border-blue-500/50",
    primaryColor: "blue",
  },
  borrow: {
    label: "Borrow",
    emoji: "🤝",
    color: "bg-green-500/10 text-green-600 dark:text-green-400",
    bgActive: "bg-green-500/20 border-green-500/50",
    primaryColor: "green",
  },
  wanted: {
    label: "Wanted",
    emoji: "🔍",
    color: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    bgActive: "bg-purple-500/20 border-purple-500/50",
    primaryColor: "purple",
  },
  fridge: {
    label: "Fridge",
    emoji: "🧊",
    color: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
    bgActive: "bg-cyan-500/20 border-cyan-500/50",
    primaryColor: "cyan",
  },
  foodbank: {
    label: "Food Bank",
    emoji: "🏦",
    color: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    bgActive: "bg-amber-500/20 border-amber-500/50",
    primaryColor: "amber",
  },
  volunteer: {
    label: "Volunteer",
    emoji: "💪",
    color: "bg-pink-500/10 text-pink-600 dark:text-pink-400",
    bgActive: "bg-pink-500/20 border-pink-500/50",
    primaryColor: "pink",
  },
  challenge: {
    label: "Challenge",
    emoji: "🏆",
    color: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
    bgActive: "bg-yellow-500/20 border-yellow-500/50",
    primaryColor: "yellow",
  },
  vegan: {
    label: "Vegan",
    emoji: "🌱",
    color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    bgActive: "bg-emerald-500/20 border-emerald-500/50",
    primaryColor: "emerald",
  },
  zerowaste: {
    label: "Zero Waste",
    emoji: "♻️",
    color: "bg-teal-500/10 text-teal-600 dark:text-teal-400",
    bgActive: "bg-teal-500/20 border-teal-500/50",
    primaryColor: "teal",
  },
  community: {
    label: "Community",
    emoji: "🏘️",
    color: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
    bgActive: "bg-indigo-500/20 border-indigo-500/50",
    primaryColor: "indigo",
  },
  business: {
    label: "Business",
    emoji: "🏢",
    color: "bg-slate-500/10 text-slate-600 dark:text-slate-400",
    bgActive: "bg-slate-500/20 border-slate-500/50",
    primaryColor: "slate",
  },
} as const;

/** Default config for unknown post types */
export const DEFAULT_POST_TYPE_CONFIG: PostTypeConfig = {
  label: "Item",
  emoji: "📋",
  color: "bg-gray-500/10 text-gray-600 dark:text-gray-400",
  bgActive: "bg-gray-500/20 border-gray-500/50",
  primaryColor: "gray",
};

/** Helper to get config for a post type with fallback */
export function getPostTypeConfig(postType: string): PostTypeConfig {
  return POST_TYPE_CONFIG[postType?.toLowerCase()] ?? DEFAULT_POST_TYPE_CONFIG;
}

/** Get all available post types */
export function getPostTypes(): string[] {
  return Object.keys(POST_TYPE_CONFIG);
}
