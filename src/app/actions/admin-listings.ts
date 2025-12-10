"use server";

/**
 * Admin Listings Server Actions
 * Mutations for admin CRM listings management
 */

import { createClient } from "@/lib/supabase/server";
import { CACHE_TAGS, invalidateTag } from "@/lib/data/cache-keys";
import { requireAdmin, logAdminAction } from "@/lib/data/admin-auth";

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
  is_active?: boolean;
  admin_notes?: string;
}

interface ActionResult {
  success: boolean;
  error?: string;
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

    await logAdminAction("update_listing", "post", String(id), adminId, {
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

    await logAdminAction("activate_listing", "post", String(id), adminId);

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

    await logAdminAction("deactivate_listing", "post", String(id), adminId, { reason });

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

    await logAdminAction("delete_listing", "post", String(id), adminId);

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

    await logAdminAction("bulk_activate_listings", "post", ids.join(","), adminId, {
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

    await logAdminAction("bulk_deactivate_listings", "post", ids.join(","), adminId, {
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

    await logAdminAction("bulk_delete_listings", "post", ids.join(","), adminId, {
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

    await logAdminAction("update_admin_notes", "post", String(id), adminId);

    invalidateTag(CACHE_TAGS.ADMIN_LISTINGS);

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

/**
 * Update user roles via user_roles junction table
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

    // Get all role IDs from roles table
    const { data: allRoles, error: rolesError } = await supabase.from("roles").select("id, name");

    if (rolesError) return { success: false, error: rolesError.message };

    const roleMap = new Map(allRoles?.map((r) => [r.name, r.id]) ?? []);

    // Delete existing user roles
    const { error: deleteError } = await supabase
      .from("user_roles")
      .delete()
      .eq("profile_id", userId);

    if (deleteError) return { success: false, error: deleteError.message };

    // Insert new roles
    const rolesToInsert = Object.entries(roles)
      .filter(([_, enabled]) => enabled)
      .map(([roleName]) => roleMap.get(roleName))
      .filter((roleId): roleId is number => roleId !== undefined)
      .map((roleId) => ({ profile_id: userId, role_id: roleId }));

    if (rolesToInsert.length > 0) {
      const { error: insertError } = await supabase.from("user_roles").insert(rolesToInsert);

      if (insertError) return { success: false, error: insertError.message };
    }

    await logAdminAction("update_user_roles", "profile", userId, adminId, { roles });

    invalidateTag(CACHE_TAGS.PROFILES);
    invalidateTag(CACHE_TAGS.ADMIN);

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}
