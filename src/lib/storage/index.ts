/**
 * Storage utilities index
 * Re-exports all storage clients and helpers
 */

// Redis (KV Cache)
export { getRedis, cache, rateLimiter, lock, REDIS_KEYS, CACHE_TTL } from "./redis";
export type { RateLimitResult, CacheTTL } from "./redis";



// Upstash Vector (Embeddings)
export {
  getVectorIndex,
  upsertVectors,
  upsertVector,
  querySimilar,
  querySimilarByType,
  fetchVectors,
  deleteVectors,
  deleteVectorsByType,
  getIndexStats,
  VECTOR_NAMESPACES,
} from "./vector";
export type {
  VectorMetadata,
  VectorContentType,
  VectorUpsertItem,
  VectorQueryResult,
  VectorNamespace,
} from "./vector";

// Upstash QStash (Message Queue)
export {
  getQStashClient,
  getQStashReceiver,
  publishMessage,
  publishDelayed,
  createSchedule,
  getSchedule,
  pauseSchedule,
  resumeSchedule,
  deleteSchedule,
  listSchedules,
  verifySignature,
  verifyRequest,
  getJobEndpoint,
  queueEmail,
  queueImageProcessing,
  queueNotification,
  queueSearchIndexSync,
  queueEmbeddingGeneration,
  JOB_TYPES,
  CRON_SCHEDULES,
} from "./qstash";
export type { PublishOptions, PublishResult, ScheduleInfo, JobType } from "./qstash";

// Upstash Search (Full-text Search)
export {
  getSearchClient,
  indexDocument,
  indexDocuments,
  searchDocuments,
  deleteDocument,
  deleteDocuments,
  indexProduct,
  indexProducts,
  searchProducts,
  removeProductFromSearch,
  removeProductsFromSearch,
  SEARCH_INDEXES,
} from "./search";
export type {
  SearchDocument,
  SearchResult,
  SearchIndexName,
  ProductSearchDocument,
} from "./search";



// MotherDuck (Analytics)
export { getMotherDuckConfig, ANALYTICS_QUERIES, MOTHERDUCK_ENV } from "./motherduck";
export type { MotherDuckConfig, AnalyticsResult, AnalyticsQueryKey } from "./motherduck";

// Image Optimization (Sharp)
export {
  optimizeImage,
  quickOptimize,
  createResponsiveSet,
  generateBlurPlaceholder,
  getImageDimensions,
  validateImageInput,
  IMAGE_SIZES,
} from "./image-optimization";
export type {
  ImageSize,
  OptimizedImage,
  ImageOptimizationResult,
  OptimizationOptions,
} from "./image-optimization";
