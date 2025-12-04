/**
 * Cache Invalidation Hook
 *
 * Provides convenient methods to invalidate API cache
 * Use after mutations to ensure data consistency
 */

import { useCallback } from "react";
import { apiCache } from "@/lib/api-cache";
import { createLogger } from "@/lib/logger";

const logger = createLogger("CacheInvalidation");

export function useCacheInvalidation() {
  /**
   * Invalidate all product caches
   */
  const invalidateProducts = useCallback(() => {
    apiCache.invalidatePattern(/^products:/);
    logger.debug("Invalidated all products");
  }, []);

  /**
   * Invalidate specific product
   */
  const invalidateProduct = useCallback((id: number) => {
    apiCache.invalidate(`product:${id}`);
    apiCache.invalidatePattern(/^products:/); // Also invalidate lists
    logger.debug(`Invalidated product ${id}`);
  }, []);

  /**
   * Invalidate product locations
   */
  const invalidateProductLocations = useCallback(() => {
    apiCache.invalidatePattern(/^products-location:/);
    logger.debug("Invalidated product locations");
  }, []);

  /**
   * Invalidate profile cache
   */
  const invalidateProfile = useCallback((profileId?: string) => {
    if (profileId) {
      apiCache.invalidate(`profile:${profileId}`);
      logger.debug(`Invalidated profile ${profileId}`);
    } else {
      apiCache.invalidatePattern(/^profile:/);
      logger.debug("Invalidated all profiles");
    }
  }, []);

  /**
   * Invalidate chat cache
   */
  const invalidateChat = useCallback((chatId?: string) => {
    if (chatId) {
      apiCache.invalidate(`chat:${chatId}`);
      logger.debug(`Invalidated chat ${chatId}`);
    } else {
      apiCache.invalidatePattern(/^chat:/);
      logger.debug("Invalidated all chats");
    }
  }, []);

  /**
   * Invalidate search cache
   */
  const invalidateSearch = useCallback(() => {
    apiCache.invalidatePattern(/^search:/);
    apiCache.invalidatePattern(/^product-search:/);
    logger.debug("Invalidated search cache");
  }, []);

  /**
   * Clear all cache
   */
  const invalidateAll = useCallback(() => {
    apiCache.clear();
    logger.debug("Cleared all cache");
  }, []);

  /**
   * Get cache statistics
   */
  const getCacheStats = useCallback(() => {
    return apiCache.getStats();
  }, []);

  return {
    // Product cache
    invalidateProducts,
    invalidateProduct,
    invalidateProductLocations,

    // Profile cache
    invalidateProfile,

    // Chat cache
    invalidateChat,

    // Search cache
    invalidateSearch,

    // Global
    invalidateAll,
    getCacheStats,
  };
}

/**
 * Hook for automatic cache invalidation after mutations
 *
 * Usage:
 * const { invalidateOnSuccess } = useAutoInvalidation();
 *
 * const mutation = useMutation({
 *   onSuccess: invalidateOnSuccess(['products', 'search'])
 * });
 */
export function useAutoInvalidation() {
  const { invalidateProducts, invalidateProduct, invalidateProfile, invalidateSearch } =
    useCacheInvalidation();

  const invalidateOnSuccess = useCallback(
    (caches: Array<"products" | "product" | "profile" | "search">, id?: number | string) => {
      return () => {
        caches.forEach((cache) => {
          switch (cache) {
            case "products":
              invalidateProducts();
              break;
            case "product":
              if (typeof id === "number") {
                invalidateProduct(id);
              }
              break;
            case "profile":
              if (typeof id === "string") {
                invalidateProfile(id);
              } else {
                invalidateProfile();
              }
              break;
            case "search":
              invalidateSearch();
              break;
          }
        });
      };
    },
    [invalidateProducts, invalidateProduct, invalidateProfile, invalidateSearch]
  );

  return { invalidateOnSuccess };
}
