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
