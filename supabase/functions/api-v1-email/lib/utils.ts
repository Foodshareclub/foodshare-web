/**
 * Shared utilities for api-v1-email
 *
 * Auth helpers, HTML escaping, types, and service-role client accessor.
 */

import { getSupabaseClient } from "../../_shared/supabase.ts";

// Re-exported so existing call sites keep one import. The implementation lives
// in `_shared` because api-v1-auth needs the same, stricter contract.
export { requireServiceAuth, verifyServiceAuth } from "../../_shared/service-auth.ts";

// =============================================================================
// Configuration
// =============================================================================

export const VERSION = "1.0.0";

// =============================================================================
// Types
// =============================================================================

export interface AutomationQueueItem {
  id: string;
  enrollment_id: string;
  flow_id: string;
  profile_id: string;
  step_index: number;
  scheduled_for: string;
  status: string;
  attempts: number;
  email_data: {
    subject?: string;
    html?: string;
    text?: string;
    template_slug?: string;
    to?: string;
  };
}

export interface QueuedEmail {
  id: string;
  user_id: string;
  campaign_id: string | null;
  email_type: string;
  template_slug: string | null;
  user_email: string;
  user_first_name: string | null;
  retry_count: number;
  metadata: Record<string, unknown>;
}

export interface ProcessResult {
  processed: number;
  sent: number;
  failed: number;
  skipped: number;
  durationMs: number;
  errors?: string[];
}

// =============================================================================
// Service Role Client
// =============================================================================

export function getServiceRoleClient() {
  return getSupabaseClient();
}

// =============================================================================
// HTML Helpers
// =============================================================================

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
