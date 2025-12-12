"use server";

/**
 * Campaign Server Actions
 * Handles newsletter campaign CRUD operations with proper server-side validation
 */

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { serverActionError, successVoid, type ServerActionResult } from "@/lib/errors";
import { CACHE_TAGS, invalidateTag } from "@/lib/data/cache-keys";
import type { ErrorCode } from "@/lib/errors";

// ============================================================================
// Types
// ============================================================================

export interface CreateCampaignInput {
  name: string;
  subject: string;
  content: string;
  campaignType?: string;
  segmentId?: string;
  scheduledAt?: string;
}

export interface UpdateCampaignInput {
  id: string;
  name?: string;
  subject?: string;
  content?: string;
  campaignType?: string;
  segmentId?: string;
  scheduledAt?: string;
}

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
// Campaign Actions
// ============================================================================

/**
 * Create a new email campaign
 */
export async function createCampaign(
  input: CreateCampaignInput
): Promise<ServerActionResult<CampaignResult>> {
  try {
    const auth = await verifyAdminAccess();
    if (isAuthError(auth)) {
      return serverActionError(auth.error, auth.code);
    }

    const { supabase, user } = auth;

    // Validate required fields
    if (!input.name?.trim()) {
      return serverActionError("Campaign name is required", "VALIDATION_ERROR");
    }
    if (!input.subject?.trim()) {
      return serverActionError("Subject line is required", "VALIDATION_ERROR");
    }

    const { data, error } = await supabase
      .from("newsletter_campaigns")
      .insert({
        name: input.name.trim(),
        subject: input.subject.trim(),
        content: input.content || "",
        campaign_type: input.campaignType || "newsletter",
        segment_id: input.segmentId || null,
        scheduled_at: input.scheduledAt || null,
        status: input.scheduledAt ? "scheduled" : "draft",
        created_by: user.id,
      })
      .select("id, name, status")
      .single();

    if (error) {
      console.error("Failed to create campaign:", error);
      return serverActionError(error.message, "DATABASE_ERROR");
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
    const auth = await verifyAdminAccess();
    if (isAuthError(auth)) {
      return serverActionError(auth.error, auth.code);
    }

    const { supabase } = auth;

    if (!input.id) {
      return serverActionError("Campaign ID is required", "VALIDATION_ERROR");
    }

    // Build update object with only provided fields
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (input.name !== undefined) updates.name = input.name.trim();
    if (input.subject !== undefined) updates.subject = input.subject.trim();
    if (input.content !== undefined) updates.content = input.content;
    if (input.campaignType !== undefined) updates.campaign_type = input.campaignType;
    if (input.segmentId !== undefined) updates.segment_id = input.segmentId || null;
    if (input.scheduledAt !== undefined) {
      updates.scheduled_at = input.scheduledAt || null;
      updates.status = input.scheduledAt ? "scheduled" : "draft";
    }

    const { data, error } = await supabase
      .from("newsletter_campaigns")
      .update(updates)
      .eq("id", input.id)
      .select("id, name, status")
      .single();

    if (error) {
      console.error("Failed to update campaign:", error);
      return serverActionError(error.message, "DATABASE_ERROR");
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
    console.error("Failed to update campaign:", error);
    return serverActionError("Failed to update campaign", "UNKNOWN_ERROR");
  }
}

/**
 * Delete a campaign
 */
export async function deleteCampaign(id: string): Promise<ServerActionResult<void>> {
  try {
    const auth = await verifyAdminAccess();
    if (isAuthError(auth)) {
      return serverActionError(auth.error, auth.code);
    }

    const { supabase } = auth;

    if (!id) {
      return serverActionError("Campaign ID is required", "VALIDATION_ERROR");
    }

    // Check campaign status - only allow deleting drafts
    const { data: campaign } = await supabase
      .from("newsletter_campaigns")
      .select("status")
      .eq("id", id)
      .single();

    if (campaign?.status === "sending") {
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

    invalidateTag(CACHE_TAGS.ADMIN);
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

    // Create duplicate
    const { data, error } = await supabase
      .from("newsletter_campaigns")
      .insert({
        name: `${original.name} (Copy)`,
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
    console.error("Failed to duplicate campaign:", error);
    return serverActionError("Failed to duplicate campaign", "UNKNOWN_ERROR");
  }
}

/**
 * Pause a sending campaign
 */
export async function pauseCampaign(id: string): Promise<ServerActionResult<void>> {
  try {
    const auth = await verifyAdminAccess();
    if (isAuthError(auth)) {
      return serverActionError(auth.error, auth.code);
    }

    const { supabase } = auth;

    const { error } = await supabase
      .from("newsletter_campaigns")
      .update({ status: "paused", updated_at: new Date().toISOString() })
      .eq("id", id)
      .in("status", ["sending", "scheduled"]);

    if (error) {
      console.error("Failed to pause campaign:", error);
      return serverActionError(error.message, "DATABASE_ERROR");
    }

    invalidateTag(CACHE_TAGS.ADMIN);
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
    const auth = await verifyAdminAccess();
    if (isAuthError(auth)) {
      return serverActionError(auth.error, auth.code);
    }

    const { supabase } = auth;

    // Check if campaign has a scheduled time
    const { data: campaign } = await supabase
      .from("newsletter_campaigns")
      .select("scheduled_at")
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

    invalidateTag(CACHE_TAGS.ADMIN);
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
