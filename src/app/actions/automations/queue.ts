"use server";

/**
 * Queue Management, Cron Control, and Analytics
 * Manual queue processing, cron control, queue status, and automation insights
 */

import { z } from "zod";
import { success, error, type ActionResult } from "./types";
import { requireAuth, logAuditEvent, invalidateAutomationCache } from "./helpers";
import { createClient } from "@/lib/supabase/server";

// ============================================================================
// Manual Queue Processing (Admin Control)
// ============================================================================

export async function triggerQueueProcessing(): Promise<
  ActionResult<{ processed: number; failed: number; message: string }>
> {
  try {
    const supabase = await createClient();
    const user = await requireAuth(supabase);

    // Call the edge function directly
    const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!projectUrl || !anonKey) {
      return error("Missing Supabase configuration", "CONFIG_ERROR");
    }

    const response = await fetch(`${projectUrl}/functions/v1/process-automation-queue`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${anonKey}`,
      },
      body: JSON.stringify({
        triggered_at: new Date().toISOString(),
        source: "manual",
        triggered_by: user.id,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return error(`Queue processing failed: ${errorText}`, "EDGE_FUNCTION_ERROR");
    }

    const result = await response.json();

    await logAuditEvent(supabase, user.id, "MANUAL_QUEUE_PROCESS", "automation_queue", "manual", {
      processed: result.processed || 0,
      failed: result.failed || 0,
    });

    invalidateAutomationCache();

    return success({
      processed: result.processed || 0,
      failed: result.failed || 0,
      message: `Processed ${result.processed || 0} emails, ${result.failed || 0} failed`,
    });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "UNAUTHORIZED") return error("Please sign in", "UNAUTHORIZED");
      if (err.message === "FORBIDDEN") return error("Admin access required", "FORBIDDEN");
    }
    console.error("Error in triggerQueueProcessing:", err);
    return error("An unexpected error occurred", "INTERNAL_ERROR");
  }
}

// ============================================================================
// Cron Job Control
// ============================================================================

export async function toggleAutomationCron(
  enabled: boolean
): Promise<ActionResult<{ enabled: boolean; message: string }>> {
  try {
    const supabase = await createClient();
    const user = await requireAuth(supabase);

    // Toggle the cron job active status
    const { error: cronError } = await supabase.rpc("toggle_automation_cron", {
      p_enabled: enabled,
    });

    if (cronError) {
      // If RPC doesn't exist, try direct SQL (requires service role)
      console.warn("toggle_automation_cron RPC not found, cron control unavailable");
      return error("Cron control not available. Contact administrator.", "RPC_NOT_FOUND");
    }

    await logAuditEvent(
      supabase,
      user.id,
      enabled ? "ENABLE_CRON" : "DISABLE_CRON",
      "automation_cron",
      "process-automation-queue",
      { enabled }
    );

    return success({
      enabled,
      message: enabled
        ? "Automation queue processing enabled (runs every 5 minutes)"
        : "Automation queue processing disabled",
    });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "UNAUTHORIZED") return error("Please sign in", "UNAUTHORIZED");
      if (err.message === "FORBIDDEN") return error("Admin access required", "FORBIDDEN");
    }
    console.error("Error in toggleAutomationCron:", err);
    return error("An unexpected error occurred", "INTERNAL_ERROR");
  }
}

// ============================================================================
// Queue Management
// ============================================================================

export async function getQueueStatus(): Promise<
  ActionResult<{
    pending: number;
    processing: number;
    sent: number;
    failed: number;
    nextScheduled: string | null;
  }>
> {
  try {
    const supabase = await createClient();
    await requireAuth(supabase);

    // Get queue counts by status
    const { data: queueItems } = await supabase
      .from("email_automation_queue")
      .select("status, scheduled_for")
      .order("scheduled_for", { ascending: true });

    const counts = {
      pending: 0,
      processing: 0,
      sent: 0,
      failed: 0,
    };

    let nextScheduled: string | null = null;

    for (const item of queueItems || []) {
      if (item.status in counts) {
        counts[item.status as keyof typeof counts]++;
      }
      if (item.status === "pending" && !nextScheduled) {
        nextScheduled = item.scheduled_for;
      }
    }

    return success({ ...counts, nextScheduled });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "UNAUTHORIZED") return error("Please sign in", "UNAUTHORIZED");
      if (err.message === "FORBIDDEN") return error("Admin access required", "FORBIDDEN");
    }
    console.error("Error in getQueueStatus:", err);
    return error("An unexpected error occurred", "INTERNAL_ERROR");
  }
}

export async function cancelPendingEmails(
  flowId?: string
): Promise<ActionResult<{ cancelled: number }>> {
  try {
    const supabase = await createClient();
    const user = await requireAuth(supabase);

    let query = supabase
      .from("email_automation_queue")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("status", "pending");

    if (flowId) {
      if (!z.string().uuid().safeParse(flowId).success) {
        return error("Invalid flow ID", "INVALID_ID");
      }
      query = query.eq("flow_id", flowId);
    }

    const { data, error: dbError } = await query.select("id");

    if (dbError) {
      return error("Failed to cancel emails", "DB_ERROR");
    }

    const cancelled = data?.length || 0;

    await logAuditEvent(
      supabase,
      user.id,
      "CANCEL_PENDING_EMAILS",
      "automation_queue",
      flowId || "all",
      {
        cancelled,
        flowId: flowId || "all",
      }
    );

    invalidateAutomationCache();

    return success({ cancelled });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "UNAUTHORIZED") return error("Please sign in", "UNAUTHORIZED");
      if (err.message === "FORBIDDEN") return error("Admin access required", "FORBIDDEN");
    }
    console.error("Error in cancelPendingEmails:", err);
    return error("An unexpected error occurred", "INTERNAL_ERROR");
  }
}

// ============================================================================
// Retry Failed Emails
// ============================================================================

export async function retryFailedEmails(
  flowId?: string
): Promise<ActionResult<{ retried: number }>> {
  try {
    const supabase = await createClient();
    const user = await requireAuth(supabase);

    let query = supabase
      .from("email_automation_queue")
      .update({
        status: "pending",
        attempts: 0,
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq("status", "failed");

    if (flowId) {
      if (!z.string().uuid().safeParse(flowId).success) {
        return error("Invalid flow ID", "INVALID_ID");
      }
      query = query.eq("flow_id", flowId);
    }

    const { data, error: dbError } = await query.select("id");

    if (dbError) {
      return error("Failed to retry emails", "DB_ERROR");
    }

    const retried = data?.length || 0;

    await logAuditEvent(
      supabase,
      user.id,
      "RETRY_FAILED_EMAILS",
      "automation_queue",
      flowId || "all",
      {
        retried,
        flowId: flowId || "all",
      }
    );

    invalidateAutomationCache();

    return success({ retried });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "UNAUTHORIZED") return error("Please sign in", "UNAUTHORIZED");
      if (err.message === "FORBIDDEN") return error("Admin access required", "FORBIDDEN");
    }
    console.error("Error in retryFailedEmails:", err);
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
