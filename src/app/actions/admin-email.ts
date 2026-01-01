/**
 * Admin Email Server Actions
 * Mutations for email management from admin CRM
 * All actions require admin/superadmin role
 * Supports dual-mode routing (Edge Functions when enabled)
 */

"use server";

import { createClient } from "@/lib/supabase/server";
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

// Feature flag for Edge Function migration
const USE_EDGE_FUNCTIONS = process.env.USE_EDGE_FUNCTIONS_FOR_ADMIN === "true";

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
// Helper: Verify Admin Access
// ============================================================================

async function verifyAdminAccess(): Promise<
  { error: string } | { supabase: Awaited<ReturnType<typeof createClient>>; userId: string }
> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: "You must be logged in" };
  }

  const { data: userRoles } = await supabase
    .from("user_roles")
    .select("roles!inner(name)")
    .eq("profile_id", user.id);

  const roles = (userRoles || [])
    .map((r) => (r.roles as unknown as { name: string })?.name)
    .filter(Boolean);

  const isAdmin = roles.includes("admin") || roles.includes("superadmin");

  if (!isAdmin) {
    return { error: "Admin access required" };
  }

  return { supabase, userId: user.id };
}

// ============================================================================
// Email Queue Actions
// ============================================================================

/**
 * Retry a failed email from the queue
 * Requires admin access
 */
export async function retryEmail(queueId: string): Promise<ActionResult> {
  if (USE_EDGE_FUNCTIONS) {
    const result = await retryEmailAPI(queueId);
    if (result.success) {
      invalidateTag(CACHE_TAGS.EMAIL_QUEUE);
      return { success: true };
    }
    return { success: false, error: result.error?.message || "Failed to retry email" };
  }

  try {
    const auth = await verifyAdminAccess();
    if ("error" in auth) {
      return { success: false, error: auth.error };
    }

    const { supabase } = auth;

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
 * Requires admin access
 */
export async function deleteQueuedEmail(queueId: string): Promise<ActionResult> {
  if (USE_EDGE_FUNCTIONS) {
    const result = await deleteQueuedEmailAPI(queueId);
    if (result.success) {
      invalidateTag(CACHE_TAGS.EMAIL_QUEUE);
      return { success: true };
    }
    return { success: false, error: result.error?.message || "Failed to delete queued email" };
  }

  try {
    const auth = await verifyAdminAccess();
    if ("error" in auth) {
      return { success: false, error: auth.error };
    }

    const { supabase } = auth;

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
 * Requires admin access
 */
export async function sendManualEmail(
  request: ManualEmailRequest
): Promise<ActionResult<{ messageId: string }>> {
  if (USE_EDGE_FUNCTIONS) {
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
    const errorMsg = !result.success && result.error ? result.error.message : "Failed to send manual email";
    return { success: false, error: errorMsg };
  }

  try {
    const auth = await verifyAdminAccess();
    if ("error" in auth) {
      return { success: false, error: auth.error };
    }

    const { supabase } = auth;

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
 * Requires admin access
 */
export async function resetProviderQuota(
  provider: EmailProvider,
  date?: string
): Promise<ActionResult> {
  if (USE_EDGE_FUNCTIONS) {
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

  try {
    const auth = await verifyAdminAccess();
    if ("error" in auth) {
      return { success: false, error: auth.error };
    }

    const { supabase } = auth;
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
 * Requires admin access
 */
export async function updateProviderAvailability(
  provider: EmailProvider,
  isAvailable: boolean
): Promise<ActionResult> {
  if (USE_EDGE_FUNCTIONS) {
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

  try {
    const auth = await verifyAdminAccess();
    if ("error" in auth) {
      return { success: false, error: auth.error };
    }

    const { supabase } = auth;

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
 * Requires admin access
 */
export async function resetCircuitBreaker(provider: EmailProvider): Promise<ActionResult> {
  if (USE_EDGE_FUNCTIONS) {
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

  try {
    const auth = await verifyAdminAccess();
    if ("error" in auth) {
      return { success: false, error: auth.error };
    }

    const { supabase } = auth;

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
  if (USE_EDGE_FUNCTIONS) {
    const result = await addToSuppressionListAPI(email, reason, notes);
    if (result.success) {
      invalidateTag(CACHE_TAGS.EMAIL_STATS);
      return { success: true };
    }
    return { success: false, error: result.error?.message || "Failed to add to suppression list" };
  }

  try {
    const auth = await verifyAdminAccess();
    if ("error" in auth) {
      return { success: false, error: auth.error };
    }

    const { supabase } = auth;

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
  if (USE_EDGE_FUNCTIONS) {
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

  try {
    const auth = await verifyAdminAccess();
    if ("error" in auth) {
      return { success: false, error: auth.error };
    }

    const { supabase } = auth;

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
