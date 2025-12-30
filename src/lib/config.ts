/**
 * Application Configuration
 * Centralized configuration for all app-wide settings
 * Single source of truth for magic numbers and defaults
 *
 * @module lib/config
 */

// Re-export from constants for backwards compatibility
export {
  STORAGE_BUCKETS,
  IMAGE_CONFIG,
  API_CONFIG,
  PAGINATION,
  ROUTES,
  CACHE_TIMES,
} from "./constants";

/**
 * Performance thresholds based on Google's Core Web Vitals
 * Used for monitoring and dashboards
 */
export const WEB_VITALS_THRESHOLDS = {
  LCP: { good: 2500, poor: 4000 }, // Largest Contentful Paint (ms)
  FID: { good: 100, poor: 300 }, // First Input Delay (ms)
  CLS: { good: 0.1, poor: 0.25 }, // Cumulative Layout Shift
  INP: { good: 200, poor: 500 }, // Interaction to Next Paint (ms)
  TTFB: { good: 800, poor: 1800 }, // Time to First Byte (ms)
  FCP: { good: 1800, poor: 3000 }, // First Contentful Paint (ms)
} as const;

/**
 * Rate limiting configuration
 */
export const RATE_LIMIT = {
  /** Standard API requests per window */
  standard: { requests: 20, windowSeconds: 10 },
  /** Sensitive operations (auth, profile) */
  sensitive: { requests: 5, windowSeconds: 60 },
  /** Write operations (create, update, delete) */
  write: { requests: 10, windowSeconds: 60 },
  /** Strict operations (admin, bulk) */
  strict: { requests: 3, windowSeconds: 60 },
} as const;

/**
 * Map configuration
 */
export const MAP_CONFIG = {
  /** Default center (Prague, Czech Republic) */
  defaultCenter: { lat: 50.0755, lng: 14.4378 },
  /** Default zoom level */
  defaultZoom: 12,
  /** Maximum zoom level */
  maxZoom: 18,
  /** Minimum zoom level */
  minZoom: 3,
  /** Cluster radius in pixels */
  clusterRadius: 50,
  /** Maximum locations to load at once */
  maxLocationsPerViewport: 500,
  /** Viewport cache grid size in degrees */
  viewportCacheGridSize: 0.1,
} as const;

/**
 * Chat configuration
 */
export const CHAT_CONFIG = {
  /** Maximum message length */
  maxMessageLength: 5000,
  /** Maximum attachments per message */
  maxAttachments: 5,
  /** Maximum room participants */
  maxParticipants: 50,
  /** Typing indicator timeout (ms) */
  typingTimeoutMs: 3000,
  /** Messages to load per page */
  messagesPerPage: 50,
  /** Presence heartbeat interval (ms) */
  presenceHeartbeatMs: 30000,
} as const;

/**
 * Forum configuration
 */
export const FORUM_CONFIG = {
  /** Maximum post title length */
  maxTitleLength: 200,
  /** Maximum post content length */
  maxContentLength: 10000,
  /** Maximum comment length */
  maxCommentLength: 5000,
  /** Posts per page */
  postsPerPage: 20,
  /** Comments per page */
  commentsPerPage: 50,
} as const;

/**
 * Upload configuration
 */
export const UPLOAD_CONFIG = {
  /** Maximum file size in bytes (5MB) */
  maxFileSize: 5 * 1024 * 1024,
  /** Maximum number of images per post */
  maxImagesPerPost: 5,
  /** Maximum avatar size in bytes (2MB) */
  maxAvatarSize: 2 * 1024 * 1024,
  /** Allowed image MIME types */
  allowedImageTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"] as const,
  /** Allowed image extensions */
  allowedImageExtensions: [".jpg", ".jpeg", ".png", ".webp", ".gif"] as const,
} as const;

/**
 * Realtime configuration
 */
export const REALTIME_CONFIG = {
  /** Reconnection delay (ms) */
  reconnectDelayMs: 1000,
  /** Maximum reconnection attempts */
  maxReconnectAttempts: 10,
  /** Connection timeout (ms) */
  connectionTimeoutMs: 10000,
  /** Heartbeat interval (ms) */
  heartbeatIntervalMs: 30000,
} as const;

/**
 * React Query cache configuration
 * Optimized for real-time experience
 */
export const QUERY_CACHE = {
  /** Products/listings - real-time important */
  products: { staleTime: 30 * 1000, gcTime: 5 * 60 * 1000 },
  /** User profile - edits more frequent */
  userProfile: { staleTime: 2 * 60 * 1000, gcTime: 10 * 60 * 1000 },
  /** Challenge leaderboard - live competition */
  leaderboard: { staleTime: 30 * 1000, gcTime: 2 * 60 * 1000 },
  /** Chat list - less volatile */
  chatList: { staleTime: 60 * 1000, gcTime: 5 * 60 * 1000 },
  /** Map locations - viewport-based caching */
  mapLocations: { staleTime: 30 * 1000, gcTime: 30 * 60 * 1000 },
  /** Forum posts */
  forumPosts: { staleTime: 60 * 1000, gcTime: 5 * 60 * 1000 },
  /** Static data (categories, etc.) */
  static: { staleTime: 30 * 60 * 1000, gcTime: 60 * 60 * 1000 },
} as const;

/**
 * SLA/SLO targets for monitoring
 */
export const SLA_TARGETS = {
  /** Uptime target percentage */
  uptime: 99.9,
  /** LCP P75 target (ms) */
  lcpP75: 2500,
  /** Error rate target percentage */
  errorRate: 0.1,
  /** API latency P95 target (ms) */
  apiLatencyP95: 500,
} as const;

/**
 * Feature flags (can be overridden by env vars)
 */
export const FEATURES = {
  analytics: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS !== "false",
  pushNotifications: process.env.NEXT_PUBLIC_ENABLE_PUSH_NOTIFICATIONS !== "false",
  chat: true,
  challenges: true,
  forum: true,
  aiInsights: true,
} as const;

/**
 * Observability configuration
 */
export const OBSERVABILITY = {
  /** Error rate alert threshold (percentage) */
  errorRateAlertThreshold: 0.01, // 1%
  /** Critical error rate threshold (percentage) */
  criticalErrorRateThreshold: 0.05, // 5%
  /** Metrics collection interval (ms) */
  metricsIntervalMs: 5 * 60 * 1000, // 5 minutes
  /** Log retention days */
  logRetentionDays: 30,
  /** Web vitals sample rate (0-1) */
  webVitalsSampleRate: 1.0, // 100% in production
} as const;

/**
 * Combined config object for easy imports
 */
export const CONFIG = {
  webVitals: WEB_VITALS_THRESHOLDS,
  rateLimit: RATE_LIMIT,
  map: MAP_CONFIG,
  chat: CHAT_CONFIG,
  forum: FORUM_CONFIG,
  upload: UPLOAD_CONFIG,
  realtime: REALTIME_CONFIG,
  queryCache: QUERY_CACHE,
  sla: SLA_TARGETS,
  features: FEATURES,
  observability: OBSERVABILITY,
} as const;

export type Config = typeof CONFIG;
