"use server";

/**
 * Helper Functions
 * Shared utilities for automation server actions
 */

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { invalidateTag } from "@/lib/data/cache-invalidation";
import { requireAdmin } from "@/lib/data/admin-check";

// ============================================================================
// Auth Helper with Role Check (uses user_roles table)
// ============================================================================

export async function requireAuth(supabase: Awaited<ReturnType<typeof createClient>>) {
  await requireAdmin();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("UNAUTHORIZED");
  }

  return user;
}

// ============================================================================
// Audit Log Helper
// ============================================================================

export async function logAuditEvent(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  action: string,
  resourceType: string,
  resourceId: string,
  metadata?: Record<string, unknown>
) {
  try {
    // Use the log_audit_event function for secure logging
    await supabase.rpc("log_audit_event", {
      p_user_id: userId,
      p_action: action,
      p_resource_type: resourceType,
      p_resource_id: resourceId,
      p_metadata: metadata || {},
    });
  } catch (err) {
    // Don't fail the main action if audit logging fails
    console.warn(`[audit] Failed to log: ${action} ${resourceType}:${resourceId}`, err);
  }
}

// ============================================================================
// Cache Invalidation Helper
// ============================================================================

export async function invalidateAutomationCache(): Promise<void> {
  revalidatePath("/admin/email");
  invalidateTag("automations");
  invalidateTag("email-dashboard");
}
