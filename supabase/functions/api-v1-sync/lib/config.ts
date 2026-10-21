/**
 * Sync Configuration
 *
 * Extracted from `api-v1-sync/index.ts` — no changes.
 */

export const VERSION = "2.0.0";

export const ALLOWED_TABLES = [
  "posts",
  "notifications",
  "rooms",
  "profiles",
  "messages",
] as const;
