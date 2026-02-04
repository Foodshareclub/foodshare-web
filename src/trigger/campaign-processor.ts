/**
 * Campaign Processor Task
 *
 * Handles scheduled email campaigns via Trigger.dev
 * - Checks for scheduled campaigns
 * - Fetches segment recipients
 * - Batch sends emails via unified notification API
 * - Updates campaign progress
 */

import { task, schedules } from "@trigger.dev/sdk/v3";
import { sendBatchEmailNotifications } from "@/lib/notifications";

// ============================================================================
// Types
// ============================================================================

interface ProcessCampaignPayload {
  campaignId: string;
}

interface ProcessCampaignResult {
  campaignId: string;
  status: "completed" | "failed" | "partial";
  totalRecipients: number;
  sent: number;
  failed: number;
}

// ============================================================================
// Process Single Campaign
// ============================================================================

/**
 * Process a single email campaign
 * Fetches recipients and sends emails in batches
 */
export const processCampaignTask = task({
  id: "process-campaign",
  retry: {
    maxAttempts: 2,
  },
  run: async (payload: ProcessCampaignPayload): Promise<ProcessCampaignResult> => {
    const { campaignId } = payload;

    // Dynamic imports for server-side modules
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();

    // 1. Fetch campaign details
    const { data: campaign, error: campaignError } = await supabase
      .from("newsletter_campaigns")
      .select("*")
      .eq("id", campaignId)
      .single();

    if (campaignError || !campaign) {
      throw new Error(`Campaign not found: ${campaignId}`);
    }

    // 2. Update status to "sending"
    await supabase.from("newsletter_campaigns").update({ status: "sending" }).eq("id", campaignId);

    // 3. Fetch segment recipients
    const { data: recipients, error: recipientsError } = await supabase
      .rpc("get_segment_recipients", { p_segment_id: campaign.segment_id })
      .limit(10000); // Safety limit

    if (recipientsError) {
      console.error("Failed to fetch recipients:", recipientsError);
      await supabase.from("newsletter_campaigns").update({ status: "failed" }).eq("id", campaignId);
      throw new Error(`Failed to fetch recipients: ${recipientsError.message}`);
    }

    const recipientList = recipients || [];

    // 4. Get user IDs for each recipient email
    const recipientEmails = recipientList.map((r: { email: string }) => r.email);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, email, first_name")
      .in("email", recipientEmails);

    if (!profiles || profiles.length === 0) {
      await supabase.from("newsletter_campaigns").update({ status: "failed" }).eq("id", campaignId);
      throw new Error("No valid recipients found");
    }

    // 5. Prepare notification payloads
    const notifications = profiles.map(
      (profile: { id: string; email: string; first_name?: string }) => ({
        userId: profile.id,
        type: "digest" as const,
        title: campaign.subject,
        body: campaign.text_content || campaign.subject,
        data: {
          campaignId: campaign.id,
          campaignName: campaign.name,
          recipientName: profile.first_name || "",
          templateId: campaign.template_id || "campaign",
          htmlContent: campaign.html_content || "",
          textContent: campaign.text_content || "",
          ...(campaign.template_data || {}),
        },
      })
    );

    // 6. Send via unified notification batch endpoint
    const batchResult = await sendBatchEmailNotifications(notifications, true);

    // Handle result
    if (!batchResult.success || !batchResult.data) {
      await supabase.from("newsletter_campaigns").update({ status: "failed" }).eq("id", campaignId);
      throw new Error(`Batch notification failed: ${batchResult.error || "Unknown error"}`);
    }

    // 7. Update campaign with results
    const finalStatus = batchResult.data.failed === 0 ? "sent" : "partial";

    await supabase
      .from("newsletter_campaigns")
      .update({
        status: finalStatus,
        sent_at: new Date().toISOString(),
        total_sent: batchResult.data.delivered,
        total_recipients: profiles.length,
      })
      .eq("id", campaignId);

    return {
      campaignId,
      status: finalStatus === "sent" ? "completed" : "partial",
      totalRecipients: profiles.length,
      sent: batchResult.data.delivered,
      failed: batchResult.data.failed,
    };
  },
});

// ============================================================================
// Scheduled Campaign Checker
// ============================================================================

/**
 * Scheduled task that checks for campaigns ready to send
 * Runs every 5 minutes
 */
export const checkScheduledCampaignsTask = schedules.task({
  id: "check-scheduled-campaigns",
  cron: "*/5 * * * *", // Every 5 minutes
  run: async () => {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();

    // Find campaigns that are scheduled and due
    const { data: dueCampaigns, error } = await supabase
      .from("newsletter_campaigns")
      .select("id, name")
      .eq("status", "scheduled")
      .lte("scheduled_at", new Date().toISOString())
      .limit(10);

    if (error) {
      console.error("Failed to fetch due campaigns:", error);
      return { processed: 0, error: error.message };
    }

    if (!dueCampaigns || dueCampaigns.length === 0) {
      return { processed: 0, message: "No campaigns due" };
    }

    // Trigger processing for each due campaign
    const triggers = await Promise.allSettled(
      dueCampaigns.map((campaign) => processCampaignTask.trigger({ campaignId: campaign.id }))
    );

    const triggered = triggers.filter((t) => t.status === "fulfilled").length;

    return {
      processed: dueCampaigns.length,
      triggered,
      campaigns: dueCampaigns.map((c) => c.name),
    };
  },
});

// ============================================================================
// Manual Campaign Trigger
// ============================================================================

/**
 * Manually trigger a campaign (for immediate send)
 */
export const triggerCampaignNow = task({
  id: "trigger-campaign-now",
  run: async (payload: { campaignId: string }) => {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();

    // Update status to scheduled (immediate)
    await supabase
      .from("newsletter_campaigns")
      .update({
        status: "scheduled",
        scheduled_at: new Date().toISOString(),
      })
      .eq("id", payload.campaignId);

    // Trigger processing
    const result = await processCampaignTask.triggerAndWait({
      campaignId: payload.campaignId,
    });

    if (!result.ok) {
      throw new Error(`Campaign processing failed: ${String(result.error)}`);
    }

    return result.output;
  },
});
