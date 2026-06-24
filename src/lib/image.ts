/**
 * Image Utilities
 * Shared image validation and processing functions
 */

/**
 * Configured image hostnames that are allowed in next.config.ts
 * Update this list when adding new image sources
 */
export const CONFIGURED_IMAGE_HOSTS = [
  "supabase.co",
  "foodshare.club",
  "firebasestorage.googleapis.com",
] as const;

/**
 * Check if an image URL is valid and from a configured host
 * @param url - The image URL to validate
 * @returns true if the URL is valid and from a configured host
 */
export function isValidImageUrl(url: string | undefined): boolean {
  if (!url) return false;
  if (url.startsWith("/")) return true; // Local images are always valid

  try {
    // Auto-prepend https:// if it looks like a domain without a protocol
    const urlToTest = url.includes("://") ? url : `https://${url}`;
    const urlObj = new URL(urlToTest);
    return urlObj.protocol === "http:" || urlObj.protocol === "https:";
  } catch {
    return false;
  }
}

export function normalizeImageUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith("/")) return url;
  if (!url.includes("://")) return `https://${url}`;
  return url;
}

/**
 * Get a fallback image URL for when the primary image is unavailable
 */
export function getFallbackImageUrl(): string {
  return "/images/placeholder-food.png";
}
