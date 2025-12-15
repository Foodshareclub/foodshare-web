/**
 * Storage Bucket Constants
 * Centralized bucket names for Supabase Storage
 */

/** Default avatar URL for unauthenticated users or users without a profile picture */
export const DEFAULT_AVATAR_URL =
  "https://***REMOVED***.supabase.co/storage/v1/object/public/profiles/cuties/cute-strawberry.png";

export const STORAGE_BUCKETS = {
  /** User profile pictures and avatars (public) */
  PROFILES: "profiles",

  /** User avatar images (public) */
  AVATARS: "avatars",

  /** Post/listing images - food photos (public) */
  POSTS: "posts",

  /** Country/region flags (public) */
  FLAGS: "flags",

  /** Forum discussion attachments (public) */
  FORUM: "forum",

  /** Challenge images (public) */
  CHALLENGES: "challenges",

  /** Room/chat images (public) */
  ROOMS: "rooms",

  /** General application assets - videos, docs, etc (public) */
  ASSETS: "assets",
} as const;

export type StorageBucket = (typeof STORAGE_BUCKETS)[keyof typeof STORAGE_BUCKETS];

/**
 * Allowed MIME types per bucket
 * Exported for validation scripts and components
 */
export const ALLOWED_MIME_TYPES = {
  PROFILES: ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif", "image/avif"],
  AVATARS: ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif", "image/avif"],
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

/**
 * Maximum file sizes per bucket (in bytes)
 * null = no limit
 */
export const MAX_FILE_SIZES = {
  PROFILES: 5 * 1024 * 1024, // 5MB
  AVATARS: 5 * 1024 * 1024, // 5MB
  POSTS: 10 * 1024 * 1024, // 10MB
  FLAGS: 2 * 1024 * 1024, // 2MB
  FORUM: 10 * 1024 * 1024, // 10MB
  CHALLENGES: 5 * 1024 * 1024, // 5MB
  ROOMS: 5 * 1024 * 1024, // 5MB
  ASSETS: 50 * 1024 * 1024, // 50MB
} as const;

/**
 * Get public URL for a storage object
 * Automatically uses R2 URL if configured, otherwise Supabase
 *
 * @param bucket - Storage bucket name
 * @param path - File path within bucket
 * @returns Full public URL
 */
export const getStorageUrl = (bucket: StorageBucket, path: string): string => {
  const r2PublicUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;

  // Use R2 if configured (primary storage)
  if (r2PublicUrl) {
    return `${r2PublicUrl}/${bucket}/${path}`;
  }

  // Fallback to Supabase
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return `${baseUrl}/storage/v1/object/public/${bucket}/${path}`;
};

/**
 * Get signed URL for private storage objects
 * Use this for private buckets like profiles
 */
export const getSignedStorageUrl = async (
  _bucket: StorageBucket,
  _path: string,
  _expiresIn: number = 3600
): Promise<string | null> => {
  // This would use the storageAPI.createSignedUrl method
  // Implementation depends on your storage API setup
  return null;
};

/**
 * Validate file type against bucket's allowed MIME types
 * @param file - File to validate
 * @param bucket - Target storage bucket
 * @returns true if valid, false otherwise
 */
export const isValidFileType = (file: File, bucket: keyof typeof STORAGE_BUCKETS): boolean => {
  const allowedTypes = ALLOWED_MIME_TYPES[bucket] as readonly string[];
  return allowedTypes.includes(file.type);
};

/**
 * Validate file size against bucket's maximum
 * @param file - File to validate
 * @param bucket - Target storage bucket
 * @returns true if valid, false otherwise
 */
export const isValidFileSize = (file: File, bucket: keyof typeof STORAGE_BUCKETS): boolean => {
  const maxSize = MAX_FILE_SIZES[bucket];
  return file.size <= maxSize;
};

/**
 * Validate file before upload
 * @param file - File to validate
 * @param bucket - Target storage bucket
 * @returns Validation result with error message if invalid
 */
export const validateFile = (
  file: File,
  bucket: keyof typeof STORAGE_BUCKETS
): { valid: boolean; error?: string } => {
  if (!isValidFileType(file, bucket)) {
    const allowedTypes = ALLOWED_MIME_TYPES[bucket]
      .map((type) => type.split("/")[1].toUpperCase())
      .join(", ");
    return {
      valid: false,
      error: `Invalid file type. Allowed types: ${allowedTypes}`,
    };
  }

  if (!isValidFileSize(file, bucket)) {
    const maxSizeMB = MAX_FILE_SIZES[bucket] / (1024 * 1024);
    return {
      valid: false,
      error: `File too large. Maximum size: ${maxSizeMB}MB`,
    };
  }

  return { valid: true };
};

/**
 * Get human-readable file size
 * @param bytes - File size in bytes
 * @returns Formatted string (e.g., "2.5 MB")
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
};
