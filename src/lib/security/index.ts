/**
 * Security Module
 *
 * Enterprise-grade security utilities.
 *
 * @module lib/security
 */

// Rate Limiting
export {
  checkRateLimit,
  requireRateLimit,
  withRateLimit,
} from "./rateLimit";
export type { RateLimitType, RateLimitResult } from "./rateLimit";

// MFA
export * from "./mfa";

// Audit Logging
export * from "./auditLog";

// Token Management
export {
  TokenManager,
  getTokenManager,
  getAccessToken,
  getAuthHeader,
  refreshTokenIfNeeded,
  startTokenManager,
  stopTokenManager,
} from "./token-manager";
export type {
  TokenInfo,
  TokenManagerConfig,
  TokenEventType,
  TokenEvent,
} from "./token-manager";

// Sensitive Data
export {
  DEFAULT_SENSITIVE_FIELDS,
  isSensitiveField,
  redactValue,
  redactEmail,
  redactPhone,
  redactObject,
  createSafeLogger,
  secureStore,
  secureRetrieve,
  secureRemove,
  secureClearAll,
  clearSensitiveData,
  sanitizeRequestBody,
  sanitizeResponse,
  createSanitizedFetch,
} from "./sensitive-data";
export type { SensitiveDataConfig } from "./sensitive-data";
