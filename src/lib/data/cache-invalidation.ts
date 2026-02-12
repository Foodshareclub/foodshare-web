import "server-only";

/**
 * Cache Invalidation (Server-Only)
 *
 * Server-only functions for cache invalidation using revalidateTag.
 * Separated from cache-keys.ts to prevent server-only imports from leaking into client components.
 */

import { revalidateTag as nextRevalidateTag } from "next/cache";
import {
  CACHE_TAGS,
  CACHE_PROFILES,
  getAdminTags,
  getPostActivityTags,
  getEmailTags,
  logCacheOperation,
} from "./cache-keys";

/**
 * Revalidate a cache tag with default profile
 * Wrapper around Next.js 16's revalidateTag which requires a profile
 */
export function invalidateTag(tag: string): void {
  logCacheOperation("invalidate", tag);
  nextRevalidateTag(tag, CACHE_PROFILES.DEFAULT);
}

/**
 * Invalidate all admin-related caches
 */
export function invalidateAdminCaches(): void {
  getAdminTags().forEach((tag) => invalidateTag(tag));
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
 * Invalidate all email system caches
 */
export function invalidateEmailCaches(): void {
  getEmailTags().forEach((tag) => invalidateTag(tag));
}
