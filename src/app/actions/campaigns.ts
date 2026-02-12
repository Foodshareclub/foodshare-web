"use server";

/**
 * Campaign Server Actions
 * Bleeding-edge implementation with:
 * - Zod schema validation
 * - Type-safe action results
 * - Audit logging
 * - Proper admin auth via user_roles
 */

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { serverActionError, successVoid, type ServerActionResult } from "@/lib/errors";
import { CACHE_TAGS } from "@/lib/data/cache-keys";
import { invalidateTag } from "@/lib/data/cache-invalidation";
import type { ErrorCode } from "@/lib/errors";

// ============================================================================
// Zod Schemas
// ============================================================================

const CreateCampaignSchema = z.object({
  name: z.string().min(1, "Campaign name is required").max(200, "Name too long"),
  subject: z.string().min(1, "Subject line is required").max(200, "Subject too long"),
  content: z.string().default(""),
  campaignType: z.enum(["newsletter", "announcement", "promotional", "transactional"]).optional(),
  segmentId: z.string().uuid().optional().nullable(),
  scheduledAt: z.string().datetime().optional().nullable(),
});

const UpdateCampaignSchema = z.object({
  id: z.string().uuid("Invalid campaign ID"),
  name: z.string().min(1).max(200).optional(),
  subject: z.string().min(1).max(200).optional(),
  content: z.string().optional(),
  campaignType: z.enum(["newsletter", "announcement", "promotional", "transactional"]).optional(),
  segmentId: z.string().uuid().optional().nullable(),
  scheduledAt: z.string().datetime().optional().nullable(),
});

// ============================================================================
// Types
// ============================================================================

export type CreateCampaignInput = z.infer<typeof CreateCampaignSchema>;
export type UpdateCampaignInput = z.infer<typeof UpdateCampaignSchema>;

export interface CampaignResult {
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

  const { data: userRoles } = await supabase
    .from("user_roles")
    .select("roles!inner(name)")
    .eq("profile_id", user.id);

  const roles = (userRoles || [])
    .map((r) => (r.roles as unknown as { name: string })?.name)
    .filter(Boolean);

  const isAdmin = roles.includes("admin") || roles.includes("superadmin");

  if (!isAdmin) {
    return { error: "Admin access required", code: "FORBIDDEN" };
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
// Campaign Actions
// ============================================================================

/**
 * Create a new email campaign
 */
export async function createCampaign(
  input: CreateCampaignInput
): Promise<ServerActionResult<CampaignResult>> {
  try {
    // Validate with Zod
    const validated = CreateCampaignSchema.safeParse(input);
    if (!validated.success) {
      const firstError = validated.error.issues[0];
      return serverActionError(firstError.message, "VALIDATION_ERROR");
    }

    const auth = await verifyAdminAccess();
    if (isAuthError(auth)) {
      return serverActionError(auth.error, auth.code);
    }

    const { supabase, user } = auth;

    const { data, error } = await supabase
      .from("newsletter_campaigns")
      .insert({
        name: validated.data.name.trim(),
        subject: validated.data.subject.trim(),
        content: validated.data.content || "",
        campaign_type: validated.data.campaignType || "newsletter",
        segment_id: validated.data.segmentId || null,
        scheduled_at: validated.data.scheduledAt || null,
        status: validated.data.scheduledAt ? "scheduled" : "draft",
        created_by: user.id,
      })
      .select("id, name, status")
      .single();

    if (error) {
      console.error("Failed to create campaign:", error);
      return serverActionError(error.message, "DATABASE_ERROR");
    }

    // Audit log
    await logAuditEvent(supabase, user.id, "CREATE", "campaign", data.id, {
      name: data.name,
      status: data.status,
    });

    invalidateTag(CACHE_TAGS.ADMIN);
    invalidateTag(CACHE_TAGS.CAMPAIGNS);
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
    console.error("Failed to create campaign:", error);
    return serverActionError("Failed to create campaign", "UNKNOWN_ERROR");
  }
}

/**
 * Update an existing campaign
 */
export async function updateCampaign(
  input: UpdateCampaignInput
): Promise<ServerActionResult<CampaignResult>> {
  try {
    // Validate with Zod
    const validated = UpdateCampaignSchema.safeParse(input);
    if (!validated.success) {
      const firstError = validated.error.issues[0];
      return serverActionError(firstError.message, "VALIDATION_ERROR");
    }

    const auth = await verifyAdminAccess();
    if (isAuthError(auth)) {
      return serverActionError(auth.error, auth.code);
    }

    const { supabase, user } = auth;

    // Build update object with only provided fields
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (validated.data.name !== undefined) updates.name = validated.data.name.trim();
    if (validated.data.subject !== undefined) updates.subject = validated.data.subject.trim();
    if (validated.data.content !== undefined) updates.content = validated.data.content;
    if (validated.data.campaignType !== undefined)
      updates.campaign_type = validated.data.campaignType;
    if (validated.data.segmentId !== undefined)
      updates.segment_id = validated.data.segmentId || null;
    if (validated.data.scheduledAt !== undefined) {
      updates.scheduled_at = validated.data.scheduledAt || null;
      updates.status = validated.data.scheduledAt ? "scheduled" : "draft";
    }

    const { data, error } = await supabase
      .from("newsletter_campaigns")
      .update(updates)
      .eq("id", validated.data.id)
      .select("id, name, status")
      .single();

    if (error) {
      console.error("Failed to update campaign:", error);
      return serverActionError(error.message, "DATABASE_ERROR");
    }

    // Audit log
    await logAuditEvent(supabase, user.id, "UPDATE", "campaign", data.id, {
      changes: Object.keys(updates).filter((k) => k !== "updated_at"),
    });

    invalidateTag(CACHE_TAGS.ADMIN);
    invalidateTag(CACHE_TAGS.CAMPAIGNS);
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
    console.error("Failed to update campaign:", error);
    return serverActionError("Failed to update campaign", "UNKNOWN_ERROR");
  }
}

/**
 * Delete a campaign
 */
export async function deleteCampaign(id: string): Promise<ServerActionResult<void>> {
  try {
    // Validate ID
    if (!id || !z.string().uuid().safeParse(id).success) {
      return serverActionError("Invalid campaign ID", "VALIDATION_ERROR");
    }

    const auth = await verifyAdminAccess();
    if (isAuthError(auth)) {
      return serverActionError(auth.error, auth.code);
    }

    const { supabase, user } = auth;

    // Check campaign status - only allow deleting drafts
    const { data: campaign } = await supabase
      .from("newsletter_campaigns")
      .select("status, name")
      .eq("id", id)
      .single();

    if (!campaign) {
      return serverActionError("Campaign not found", "NOT_FOUND");
    }

    if (campaign.status === "sending") {
      return serverActionError(
        "Cannot delete a campaign that is currently sending",
        "VALIDATION_ERROR"
      );
    }

    const { error } = await supabase.from("newsletter_campaigns").delete().eq("id", id);

    if (error) {
      console.error("Failed to delete campaign:", error);
      return serverActionError(error.message, "DATABASE_ERROR");
    }

    // Audit log
    await logAuditEvent(supabase, user.id, "DELETE", "campaign", id, {
      name: campaign.name,
    });

    invalidateTag(CACHE_TAGS.ADMIN);
    invalidateTag(CACHE_TAGS.CAMPAIGNS);
    revalidatePath("/admin/email");

    return successVoid();
  } catch (error) {
    console.error("Failed to delete campaign:", error);
    return serverActionError("Failed to delete campaign", "UNKNOWN_ERROR");
  }
}

/**
 * Duplicate a campaign
 */
export async function duplicateCampaign(id: string): Promise<ServerActionResult<CampaignResult>> {
  try {
    // Validate ID
    if (!id || !z.string().uuid().safeParse(id).success) {
      return serverActionError("Invalid campaign ID", "VALIDATION_ERROR");
    }

    const auth = await verifyAdminAccess();
    if (isAuthError(auth)) {
      return serverActionError(auth.error, auth.code);
    }

    const { supabase, user } = auth;

    // Get original campaign
    const { data: original, error: fetchError } = await supabase
      .from("newsletter_campaigns")
      .select("name, subject, content, campaign_type, segment_id")
      .eq("id", id)
      .single();

    if (fetchError || !original) {
      return serverActionError("Campaign not found", "NOT_FOUND");
    }

    // Create duplicate with unique name
    let newName = `${original.name} (Copy)`;
    let counter = 1;
    while (true) {
      const { data: existing } = await supabase
        .from("newsletter_campaigns")
        .select("id")
        .eq("name", newName)
        .single();
      if (!existing) break;
      counter++;
      newName = `${original.name} (Copy ${counter})`;
    }

    const { data, error } = await supabase
      .from("newsletter_campaigns")
      .insert({
        name: newName,
        subject: original.subject,
        content: original.content,
        campaign_type: original.campaign_type,
        segment_id: original.segment_id,
        status: "draft",
        created_by: user.id,
      })
      .select("id, name, status")
      .single();

    if (error) {
      console.error("Failed to duplicate campaign:", error);
      return serverActionError(error.message, "DATABASE_ERROR");
    }

    // Audit log
    await logAuditEvent(supabase, user.id, "DUPLICATE", "campaign", data.id, {
      sourceId: id,
      sourceName: original.name,
    });

    invalidateTag(CACHE_TAGS.ADMIN);
    invalidateTag(CACHE_TAGS.CAMPAIGNS);
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
    console.error("Failed to duplicate campaign:", error);
    return serverActionError("Failed to duplicate campaign", "UNKNOWN_ERROR");
  }
}

/**
 * Pause a sending campaign
 */
export async function pauseCampaign(id: string): Promise<ServerActionResult<void>> {
  try {
    if (!id || !z.string().uuid().safeParse(id).success) {
      return serverActionError("Invalid campaign ID", "VALIDATION_ERROR");
    }

    const auth = await verifyAdminAccess();
    if (isAuthError(auth)) {
      return serverActionError(auth.error, auth.code);
    }

    const { supabase, user } = auth;

    const { data, error } = await supabase
      .from("newsletter_campaigns")
      .update({ status: "paused", updated_at: new Date().toISOString() })
      .eq("id", id)
      .in("status", ["sending", "scheduled"])
      .select("name")
      .single();

    if (error) {
      console.error("Failed to pause campaign:", error);
      return serverActionError(error.message, "DATABASE_ERROR");
    }

    await logAuditEvent(supabase, user.id, "PAUSE", "campaign", id, { name: data?.name });

    invalidateTag(CACHE_TAGS.ADMIN);
    invalidateTag(CACHE_TAGS.CAMPAIGNS);
    revalidatePath("/admin/email");

    return successVoid();
  } catch (error) {
    console.error("Failed to pause campaign:", error);
    return serverActionError("Failed to pause campaign", "UNKNOWN_ERROR");
  }
}

/**
 * Resume a paused campaign
 */
export async function resumeCampaign(id: string): Promise<ServerActionResult<void>> {
  try {
    if (!id || !z.string().uuid().safeParse(id).success) {
      return serverActionError("Invalid campaign ID", "VALIDATION_ERROR");
    }

    const auth = await verifyAdminAccess();
    if (isAuthError(auth)) {
      return serverActionError(auth.error, auth.code);
    }

    const { supabase, user } = auth;

    // Check if campaign has a scheduled time
    const { data: campaign } = await supabase
      .from("newsletter_campaigns")
      .select("scheduled_at, name")
      .eq("id", id)
      .single();

    const newStatus = campaign?.scheduled_at ? "scheduled" : "sending";

    const { error } = await supabase
      .from("newsletter_campaigns")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("status", "paused");

    if (error) {
      console.error("Failed to resume campaign:", error);
      return serverActionError(error.message, "DATABASE_ERROR");
    }

    await logAuditEvent(supabase, user.id, "RESUME", "campaign", id, {
      name: campaign?.name,
      newStatus,
    });

    invalidateTag(CACHE_TAGS.ADMIN);
    invalidateTag(CACHE_TAGS.CAMPAIGNS);
    revalidatePath("/admin/email");

    return successVoid();
  } catch (error) {
    console.error("Failed to resume campaign:", error);
    return serverActionError("Failed to resume campaign", "UNKNOWN_ERROR");
  }
}

// ============================================================================
// Refresh Dashboard Data
// ============================================================================

/**
 * Refresh the email CRM dashboard data
 * Triggers revalidation of the admin email page
 */
export async function refreshEmailDashboard(): Promise<ServerActionResult<void>> {
  try {
    const auth = await verifyAdminAccess();
    if ("error" in auth) {
      return serverActionError(auth.error, auth.code);
    }

    invalidateTag(CACHE_TAGS.ADMIN);
    revalidatePath("/admin/email");

    return successVoid();
  } catch (error) {
    console.error("Failed to refresh dashboard:", error);
    return serverActionError("Failed to refresh dashboard", "UNKNOWN_ERROR");
  }
}
