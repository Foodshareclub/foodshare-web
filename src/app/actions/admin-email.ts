/**
 * Admin Email Server Actions
 * Mutations for email management from admin CRM
 * All actions require admin/superadmin role
 * Uses unified Edge Functions API
 */

"use server";

import type { EmailProvider, EmailType } from "@/lib/email/types";
import { invalidateTag, CACHE_TAGS } from "@/lib/data/cache-keys";
import {
  retryEmailAPI,
  deleteQueuedEmailAPI,
  sendManualEmailAPI,
  resetProviderQuotaAPI,
  updateProviderAvailabilityAPI,
  resetCircuitBreakerAPI,
  addToSuppressionListAPI,
  removeFromSuppressionListAPI,
} from "@/lib/api";

// ============================================================================
// Types
// ============================================================================

export interface ManualEmailRequest {
  to: string;
  subject: string;
  html: string;
  emailType: EmailType;
  provider?: EmailProvider;
}

export interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============================================================================
// Email Queue Actions
// ============================================================================

/**
 * Retry a failed email from the queue
 * Requires admin access
 */
export async function retryEmail(queueId: string): Promise<ActionResult> {
  const result = await retryEmailAPI(queueId);
  if (result.success) {
    invalidateTag(CACHE_TAGS.EMAIL_QUEUE);
    return { success: true };
  }
  return { success: false, error: result.error?.message || "Failed to retry email" };
}

/**
 * Delete a failed email from the queue
 * Requires admin access
 */
export async function deleteQueuedEmail(queueId: string): Promise<ActionResult> {
  const result = await deleteQueuedEmailAPI(queueId);
  if (result.success) {
    invalidateTag(CACHE_TAGS.EMAIL_QUEUE);
    return { success: true };
  }
  return { success: false, error: result.error?.message || "Failed to delete queued email" };
}

/**
 * Send a manual email (admin only)
 * Requires admin access
 */
export async function sendManualEmail(
  request: ManualEmailRequest
): Promise<ActionResult<{ messageId: string }>> {
  const result = await sendManualEmailAPI({
    to: request.to,
    subject: request.subject,
    html: request.html,
    emailType: request.emailType as "transactional" | "marketing" | "notification" | "system",
    provider: request.provider as "resend" | "brevo" | "mailersend" | "ses" | undefined,
  });
  if (result.success && result.data) {
    invalidateTag(CACHE_TAGS.EMAIL_QUEUE);
    invalidateTag(CACHE_TAGS.EMAIL_STATS);
    return { success: true, data: { messageId: result.data.messageId || "" } };
  }
  const errorMsg =
    !result.success && result.error ? result.error.message : "Failed to send manual email";
  return { success: false, error: errorMsg };
}

// ============================================================================
// Provider Management Actions
// ============================================================================

/**
 * Reset provider quota (admin only - use with caution)
 * Requires admin access
 */
export async function resetProviderQuota(
  provider: EmailProvider,
  date?: string
): Promise<ActionResult> {
  const result = await resetProviderQuotaAPI(
    provider as "resend" | "brevo" | "mailersend" | "ses",
    date
  );
  if (result.success) {
    invalidateTag(CACHE_TAGS.PROVIDER_QUOTAS);
    invalidateTag(CACHE_TAGS.PROVIDER_HEALTH);
    invalidateTag(CACHE_TAGS.EMAIL_STATS);
    return { success: true };
  }
  return { success: false, error: result.error?.message || "Failed to reset provider quota" };
}

/**
 * Update provider availability (enable/disable)
 * Requires admin access
 */
export async function updateProviderAvailability(
  provider: EmailProvider,
  isAvailable: boolean
): Promise<ActionResult> {
  const result = await updateProviderAvailabilityAPI(
    provider as "resend" | "brevo" | "mailersend" | "ses",
    isAvailable
  );
  if (result.success) {
    invalidateTag(CACHE_TAGS.PROVIDER_HEALTH);
    invalidateTag(CACHE_TAGS.EMAIL_HEALTH);
    return { success: true };
  }
  return { success: false, error: result.error?.message || "Failed to update availability" };
}

/**
 * Reset circuit breaker for a provider
 * Requires admin access
 */
export async function resetCircuitBreaker(provider: EmailProvider): Promise<ActionResult> {
  const result = await resetCircuitBreakerAPI(
    provider as "resend" | "brevo" | "mailersend" | "ses"
  );
  if (result.success) {
    invalidateTag(CACHE_TAGS.PROVIDER_HEALTH);
    invalidateTag(CACHE_TAGS.EMAIL_HEALTH);
    return { success: true };
  }
  return { success: false, error: result.error?.message || "Failed to reset circuit breaker" };
}

// ============================================================================
// Suppression List Actions
// ============================================================================

/**
 * Add email to suppression list
 */
export async function addToSuppressionList(
  email: string,
  reason: "bounce" | "complaint" | "unsubscribe" | "manual",
  notes?: string
): Promise<ActionResult> {
  const result = await addToSuppressionListAPI(email, reason, notes);
  if (result.success) {
    invalidateTag(CACHE_TAGS.EMAIL_STATS);
    return { success: true };
  }
  return { success: false, error: result.error?.message || "Failed to add to suppression list" };
}

/**
 * Remove email from suppression list
 */
export async function removeFromSuppressionList(email: string): Promise<ActionResult> {
  const result = await removeFromSuppressionListAPI(email);
  if (result.success) {
    invalidateTag(CACHE_TAGS.EMAIL_STATS);
    return { success: true };
  }
  return {
    success: false,
    error: result.error?.message || "Failed to remove from suppression list",
  };
}
