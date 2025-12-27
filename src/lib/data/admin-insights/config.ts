/**
 * Configuration constants for Admin Insights
 */

// Grok model configuration
export const MODELS = {
  QUICK_INSIGHTS: "grok-3-mini",
  FAST_REASONING: "grok-3-mini", // Use grok-3-mini for all queries via AI Gateway
  DEEP_ANALYSIS: "grok-3-mini",
} as const;

// Cache for insights
export const CACHE_TTL = 3600000; // 1 hour

// Circuit breaker configuration
export const CIRCUIT_BREAKER_CONFIG = {
  failureThreshold: 5, // Open circuit after 5 consecutive failures (more tolerance)
  resetTimeoutMs: 15000, // Try again after 15 seconds (faster recovery)
  halfOpenMaxAttempts: 1, // Allow 1 request in half-open state
} as const;

// Rate limiting configuration
export const RATE_LIMIT_CONFIG = {
  minIntervalMs: 1000, // Minimum 1 second between calls (xAI limits are per-minute)
  maxRetries: 5, // Maximum retry attempts
  baseDelayMs: 2000, // Base delay for exponential backoff (faster initial retry)
  maxDelayMs: 60000, // Maximum delay cap (60 seconds)
  jitterFactor: 0.3, // Add up to 30% random jitter
  requestTimeoutMs: 30000, // Timeout for individual requests
  queueTimeoutMs: 120000, // Max time a request can wait in queue
} as const;

/**
 * Database schema for AI context (simplified for token efficiency)
 */
export const DATABASE_SCHEMA = `
TABLES:
- profiles (id uuid PK, nickname, first_name, email, avatar_url, created_time, last_seen_at, is_verified, is_active, language)
- posts (id bigint PK, profile_id FK, post_name, post_description, post_type, is_active, is_arranged, post_views, created_at, updated_at, location geography)
- rooms (id uuid PK, sharer FK, requester FK, post_id FK, last_message, last_message_time)
- messages (room_id, sender_id, content, created_at)
- reviews (id, profile_id, post_id, reviewed_rating 0-5, feedback, created_at)
- forum (id, profile_id, forum_post_name, forum_post_description, forum_likes_counter, forum_comments_counter, views_count, created_at)
- comments (id, forum_id, user_id, comment, created_at, likes_count, replies_count)
- likes (id, post_id, forum_id, profile_id, created_at)
- email_logs (id, recipient_id, email_type, status, provider, created_at)
- crm_customers (id, profile_id, status, engagement_score, lifecycle_stage, churn_risk_score, total_interactions)
- user_notifications (id, recipient_id, type, is_read, created_at)
- post_reports (id, post_id, reporter_id, reason, status, ai_severity_score)

POST_TYPES: food, things, borrow, wanted, fridge, foodbank, business, volunteer, challenge, zerowaste, vegan, community

COMMON JOINS:
- posts.profile_id → profiles.id
- rooms.sharer/requester → profiles.id
- forum.profile_id → profiles.id
`;

/**
 * Allowed SQL operations for safety
 */
export const ALLOWED_SQL_PATTERNS = [
  /^SELECT\s/i,
  /^WITH\s/i, // CTEs
];

export const FORBIDDEN_SQL_PATTERNS = [
  /\bDROP\b/i,
  /\bDELETE\b/i,
  /\bTRUNCATE\b/i,
  /\bINSERT\b/i,
  /\bUPDATE\b/i,
  /\bALTER\b/i,
  /\bCREATE\b/i,
  /\bGRANT\b/i,
  /\bREVOKE\b/i,
  /\bEXEC\b/i,
  /\bEXECUTE\b/i,
  /--/,
  /;[\s\S]*;/, // Multiple statements (dotAll alternative)
];
