"use server";

/**
 * Admin Listings Server Actions
 * Mutations for admin CRM listings management
 */

import { createClient } from "@/lib/supabase/server";
import { CACHE_TAGS, invalidateTag } from "@/lib/data/cache-keys";
import { checkAdminRole } from "@/lib/data/admin-listings";

// ============================================================================
// Types
// ============================================================================

export interface UpdateListingData {
  post_name?: string;
  post_description?: string;
  post_type?: string;
  pickup_time?: string;
  available_hours?: string;
  post_address?: string;
  latitude?: number;
  longitude?: number;
  is_active?: boolean;
  admin_notes?: string;
}

interface ActionResult {
  success: boolean;
  error?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

async function requireAdmin(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const { isAdmin } = await checkAdminRole(user.id);
  if (!isAdmin) throw new Error("Admin access required");

  return user.id;
}

async function logAuditAction(
  action: string,
  entityType: string,
  entityId: string,
  userId: string,
  details: Record<string, unknown> = {}
): Promise<void> {
  const supabase = await createClient();
  await supabase.from("audit_logs").insert({
    action,
    entity_type: entityType,
    entity_id: entityId,
    user_id: userId,
    details,
  });
}

// ============================================================================
// Server Actions
// ============================================================================

/**
 * Update a listing (admin can edit any listing)
 */
export async function updateListing(id: number, data: UpdateListingData): Promise<ActionResult> {
  try {
    const adminId = await requireAdmin();
    const supabase = await createClient();

    const { error } = await supabase
      .from("posts")
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) return { success: false, error: error.message };

    await logAuditAction("update_listing", "post", String(id), adminId, {
      updated_fields: Object.keys(data),
    });

    invalidateTag(CACHE_TAGS.ADMIN_LISTINGS);
    invalidateTag(CACHE_TAGS.PRODUCTS);
    invalidateTag(CACHE_TAGS.PRODUCT(id));

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

/**
 * Activate a listing (approve)
 */
export async function activateListing(id: number): Promise<ActionResult> {
  try {
    const adminId = await requireAdmin();
    const supabase = await createClient();

    const { error } = await supabase
      .from("posts")
      .update({ is_active: true, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) return { success: false, error: error.message };

    await logAuditAction("activate_listing", "post", String(id), adminId);

    invalidateTag(CACHE_TAGS.ADMIN_LISTINGS);
    invalidateTag(CACHE_TAGS.PRODUCTS);
    invalidateTag(CACHE_TAGS.PRODUCT(id));

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

/**
 * Deactivate a listing
 */
export async function deactivateListing(id: number, reason?: string): Promise<ActionResult> {
  try {
    const adminId = await requireAdmin();
    const supabase = await createClient();

    const { error } = await supabase
      .from("posts")
      .update({
        is_active: false,
        admin_notes: reason || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) return { success: false, error: error.message };

    await logAuditAction("deactivate_listing", "post", String(id), adminId, { reason });

    invalidateTag(CACHE_TAGS.ADMIN_LISTINGS);
    invalidateTag(CACHE_TAGS.PRODUCTS);
    invalidateTag(CACHE_TAGS.PRODUCT(id));

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

/**
 * Delete a listing permanently
 */
export async function deleteListing(id: number): Promise<ActionResult> {
  try {
    const adminId = await requireAdmin();
    const supabase = await createClient();

    const { error } = await supabase.from("posts").delete().eq("id", id);

    if (error) return { success: false, error: error.message };

    await logAuditAction("delete_listing", "post", String(id), adminId);

    invalidateTag(CACHE_TAGS.ADMIN_LISTINGS);
    invalidateTag(CACHE_TAGS.PRODUCTS);

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

/**
 * Bulk activate listings
 */
export async function bulkActivateListings(ids: number[]): Promise<ActionResult> {
  try {
    const adminId = await requireAdmin();
    const supabase = await createClient();

    const { error } = await supabase
      .from("posts")
      .update({ is_active: true, updated_at: new Date().toISOString() })
      .in("id", ids);

    if (error) return { success: false, error: error.message };

    await logAuditAction("bulk_activate_listings", "post", ids.join(","), adminId, {
      count: ids.length,
    });

    invalidateTag(CACHE_TAGS.ADMIN_LISTINGS);
    invalidateTag(CACHE_TAGS.PRODUCTS);

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

/**
 * Bulk deactivate listings
 */
export async function bulkDeactivateListings(
  ids: number[],
  reason?: string
): Promise<ActionResult> {
  try {
    const adminId = await requireAdmin();
    const supabase = await createClient();

    const { error } = await supabase
      .from("posts")
      .update({
        is_active: false,
        admin_notes: reason || null,
        updated_at: new Date().toISOString(),
      })
      .in("id", ids);

    if (error) return { success: false, error: error.message };

    await logAuditAction("bulk_deactivate_listings", "post", ids.join(","), adminId, {
      count: ids.length,
      reason,
    });

    invalidateTag(CACHE_TAGS.ADMIN_LISTINGS);
    invalidateTag(CACHE_TAGS.PRODUCTS);

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

/**
 * Bulk delete listings
 */
export async function bulkDeleteListings(ids: number[]): Promise<ActionResult> {
  try {
    const adminId = await requireAdmin();
    const supabase = await createClient();

    const { error } = await supabase.from("posts").delete().in("id", ids);

    if (error) return { success: false, error: error.message };

    await logAuditAction("bulk_delete_listings", "post", ids.join(","), adminId, {
      count: ids.length,
    });

    invalidateTag(CACHE_TAGS.ADMIN_LISTINGS);
    invalidateTag(CACHE_TAGS.PRODUCTS);

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

/**
 * Update admin notes for a listing
 */
export async function updateAdminNotes(id: number, notes: string): Promise<ActionResult> {
  try {
    const adminId = await requireAdmin();
    const supabase = await createClient();

    const { error } = await supabase
      .from("posts")
      .update({ admin_notes: notes, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) return { success: false, error: error.message };

    await logAuditAction("update_admin_notes", "post", String(id), adminId);

    invalidateTag(CACHE_TAGS.ADMIN_LISTINGS);

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

/**
 * Update user role (JSONB role field)
 */
export async function updateUserRoles(
  userId: string,
  roles: Record<string, boolean>
): Promise<ActionResult> {
  try {
    const adminId = await requireAdmin();
    const supabase = await createClient();

    // Prevent self-demotion
    if (userId === adminId && roles.admin === false) {
      return { success: false, error: "Cannot remove your own admin role" };
    }

    const { error } = await supabase
      .from("profiles")
      .update({ role: roles, updated_at: new Date().toISOString() })
      .eq("id", userId);

    if (error) return { success: false, error: error.message };

    await logAuditAction("update_user_roles", "profile", userId, adminId, { roles });

    invalidateTag(CACHE_TAGS.PROFILES);
    invalidateTag(CACHE_TAGS.ADMIN);

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}
