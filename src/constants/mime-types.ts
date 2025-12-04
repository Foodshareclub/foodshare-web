/**
 * MIME Types Constants
 * Isolated file with zero dependencies to prevent bundling issues
 * Do NOT import anything in this file
 */

/**
 * Allowed MIME types per bucket
 * Matches Supabase bucket configuration
 */
export const ALLOWED_MIME_TYPES = {
  PROFILES: ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif", "image/avif"],
  POSTS: [
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
    "image/gif",
    "image/avif",
    "image/heic",
    "image/heif",
  ],
  FLAGS: [
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
    "image/gif",
    "image/svg+xml",
    "image/avif",
  ],
  FORUM: [
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
    "image/gif",
    "image/avif",
    "application/pdf",
    "text/plain",
  ],
  CHALLENGES: ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif", "image/avif"],
  ROOMS: ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif", "image/avif"],
  ASSETS: [
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
    "image/gif",
    "image/svg+xml",
    "image/avif",
    "application/pdf",
    "text/plain",
    "text/css",
    "application/json",
    "video/mp4",
    "video/webm",
  ],
} as const;
