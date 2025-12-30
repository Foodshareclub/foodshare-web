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
