/**
 * Email Automation Processor Task
 *
 * Handles automated email flows via Trigger.dev
 * - Processes email_automation_queue table
 * - Sends scheduled automation emails
 * - Updates automation run status
 */

import { task, schedules } from "@trigger.dev/sdk/v3";
import { sendEmailTask } from "./email-queue";

// ============================================================================
// Types
// ============================================================================

interface AutomationQueueItem {
  id: string;
  automation_id: string;
  profile_id: string;
  email: string;
  step_index: number;
  scheduled_at: string;
  status: string;
  template_name: string;
  template_data: Record<string, unknown>;
}

interface ProcessAutomationResult {
  processed: number;
  sent: number;
  failed: number;
  errors?: string[];
}

// ============================================================================
// Process Single Automation Email
// ============================================================================

/**
 * Process a single automation queue item
 */
export const processAutomationEmailTask = task({
  id: "process-automation-email",
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 10000,
  },
  run: async (payload: { queueItemId: string }): Promise<{ success: boolean; error?: string }> => {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();

    // 1. Fetch queue item
    const { data: queueItem, error: fetchError } = await supabase
      .from("email_automation_queue")
      .select("*, automation:email_automations(*)")
      .eq("id", payload.queueItemId)
      .single();

    if (fetchError || !queueItem) {
      return { success: false, error: `Queue item not found: ${payload.queueItemId}` };
    }

    // 2. Mark as processing
    await supabase
      .from("email_automation_queue")
      .update({ status: "processing" })
      .eq("id", payload.queueItemId);

    try {
      // 3. Get automation step details
      const automation = queueItem.automation;
      const steps = automation?.steps || [];
      const currentStep = steps[queueItem.step_index];

      if (!currentStep) {
        throw new Error(`Step ${queueItem.step_index} not found in automation`);
      }

      // 4. Build email content from template
      const { data: template } = await supabase
        .from("email_templates")
        .select("*")
        .eq("id", currentStep.template_id)
        .single();

      const htmlContent = template?.html_content || currentStep.html_content || "";
      const subject = currentStep.subject || template?.subject || "FoodShare Update";

      // 5. Send email via trigger task
      const result = await sendEmailTask.triggerAndWait({
        to: queueItem.email,
        subject,
        html: htmlContent,
        text: currentStep.text_content,
        emailType: "newsletter",
        data: queueItem.template_data,
      });

      if (!result.ok) {
        throw new Error(`Email task failed: ${String(result.error)}`);
      }

      // 6. Update queue item status
      await supabase
        .from("email_automation_queue")
        .update({
          status: result.output.success ? "sent" : "failed",
          sent_at: result.output.success ? new Date().toISOString() : null,
          error_message: result.output.error,
        })
        .eq("id", payload.queueItemId);

      // 7. Record in automation runs
      await supabase.from("email_automation_runs").insert({
        automation_id: queueItem.automation_id,
        profile_id: queueItem.profile_id,
        step_index: queueItem.step_index,
        status: result.output.success ? "sent" : "failed",
        sent_at: new Date().toISOString(),
      });

      return { success: result.output.success, error: result.output.error };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";

      // Update status to failed
      await supabase
        .from("email_automation_queue")
        .update({
          status: "failed",
          error_message: errorMsg,
        })
        .eq("id", payload.queueItemId);

      return { success: false, error: errorMsg };
    }
  },
});

// ============================================================================
// Scheduled Automation Processor
// ============================================================================

/**
 * Scheduled task that processes due automation emails
 * Runs every 5 minutes
 */
export const checkAutomationQueueTask = schedules.task({
  id: "check-automation-queue",
  cron: "*/5 * * * *", // Every 5 minutes
  run: async (): Promise<ProcessAutomationResult> => {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();

    // Find queue items that are due
    const { data: dueItems, error } = await supabase
      .from("email_automation_queue")
      .select("id")
      .eq("status", "pending")
      .lte("scheduled_at", new Date().toISOString())
      .limit(50); // Process max 50 at a time

    if (error) {
      console.error("[checkAutomationQueue] Failed to fetch queue:", error);
      return { processed: 0, sent: 0, failed: 0, errors: [error.message] };
    }

    if (!dueItems || dueItems.length === 0) {
      return { processed: 0, sent: 0, failed: 0 };
    }

    // Process each item
    const results = await Promise.allSettled(
      dueItems.map((item) => processAutomationEmailTask.triggerAndWait({ queueItemId: item.id }))
    );

    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const result of results) {
      if (result.status === "fulfilled") {
        if (result.value.ok && result.value.output.success) {
          sent++;
        } else {
          failed++;
          const err = result.value.ok ? result.value.output.error : String(result.value.error);
          if (err) errors.push(err);
        }
      } else {
        failed++;
        errors.push(String(result.reason));
      }
    }

    return {
      processed: dueItems.length,
      sent,
      failed,
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
    };
  },
});

// ============================================================================
// Trigger Automation for User
// ============================================================================

/**
 * Trigger an automation flow for a specific user
 * Called when user meets automation trigger conditions
 */
export const triggerAutomationTask = task({
  id: "trigger-automation",
  run: async (payload: {
    automationId: string;
    profileId: string;
    email: string;
    triggerData?: Record<string, unknown>;
  }) => {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();

    // 1. Fetch automation details
    const { data: automation, error } = await supabase
      .from("email_automations")
      .select("*")
      .eq("id", payload.automationId)
      .eq("is_active", true)
      .single();

    if (error || !automation) {
      return { success: false, error: "Automation not found or inactive" };
    }

    // 2. Check if user is already in this automation
    const { data: existingRun } = await supabase
      .from("email_automation_runs")
      .select("id")
      .eq("automation_id", payload.automationId)
      .eq("profile_id", payload.profileId)
      .limit(1);

    if (existingRun && existingRun.length > 0) {
      return { success: false, error: "User already in automation" };
    }

    // 3. Queue all steps
    const steps = automation.steps || [];
    const queueItems = steps.map((step: { delay_minutes?: number }, index: number) => ({
      automation_id: payload.automationId,
      profile_id: payload.profileId,
      email: payload.email,
      step_index: index,
      scheduled_at: new Date(Date.now() + (step.delay_minutes || 0) * 60 * 1000).toISOString(),
      status: "pending",
      template_data: {
        ...payload.triggerData,
        step_index: index,
      },
    }));

    const { error: insertError } = await supabase.from("email_automation_queue").insert(queueItems);

    if (insertError) {
      return { success: false, error: insertError.message };
    }

    return {
      success: true,
      stepsQueued: steps.length,
      automationName: automation.name,
    };
  },
});
