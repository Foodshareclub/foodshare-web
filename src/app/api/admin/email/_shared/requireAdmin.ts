/**
 * Shared admin auth guard for email API routes
 * Pattern extracted from sync/route.ts
 */

export { requireAdmin } from "../../_shared/requireAdmin";
export type { AdminAuthResult } from "../../_shared/requireAdmin";
