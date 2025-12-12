"use server";

/**
 * Audience Segment Server Actions
 * Handles audience segment CRUD operations
 */

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { serverActionError, successVoid, type ServerActionResult } from "@/lib/errors";
import { CACHE_TAGS, invalidateTag } from "@/lib/data/cache-keys";
import type { ErrorCode } from "@/lib/errors";

// ============================================================================
// Types
// ============================================================================

export interface CreateSegmentInput {
  name: string;
  description?: string;
  filterRules: SegmentFilterRule[];
  color?: string;
  iconName?: string;
}

export interface SegmentFilterRule {
  field: string;
  operator: "equals" | "not_equals" | "contains" | "greater_than" | "less_than" | "in" | "not_in";
  value: string | number | string[];
}

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
// Segment Actions
// ============================================================================

/**
 * Create a new audience segment
 */
export async function createSegment(
  input: CreateSegmentInput
): Promise<ServerActionResult<SegmentResult>> {
  try {
    const auth = await verifyAdminAccess();
    if (isAuthError(auth)) {
      return serverActionError(auth.error, auth.code);
    }

    const { supabase, user } = auth;

    if (!input.name?.trim()) {
      return serverActionError("Segment name is required", "VALIDATION_ERROR");
    }
    if (!input.filterRules || input.filterRules.length === 0) {
      return serverActionError("At least one filter rule is required", "VALIDATION_ERROR");
    }

    const { data, error } = await supabase
      .from("audience_segments")
      .insert({
        name: input.name.trim(),
        description: input.description?.trim() || null,
        filter_rules: input.filterRules,
        color: input.color || "#6366f1",
        icon_name: input.iconName || "users",
        is_system: false,
        created_by: user.id,
      })
      .select("id, name, cached_count")
      .single();

    if (error) {
      console.error("Failed to create segment:", error);
      return serverActionError(error.message, "DATABASE_ERROR");
    }

    invalidateTag(CACHE_TAGS.ADMIN);
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
    const auth = await verifyAdminAccess();
    if (isAuthError(auth)) {
      return serverActionError(auth.error, auth.code);
    }

    const { supabase } = auth;

    // Check if segment is system segment
    const { data: existing } = await supabase
      .from("audience_segments")
      .select("is_system")
      .eq("id", id)
      .single();

    if (existing?.is_system) {
      return serverActionError("Cannot modify system segments", "VALIDATION_ERROR");
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (input.name !== undefined) updates.name = input.name.trim();
    if (input.description !== undefined) updates.description = input.description?.trim() || null;
    if (input.filterRules !== undefined) updates.filter_rules = input.filterRules;
    if (input.color !== undefined) updates.color = input.color;
    if (input.iconName !== undefined) updates.icon_name = input.iconName;

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

    invalidateTag(CACHE_TAGS.ADMIN);
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
    const auth = await verifyAdminAccess();
    if (isAuthError(auth)) {
      return serverActionError(auth.error, auth.code);
    }

    const { supabase } = auth;

    // Check if segment is system segment
    const { data: existing } = await supabase
      .from("audience_segments")
      .select("is_system")
      .eq("id", id)
      .single();

    if (existing?.is_system) {
      return serverActionError("Cannot delete system segments", "VALIDATION_ERROR");
    }

    const { error } = await supabase.from("audience_segments").delete().eq("id", id);

    if (error) {
      console.error("Failed to delete segment:", error);
      return serverActionError(error.message, "DATABASE_ERROR");
    }

    invalidateTag(CACHE_TAGS.ADMIN);
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
    const auth = await verifyAdminAccess();
    if (isAuthError(auth)) {
      return serverActionError(auth.error, auth.code);
    }

    const { supabase } = auth;

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

    invalidateTag(CACHE_TAGS.ADMIN);

    return {
      success: true,
      data: count || 0,
    };
  } catch (error) {
    console.error("Failed to refresh segment count:", error);
    return serverActionError("Failed to refresh segment count", "UNKNOWN_ERROR");
  }
}
