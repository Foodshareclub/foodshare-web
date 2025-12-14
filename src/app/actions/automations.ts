"use server";

/**
 * Email Automation Server Actions
 * Bleeding-edge implementation with:
 * - Zod schema validation
 * - Type-safe action results
 * - Optimistic update support
 * - Rate limiting awareness
 * - Audit logging
 * - Soft delete pattern
 */

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { AutomationStep } from "@/lib/data/automations";
import { invalidateTag } from "@/lib/data/cache-keys";

// ============================================================================
// Type-Safe Action Result Pattern
// ============================================================================

type ActionSuccess<T> = { success: true; data: T };
type ActionError = { success: false; error: { message: string; code?: string; field?: string } };
type ActionResult<T> = ActionSuccess<T> | ActionError;

function success<T>(data: T): ActionSuccess<T> {
  return { success: true, data };
}

function error(message: string, code?: string, field?: string): ActionError {
  return { success: false, error: { message, code, field } };
}

// ============================================================================
// Zod Schemas for Validation
// ============================================================================

const AutomationStepSchema = z.object({
  type: z.enum(["email", "delay", "condition", "action"]),
  delay_minutes: z.number().min(0).optional(),
  template_slug: z.string().optional(),
  subject: z.string().max(200).optional(),
  content: z.string().optional(),
  condition: z
    .object({
      field: z.string(),
      operator: z.string(),
      value: z.unknown(),
    })
    .optional(),
});

const CreateAutomationSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  description: z.string().max(500).optional(),
  trigger_type: z.string().min(1, "Trigger type is required"),
  trigger_config: z.record(z.string(), z.unknown()).optional(),
  steps: z.array(AutomationStepSchema).optional(),
});

const UpdateAutomationSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  trigger_type: z.string().optional(),
  trigger_config: z.record(z.string(), z.unknown()).optional(),
  steps: z.array(AutomationStepSchema).optional(),
  status: z.enum(["draft", "active", "paused", "archived"]).optional(),
});

const EmailTemplateSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, "Name is required").max(100),
  slug: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase with hyphens"),
  subject: z.string().min(1, "Subject is required").max(200),
  html_content: z.string().min(1, "Content is required"),
  plain_text_content: z.string().optional(),
  category: z.enum(["automation", "transactional", "marketing", "system"]).optional(),
  variables: z.array(z.string()).optional(),
});

// ============================================================================
// Auth Helper with Role Check
// ============================================================================

async function requireAuth(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("UNAUTHORIZED");
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = (profile as { role?: string } | null)?.role;
  if (!role || !["admin", "super_admin"].includes(role)) {
    throw new Error("FORBIDDEN");
  }

  return user;
}

// ============================================================================
// Audit Log Helper
// ============================================================================

async function logAuditEvent(
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

function invalidateAutomationCache(): void {
  revalidatePath("/admin/email");
  invalidateTag("automations");
  invalidateTag("email-dashboard");
}

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
// Enrollment Management
// ============================================================================

export async function enrollUserInAutomation(
  flowId: string,
  profileId: string
): Promise<ActionResult<{ enrollmentId: string }>> {
  try {
    if (!flowId || !z.string().uuid().safeParse(flowId).success) {
      return error("Invalid flow ID", "INVALID_ID");
    }
    if (!profileId || !z.string().uuid().safeParse(profileId).success) {
      return error("Invalid profile ID", "INVALID_ID");
    }

    const supabase = await createClient();
    const user = await requireAuth(supabase);

    // Check if flow is active
    const { data: flow } = await supabase
      .from("email_automation_flows")
      .select("status, name")
      .eq("id", flowId)
      .single();

    if (!flow) {
      return error("Automation not found", "NOT_FOUND");
    }

    if (flow.status !== "active") {
      return error("Can only enroll users in active automations", "NOT_ACTIVE");
    }

    const { data, error: rpcError } = await supabase.rpc("enroll_user_in_automation", {
      p_flow_id: flowId,
      p_profile_id: profileId,
    });

    if (rpcError) {
      console.error("Error enrolling user:", rpcError);
      return error(rpcError.message, "DB_ERROR");
    }

    if (!data) {
      return error("User is already enrolled in this automation", "ALREADY_ENROLLED");
    }

    await logAuditEvent(supabase, user.id, "ENROLL_USER", "automation_enrollment", data, {
      flowId,
      profileId,
      flowName: flow.name,
    });

    invalidateAutomationCache();
    return success({ enrollmentId: data });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "UNAUTHORIZED") return error("Please sign in", "UNAUTHORIZED");
      if (err.message === "FORBIDDEN") return error("Admin access required", "FORBIDDEN");
    }
    console.error("Error in enrollUserInAutomation:", err);
    return error("An unexpected error occurred", "INTERNAL_ERROR");
  }
}

export async function exitUserFromAutomation(
  enrollmentId: string,
  reason?: string
): Promise<ActionResult<{ id: string }>> {
  try {
    if (!enrollmentId || !z.string().uuid().safeParse(enrollmentId).success) {
      return error("Invalid enrollment ID", "INVALID_ID");
    }

    const supabase = await createClient();
    const user = await requireAuth(supabase);

    const { error: dbError } = await supabase
      .from("automation_enrollments")
      .update({
        status: "exited",
        exited_at: new Date().toISOString(),
        exit_reason: reason || "Manual exit by admin",
        updated_at: new Date().toISOString(),
      })
      .eq("id", enrollmentId);

    if (dbError) {
      return error("Failed to exit user", "DB_ERROR");
    }

    // Cancel pending queue items
    await supabase
      .from("email_automation_queue")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("enrollment_id", enrollmentId)
      .eq("status", "pending");

    await logAuditEvent(supabase, user.id, "EXIT_USER", "automation_enrollment", enrollmentId, {
      reason: reason || "Manual exit",
    });

    invalidateAutomationCache();
    return success({ id: enrollmentId });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "UNAUTHORIZED") return error("Please sign in", "UNAUTHORIZED");
      if (err.message === "FORBIDDEN") return error("Admin access required", "FORBIDDEN");
    }
    console.error("Error in exitUserFromAutomation:", err);
    return error("An unexpected error occurred", "INTERNAL_ERROR");
  }
}

// ============================================================================
// Email Template Management
// ============================================================================

export async function saveEmailTemplate(
  input: z.infer<typeof EmailTemplateSchema>
): Promise<ActionResult<{ id: string; slug: string }>> {
  try {
    const validated = EmailTemplateSchema.safeParse(input);
    if (!validated.success) {
      const firstError = validated.error.issues[0];
      return error(firstError.message, "VALIDATION_ERROR", firstError.path.join("."));
    }

    const supabase = await createClient();
    const user = await requireAuth(supabase);

    // Check slug uniqueness
    const { data: existing } = await supabase
      .from("email_templates")
      .select("id")
      .eq("slug", validated.data.slug)
      .neq("id", validated.data.id || "00000000-0000-0000-0000-000000000000")
      .single();

    if (existing) {
      return error("A template with this slug already exists", "DUPLICATE_SLUG", "slug");
    }

    if (validated.data.id) {
      // Update existing
      const { data: updated, error: dbError } = await supabase
        .from("email_templates")
        .update({
          name: validated.data.name,
          slug: validated.data.slug,
          subject: validated.data.subject,
          html_content: validated.data.html_content,
          plain_text_content: validated.data.plain_text_content || null,
          category: validated.data.category || "automation",
          variables: validated.data.variables || [],
          updated_at: new Date().toISOString(),
        })
        .eq("id", validated.data.id)
        .select("id, slug")
        .single();

      if (dbError) {
        return error("Failed to update template", "DB_ERROR");
      }

      await logAuditEvent(supabase, user.id, "UPDATE", "email_template", updated.id);
      invalidateAutomationCache();
      return success({ id: updated.id, slug: updated.slug });
    } else {
      // Create new
      const { data: created, error: dbError } = await supabase
        .from("email_templates")
        .insert({
          name: validated.data.name,
          slug: validated.data.slug,
          subject: validated.data.subject,
          html_content: validated.data.html_content,
          plain_text_content: validated.data.plain_text_content || null,
          category: validated.data.category || "automation",
          variables: validated.data.variables || [],
          created_by: user.id,
        })
        .select("id, slug")
        .single();

      if (dbError) {
        return error("Failed to create template", "DB_ERROR");
      }

      await logAuditEvent(supabase, user.id, "CREATE", "email_template", created.id);
      invalidateAutomationCache();
      return success({ id: created.id, slug: created.slug });
    }
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "UNAUTHORIZED") return error("Please sign in", "UNAUTHORIZED");
      if (err.message === "FORBIDDEN") return error("Admin access required", "FORBIDDEN");
    }
    console.error("Error in saveEmailTemplate:", err);
    return error("An unexpected error occurred", "INTERNAL_ERROR");
  }
}

export async function deleteEmailTemplate(id: string): Promise<ActionResult<{ id: string }>> {
  try {
    if (!id || !z.string().uuid().safeParse(id).success) {
      return error("Invalid template ID", "INVALID_ID");
    }

    const supabase = await createClient();
    const user = await requireAuth(supabase);

    // Check if template is in use
    const { data: flows } = await supabase
      .from("email_automation_flows")
      .select("id, name")
      .contains("steps", [{ template_slug: id }]);

    if (flows && flows.length > 0) {
      return error(
        `Template is used by ${flows.length} automation(s). Remove references first.`,
        "IN_USE"
      );
    }

    const { error: dbError } = await supabase.from("email_templates").delete().eq("id", id);

    if (dbError) {
      return error("Failed to delete template", "DB_ERROR");
    }

    await logAuditEvent(supabase, user.id, "DELETE", "email_template", id);
    invalidateAutomationCache();
    return success({ id });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "UNAUTHORIZED") return error("Please sign in", "UNAUTHORIZED");
      if (err.message === "FORBIDDEN") return error("Admin access required", "FORBIDDEN");
    }
    console.error("Error in deleteEmailTemplate:", err);
    return error("An unexpected error occurred", "INTERNAL_ERROR");
  }
}

// ============================================================================
// Preset Automations
// ============================================================================

export async function createPresetAutomation(
  preset: "welcome" | "reengagement" | "food_alert"
): Promise<ActionResult<{ id: string; name: string }>> {
  const presets = {
    welcome: {
      name: "Welcome Series",
      description: "Onboard new subscribers with a 3-email sequence",
      trigger_type: "user_signup",
      steps: [
        {
          type: "email" as const,
          delay_minutes: 0,
          template_slug: "welcome",
          subject: "Welcome to FoodShare! 🍎",
        },
        { type: "delay" as const, delay_minutes: 2880 },
        {
          type: "email" as const,
          delay_minutes: 0,
          template_slug: "complete-profile",
          subject: "Complete your FoodShare profile 📝",
        },
        { type: "delay" as const, delay_minutes: 7200 },
        {
          type: "email" as const,
          delay_minutes: 0,
          template_slug: "first-share-tips",
          subject: "Ready to share your first food? 🥗",
        },
      ],
    },
    reengagement: {
      name: "Re-engagement Campaign",
      description: "Win back inactive users after 30 days",
      trigger_type: "inactivity",
      trigger_config: { days_inactive: 30 },
      steps: [
        {
          type: "email" as const,
          delay_minutes: 0,
          template_slug: "reengagement",
          subject: "We miss you at FoodShare! 💚",
        },
        { type: "delay" as const, delay_minutes: 10080 },
        {
          type: "condition" as const,
          condition: { field: "last_seen_at", operator: "older_than", value: "7d" },
        },
        {
          type: "email" as const,
          delay_minutes: 0,
          subject: "Here's what you're missing on FoodShare",
        },
      ],
    },
    food_alert: {
      name: "Food Alert",
      description: "Notify users when food is available nearby",
      trigger_type: "food_listed_nearby",
      trigger_config: { radius_km: 5, max_per_day: 3 },
      steps: [
        {
          type: "email" as const,
          delay_minutes: 0,
          template_slug: "food-alert",
          subject: "New food available near you! 🍽️",
        },
      ],
    },
  };

  const config = presets[preset];
  if (!config) {
    return error("Invalid preset type", "INVALID_PRESET");
  }

  return createAutomationFlow(config);
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

// ============================================================================
// Analytics & Insights
// ============================================================================

export async function getAutomationInsights(flowId: string): Promise<
  ActionResult<{
    enrollments: { total: number; active: number; completed: number; exited: number };
    emails: { sent: number; failed: number; pending: number };
    performance: { avgCompletionTime: number; conversionRate: number };
  }>
> {
  try {
    if (!flowId || !z.string().uuid().safeParse(flowId).success) {
      return error("Invalid flow ID", "INVALID_ID");
    }

    const supabase = await createClient();
    await requireAuth(supabase);

    // Get enrollment stats
    const { data: enrollments } = await supabase
      .from("automation_enrollments")
      .select("status")
      .eq("flow_id", flowId);

    const enrollmentStats = {
      total: enrollments?.length || 0,
      active: enrollments?.filter((e) => e.status === "active").length || 0,
      completed: enrollments?.filter((e) => e.status === "completed").length || 0,
      exited: enrollments?.filter((e) => e.status === "exited").length || 0,
    };

    // Get email stats
    const { data: emails } = await supabase
      .from("email_automation_queue")
      .select("status")
      .eq("flow_id", flowId);

    const emailStats = {
      sent: emails?.filter((e) => e.status === "sent").length || 0,
      failed: emails?.filter((e) => e.status === "failed").length || 0,
      pending: emails?.filter((e) => e.status === "pending").length || 0,
    };

    // Get flow for conversion data
    const { data: flow } = await supabase
      .from("email_automation_flows")
      .select("total_completed, total_converted")
      .eq("id", flowId)
      .single();

    const conversionRate =
      flow && flow.total_completed > 0
        ? Math.round((flow.total_converted / flow.total_completed) * 100)
        : 0;

    return success({
      enrollments: enrollmentStats,
      emails: emailStats,
      performance: {
        avgCompletionTime: 0, // Would need more complex query
        conversionRate,
      },
    });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "UNAUTHORIZED") return error("Please sign in", "UNAUTHORIZED");
      if (err.message === "FORBIDDEN") return error("Admin access required", "FORBIDDEN");
    }
    console.error("Error in getAutomationInsights:", err);
    return error("An unexpected error occurred", "INTERNAL_ERROR");
  }
}
