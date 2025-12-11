"use server";

/**
 * Newsletter & Campaign Server Actions
 * Mutations for email marketing and automation
 */

import { createClient } from "@/lib/supabase/server";
import { CACHE_TAGS, invalidateTag } from "@/lib/data/cache-keys";

// ============================================================================
// Campaign Management
// ============================================================================

export async function createCampaign(formData: FormData): Promise<{
  success: boolean;
  campaignId?: string;
  error?: string;
}> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const name = formData.get("name") as string;
  const subject = formData.get("subject") as string;
  const previewText = formData.get("previewText") as string;
  const htmlContent = formData.get("htmlContent") as string;
  const campaignType = (formData.get("campaignType") as string) || "newsletter";

  const { data, error } = await supabase
    .from("newsletter_campaigns")
    .insert({
      name,
      subject,
      preview_text: previewText,
      html_content: htmlContent,
      campaign_type: campaignType,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };

  invalidateTag(CACHE_TAGS.CAMPAIGNS);
  invalidateTag(CACHE_TAGS.NEWSLETTER);
  return { success: true, campaignId: data.id };
}

export async function updateCampaignStatus(
  campaignId: string,
  status: "draft" | "scheduled" | "sending" | "sent" | "paused" | "cancelled"
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const updateData: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
  if (status === "sent") updateData.sent_at = new Date().toISOString();
  if (status === "sent") updateData.completed_at = new Date().toISOString();

  const { error } = await supabase
    .from("newsletter_campaigns")
    .update(updateData)
    .eq("id", campaignId);

  if (error) return { success: false, error: error.message };

  invalidateTag(CACHE_TAGS.CAMPAIGNS);
  invalidateTag(CACHE_TAGS.CAMPAIGN(campaignId));
  return { success: true };
}

export async function scheduleCampaign(
  campaignId: string,
  scheduledAt: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("newsletter_campaigns")
    .update({
      status: "scheduled",
      scheduled_at: scheduledAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", campaignId);

  if (error) return { success: false, error: error.message };

  invalidateTag(CACHE_TAGS.CAMPAIGNS);
  invalidateTag(CACHE_TAGS.CAMPAIGN(campaignId));
  return { success: true };
}

// ============================================================================
// Subscriber Management
// ============================================================================

export async function addSubscriber(
  email: string,
  firstName?: string,
  source: "website" | "import" | "api" | "referral" = "website"
): Promise<{ success: boolean; subscriberId?: string; error?: string }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("newsletter_subscribers")
    .insert({ email, first_name: firstName, source })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") return { success: false, error: "Email already subscribed" };
    return { success: false, error: error.message };
  }

  return { success: true, subscriberId: data.id };
}

export async function unsubscribeEmail(
  email: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("newsletter_subscribers")
    .update({
      status: "unsubscribed",
      unsubscribed_at: new Date().toISOString(),
      unsubscribe_reason: reason,
      updated_at: new Date().toISOString(),
    })
    .eq("email", email);

  if (error) return { success: false, error: error.message };

  return { success: true };
}

// ============================================================================
// Audience Segments
// ============================================================================

export async function createSegment(formData: FormData): Promise<{
  success: boolean;
  segmentId?: string;
  error?: string;
}> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const criteriaStr = formData.get("criteria") as string;
  const color = (formData.get("color") as string) || "#6366f1";

  let criteria = {};
  try {
    criteria = JSON.parse(criteriaStr || "{}");
  } catch {
    return { success: false, error: "Invalid criteria JSON" };
  }

  const { data, error } = await supabase
    .from("audience_segments")
    .insert({
      name,
      description,
      criteria,
      color,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };

  invalidateTag(CACHE_TAGS.SEGMENTS);
  invalidateTag(CACHE_TAGS.NEWSLETTER);
  return { success: true, segmentId: data.id };
}

// ============================================================================
// Automation Flows
// ============================================================================

export async function createAutomationFlow(formData: FormData): Promise<{
  success: boolean;
  flowId?: string;
  error?: string;
}> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const triggerType = formData.get("triggerType") as string;
  const triggerConfigStr = formData.get("triggerConfig") as string;
  const stepsStr = formData.get("steps") as string;

  let triggerConfig = {};
  let steps: unknown[] = [];
  try {
    triggerConfig = JSON.parse(triggerConfigStr || "{}");
    steps = JSON.parse(stepsStr || "[]");
  } catch {
    return { success: false, error: "Invalid JSON configuration" };
  }

  const { data, error } = await supabase
    .from("email_automation_flows")
    .insert({
      name,
      description,
      trigger_type: triggerType,
      trigger_config: triggerConfig,
      steps,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };

  invalidateTag(CACHE_TAGS.AUTOMATIONS);
  invalidateTag(CACHE_TAGS.NEWSLETTER);
  return { success: true, flowId: data.id };
}

export async function updateAutomationStatus(
  flowId: string,
  status: "draft" | "active" | "paused" | "archived"
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("email_automation_flows")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", flowId);

  if (error) return { success: false, error: error.message };

  invalidateTag(CACHE_TAGS.AUTOMATIONS);
  invalidateTag(CACHE_TAGS.AUTOMATION(flowId));
  return { success: true };
}

export async function enrollUserInAutomation(
  flowId: string,
  profileId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("automation_enrollments")
    .insert({ flow_id: flowId, profile_id: profileId })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") return { success: true }; // Already enrolled
    return { success: false, error: error.message };
  }

  // Update flow enrollment count
  await supabase.rpc("increment_automation_enrolled", { flow_id: flowId });

  return { success: true };
}
