/**
 * Shared utilities barrel (backward compatibility).
 *
 * Canonical implementations live in focused modules — import from them
 * directly in new code:
 * - `@/lib/cn` — Tailwind class merging (`cn`)
 * - `@/lib/cn` — Tailwind class merging with variants (`buttonClasses`)
 * - `@/lib/dates` — `formatDate`, `DateFormat`, `FormatDateOptions`
 * - `@/lib/strings` — `escapeHtml`, `escapeFilterValue`, `slugify`
 */

export { cn, buttonClasses } from "./cn";
export { formatDate, type DateFormat, type FormatDateOptions } from "./dates";
export { escapeHtml, escapeFilterValue, slugify } from "./strings";
