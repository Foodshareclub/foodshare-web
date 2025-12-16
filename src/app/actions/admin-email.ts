/**
 * Admin Email Server Actions
 * Mutations for email management from admin CRM
 */

"use server";

import { createClient } from "@/lib/supabase/server";
import type { EmailProvider, EmailType } from "@/lib/email/types";
import { invalidateTag, CACHE_TAGS } from "@/lib/data/cache-keys";

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
 */
export async function retryEmail(queueId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from("email_queue")
      .update({
        status: "queued",
        next_retry_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", queueId);

    if (error) {
      return { success: false, error: error.message };
    }

    // Invalidate email queue cache
    invalidateTag(CACHE_TAGS.EMAIL_QUEUE);

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to retry email",
    };
  }
}

/**
 * Delete a failed email from the queue
 */
export async function deleteQueuedEmail(queueId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    const { error } = await supabase.from("email_queue").delete().eq("id", queueId);

    if (error) {
      return { success: false, error: error.message };
    }

    // Invalidate email queue cache
    invalidateTag(CACHE_TAGS.EMAIL_QUEUE);

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete queued email",
    };
  }
}

/**
 * Send a manual email (admin only)
 */
export async function sendManualEmail(
  request: ManualEmailRequest
): Promise<ActionResult<{ messageId: string }>> {
  try {
    const supabase = await createClient();

    // Queue the email for processing
    const { data, error } = await supabase
      .from("email_queue")
      .insert({
        recipient_email: request.to,
        email_type: request.emailType,
        template_name: "manual_admin_email",
        template_data: {
          subject: request.subject,
          html: request.html,
          from: "admin@foodshare.club",
        },
        status: "queued",
        next_retry_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    // Invalidate email queue and stats caches
    invalidateTag(CACHE_TAGS.EMAIL_QUEUE);
    invalidateTag(CACHE_TAGS.EMAIL_STATS);

    return { success: true, data: { messageId: data.id } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send manual email",
    };
  }
}

// ============================================================================
// Provider Management Actions
// ============================================================================

/**
 * Reset provider quota (admin only - use with caution)
 */
export async function resetProviderQuota(
  provider: EmailProvider,
  date?: string
): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    const targetDate = date || new Date().toISOString().split("T")[0];

    const { error } = await supabase
      .from("email_provider_quota")
      .update({ emails_sent: 0 })
      .eq("provider", provider)
      .eq("date", targetDate);

    if (error) {
      return { success: false, error: error.message };
    }

    // Invalidate provider quota and health caches
    invalidateTag(CACHE_TAGS.PROVIDER_QUOTAS);
    invalidateTag(CACHE_TAGS.PROVIDER_HEALTH);
    invalidateTag(CACHE_TAGS.EMAIL_STATS);

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to reset provider quota",
    };
  }
}

/**
 * Update provider availability (enable/disable)
 */
export async function updateProviderAvailability(
  provider: EmailProvider,
  isAvailable: boolean
): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    // Update circuit breaker state
    const { error } = await supabase.from("email_circuit_breaker").upsert(
      {
        provider,
        state: isAvailable ? "closed" : "open",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "provider" }
    );

    if (error) {
      return { success: false, error: error.message };
    }

    // Invalidate provider health cache
    invalidateTag(CACHE_TAGS.PROVIDER_HEALTH);
    invalidateTag(CACHE_TAGS.EMAIL_HEALTH);

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update provider availability",
    };
  }
}

/**
 * Reset circuit breaker for a provider
 */
export async function resetCircuitBreaker(provider: EmailProvider): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from("email_circuit_breaker")
      .update({
        state: "closed",
        failures: 0,
        consecutive_successes: 0,
        last_failure_time: null,
        updated_at: new Date().toISOString(),
      })
      .eq("provider", provider);

    if (error) {
      return { success: false, error: error.message };
    }

    // Invalidate provider health cache
    invalidateTag(CACHE_TAGS.PROVIDER_HEALTH);
    invalidateTag(CACHE_TAGS.EMAIL_HEALTH);

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to reset circuit breaker",
    };
  }
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
  try {
    const supabase = await createClient();

    const { error } = await supabase.from("email_suppression_list").insert({
      email: email.toLowerCase(),
      reason,
      notes,
      added_at: new Date().toISOString(),
    });

    if (error) {
      // Handle duplicate key error gracefully
      if (error.code === "23505") {
        return { success: true }; // Email already suppressed
      }
      return { success: false, error: error.message };
    }

    // Invalidate email stats cache
    invalidateTag(CACHE_TAGS.EMAIL_STATS);

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to add email to suppression list",
    };
  }
}

/**
 * Remove email from suppression list
 */
export async function removeFromSuppressionList(email: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from("email_suppression_list")
      .delete()
      .eq("email", email.toLowerCase());

    if (error) {
      return { success: false, error: error.message };
    }

    // Invalidate email stats cache
    invalidateTag(CACHE_TAGS.EMAIL_STATS);

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to remove email from suppression list",
    };
  }
}
