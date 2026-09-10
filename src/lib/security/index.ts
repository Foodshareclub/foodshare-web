/**
 * Security utilities: validation, XSS protection, audit, MFA, rate-limiting,
 * sensitive-data handling, and token management.
 *
 * Canonical implementations live here — import from `@/lib/security`
 * directly in new code.
 */
export { validateEmail } from "./email";
export { sanitizeHtml } from "./html";
export { AuditLogService, LogAdminAction, type AuditLogEntry } from "./auditLog";
export {
  MFAService,
  checkAdminMFARequired,
  validateAdminAAL2,
  type MFAMethod,
  type AALLevel,
  type MFAConfiguration,
  type MFAChallenge,
  type MFAVerificationResult,
  type MFASession,
} from "./mfa";
export {
  checkRateLimit,
  requireRateLimit,
  withRateLimit,
  type RateLimitType,
  type RateLimitResult,
} from "./rateLimit";
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
  type SensitiveDataConfig,
} from "./sensitive-data";
export {
  TokenManager,
  getTokenManager,
  getAccessToken,
  getAuthHeader,
  refreshTokenIfNeeded,
  startTokenManager,
  stopTokenManager,
  type TokenInfo,
  type TokenManagerConfig,
  type TokenEventType,
  type TokenEvent,
} from "./token-manager";
