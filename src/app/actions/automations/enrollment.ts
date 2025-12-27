"use server";

/**
 * User Enrollment Management
 * Enroll and exit users from automation flows
 */

import { z } from "zod";
import { success, error, type ActionResult } from "./types";
import { requireAuth, logAuditEvent, invalidateAutomationCache } from "./helpers";
import { createClient } from "@/lib/supabase/server";

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
