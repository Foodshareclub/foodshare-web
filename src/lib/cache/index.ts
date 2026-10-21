/**
 * Cache Module
 *
 * Multi-layer caching with smart invalidation.
 *
 * @module lib/cache
 */

// Multi-layer cache
export {
  MultiLayerCache,
  getCache,
  cacheGet,
  cacheGetOrFetch,
  cacheSet,
  cacheDelete,
  cacheDeleteByTag,
  cacheDeleteByPattern,
  cacheClear,
  cacheStats,
} from "./multi-layer";
export type {
  CacheEntry,
  CacheOptions,
  CacheStats,
} from "./multi-layer";

// Invalidation
export {
  InvalidationManager,
  getInvalidationManager,
  addInvalidationRule,
  removeInvalidationRule,
  startInvalidationManager,
  stopInvalidationManager,
  createCommonInvalidationRules,
  initializeCommonInvalidation,
} from "./invalidation";
export type {
  InvalidationRule,
  InvalidationManagerConfig,
} from "./invalidation";
