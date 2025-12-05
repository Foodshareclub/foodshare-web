/**
 * Centralized Cache Keys & Tags
 *
 * Single source of truth for all cache tags used with unstable_cache and revalidateTag.
 * This ensures consistency across data fetching and cache invalidation.
 */

// ============================================================================
// Cache Tags - Used with unstable_cache and revalidateTag
// ============================================================================

export const CACHE_TAGS = {
  // Products
  PRODUCTS: 'products',
  PRODUCTS_BY_TYPE: (type: string) => `products-${type}`,
  PRODUCT: (id: number) => `product-${id}`,
  PRODUCT_LOCATIONS: 'product-locations',
  PRODUCT_LOCATIONS_BY_TYPE: (type: string) => `product-locations-${type}`,
  USER_PRODUCTS: (userId: string) => `user-products-${userId}`,
  PRODUCT_SEARCH: 'product-search',

  // Profiles
  PROFILES: 'profiles',
  PROFILE: (id: string) => `profile-${id}`,
  PROFILE_STATS: (id: string) => `profile-stats-${id}`,
  PROFILE_REVIEWS: (id: string) => `profile-reviews-${id}`,
  VOLUNTEERS: 'volunteers',

  // Forum
  FORUM: 'forum',
  FORUM_POST: (id: number) => `forum-post-${id}`,
  FORUM_COMMENTS: (postId: number) => `forum-comments-${postId}`,

  // Chat
  CHATS: 'chats',
  CHAT: (id: string) => `chat-${id}`,
  CHAT_MESSAGES: (chatId: string) => `chat-messages-${chatId}`,

  // Admin
  ADMIN: 'admin',
  ADMIN_STATS: 'admin-stats',
  ADMIN_LISTINGS: 'admin-listings',
  AUDIT_LOGS: 'audit-logs',

  // Auth
  AUTH: 'auth',
  SESSION: 'session',
} as const;

// ============================================================================
// Cache Durations (in seconds)
// ============================================================================

export const CACHE_DURATIONS = {
  // Short-lived (frequently changing data)
  SHORT: 60, // 1 minute
  
  // Medium (moderately changing data)
  MEDIUM: 300, // 5 minutes
  
  // Long (rarely changing data)
  LONG: 3600, // 1 hour
  
  // Very long (static-ish data)
  VERY_LONG: 86400, // 24 hours

  // Specific durations
  PRODUCTS: 60, // 1 minute - products change frequently
  PRODUCT_DETAIL: 120, // 2 minutes
  PRODUCT_LOCATIONS: 300, // 5 minutes - map data
  PROFILES: 300, // 5 minutes
  PROFILE_STATS: 600, // 10 minutes
  VOLUNTEERS: 3600, // 1 hour
  FORUM: 120, // 2 minutes
  ADMIN_STATS: 300, // 5 minutes
  STATIC_PAGES: 86400, // 24 hours
} as const;

// ============================================================================
// Cache Profiles for revalidateTag (Next.js 16)
// ============================================================================

export const CACHE_PROFILES = {
  DEFAULT: 'default',
  INSTANT: { expire: 0 },
} as const;

// ============================================================================
// Helper function for revalidation (Next.js 16 requires profile)
// ============================================================================

import { revalidateTag as nextRevalidateTag } from 'next/cache';

/**
 * Revalidate a cache tag with default profile
 * Wrapper around Next.js 16's revalidateTag which requires a profile
 */
export function invalidateTag(tag: string): void {
  nextRevalidateTag(tag, CACHE_PROFILES.DEFAULT);
}

// ============================================================================
// Helper to get all tags for a category (for bulk invalidation)
// ============================================================================

export function getProductTags(productId?: number, type?: string): string[] {
  const tags: string[] = [CACHE_TAGS.PRODUCTS, CACHE_TAGS.PRODUCT_LOCATIONS];
  if (productId) tags.push(CACHE_TAGS.PRODUCT(productId));
  if (type) {
    tags.push(CACHE_TAGS.PRODUCTS_BY_TYPE(type));
    tags.push(CACHE_TAGS.PRODUCT_LOCATIONS_BY_TYPE(type));
  }
  return tags;
}

export function getProfileTags(profileId: string): string[] {
  return [
    CACHE_TAGS.PROFILES,
    CACHE_TAGS.PROFILE(profileId),
    CACHE_TAGS.PROFILE_STATS(profileId),
    CACHE_TAGS.PROFILE_REVIEWS(profileId),
  ];
}

export function getForumTags(postId?: number): string[] {
  const tags: string[] = [CACHE_TAGS.FORUM];
  if (postId) {
    tags.push(CACHE_TAGS.FORUM_POST(postId));
    tags.push(CACHE_TAGS.FORUM_COMMENTS(postId));
  }
  return tags;
}
