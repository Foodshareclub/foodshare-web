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
  "r2.cloudflarestorage.com",
] as const;

/** Next's wildcard matcher does not include the bare hostname. Allow both explicitly. */
export const CONFIGURED_IMAGE_PATTERNS = CONFIGURED_IMAGE_HOSTS.flatMap((host) => [
  { protocol: "https" as const, hostname: host },
  { protocol: "https" as const, hostname: `**.${host}` },
]);

/**
 * Check if an image URL is valid and from a configured host
 * @param url - The image URL to validate
 * @returns true if the URL is valid and from a configured host
 */
export function isValidImageUrl(url: string | undefined): boolean {
  return normalizeImageUrl(url) !== undefined;
}

export function normalizeImageUrl(url: string | undefined): string | undefined {
  const value = url?.trim();
  if (!value || value.includes("\\")) return undefined;
  if (value.startsWith("/")) return value.startsWith("//") ? undefined : value;

  try {
    const parsed = new URL(value.includes("://") ? value : `https://${value}`);
    const supportedHost = CONFIGURED_IMAGE_HOSTS.some(
      (host) => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`),
    );
    if (parsed.protocol !== "https:" || parsed.username || parsed.password || !supportedHost) {
      return undefined;
    }
    return parsed.href;
  } catch {
    return undefined;
  }
}

/**
 * Get a fallback image URL for when the primary image is unavailable
 */
export function getFallbackImageUrl(): string {
  return "/images/placeholder-food.png";
}

/** Only backend-owned reference namespaces identify a representative photo. */
export function isReferenceImageUrl(value: string | undefined): boolean {
  const normalized = normalizeImageUrl(value);
  if (!normalized || normalized.startsWith("/")) return false;
  const url = new URL(normalized);
  if (url.origin !== "https://api.foodshare.club") return false;
  return /^\/storage\/v1\/object\/public\/(?:assets\/listing-reference\/[a-f0-9]{64}\/[^/]+|food-images\/[^/]+\/reference-covers\/[a-f0-9]{64}\.(?:jpeg|jpg|png|webp))$/.test(
    url.pathname,
  );
}

/** Only durable backend-owned generated covers identify an AI illustration. */
export function isGeneratedImageUrl(value: string | undefined): boolean {
  const normalized = normalizeImageUrl(value);
  if (!normalized || normalized.startsWith("/")) return false;
  const url = new URL(normalized);
  return (
    url.origin === "https://api.foodshare.club" &&
    /^\/storage\/v1\/object\/public\/food-images\/[^/]+\/generated-covers\/[a-f0-9]{64}\.(?:jpeg|jpg|png|webp)$/.test(
      url.pathname,
    )
  );
}
