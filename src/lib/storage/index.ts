/**
 * Storage utilities index
 * Re-exports all storage clients and helpers
 */

// Redis (KV Cache)
export {
  getRedis,
  cache,
  rateLimiter,
  lock,
  REDIS_KEYS,
  CACHE_TTL,
} from './redis';
export type { RateLimitResult, CacheTTL } from './redis';

// Vercel Blob (File Storage)
export {
  uploadBlob,
  deleteBlob,
  deleteBlobs,
  listBlobs,
  getBlobMetadata,
  copyBlob,
  uploadProductImage,
  uploadUserAvatar,
  uploadChatAttachment,
  deleteProductBlobs,
  validateFile,
  BLOB_PATHS,
  MAX_FILE_SIZES,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_DOCUMENT_TYPES,
} from './blob';
export type { UploadOptions, BlobAccess, BlobUploadResult } from './blob';

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
} from './vector';
export type {
  VectorMetadata,
  VectorContentType,
  VectorUpsertItem,
  VectorQueryResult,
  VectorNamespace,
} from './vector';

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
} from './qstash';
export type { PublishOptions, PublishResult, ScheduleInfo, JobType } from './qstash';

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
} from './search';
export type {
  SearchDocument,
  SearchResult,
  SearchIndexName,
  ProductSearchDocument,
} from './search';

// Vercel Edge Config (Feature Flags)
export {
  getConfig,
  getAllConfig,
  hasConfig,
  isFeatureEnabled,
  getFeatureFlags,
  isMaintenanceMode,
  getRateLimitConfig,
  getSupportedLocales,
  FEATURE_FLAGS,
  CONFIG_KEYS,
} from './edge-config';
export type { FeatureFlagKey, ConfigKey } from './edge-config';

// MotherDuck (Analytics)
export {
  getMotherDuckConfig,
  ANALYTICS_QUERIES,
  MOTHERDUCK_ENV,
} from './motherduck';
export type { MotherDuckConfig, AnalyticsResult, AnalyticsQueryKey } from './motherduck';
