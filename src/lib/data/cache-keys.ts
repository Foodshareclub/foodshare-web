/**
 * Centralized Cache Keys & Tags
 *
 * Single source of truth for all cache tags used with unstable_cache and revalidateTag.
 * This ensures consistency across data fetching and cache invalidation.
 */

// ============================================================================
// Development Cache Logging
// ============================================================================

const IS_DEV = process.env.NODE_ENV === "development";

/**
 * Log cache operations in development
 */
function logCacheOperation(
  operation: "hit" | "miss" | "set" | "invalidate",
  key: string,
  metadata?: Record<string, unknown>
): void {
  if (!IS_DEV) return;

  const emoji =
    operation === "hit" ? "✅" : operation === "miss" ? "❌" : operation === "set" ? "💾" : "🗑️";
  const color =
    operation === "hit"
      ? "\x1b[32m"
      : operation === "miss"
        ? "\x1b[33m"
        : operation === "set"
          ? "\x1b[36m"
          : "\x1b[35m";
  const reset = "\x1b[0m";
  const time = new Date().toISOString().split("T")[1].slice(0, 12);

  const metaStr = metadata ? ` ${JSON.stringify(metadata)}` : "";
  console.log(
    `${emoji} ${color}[${time}] CACHE ${operation.toUpperCase()}${reset} ${key}${metaStr}`
  );
}

// ============================================================================
// Cache Tags - Used with unstable_cache and revalidateTag
// ============================================================================

export const CACHE_TAGS = {
  // Products
  PRODUCTS: "products",
  PRODUCTS_BY_TYPE: (type: string) => `products-${type}`,
  PRODUCT: (id: number) => `product-${id}`,
  PRODUCT_LOCATIONS: "product-locations",
  PRODUCT_LOCATIONS_BY_TYPE: (type: string) => `product-locations-${type}`,
  USER_PRODUCTS: (userId: string) => `user-products-${userId}`,
  PRODUCT_SEARCH: "product-search",

  // Nearby Posts (PostGIS geo-queries)
  NEARBY_POSTS: "nearby-posts",
  NEARBY_POSTS_COUNTS: "nearby-posts-counts",

  // Profiles
  PROFILES: "profiles",
  PROFILE: (id: string) => `profile-${id}`,
  PROFILE_STATS: (id: string) => `profile-stats-${id}`,
  PROFILE_REVIEWS: (id: string) => `profile-reviews-${id}`,
  VOLUNTEERS: "volunteers",

  // Challenges
  CHALLENGES: "challenges",
  CHALLENGE: (id: number) => `challenge-${id}`,
  USER_CHALLENGES: (userId: string) => `user-challenges-${userId}`,
  CHALLENGE_LEADERBOARD: "challenge-leaderboard",
  LEADERBOARD_USER: (id: string) => `leaderboard-user-${id}`,

  // Forum
  FORUM: "forum",
  FORUM_POST: (id: number) => `forum-post-${id}`,
  FORUM_COMMENTS: (postId: number) => `forum-comments-${postId}`,

  // Chat
  CHATS: "chats",
  CHAT: (id: string) => `chat-${id}`,
  CHAT_MESSAGES: (chatId: string) => `chat-messages-${chatId}`,

  // Admin
  ADMIN: "admin",
  ADMIN_STATS: "admin-stats",
  ADMIN_LISTINGS: "admin-listings",
  ADMIN_USERS: "admin-users",
  ADMIN_REPORTS: "admin-reports",
  ADMIN_CRM: "admin-crm",
  AUDIT_LOGS: "audit-logs",

  // Post Activity Logs
  POST_ACTIVITY: "post-activity",
  POST_ACTIVITY_LOGS: (postId: number) => `post-activity-${postId}`,
  USER_ACTIVITY: (userId: string) => `user-activity-${userId}`,
  POST_ACTIVITY_STATS: "post-activity-stats",

  // Newsletter & Campaigns
  NEWSLETTER: "newsletter",
  CAMPAIGNS: "campaigns",
  CAMPAIGN: (id: string) => `campaign-${id}`,
  SEGMENTS: "segments",
  SEGMENT: (id: string) => `segment-${id}`,
  AUTOMATIONS: "automations",
  AUTOMATION: (id: string) => `automation-${id}`,
  SUBSCRIBERS: "subscribers",

  // Auth
  AUTH: "auth",
  SESSION: "session",

  // Notifications
  NOTIFICATIONS: "notifications",
  NOTIFICATIONS_UNREAD: "notifications-unread",
  USER_NOTIFICATIONS: (userId: string) => `user-notifications-${userId}`,

  // Email System
  EMAIL_HEALTH: "email-health",
  PROVIDER_HEALTH: "provider-health",
  PROVIDER_QUOTAS: "provider-quotas",
  EMAIL_QUEUE: "email-queue",
  EMAIL_LOGS: "email-logs",
  EMAIL_STATS: "email-stats",
  PROVIDER_METRICS: "provider-metrics",
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
  NEARBY_POSTS: 60, // 1 minute - location-based data changes frequently
  PROFILES: 300, // 5 minutes
  PROFILE_STATS: 600, // 10 minutes
  VOLUNTEERS: 3600, // 1 hour
  CHALLENGES: 300, // 5 minutes
  CHALLENGE_DETAIL: 300, // 5 minutes
  CHALLENGE_LEADERBOARD: 120, // 2 minutes - leaderboard updates frequently
  FORUM: 120, // 2 minutes
  ADMIN_STATS: 300, // 5 minutes
  NEWSLETTER: 300, // 5 minutes
  CAMPAIGNS: 300, // 5 minutes
  SEGMENTS: 600, // 10 minutes
  AUTOMATIONS: 600, // 10 minutes
  STATIC_PAGES: 86400, // 24 hours

  // Email system
  EMAIL_HEALTH: 60, // 1 minute - health data needs to be fresh
  PROVIDER_HEALTH: 60, // 1 minute
  PROVIDER_QUOTAS: 30, // 30 seconds - quota data changes frequently
  EMAIL_QUEUE: 30, // 30 seconds - queue changes frequently
  EMAIL_LOGS: 300, // 5 minutes
  EMAIL_STATS: 300, // 5 minutes
  PROVIDER_METRICS: 120, // 2 minutes
} as const;

// ============================================================================
// Cache Profiles for revalidateTag (Next.js 16)
// ============================================================================

export const CACHE_PROFILES = {
  DEFAULT: "default",
  INSTANT: { expire: 0 },
} as const;

// ============================================================================
// Helper function for revalidation (Next.js 16 requires profile)
// ============================================================================

import { revalidateTag as nextRevalidateTag } from "next/cache";

/**
 * Revalidate a cache tag with default profile
 * Wrapper around Next.js 16's revalidateTag which requires a profile
 */
export function invalidateTag(tag: string): void {
  logCacheOperation("invalidate", tag);
  nextRevalidateTag(tag, CACHE_PROFILES.DEFAULT);
}

// Export for use in data functions
export { logCacheOperation };

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

export function getChallengeTags(challengeId?: number): string[] {
  const tags: string[] = [CACHE_TAGS.CHALLENGES];
  if (challengeId) {
    tags.push(CACHE_TAGS.CHALLENGE(challengeId));
  }
  return tags;
}

export function getNotificationTags(userId?: string): string[] {
  const tags: string[] = [CACHE_TAGS.NOTIFICATIONS, CACHE_TAGS.NOTIFICATIONS_UNREAD];
  if (userId) {
    tags.push(CACHE_TAGS.USER_NOTIFICATIONS(userId));
  }
  return tags;
}

export function getAdminTags(): string[] {
  return [
    CACHE_TAGS.ADMIN,
    CACHE_TAGS.ADMIN_STATS,
    CACHE_TAGS.ADMIN_LISTINGS,
    CACHE_TAGS.ADMIN_USERS,
    CACHE_TAGS.ADMIN_REPORTS,
    CACHE_TAGS.ADMIN_CRM,
    CACHE_TAGS.AUDIT_LOGS,
  ];
}

export function getNewsletterTags(
  campaignId?: string,
  segmentId?: string,
  automationId?: string
): string[] {
  const tags: string[] = [
    CACHE_TAGS.NEWSLETTER,
    CACHE_TAGS.CAMPAIGNS,
    CACHE_TAGS.SEGMENTS,
    CACHE_TAGS.AUTOMATIONS,
    CACHE_TAGS.SUBSCRIBERS,
  ];
  if (campaignId) tags.push(CACHE_TAGS.CAMPAIGN(campaignId));
  if (segmentId) tags.push(CACHE_TAGS.SEGMENT(segmentId));
  if (automationId) tags.push(CACHE_TAGS.AUTOMATION(automationId));
  return tags;
}

/**
 * Invalidate all admin-related caches
 */
export function invalidateAdminCaches(): void {
  getAdminTags().forEach((tag) => invalidateTag(tag));
}

export function getPostActivityTags(postId?: number, userId?: string): string[] {
  const tags: string[] = [CACHE_TAGS.POST_ACTIVITY, CACHE_TAGS.POST_ACTIVITY_STATS];
  if (postId) tags.push(CACHE_TAGS.POST_ACTIVITY_LOGS(postId));
  if (userId) tags.push(CACHE_TAGS.USER_ACTIVITY(userId));
  return tags;
}

/**
 * Invalidate post activity caches
 */
export function invalidatePostActivityCaches(postId?: number, userId?: string): void {
  getPostActivityTags(postId, userId).forEach((tag) => invalidateTag(tag));
}

/**
 * Invalidate all newsletter-related caches
 */
export function invalidateNewsletterCaches(): void {
  [
    CACHE_TAGS.NEWSLETTER,
    CACHE_TAGS.CAMPAIGNS,
    CACHE_TAGS.SEGMENTS,
    CACHE_TAGS.AUTOMATIONS,
    CACHE_TAGS.SUBSCRIBERS,
  ].forEach((tag) => invalidateTag(tag));
}

/**
 * Get all email system tags
 */
export function getEmailTags(): string[] {
  return [
    CACHE_TAGS.EMAIL_HEALTH,
    CACHE_TAGS.PROVIDER_HEALTH,
    CACHE_TAGS.PROVIDER_QUOTAS,
    CACHE_TAGS.EMAIL_QUEUE,
    CACHE_TAGS.EMAIL_LOGS,
    CACHE_TAGS.EMAIL_STATS,
    CACHE_TAGS.PROVIDER_METRICS,
  ];
}

/**
 * Invalidate all email system caches
 */
export function invalidateEmailCaches(): void {
  getEmailTags().forEach((tag) => invalidateTag(tag));
}
