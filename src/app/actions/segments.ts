"use server";

/**
 * Audience Segment Server Actions
 * Bleeding-edge implementation with:
 * - Zod schema validation
 * - Type-safe action results
 * - Audit logging
 */

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { serverActionError, successVoid, type ServerActionResult } from "@/lib/errors";
import { CACHE_TAGS } from "@/lib/data/cache-keys";
import { invalidateTag } from "@/lib/data/cache-invalidation";
import type { ErrorCode } from "@/lib/errors";

// ============================================================================
// Zod Schemas
// ============================================================================

const SegmentFilterRuleSchema = z.object({
  field: z.string().min(1, "Field is required"),
  operator: z.enum([
    "equals",
    "not_equals",
    "contains",
    "greater_than",
    "less_than",
    "in",
    "not_in",
  ]),
  value: z.union([z.string(), z.number(), z.array(z.string())]),
});

const CreateSegmentSchema = z.object({
  name: z.string().min(1, "Segment name is required").max(100, "Name too long"),
  description: z.string().max(500).optional(),
  filterRules: z.array(SegmentFilterRuleSchema).min(1, "At least one filter rule is required"),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color format")
    .optional(),
  iconName: z.string().max(50).optional(),
});

const UpdateSegmentSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  filterRules: z.array(SegmentFilterRuleSchema).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  iconName: z.string().max(50).optional(),
});

// ============================================================================
// Types
// ============================================================================

export type SegmentFilterRule = z.infer<typeof SegmentFilterRuleSchema>;
export type CreateSegmentInput = z.infer<typeof CreateSegmentSchema>;

export interface SegmentResult {
  id: string;
  name: string;
  cachedCount: number;
}

// ============================================================================
// Helper: Verify Admin Access
// ============================================================================

type AuthError = { error: string; code: ErrorCode };
type AuthSuccess = {
  user: { id: string };
  supabase: Awaited<ReturnType<typeof createClient>>;
};

async function verifyAdminAccess(): Promise<AuthError | AuthSuccess> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: "You must be logged in", code: "UNAUTHORIZED" };
  }

  const { data: userRole } = await supabase
    .from("user_roles")
    .select("roles!inner(name)")
    .eq("profile_id", user.id)
    .in("roles.name", ["admin", "superadmin"])
    .single();

  if (!userRole) {
    return { error: "Admin access required", code: "FORBIDDEN" };
  }

  return { user: { id: user.id }, supabase };
}

function isAuthError(result: AuthError | AuthSuccess): result is AuthError {
  return "error" in result && "code" in result && !("supabase" in result);
}

// ============================================================================
// Audit Logging Helper
// ============================================================================

async function logAuditEvent(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  action: string,
  resourceType: string,
  resourceId: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    await supabase.rpc("log_audit_event", {
      p_user_id: userId,
      p_action: action,
      p_resource_type: resourceType,
      p_resource_id: resourceId,
      p_metadata: metadata || {},
    });
  } catch (err) {
    console.warn(`[audit] Failed to log: ${action} ${resourceType}:${resourceId}`, err);
  }
}

// ============================================================================
// Segment Actions
// ============================================================================

/**
 * Create a new audience segment
 */
export async function createSegment(
  input: CreateSegmentInput
): Promise<ServerActionResult<SegmentResult>> {
  try {
    // Validate with Zod
    const validated = CreateSegmentSchema.safeParse(input);
    if (!validated.success) {
      const firstError = validated.error.issues[0];
      return serverActionError(firstError.message, "VALIDATION_ERROR");
    }

    const auth = await verifyAdminAccess();
    if (isAuthError(auth)) {
      return serverActionError(auth.error, auth.code);
    }

    const { supabase, user } = auth;

    const { data, error } = await supabase
      .from("audience_segments")
      .insert({
        name: validated.data.name.trim(),
        description: validated.data.description?.trim() || null,
        filter_rules: validated.data.filterRules,
        color: validated.data.color || "#6366f1",
        icon_name: validated.data.iconName || "users",
        is_system: false,
        created_by: user.id,
      })
      .select("id, name, cached_count")
      .single();

    if (error) {
      console.error("Failed to create segment:", error);
      return serverActionError(error.message, "DATABASE_ERROR");
    }

    // Audit log
    await logAuditEvent(supabase, user.id, "CREATE", "segment", data.id, {
      name: data.name,
      rulesCount: validated.data.filterRules.length,
    });

    invalidateTag(CACHE_TAGS.ADMIN);
    invalidateTag(CACHE_TAGS.SEGMENTS);
    revalidatePath("/admin/email");

    return {
      success: true,
      data: {
        id: data.id,
        name: data.name,
        cachedCount: data.cached_count || 0,
      },
    };
  } catch (error) {
    console.error("Failed to create segment:", error);
    return serverActionError("Failed to create segment", "UNKNOWN_ERROR");
  }
}

/**
 * Update an existing segment
 */
export async function updateSegment(
  id: string,
  input: Partial<CreateSegmentInput>
): Promise<ServerActionResult<SegmentResult>> {
  try {
    // Validate ID
    if (!id || !z.string().uuid().safeParse(id).success) {
      return serverActionError("Invalid segment ID", "VALIDATION_ERROR");
    }

    // Validate input
    const validated = UpdateSegmentSchema.safeParse(input);
    if (!validated.success) {
      const firstError = validated.error.issues[0];
      return serverActionError(firstError.message, "VALIDATION_ERROR");
    }

    const auth = await verifyAdminAccess();
    if (isAuthError(auth)) {
      return serverActionError(auth.error, auth.code);
    }

    const { supabase, user } = auth;

    // Check if segment is system segment
    const { data: existing } = await supabase
      .from("audience_segments")
      .select("is_system, name")
      .eq("id", id)
      .single();

    if (!existing) {
      return serverActionError("Segment not found", "NOT_FOUND");
    }

    if (existing.is_system) {
      return serverActionError("Cannot modify system segments", "VALIDATION_ERROR");
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (validated.data.name !== undefined) updates.name = validated.data.name.trim();
    if (validated.data.description !== undefined)
      updates.description = validated.data.description?.trim() || null;
    if (validated.data.filterRules !== undefined) updates.filter_rules = validated.data.filterRules;
    if (validated.data.color !== undefined) updates.color = validated.data.color;
    if (validated.data.iconName !== undefined) updates.icon_name = validated.data.iconName;

    const { data, error } = await supabase
      .from("audience_segments")
      .update(updates)
      .eq("id", id)
      .select("id, name, cached_count")
      .single();

    if (error) {
      console.error("Failed to update segment:", error);
      return serverActionError(error.message, "DATABASE_ERROR");
    }

    // Audit log
    await logAuditEvent(supabase, user.id, "UPDATE", "segment", id, {
      changes: Object.keys(updates).filter((k) => k !== "updated_at"),
    });

    invalidateTag(CACHE_TAGS.ADMIN);
    invalidateTag(CACHE_TAGS.SEGMENTS);
    revalidatePath("/admin/email");

    return {
      success: true,
      data: {
        id: data.id,
        name: data.name,
        cachedCount: data.cached_count || 0,
      },
    };
  } catch (error) {
    console.error("Failed to update segment:", error);
    return serverActionError("Failed to update segment", "UNKNOWN_ERROR");
  }
}

/**
 * Delete a segment
 */
export async function deleteSegment(id: string): Promise<ServerActionResult<void>> {
  try {
    // Validate ID
    if (!id || !z.string().uuid().safeParse(id).success) {
      return serverActionError("Invalid segment ID", "VALIDATION_ERROR");
    }

    const auth = await verifyAdminAccess();
    if (isAuthError(auth)) {
      return serverActionError(auth.error, auth.code);
    }

    const { supabase, user } = auth;

    // Check if segment is system segment
    const { data: existing } = await supabase
      .from("audience_segments")
      .select("is_system, name")
      .eq("id", id)
      .single();

    if (!existing) {
      return serverActionError("Segment not found", "NOT_FOUND");
    }

    if (existing.is_system) {
      return serverActionError("Cannot delete system segments", "VALIDATION_ERROR");
    }

    const { error } = await supabase.from("audience_segments").delete().eq("id", id);

    if (error) {
      console.error("Failed to delete segment:", error);
      return serverActionError(error.message, "DATABASE_ERROR");
    }

    // Audit log
    await logAuditEvent(supabase, user.id, "DELETE", "segment", id, {
      name: existing.name,
    });

    invalidateTag(CACHE_TAGS.ADMIN);
    invalidateTag(CACHE_TAGS.SEGMENTS);
    revalidatePath("/admin/email");

    return successVoid();
  } catch (error) {
    console.error("Failed to delete segment:", error);
    return serverActionError("Failed to delete segment", "UNKNOWN_ERROR");
  }
}

/**
 * Refresh segment member count
 */
export async function refreshSegmentCount(id: string): Promise<ServerActionResult<number>> {
  try {
    // Validate ID
    if (!id || !z.string().uuid().safeParse(id).success) {
      return serverActionError("Invalid segment ID", "VALIDATION_ERROR");
    }

    const auth = await verifyAdminAccess();
    if (isAuthError(auth)) {
      return serverActionError(auth.error, auth.code);
    }

    const { supabase, user } = auth;

    // Get segment filter rules
    const { data: segment, error: fetchError } = await supabase
      .from("audience_segments")
      .select("filter_rules")
      .eq("id", id)
      .single();

    if (fetchError || !segment) {
      return serverActionError("Segment not found", "NOT_FOUND");
    }

    // For now, just count all active subscribers
    // In production, this would apply the filter rules
    const { count, error: countError } = await supabase
      .from("newsletter_subscribers")
      .select("*", { count: "exact", head: true })
      .eq("status", "active");

    if (countError) {
      console.error("Failed to count segment members:", countError);
      return serverActionError(countError.message, "DATABASE_ERROR");
    }

    // Update cached count
    await supabase
      .from("audience_segments")
      .update({ cached_count: count || 0, updated_at: new Date().toISOString() })
      .eq("id", id);

    // Audit log
    await logAuditEvent(supabase, user.id, "REFRESH_COUNT", "segment", id, {
      newCount: count || 0,
    });

    invalidateTag(CACHE_TAGS.ADMIN);
    invalidateTag(CACHE_TAGS.SEGMENTS);

    return {
      success: true,
      data: count || 0,
    };
  } catch (error) {
    console.error("Failed to refresh segment count:", error);
    return serverActionError("Failed to refresh segment count", "UNKNOWN_ERROR");
  }
}
