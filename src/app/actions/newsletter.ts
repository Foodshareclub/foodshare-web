"use server";

/**
 * Newsletter & Campaign Server Actions
 * Bleeding-edge implementation with:
 * - Zod schema validation
 * - Type-safe action results
 * - Audit logging
 * - Proper auth checks
 */

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { CACHE_TAGS } from "@/lib/data/cache-keys";
import { invalidateTag } from "@/lib/data/cache-invalidation";
import { serverActionError, successVoid, type ServerActionResult } from "@/lib/errors";
import type { ErrorCode } from "@/lib/errors";

// ============================================================================
// Zod Schemas
// ============================================================================

const CreateCampaignSchema = z.object({
  name: z.string().min(1, "Campaign name is required").max(200),
  subject: z.string().min(1, "Subject is required").max(200),
  previewText: z.string().max(200).optional(),
  htmlContent: z.string().min(1, "Content is required"),
  campaignType: z
    .enum(["newsletter", "announcement", "promotional", "transactional"])
    .default("newsletter"),
});

const CampaignStatusSchema = z.enum([
  "draft",
  "scheduled",
  "sending",
  "sent",
  "paused",
  "cancelled",
]);

const ScheduleCampaignSchema = z.object({
  campaignId: z.string().uuid("Invalid campaign ID"),
  scheduledAt: z.string().datetime("Invalid date format"),
});

const AddSubscriberSchema = z.object({
  email: z.string().email("Invalid email address"),
  firstName: z.string().max(100).optional(),
  source: z.enum(["website", "import", "api", "referral"]).default("website"),
});

const CreateSegmentSchema = z.object({
  name: z.string().min(1, "Segment name is required").max(100),
  description: z.string().max(500).optional(),
  criteria: z.record(z.string(), z.unknown()).default({}),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .default("#6366f1"),
});

const CreateAutomationFlowSchema = z.object({
  name: z.string().min(1, "Flow name is required").max(100),
  description: z.string().max(500).optional(),
  triggerType: z.string().min(1, "Trigger type is required"),
  triggerConfig: z.record(z.string(), z.unknown()).default({}),
  steps: z.array(z.unknown()).default([]),
});

const AutomationStatusSchema = z.enum(["draft", "active", "paused", "archived"]);

// ============================================================================
// Types
// ============================================================================

export interface CampaignResult {
  campaignId: string;
}

export interface SubscriberResult {
  subscriberId: string;
}

export interface SegmentResult {
  segmentId: string;
}

export interface FlowResult {
  flowId: string;
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
// Campaign Management
// ============================================================================

/**
 * Create a new campaign
 */
export async function createCampaign(
  formData: FormData
): Promise<ServerActionResult<CampaignResult>> {
  try {
    const auth = await verifyAuth();
    if (isAuthError(auth)) {
      return serverActionError(auth.error, auth.code);
    }

    const { supabase, user } = auth;

    // Parse and validate form data
    const rawData = {
      name: formData.get("name") as string,
      subject: formData.get("subject") as string,
      previewText: formData.get("previewText") as string,
      htmlContent: formData.get("htmlContent") as string,
      campaignType: (formData.get("campaignType") as string) || "newsletter",
    };

    const validated = CreateCampaignSchema.safeParse(rawData);
    if (!validated.success) {
      const firstError = validated.error.issues[0];
      return serverActionError(firstError.message, "VALIDATION_ERROR");
    }

    const { data, error } = await supabase
      .from("newsletter_campaigns")
      .insert({
        name: validated.data.name,
        subject: validated.data.subject,
        preview_text: validated.data.previewText || null,
        html_content: validated.data.htmlContent,
        campaign_type: validated.data.campaignType,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Failed to create campaign:", error);
      return serverActionError(error.message, "DATABASE_ERROR");
    }

    await logAuditEvent(supabase, user.id, "CREATE", "campaign", data.id, {
      name: validated.data.name,
    });

    invalidateTag(CACHE_TAGS.CAMPAIGNS);
    invalidateTag(CACHE_TAGS.NEWSLETTER);
    revalidatePath("/admin/email");

    return {
      success: true,
      data: { campaignId: data.id },
    };
  } catch (error) {
    console.error("Failed to create campaign:", error);
    return serverActionError("Failed to create campaign", "UNKNOWN_ERROR");
  }
}

/**
 * Update campaign status
 */
export async function updateCampaignStatus(
  campaignId: string,
  status: z.infer<typeof CampaignStatusSchema>
): Promise<ServerActionResult<void>> {
  try {
    // Validate inputs
    if (!campaignId || !z.string().uuid().safeParse(campaignId).success) {
      return serverActionError("Invalid campaign ID", "VALIDATION_ERROR");
    }

    const statusValidation = CampaignStatusSchema.safeParse(status);
    if (!statusValidation.success) {
      return serverActionError("Invalid status", "VALIDATION_ERROR");
    }

    const auth = await verifyAuth();
    if (isAuthError(auth)) {
      return serverActionError(auth.error, auth.code);
    }

    const { supabase, user } = auth;

    const updateData: Record<string, unknown> = {
      status: statusValidation.data,
      updated_at: new Date().toISOString(),
    };

    if (status === "sent") {
      updateData.sent_at = new Date().toISOString();
      updateData.completed_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from("newsletter_campaigns")
      .update(updateData)
      .eq("id", campaignId);

    if (error) {
      console.error("Failed to update campaign status:", error);
      return serverActionError(error.message, "DATABASE_ERROR");
    }

    await logAuditEvent(supabase, user.id, "UPDATE_STATUS", "campaign", campaignId, {
      newStatus: status,
    });

    invalidateTag(CACHE_TAGS.CAMPAIGNS);
    invalidateTag(CACHE_TAGS.CAMPAIGN(campaignId));
    revalidatePath("/admin/email");

    return successVoid();
  } catch (error) {
    console.error("Failed to update campaign status:", error);
    return serverActionError("Failed to update campaign status", "UNKNOWN_ERROR");
  }
}

/**
 * Schedule a campaign
 */
export async function scheduleCampaign(
  campaignId: string,
  scheduledAt: string
): Promise<ServerActionResult<void>> {
  try {
    // Validate inputs
    const validated = ScheduleCampaignSchema.safeParse({ campaignId, scheduledAt });
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
      .from("newsletter_campaigns")
      .update({
        status: "scheduled",
        scheduled_at: validated.data.scheduledAt,
        updated_at: new Date().toISOString(),
      })
      .eq("id", validated.data.campaignId);

    if (error) {
      console.error("Failed to schedule campaign:", error);
      return serverActionError(error.message, "DATABASE_ERROR");
    }

    await logAuditEvent(supabase, user.id, "SCHEDULE", "campaign", campaignId, {
      scheduledAt,
    });

    invalidateTag(CACHE_TAGS.CAMPAIGNS);
    invalidateTag(CACHE_TAGS.CAMPAIGN(campaignId));
    revalidatePath("/admin/email");

    return successVoid();
  } catch (error) {
    console.error("Failed to schedule campaign:", error);
    return serverActionError("Failed to schedule campaign", "UNKNOWN_ERROR");
  }
}

// ============================================================================
// Subscriber Management
// ============================================================================

/**
 * Add a subscriber
 */
export async function addSubscriber(
  email: string,
  firstName?: string,
  source: "website" | "import" | "api" | "referral" = "website"
): Promise<ServerActionResult<SubscriberResult>> {
  try {
    // Validate inputs
    const validated = AddSubscriberSchema.safeParse({ email, firstName, source });
    if (!validated.success) {
      const firstError = validated.error.issues[0];
      return serverActionError(firstError.message, "VALIDATION_ERROR");
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("newsletter_subscribers")
      .insert({
        email: validated.data.email,
        first_name: validated.data.firstName || null,
        source: validated.data.source,
      })
      .select("id")
      .single();

    if (error) {
      if (error.code === "23505") {
        return serverActionError("Email already subscribed", "CONFLICT");
      }
      console.error("Failed to add subscriber:", error);
      return serverActionError(error.message, "DATABASE_ERROR");
    }

    return {
      success: true,
      data: { subscriberId: data.id },
    };
  } catch (error) {
    console.error("Failed to add subscriber:", error);
    return serverActionError("Failed to add subscriber", "UNKNOWN_ERROR");
  }
}

/**
 * Unsubscribe an email
 */
export async function unsubscribeEmail(
  email: string,
  reason?: string
): Promise<ServerActionResult<void>> {
  try {
    // Validate email
    if (!email || !z.string().email().safeParse(email).success) {
      return serverActionError("Invalid email address", "VALIDATION_ERROR");
    }

    const supabase = await createClient();

    const { error } = await supabase
      .from("newsletter_subscribers")
      .update({
        status: "unsubscribed",
        unsubscribed_at: new Date().toISOString(),
        unsubscribe_reason: reason || null,
        updated_at: new Date().toISOString(),
      })
      .eq("email", email);

    if (error) {
      console.error("Failed to unsubscribe:", error);
      return serverActionError(error.message, "DATABASE_ERROR");
    }

    return successVoid();
  } catch (error) {
    console.error("Failed to unsubscribe:", error);
    return serverActionError("Failed to unsubscribe", "UNKNOWN_ERROR");
  }
}

// ============================================================================
// Audience Segments
// ============================================================================

/**
 * Create a segment
 */
export async function createSegment(
  formData: FormData
): Promise<ServerActionResult<SegmentResult>> {
  try {
    const auth = await verifyAuth();
    if (isAuthError(auth)) {
      return serverActionError(auth.error, auth.code);
    }

    const { supabase, user } = auth;

    // Parse form data
    const criteriaStr = formData.get("criteria") as string;
    let criteria = {};
    try {
      criteria = JSON.parse(criteriaStr || "{}");
    } catch {
      return serverActionError("Invalid criteria JSON", "VALIDATION_ERROR");
    }

    const rawData = {
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      criteria,
      color: (formData.get("color") as string) || "#6366f1",
    };

    const validated = CreateSegmentSchema.safeParse(rawData);
    if (!validated.success) {
      const firstError = validated.error.issues[0];
      return serverActionError(firstError.message, "VALIDATION_ERROR");
    }

    const { data, error } = await supabase
      .from("audience_segments")
      .insert({
        name: validated.data.name,
        description: validated.data.description || null,
        criteria: validated.data.criteria,
        color: validated.data.color,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Failed to create segment:", error);
      return serverActionError(error.message, "DATABASE_ERROR");
    }

    await logAuditEvent(supabase, user.id, "CREATE", "segment", data.id, {
      name: validated.data.name,
    });

    invalidateTag(CACHE_TAGS.SEGMENTS);
    invalidateTag(CACHE_TAGS.NEWSLETTER);
    revalidatePath("/admin/email");

    return {
      success: true,
      data: { segmentId: data.id },
    };
  } catch (error) {
    console.error("Failed to create segment:", error);
    return serverActionError("Failed to create segment", "UNKNOWN_ERROR");
  }
}

// ============================================================================
// Automation Flows
// ============================================================================

/**
 * Create an automation flow
 */
export async function createAutomationFlow(
  formData: FormData
): Promise<ServerActionResult<FlowResult>> {
  try {
    const auth = await verifyAuth();
    if (isAuthError(auth)) {
      return serverActionError(auth.error, auth.code);
    }

    const { supabase, user } = auth;

    // Parse JSON fields
    const triggerConfigStr = formData.get("triggerConfig") as string;
    const stepsStr = formData.get("steps") as string;

    let triggerConfig = {};
    let steps: unknown[] = [];
    try {
      triggerConfig = JSON.parse(triggerConfigStr || "{}");
      steps = JSON.parse(stepsStr || "[]");
    } catch {
      return serverActionError("Invalid JSON configuration", "VALIDATION_ERROR");
    }

    const rawData = {
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      triggerType: formData.get("triggerType") as string,
      triggerConfig,
      steps,
    };

    const validated = CreateAutomationFlowSchema.safeParse(rawData);
    if (!validated.success) {
      const firstError = validated.error.issues[0];
      return serverActionError(firstError.message, "VALIDATION_ERROR");
    }

    const { data, error } = await supabase
      .from("email_automation_flows")
      .insert({
        name: validated.data.name,
        description: validated.data.description || null,
        trigger_type: validated.data.triggerType,
        trigger_config: validated.data.triggerConfig,
        steps: validated.data.steps,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Failed to create automation flow:", error);
      return serverActionError(error.message, "DATABASE_ERROR");
    }

    await logAuditEvent(supabase, user.id, "CREATE", "automation_flow", data.id, {
      name: validated.data.name,
      triggerType: validated.data.triggerType,
    });

    invalidateTag(CACHE_TAGS.AUTOMATIONS);
    invalidateTag(CACHE_TAGS.NEWSLETTER);
    revalidatePath("/admin/email");

    return {
      success: true,
      data: { flowId: data.id },
    };
  } catch (error) {
    console.error("Failed to create automation flow:", error);
    return serverActionError("Failed to create automation flow", "UNKNOWN_ERROR");
  }
}

/**
 * Update automation status
 */
export async function updateAutomationStatus(
  flowId: string,
  status: z.infer<typeof AutomationStatusSchema>
): Promise<ServerActionResult<void>> {
  try {
    // Validate inputs
    if (!flowId || !z.string().uuid().safeParse(flowId).success) {
      return serverActionError("Invalid flow ID", "VALIDATION_ERROR");
    }

    const statusValidation = AutomationStatusSchema.safeParse(status);
    if (!statusValidation.success) {
      return serverActionError("Invalid status", "VALIDATION_ERROR");
    }

    const auth = await verifyAuth();
    if (isAuthError(auth)) {
      return serverActionError(auth.error, auth.code);
    }

    const { supabase, user } = auth;

    const { error } = await supabase
      .from("email_automation_flows")
      .update({ status: statusValidation.data, updated_at: new Date().toISOString() })
      .eq("id", flowId);

    if (error) {
      console.error("Failed to update automation status:", error);
      return serverActionError(error.message, "DATABASE_ERROR");
    }

    await logAuditEvent(supabase, user.id, "UPDATE_STATUS", "automation_flow", flowId, {
      newStatus: status,
    });

    invalidateTag(CACHE_TAGS.AUTOMATIONS);
    invalidateTag(CACHE_TAGS.AUTOMATION(flowId));
    revalidatePath("/admin/email");

    return successVoid();
  } catch (error) {
    console.error("Failed to update automation status:", error);
    return serverActionError("Failed to update automation status", "UNKNOWN_ERROR");
  }
}

/**
 * Enroll user in automation
 */
export async function enrollUserInAutomation(
  flowId: string,
  profileId: string
): Promise<ServerActionResult<void>> {
  try {
    // Validate inputs
    if (!flowId || !z.string().uuid().safeParse(flowId).success) {
      return serverActionError("Invalid flow ID", "VALIDATION_ERROR");
    }
    if (!profileId || !z.string().uuid().safeParse(profileId).success) {
      return serverActionError("Invalid profile ID", "VALIDATION_ERROR");
    }

    const supabase = await createClient();

    const { error } = await supabase
      .from("automation_enrollments")
      .insert({ flow_id: flowId, profile_id: profileId })
      .select("id")
      .single();

    if (error) {
      // Already enrolled is not an error
      if (error.code === "23505") {
        return successVoid();
      }
      console.error("Failed to enroll user:", error);
      return serverActionError(error.message, "DATABASE_ERROR");
    }

    // Update flow enrollment count
    await supabase.rpc("increment_automation_enrolled", { flow_id: flowId });

    return successVoid();
  } catch (error) {
    console.error("Failed to enroll user:", error);
    return serverActionError("Failed to enroll user", "UNKNOWN_ERROR");
  }
}
