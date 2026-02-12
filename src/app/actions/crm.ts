"use server";

/**
 * CRM Server Actions
 * Bleeding-edge implementation with:
 * - Zod schema validation
 * - Type-safe action results
 * - Audit logging
 * - Proper auth checks
 */

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { invalidateTag } from "@/lib/data/cache-invalidation";
import { CRM_CACHE_TAGS } from "@/lib/data/crm";
import { serverActionError, successVoid, type ServerActionResult } from "@/lib/errors";
import type { ErrorCode } from "@/lib/errors";

// ============================================================================
// Zod Schemas
// ============================================================================

const LifecycleStageSchema = z.enum(["lead", "active", "champion", "at_risk", "churned"]);

const UpdateEngagementSchema = z.object({
  customerId: z.string().uuid("Invalid customer ID"),
  score: z.number().int().min(0).max(100),
});

const ArchiveCustomerSchema = z.object({
  customerId: z.string().uuid("Invalid customer ID"),
  reason: z.string().max(500).optional(),
});

const AddNoteSchema = z.object({
  customerId: z.string().uuid("Invalid customer ID"),
  content: z.string().min(1, "Note content is required").max(5000),
  noteType: z.enum(["general", "call", "email", "meeting", "support"]).default("general"),
});

const CreateTagSchema = z.object({
  name: z.string().min(1, "Tag name is required").max(50),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color format"),
  description: z.string().max(200).optional(),
});

// ============================================================================
// Types
// ============================================================================

export interface ImportResult {
  imported: number;
}

export interface TagResult {
  tagId: string;
}

// ============================================================================
// Helper: Verify Auth
// ============================================================================

type AuthError = { error: string; code: ErrorCode };
type AuthSuccess = {
  user: { id: string };
  supabase: Awaited<ReturnType<typeof createClient>>;
};

async function verifyAuth(): Promise<AuthError | AuthSuccess> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: "You must be logged in", code: "UNAUTHORIZED" };
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
// Import Customers from Profiles
// ============================================================================

/**
 * Import profiles as CRM customers
 * Creates CRM customer records for profiles that don't have one
 */
export async function importProfilesAsCRMCustomers(): Promise<ServerActionResult<ImportResult>> {
  try {
    const auth = await verifyAuth();
    if (isAuthError(auth)) {
      return serverActionError(auth.error, auth.code);
    }

    const { supabase, user } = auth;

    // Get profiles that don't have a CRM customer record
    const { data: profiles, error: fetchError } = await supabase
      .from("profiles")
      .select("id")
      .not("id", "in", supabase.from("crm_customers").select("profile_id"));

    if (fetchError) {
      console.error("Failed to fetch profiles:", fetchError);
      return serverActionError(fetchError.message, "DATABASE_ERROR");
    }

    if (!profiles || profiles.length === 0) {
      return {
        success: true,
        data: { imported: 0 },
      };
    }

    // Create CRM customer records
    const customersToInsert = profiles.map((p) => ({
      profile_id: p.id,
      status: "active",
      lifecycle_stage: "lead",
      engagement_score: 50,
      churn_risk_score: 0,
    }));

    const { error: insertError } = await supabase.from("crm_customers").insert(customersToInsert);

    if (insertError) {
      console.error("Failed to import customers:", insertError);
      return serverActionError(insertError.message, "DATABASE_ERROR");
    }

    await logAuditEvent(supabase, user.id, "IMPORT_CUSTOMERS", "crm_customers", "bulk", {
      count: profiles.length,
    });

    invalidateTag(CRM_CACHE_TAGS.CUSTOMERS);
    revalidatePath("/admin/crm");

    return {
      success: true,
      data: { imported: profiles.length },
    };
  } catch (error) {
    console.error("Failed to import customers:", error);
    return serverActionError("Failed to import customers", "UNKNOWN_ERROR");
  }
}

// ============================================================================
// Customer Management
// ============================================================================

/**
 * Update customer lifecycle stage
 */
export async function updateCustomerLifecycle(
  customerId: string,
  stage: z.infer<typeof LifecycleStageSchema>
): Promise<ServerActionResult<void>> {
  try {
    // Validate inputs
    if (!customerId || !z.string().uuid().safeParse(customerId).success) {
      return serverActionError("Invalid customer ID", "VALIDATION_ERROR");
    }

    const stageValidation = LifecycleStageSchema.safeParse(stage);
    if (!stageValidation.success) {
      return serverActionError("Invalid lifecycle stage", "VALIDATION_ERROR");
    }

    const auth = await verifyAuth();
    if (isAuthError(auth)) {
      return serverActionError(auth.error, auth.code);
    }

    const { supabase, user } = auth;

    const { error } = await supabase
      .from("crm_customers")
      .update({ lifecycle_stage: stageValidation.data, updated_at: new Date().toISOString() })
      .eq("id", customerId);

    if (error) {
      console.error("Failed to update lifecycle:", error);
      return serverActionError(error.message, "DATABASE_ERROR");
    }

    await logAuditEvent(supabase, user.id, "UPDATE_LIFECYCLE", "crm_customer", customerId, {
      newStage: stage,
    });

    invalidateTag(CRM_CACHE_TAGS.CUSTOMERS);
    invalidateTag(CRM_CACHE_TAGS.CUSTOMER(customerId));
    revalidatePath("/admin/crm");

    return successVoid();
  } catch (error) {
    console.error("Failed to update lifecycle:", error);
    return serverActionError("Failed to update lifecycle", "UNKNOWN_ERROR");
  }
}

/**
 * Update customer engagement score
 */
export async function updateEngagementScore(
  customerId: string,
  score: number
): Promise<ServerActionResult<void>> {
  try {
    // Validate inputs
    const validated = UpdateEngagementSchema.safeParse({ customerId, score });
    if (!validated.success) {
      const firstError = validated.error.issues[0];
      return serverActionError(firstError.message, "VALIDATION_ERROR");
    }

    const auth = await verifyAuth();
    if (isAuthError(auth)) {
      return serverActionError(auth.error, auth.code);
    }

    const { supabase, user } = auth;

    const { error } = await supabase
      .from("crm_customers")
      .update({
        engagement_score: validated.data.score,
        updated_at: new Date().toISOString(),
      })
      .eq("id", validated.data.customerId);

    if (error) {
      console.error("Failed to update engagement score:", error);
      return serverActionError(error.message, "DATABASE_ERROR");
    }

    await logAuditEvent(supabase, user.id, "UPDATE_ENGAGEMENT", "crm_customer", customerId, {
      newScore: score,
    });

    invalidateTag(CRM_CACHE_TAGS.CUSTOMERS);
    invalidateTag(CRM_CACHE_TAGS.CUSTOMER(customerId));
    revalidatePath("/admin/crm");

    return successVoid();
  } catch (error) {
    console.error("Failed to update engagement score:", error);
    return serverActionError("Failed to update engagement score", "UNKNOWN_ERROR");
  }
}

/**
 * Archive a customer
 */
export async function archiveCustomer(
  customerId: string,
  reason?: string
): Promise<ServerActionResult<void>> {
  try {
    // Validate inputs
    const validated = ArchiveCustomerSchema.safeParse({ customerId, reason });
    if (!validated.success) {
      const firstError = validated.error.issues[0];
      return serverActionError(firstError.message, "VALIDATION_ERROR");
    }

    const auth = await verifyAuth();
    if (isAuthError(auth)) {
      return serverActionError(auth.error, auth.code);
    }

    const { supabase, user } = auth;

    const { error } = await supabase
      .from("crm_customers")
      .update({
        is_archived: true,
        archived_at: new Date().toISOString(),
        archived_reason: validated.data.reason || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", validated.data.customerId);

    if (error) {
      console.error("Failed to archive customer:", error);
      return serverActionError(error.message, "DATABASE_ERROR");
    }

    await logAuditEvent(supabase, user.id, "ARCHIVE", "crm_customer", customerId, {
      reason: reason || "No reason provided",
    });

    invalidateTag(CRM_CACHE_TAGS.CUSTOMERS);
    revalidatePath("/admin/crm");

    return successVoid();
  } catch (error) {
    console.error("Failed to archive customer:", error);
    return serverActionError("Failed to archive customer", "UNKNOWN_ERROR");
  }
}

/**
 * Restore an archived customer
 */
export async function restoreCustomer(customerId: string): Promise<ServerActionResult<void>> {
  try {
    // Validate ID
    if (!customerId || !z.string().uuid().safeParse(customerId).success) {
      return serverActionError("Invalid customer ID", "VALIDATION_ERROR");
    }

    const auth = await verifyAuth();
    if (isAuthError(auth)) {
      return serverActionError(auth.error, auth.code);
    }

    const { supabase, user } = auth;

    const { error } = await supabase
      .from("crm_customers")
      .update({
        is_archived: false,
        archived_at: null,
        archived_reason: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", customerId);

    if (error) {
      console.error("Failed to restore customer:", error);
      return serverActionError(error.message, "DATABASE_ERROR");
    }

    await logAuditEvent(supabase, user.id, "RESTORE", "crm_customer", customerId);

    invalidateTag(CRM_CACHE_TAGS.CUSTOMERS);
    invalidateTag(CRM_CACHE_TAGS.CUSTOMER(customerId));
    revalidatePath("/admin/crm");

    return successVoid();
  } catch (error) {
    console.error("Failed to restore customer:", error);
    return serverActionError("Failed to restore customer", "UNKNOWN_ERROR");
  }
}

// ============================================================================
// Customer Notes
// ============================================================================

/**
 * Add a note to a customer
 */
export async function addCustomerNote(
  customerId: string,
  content: string,
  noteType: "general" | "call" | "email" | "meeting" | "support" = "general"
): Promise<ServerActionResult<void>> {
  try {
    // Validate inputs
    const validated = AddNoteSchema.safeParse({ customerId, content, noteType });
    if (!validated.success) {
      const firstError = validated.error.issues[0];
      return serverActionError(firstError.message, "VALIDATION_ERROR");
    }

    const auth = await verifyAuth();
    if (isAuthError(auth)) {
      return serverActionError(auth.error, auth.code);
    }

    const { supabase, user } = auth;

    const { error } = await supabase.from("crm_customer_notes").insert({
      customer_id: validated.data.customerId,
      admin_id: user.id,
      content: validated.data.content,
      note_text: validated.data.content,
      note_type: validated.data.noteType,
    });

    if (error) {
      console.error("Failed to add note:", error);
      return serverActionError(error.message, "DATABASE_ERROR");
    }

    // Update last interaction
    await supabase
      .from("crm_customers")
      .update({ last_interaction_at: new Date().toISOString() })
      .eq("id", validated.data.customerId);

    invalidateTag(CRM_CACHE_TAGS.CUSTOMER_NOTES(customerId));
    invalidateTag(CRM_CACHE_TAGS.CUSTOMER(customerId));
    revalidatePath("/admin/crm");

    return successVoid();
  } catch (error) {
    console.error("Failed to add note:", error);
    return serverActionError("Failed to add note", "UNKNOWN_ERROR");
  }
}

/**
 * Delete a customer note
 */
export async function deleteCustomerNote(noteId: string): Promise<ServerActionResult<void>> {
  try {
    // Validate ID
    if (!noteId || !z.string().uuid().safeParse(noteId).success) {
      return serverActionError("Invalid note ID", "VALIDATION_ERROR");
    }

    const auth = await verifyAuth();
    if (isAuthError(auth)) {
      return serverActionError(auth.error, auth.code);
    }

    const { supabase, user } = auth;

    // Get note to find customer ID for cache invalidation
    const { data: note } = await supabase
      .from("crm_customer_notes")
      .select("customer_id")
      .eq("id", noteId)
      .single();

    const { error } = await supabase.from("crm_customer_notes").delete().eq("id", noteId);

    if (error) {
      console.error("Failed to delete note:", error);
      return serverActionError(error.message, "DATABASE_ERROR");
    }

    await logAuditEvent(supabase, user.id, "DELETE_NOTE", "crm_customer_note", noteId);

    if (note?.customer_id) {
      invalidateTag(CRM_CACHE_TAGS.CUSTOMER_NOTES(note.customer_id));
      invalidateTag(CRM_CACHE_TAGS.CUSTOMER(note.customer_id));
    }
    revalidatePath("/admin/crm");

    return successVoid();
  } catch (error) {
    console.error("Failed to delete note:", error);
    return serverActionError("Failed to delete note", "UNKNOWN_ERROR");
  }
}

// ============================================================================
// Tags
// ============================================================================

/**
 * Assign tag to customer
 */
export async function assignTagToCustomer(
  customerId: string,
  tagId: string
): Promise<ServerActionResult<void>> {
  try {
    // Validate IDs
    if (!customerId || !z.string().uuid().safeParse(customerId).success) {
      return serverActionError("Invalid customer ID", "VALIDATION_ERROR");
    }
    if (!tagId || !z.string().uuid().safeParse(tagId).success) {
      return serverActionError("Invalid tag ID", "VALIDATION_ERROR");
    }

    const supabase = await createClient();

    const { error } = await supabase.from("crm_customer_tag_assignments").insert({
      customer_id: customerId,
      tag_id: tagId,
    });

    if (error) {
      // Ignore duplicate key errors
      if (error.code === "23505") {
        return successVoid();
      }
      console.error("Failed to assign tag:", error);
      return serverActionError(error.message, "DATABASE_ERROR");
    }

    invalidateTag(CRM_CACHE_TAGS.CUSTOMER(customerId));
    revalidatePath("/admin/crm");

    return successVoid();
  } catch (error) {
    console.error("Failed to assign tag:", error);
    return serverActionError("Failed to assign tag", "UNKNOWN_ERROR");
  }
}

/**
 * Remove tag from customer
 */
export async function removeTagFromCustomer(
  customerId: string,
  tagId: string
): Promise<ServerActionResult<void>> {
  try {
    // Validate IDs
    if (!customerId || !z.string().uuid().safeParse(customerId).success) {
      return serverActionError("Invalid customer ID", "VALIDATION_ERROR");
    }
    if (!tagId || !z.string().uuid().safeParse(tagId).success) {
      return serverActionError("Invalid tag ID", "VALIDATION_ERROR");
    }

    const supabase = await createClient();

    const { error } = await supabase
      .from("crm_customer_tag_assignments")
      .delete()
      .eq("customer_id", customerId)
      .eq("tag_id", tagId);

    if (error) {
      console.error("Failed to remove tag:", error);
      return serverActionError(error.message, "DATABASE_ERROR");
    }

    invalidateTag(CRM_CACHE_TAGS.CUSTOMER(customerId));
    revalidatePath("/admin/crm");

    return successVoid();
  } catch (error) {
    console.error("Failed to remove tag:", error);
    return serverActionError("Failed to remove tag", "UNKNOWN_ERROR");
  }
}

/**
 * Create a new tag
 */
export async function createTag(
  name: string,
  color: string,
  description?: string
): Promise<ServerActionResult<TagResult>> {
  try {
    // Validate inputs
    const validated = CreateTagSchema.safeParse({ name, color, description });
    if (!validated.success) {
      const firstError = validated.error.issues[0];
      return serverActionError(firstError.message, "VALIDATION_ERROR");
    }

    const auth = await verifyAuth();
    if (isAuthError(auth)) {
      return serverActionError(auth.error, auth.code);
    }

    const { supabase, user } = auth;

    const { data, error } = await supabase
      .from("crm_customer_tags")
      .insert({
        name: validated.data.name,
        color: validated.data.color,
        description: validated.data.description || null,
      })
      .select("id")
      .single();

    if (error) {
      if (error.code === "23505") {
        return serverActionError("A tag with this name already exists", "CONFLICT");
      }
      console.error("Failed to create tag:", error);
      return serverActionError(error.message, "DATABASE_ERROR");
    }

    await logAuditEvent(supabase, user.id, "CREATE", "crm_tag", data.id, {
      name: validated.data.name,
    });

    invalidateTag(CRM_CACHE_TAGS.TAGS);
    revalidatePath("/admin/crm");

    return {
      success: true,
      data: { tagId: data.id },
    };
  } catch (error) {
    console.error("Failed to create tag:", error);
    return serverActionError("Failed to create tag", "UNKNOWN_ERROR");
  }
}

/**
 * Delete a tag
 */
export async function deleteTag(tagId: string): Promise<ServerActionResult<void>> {
  try {
    // Validate ID
    if (!tagId || !z.string().uuid().safeParse(tagId).success) {
      return serverActionError("Invalid tag ID", "VALIDATION_ERROR");
    }

    const auth = await verifyAuth();
    if (isAuthError(auth)) {
      return serverActionError(auth.error, auth.code);
    }

    const { supabase, user } = auth;

    // Delete tag assignments first
    await supabase.from("crm_customer_tag_assignments").delete().eq("tag_id", tagId);

    // Delete the tag
    const { error } = await supabase.from("crm_customer_tags").delete().eq("id", tagId);

    if (error) {
      console.error("Failed to delete tag:", error);
      return serverActionError(error.message, "DATABASE_ERROR");
    }

    await logAuditEvent(supabase, user.id, "DELETE", "crm_tag", tagId);

    invalidateTag(CRM_CACHE_TAGS.TAGS);
    invalidateTag(CRM_CACHE_TAGS.CUSTOMERS);
    revalidatePath("/admin/crm");

    return successVoid();
  } catch (error) {
    console.error("Failed to delete tag:", error);
    return serverActionError("Failed to delete tag", "UNKNOWN_ERROR");
  }
}
