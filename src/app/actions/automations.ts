"use server";

/**
 * Automation Server Actions
 * Handles email automation flow CRUD operations
 */

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { serverActionError, successVoid, type ServerActionResult } from "@/lib/errors";
import { CACHE_TAGS, invalidateTag } from "@/lib/data/cache-keys";
import type { ErrorCode } from "@/lib/errors";

// ============================================================================
// Types
// ============================================================================

export interface CreateAutomationInput {
  name: string;
  triggerType: string;
  triggerConfig?: Record<string, unknown>;
  steps?: AutomationStep[];
}

export interface AutomationStep {
  stepOrder: number;
  stepType: "email" | "delay" | "condition";
  config: Record<string, unknown>;
}

export interface AutomationResult {
  id: string;
  name: string;
  status: string;
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
// Automation Actions
// ============================================================================

/**
 * Create a new email automation flow
 */
export async function createAutomation(
  input: CreateAutomationInput
): Promise<ServerActionResult<AutomationResult>> {
  try {
    const auth = await verifyAdminAccess();
    if (isAuthError(auth)) {
      return serverActionError(auth.error, auth.code);
    }

    const { supabase, user } = auth;

    if (!input.name?.trim()) {
      return serverActionError("Automation name is required", "VALIDATION_ERROR");
    }
    if (!input.triggerType) {
      return serverActionError("Trigger type is required", "VALIDATION_ERROR");
    }

    const { data, error } = await supabase
      .from("email_automation_flows")
      .insert({
        name: input.name.trim(),
        trigger_type: input.triggerType,
        trigger_config: input.triggerConfig || {},
        status: "draft",
        created_by: user.id,
      })
      .select("id, name, status")
      .single();

    if (error) {
      console.error("Failed to create automation:", error);
      return serverActionError(error.message, "DATABASE_ERROR");
    }

    // Add steps if provided
    if (input.steps && input.steps.length > 0) {
      const stepsToInsert = input.steps.map((step) => ({
        flow_id: data.id,
        step_order: step.stepOrder,
        step_type: step.stepType,
        config: step.config,
      }));

      const { error: stepsError } = await supabase
        .from("email_automation_steps")
        .insert(stepsToInsert);

      if (stepsError) {
        console.error("Failed to create automation steps:", stepsError);
      }
    }

    invalidateTag(CACHE_TAGS.ADMIN);
    revalidatePath("/admin/email");

    return {
      success: true,
      data: {
        id: data.id,
        name: data.name,
        status: data.status,
      },
    };
  } catch (error) {
    console.error("Failed to create automation:", error);
    return serverActionError("Failed to create automation", "UNKNOWN_ERROR");
  }
}

/**
 * Activate an automation flow
 */
export async function activateAutomation(id: string): Promise<ServerActionResult<void>> {
  try {
    const auth = await verifyAdminAccess();
    if (isAuthError(auth)) {
      return serverActionError(auth.error, auth.code);
    }

    const { supabase } = auth;

    const { error } = await supabase
      .from("email_automation_flows")
      .update({ status: "active", updated_at: new Date().toISOString() })
      .eq("id", id)
      .in("status", ["draft", "paused"]);

    if (error) {
      console.error("Failed to activate automation:", error);
      return serverActionError(error.message, "DATABASE_ERROR");
    }

    invalidateTag(CACHE_TAGS.ADMIN);
    revalidatePath("/admin/email");

    return successVoid();
  } catch (error) {
    console.error("Failed to activate automation:", error);
    return serverActionError("Failed to activate automation", "UNKNOWN_ERROR");
  }
}

/**
 * Pause an active automation
 */
export async function pauseAutomation(id: string): Promise<ServerActionResult<void>> {
  try {
    const auth = await verifyAdminAccess();
    if (isAuthError(auth)) {
      return serverActionError(auth.error, auth.code);
    }

    const { supabase } = auth;

    const { error } = await supabase
      .from("email_automation_flows")
      .update({ status: "paused", updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("status", "active");

    if (error) {
      console.error("Failed to pause automation:", error);
      return serverActionError(error.message, "DATABASE_ERROR");
    }

    invalidateTag(CACHE_TAGS.ADMIN);
    revalidatePath("/admin/email");

    return successVoid();
  } catch (error) {
    console.error("Failed to pause automation:", error);
    return serverActionError("Failed to pause automation", "UNKNOWN_ERROR");
  }
}

/**
 * Delete an automation flow
 */
export async function deleteAutomation(id: string): Promise<ServerActionResult<void>> {
  try {
    const auth = await verifyAdminAccess();
    if (isAuthError(auth)) {
      return serverActionError(auth.error, auth.code);
    }

    const { supabase } = auth;

    // Check if automation is active
    const { data: automation } = await supabase
      .from("email_automation_flows")
      .select("status")
      .eq("id", id)
      .single();

    if (automation?.status === "active") {
      return serverActionError(
        "Cannot delete an active automation. Pause it first.",
        "VALIDATION_ERROR"
      );
    }

    // Delete steps first
    await supabase.from("email_automation_steps").delete().eq("flow_id", id);

    const { error } = await supabase.from("email_automation_flows").delete().eq("id", id);

    if (error) {
      console.error("Failed to delete automation:", error);
      return serverActionError(error.message, "DATABASE_ERROR");
    }

    invalidateTag(CACHE_TAGS.ADMIN);
    revalidatePath("/admin/email");

    return successVoid();
  } catch (error) {
    console.error("Failed to delete automation:", error);
    return serverActionError("Failed to delete automation", "UNKNOWN_ERROR");
  }
}

/**
 * Duplicate an automation flow
 */
export async function duplicateAutomation(
  id: string
): Promise<ServerActionResult<AutomationResult>> {
  try {
    const auth = await verifyAdminAccess();
    if (isAuthError(auth)) {
      return serverActionError(auth.error, auth.code);
    }

    const { supabase, user } = auth;

    // Get original automation with steps
    const { data: original, error: fetchError } = await supabase
      .from("email_automation_flows")
      .select("name, trigger_type, trigger_config")
      .eq("id", id)
      .single();

    if (fetchError || !original) {
      return serverActionError("Automation not found", "NOT_FOUND");
    }

    // Create duplicate
    const { data, error } = await supabase
      .from("email_automation_flows")
      .insert({
        name: `${original.name} (Copy)`,
        trigger_type: original.trigger_type,
        trigger_config: original.trigger_config,
        status: "draft",
        created_by: user.id,
      })
      .select("id, name, status")
      .single();

    if (error) {
      console.error("Failed to duplicate automation:", error);
      return serverActionError(error.message, "DATABASE_ERROR");
    }

    // Copy steps
    const { data: steps } = await supabase
      .from("email_automation_steps")
      .select("step_order, step_type, config")
      .eq("flow_id", id);

    if (steps && steps.length > 0) {
      const stepsToInsert = steps.map((step) => ({
        flow_id: data.id,
        step_order: step.step_order,
        step_type: step.step_type,
        config: step.config,
      }));

      await supabase.from("email_automation_steps").insert(stepsToInsert);
    }

    invalidateTag(CACHE_TAGS.ADMIN);
    revalidatePath("/admin/email");

    return {
      success: true,
      data: {
        id: data.id,
        name: data.name,
        status: data.status,
      },
    };
  } catch (error) {
    console.error("Failed to duplicate automation:", error);
    return serverActionError("Failed to duplicate automation", "UNKNOWN_ERROR");
  }
}
