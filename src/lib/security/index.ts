/**
 * Security utilities: validation, XSS protection, audit, MFA, sensitive-data
 * handling, and token management.
 *
 * Rate limiting is not here: it lives in `src/proxy.ts`, which is the only
 * place every request passes through. The removed `checkRateLimit` helper had
 * no callers, opened with a no-op when Redis was absent, and — reachable from
 * this barrel, which `lib/utils.ts` re-exports — pulled `@upstash/redis` and
 * `@upstash/ratelimit` into the client bundle of every page.
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
