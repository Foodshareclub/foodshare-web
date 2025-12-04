/**
 * Image Utilities
 * Shared image validation and processing functions
 */

/**
 * Configured image hostnames that are allowed in next.config.ts
 * Update this list when adding new image sources
 */
export const CONFIGURED_IMAGE_HOSTS = [
  'supabase.co',
  'firebasestorage.googleapis.com',
] as const;

/**
 * Check if an image URL is valid and from a configured host
 * @param url - The image URL to validate
 * @returns true if the URL is valid and from a configured host
 */
export function isValidImageUrl(url: string | undefined): boolean {
  if (!url) return false;
  if (url.startsWith('/')) return true; // Local images are always valid

  try {
    const urlObj = new URL(url);
    // Check if hostname matches any configured host (including subdomains)
    return CONFIGURED_IMAGE_HOSTS.some(host =>
      urlObj.hostname === host || urlObj.hostname.endsWith('.' + host)
    );
  } catch {
    return false;
  }
}

/**
 * Get a fallback image URL for when the primary image is unavailable
 */
export function getFallbackImageUrl(): string {
  return '/images/placeholder-food.png';
}
