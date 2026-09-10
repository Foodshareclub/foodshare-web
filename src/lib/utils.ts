/**
 * Shared utilities barrel (backward compatibility).
 *
 * Canonical implementations live in focused modules — import from them
 * directly in new code:
 * - `@/lib/cn` — Tailwind class merging (`cn`, `buttonClasses`)
 * - `@/lib/dates` — `formatDate`, `DateFormat`, `FormatDateOptions`
 * - `@/lib/strings` — `escapeHtml`, `escapeFilterValue`, `slugify`
 * - `@/lib/observability` — structured logging + Sentry capture helpers
 * - `@/lib/security` — validation, sanitization, audit, MFA, rate-limit, tokens
 * - `@/lib/performance` — performance metrics tracking
 */

export { cn, buttonClasses } from "./cn";
export { formatDate, type DateFormat, type FormatDateOptions } from "./dates";
export { escapeHtml, escapeFilterValue, slugify } from "./strings";
export { structuredLog } from "./observability";
export { validateEmail, sanitizeHtml } from "./security";
export { usePerformanceMonitor } from "./performance";
