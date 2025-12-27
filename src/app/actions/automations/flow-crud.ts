"use server";

/**
 * Automation Flow CRUD Operations
 * Create, update, delete, toggle, and duplicate automation flows
 */

import { z } from "zod";
import { CreateAutomationSchema, UpdateAutomationSchema } from "./schemas";
import { success, error, type ActionResult } from "./types";
import { requireAuth, logAuditEvent, invalidateAutomationCache } from "./helpers";
import type { AutomationStep } from "@/lib/data/automations";
import { createClient } from "@/lib/supabase/server";

// ============================================================================
// Create Automation Flow
// ============================================================================

export async function createAutomationFlow(
  input: z.infer<typeof CreateAutomationSchema>
): Promise<ActionResult<{ id: string; name: string }>> {
  try {
    // Validate input
    const validated = CreateAutomationSchema.safeParse(input);
    if (!validated.success) {
      const firstError = validated.error.issues[0];
      return error(firstError.message, "VALIDATION_ERROR", firstError.path.join("."));
    }

    const supabase = await createClient();
    const user = await requireAuth(supabase);

    // Check for duplicate name
    const { data: existing } = await supabase
      .from("email_automation_flows")
      .select("id")
      .eq("name", validated.data.name)
      .neq("status", "archived")
      .single();

    if (existing) {
      return error("An automation with this name already exists", "DUPLICATE_NAME", "name");
    }

    const { data: flow, error: dbError } = await supabase
      .from("email_automation_flows")
      .insert({
        name: validated.data.name,
        description: validated.data.description || null,
        trigger_type: validated.data.trigger_type,
        trigger_config: validated.data.trigger_config || {},
        steps: validated.data.steps || [],
        status: "draft",
        created_by: user.id,
      })
      .select("id, name")
      .single();

    if (dbError) {
      console.error("Error creating automation flow:", dbError);
      return error("Failed to create automation", "DB_ERROR");
    }

    // Audit log
    await logAuditEvent(supabase, user.id, "CREATE", "automation_flow", flow.id, {
      name: flow.name,
      trigger_type: validated.data.trigger_type,
    });

    invalidateAutomationCache();
    return success({ id: flow.id, name: flow.name });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "UNAUTHORIZED") return error("Please sign in", "UNAUTHORIZED");
      if (err.message === "FORBIDDEN") return error("Admin access required", "FORBIDDEN");
    }
    console.error("Error in createAutomationFlow:", err);
    return error("An unexpected error occurred", "INTERNAL_ERROR");
  }
}

// ============================================================================
// Update Automation Flow
// ============================================================================

export async function updateAutomationFlow(
  id: string,
  input: z.infer<typeof UpdateAutomationSchema>
): Promise<ActionResult<{ id: string; status: string }>> {
  try {
    if (!id || !z.string().uuid().safeParse(id).success) {
      return error("Invalid automation ID", "INVALID_ID");
    }

    const validated = UpdateAutomationSchema.safeParse(input);
    if (!validated.success) {
      const firstError = validated.error.issues[0];
      return error(firstError.message, "VALIDATION_ERROR", firstError.path.join("."));
    }

    const supabase = await createClient();
    const user = await requireAuth(supabase);

    // Check if automation exists and get current state
    const { data: current, error: fetchError } = await supabase
      .from("email_automation_flows")
      .select("id, status, name")
      .eq("id", id)
      .single();

    if (fetchError || !current) {
      return error("Automation not found", "NOT_FOUND");
    }

    // Prevent editing archived automations
    if (current.status === "archived") {
      return error("Cannot edit archived automations", "ARCHIVED");
    }

    // Check name uniqueness if changing name
    if (validated.data.name && validated.data.name !== current.name) {
      const { data: duplicate } = await supabase
        .from("email_automation_flows")
        .select("id")
        .eq("name", validated.data.name)
        .neq("id", id)
        .neq("status", "archived")
        .single();

      if (duplicate) {
        return error("An automation with this name already exists", "DUPLICATE_NAME", "name");
      }
    }

    const { data: updated, error: dbError } = await supabase
      .from("email_automation_flows")
      .update({
        ...validated.data,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("id, status")
      .single();

    if (dbError) {
      console.error("Error updating automation flow:", dbError);
      return error("Failed to update automation", "DB_ERROR");
    }

    await logAuditEvent(supabase, user.id, "UPDATE", "automation_flow", id, {
      changes: Object.keys(validated.data),
    });

    invalidateAutomationCache();
    return success({ id: updated.id, status: updated.status });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "UNAUTHORIZED") return error("Please sign in", "UNAUTHORIZED");
      if (err.message === "FORBIDDEN") return error("Admin access required", "FORBIDDEN");
    }
    console.error("Error in updateAutomationFlow:", err);
    return error("An unexpected error occurred", "INTERNAL_ERROR");
  }
}

// ============================================================================
// Delete Automation Flow (Soft Delete)
// ============================================================================

export async function deleteAutomationFlow(
  id: string,
  hardDelete = false
): Promise<ActionResult<{ id: string }>> {
  try {
    if (!id || !z.string().uuid().safeParse(id).success) {
      return error("Invalid automation ID", "INVALID_ID");
    }

    const supabase = await createClient();
    const user = await requireAuth(supabase);

    // Check if automation exists
    const { data: current, error: fetchError } = await supabase
      .from("email_automation_flows")
      .select("id, status, name, total_enrolled")
      .eq("id", id)
      .single();

    if (fetchError || !current) {
      return error("Automation not found", "NOT_FOUND");
    }

    // Prevent deleting active automations with enrollments
    if (current.status === "active" && current.total_enrolled > 0) {
      return error(
        "Cannot delete active automation with enrollments. Pause it first.",
        "HAS_ENROLLMENTS"
      );
    }

    if (hardDelete) {
      // Hard delete - remove from database
      const { error: dbError } = await supabase
        .from("email_automation_flows")
        .delete()
        .eq("id", id);

      if (dbError) {
        return error("Failed to delete automation", "DB_ERROR");
      }
    } else {
      // Soft delete - archive
      const { error: dbError } = await supabase
        .from("email_automation_flows")
        .update({
          status: "archived",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (dbError) {
        return error("Failed to archive automation", "DB_ERROR");
      }

      // Cancel all pending queue items
      await supabase
        .from("email_automation_queue")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("flow_id", id)
        .eq("status", "pending");
    }

    await logAuditEvent(
      supabase,
      user.id,
      hardDelete ? "HARD_DELETE" : "ARCHIVE",
      "automation_flow",
      id,
      {
        name: current.name,
      }
    );

    invalidateAutomationCache();
    return success({ id });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "UNAUTHORIZED") return error("Please sign in", "UNAUTHORIZED");
      if (err.message === "FORBIDDEN") return error("Admin access required", "FORBIDDEN");
    }
    console.error("Error in deleteAutomationFlow:", err);
    return error("An unexpected error occurred", "INTERNAL_ERROR");
  }
}

// ============================================================================
// Toggle Automation Status (with validation)
// ============================================================================

export async function toggleAutomationStatus(
  id: string,
  newStatus: "active" | "paused"
): Promise<ActionResult<{ id: string; status: string; message: string }>> {
  try {
    if (!id || !z.string().uuid().safeParse(id).success) {
      return error("Invalid automation ID", "INVALID_ID");
    }

    if (!["active", "paused"].includes(newStatus)) {
      return error("Invalid status. Use 'active' or 'paused'", "INVALID_STATUS");
    }

    const supabase = await createClient();
    const user = await requireAuth(supabase);

    // Get current automation state
    const { data: current, error: fetchError } = await supabase
      .from("email_automation_flows")
      .select("id, status, name, steps, trigger_type")
      .eq("id", id)
      .single();

    if (fetchError || !current) {
      return error("Automation not found", "NOT_FOUND");
    }

    // Validate before activating
    if (newStatus === "active") {
      // Check if automation has steps
      const steps = current.steps as AutomationStep[] | null;
      if (!steps || steps.length === 0) {
        return error("Cannot activate automation without steps", "NO_STEPS");
      }

      // Check if at least one email step exists
      const hasEmailStep = steps.some((s) => s.type === "email");
      if (!hasEmailStep) {
        return error("Automation must have at least one email step", "NO_EMAIL_STEP");
      }

      // Check if archived
      if (current.status === "archived") {
        return error("Cannot activate archived automation. Restore it first.", "ARCHIVED");
      }
    }

    const { data: updated, error: dbError } = await supabase
      .from("email_automation_flows")
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("id, status")
      .single();

    if (dbError) {
      return error("Failed to update status", "DB_ERROR");
    }

    // If pausing, optionally pause pending queue items
    if (newStatus === "paused") {
      await supabase
        .from("email_automation_queue")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("flow_id", id)
        .eq("status", "pending");
    }

    await logAuditEvent(
      supabase,
      user.id,
      newStatus === "active" ? "ACTIVATE" : "PAUSE",
      "automation_flow",
      id,
      {
        name: current.name,
        previousStatus: current.status,
      }
    );

    invalidateAutomationCache();

    const message =
      newStatus === "active"
        ? `"${current.name}" is now active and will process enrollments`
        : `"${current.name}" is paused. No new emails will be sent.`;

    return success({ id: updated.id, status: updated.status, message });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "UNAUTHORIZED") return error("Please sign in", "UNAUTHORIZED");
      if (err.message === "FORBIDDEN") return error("Admin access required", "FORBIDDEN");
    }
    console.error("Error in toggleAutomationStatus:", err);
    return error("An unexpected error occurred", "INTERNAL_ERROR");
  }
}

// ============================================================================
// Duplicate Automation
// ============================================================================

export async function duplicateAutomation(
  id: string
): Promise<ActionResult<{ id: string; name: string }>> {
  try {
    if (!id || !z.string().uuid().safeParse(id).success) {
      return error("Invalid automation ID", "INVALID_ID");
    }

    const supabase = await createClient();
    const user = await requireAuth(supabase);

    // Get source automation
    const { data: source, error: fetchError } = await supabase
      .from("email_automation_flows")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !source) {
      return error("Automation not found", "NOT_FOUND");
    }

    // Generate unique name
    const baseName = `${source.name} (Copy)`;
    let newName = baseName;
    let counter = 1;

    while (true) {
      const { data: existing } = await supabase
        .from("email_automation_flows")
        .select("id")
        .eq("name", newName)
        .neq("status", "archived")
        .single();

      if (!existing) break;
      counter++;
      newName = `${source.name} (Copy ${counter})`;
    }

    const { data: duplicate, error: dbError } = await supabase
      .from("email_automation_flows")
      .insert({
        name: newName,
        description: source.description,
        trigger_type: source.trigger_type,
        trigger_config: source.trigger_config,
        steps: source.steps,
        status: "draft",
        conversion_goal: source.conversion_goal,
        created_by: user.id,
      })
      .select("id, name")
      .single();

    if (dbError) {
      return error("Failed to duplicate automation", "DB_ERROR");
    }

    await logAuditEvent(supabase, user.id, "DUPLICATE", "automation_flow", duplicate.id, {
      sourceId: id,
      sourceName: source.name,
    });

    invalidateAutomationCache();
    return success({ id: duplicate.id, name: duplicate.name });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "UNAUTHORIZED") return error("Please sign in", "UNAUTHORIZED");
      if (err.message === "FORBIDDEN") return error("Admin access required", "FORBIDDEN");
    }
    console.error("Error in duplicateAutomation:", err);
    return error("An unexpected error occurred", "INTERNAL_ERROR");
  }
}

// ============================================================================
// Bulk Operations
// ============================================================================

export async function bulkUpdateAutomationStatus(
  ids: string[],
  status: "active" | "paused" | "archived"
): Promise<ActionResult<{ updated: number; failed: string[] }>> {
  try {
    if (!ids.length) {
      return error("No automation IDs provided", "NO_IDS");
    }

    if (ids.length > 50) {
      return error("Maximum 50 automations per bulk operation", "TOO_MANY");
    }

    const supabase = await createClient();
    const user = await requireAuth(supabase);

    const failed: string[] = [];
    let updated = 0;

    for (const id of ids) {
      if (!z.string().uuid().safeParse(id).success) {
        failed.push(id);
        continue;
      }

      const { error: dbError } = await supabase
        .from("email_automation_flows")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (dbError) {
        failed.push(id);
      } else {
        updated++;
      }
    }

    await logAuditEvent(supabase, user.id, "BULK_UPDATE_STATUS", "automation_flow", "bulk", {
      ids,
      status,
      updated,
      failed: failed.length,
    });

    invalidateAutomationCache();
    return success({ updated, failed });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "UNAUTHORIZED") return error("Please sign in", "UNAUTHORIZED");
      if (err.message === "FORBIDDEN") return error("Admin access required", "FORBIDDEN");
    }
    console.error("Error in bulkUpdateAutomationStatus:", err);
    return error("An unexpected error occurred", "INTERNAL_ERROR");
  }
}
