/**
 * Admin Email API Client
 *
 * Provides functions for calling the api-v1-admin-email Edge Function.
 * Used for admin email management operations.
 */

import { apiCall, apiDelete } from "./client";
import type { ActionResult } from "@/lib/errors";

// =============================================================================
// Types
// =============================================================================

export type EmailProvider = "resend" | "brevo" | "mailersend" | "ses";
export type EmailType = "transactional" | "marketing" | "notification" | "system";
export type SuppressionReason = "bounce" | "complaint" | "unsubscribe" | "manual";

export interface SendManualEmailRequest {
  to: string;
  subject: string;
  html: string;
  emailType: EmailType;
  provider?: EmailProvider;
}

export interface ResetQuotaRequest {
  date?: string;
}

export interface UpdateAvailabilityRequest {
  isAvailable: boolean;
}

export interface AddSuppressionRequest {
  email: string;
  reason: SuppressionReason;
  notes?: string;
}

export interface QueueActionResponse {
  queueId?: string;
  messageId?: string;
  retried?: boolean;
  queued?: boolean;
}

export interface ProviderActionResponse {
  provider: EmailProvider;
  date?: string;
  quotaReset?: boolean;
  isAvailable?: boolean;
  circuitBreakerReset?: boolean;
}

export interface SuppressionActionResponse {
  email: string;
  added?: boolean;
  removed?: boolean;
  alreadySuppressed?: boolean;
}

// =============================================================================
// Queue API Functions
// =============================================================================

const ENDPOINT = "api-v1-admin-email";

/**
 * Retry a failed email from the queue
 */
export async function retryEmailAPI(
  queueId: string
): Promise<ActionResult<QueueActionResponse>> {
  return apiCall<QueueActionResponse, Record<string, never>>(`${ENDPOINT}/queue/${queueId}/retry`, {
    method: "POST",
    body: {},
  });
}

/**
 * Delete a queued email
 */
export async function deleteQueuedEmailAPI(
  queueId: string
): Promise<ActionResult<void>> {
  return apiDelete<void>(`${ENDPOINT}/queue/${queueId}`);
}

/**
 * Send a manual email
 */
export async function sendManualEmailAPI(
  request: SendManualEmailRequest
): Promise<ActionResult<QueueActionResponse>> {
  return apiCall<QueueActionResponse, SendManualEmailRequest>(`${ENDPOINT}/queue/send`, {
    method: "POST",
    body: request,
  });
}

// =============================================================================
// Provider API Functions
// =============================================================================

/**
 * Reset provider quota
 */
export async function resetProviderQuotaAPI(
  provider: EmailProvider,
  date?: string
): Promise<ActionResult<ProviderActionResponse>> {
  return apiCall<ProviderActionResponse, ResetQuotaRequest>(
    `${ENDPOINT}/providers/${provider}/reset-quota`,
    {
      method: "POST",
      body: { date },
    }
  );
}

/**
 * Update provider availability
 */
export async function updateProviderAvailabilityAPI(
  provider: EmailProvider,
  isAvailable: boolean
): Promise<ActionResult<ProviderActionResponse>> {
  return apiCall<ProviderActionResponse, UpdateAvailabilityRequest>(
    `${ENDPOINT}/providers/${provider}/availability`,
    {
      method: "PUT",
      body: { isAvailable },
    }
  );
}

/**
 * Reset circuit breaker for a provider
 */
export async function resetCircuitBreakerAPI(
  provider: EmailProvider
): Promise<ActionResult<ProviderActionResponse>> {
  return apiCall<ProviderActionResponse, Record<string, never>>(
    `${ENDPOINT}/providers/${provider}/reset-circuit-breaker`,
    {
      method: "POST",
      body: {},
    }
  );
}

// =============================================================================
// Suppression List API Functions
// =============================================================================

/**
 * Add email to suppression list
 */
export async function addToSuppressionListAPI(
  email: string,
  reason: SuppressionReason,
  notes?: string
): Promise<ActionResult<SuppressionActionResponse>> {
  return apiCall<SuppressionActionResponse, AddSuppressionRequest>(`${ENDPOINT}/suppression`, {
    method: "POST",
    body: { email, reason, notes },
  });
}

/**
 * Remove email from suppression list
 */
export async function removeFromSuppressionListAPI(
  email: string
): Promise<ActionResult<SuppressionActionResponse>> {
  return apiDelete<SuppressionActionResponse>(
    `${ENDPOINT}/suppression/${encodeURIComponent(email)}`
  );
}
