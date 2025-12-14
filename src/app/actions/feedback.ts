"use server";

/**
 * Feedback Server Actions
 * Bleeding-edge implementation with:
 * - Zod schema validation
 * - Type-safe action results
 * - Audit logging
 * - Proper admin auth via user_roles
 */

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { serverActionError, successVoid, type ServerActionResult } from "@/lib/errors";
import type { ErrorCode } from "@/lib/errors";

// ============================================================================
// Zod Schemas
// ============================================================================

const FeedbackTypeSchema = z.enum(["bug", "feature", "general", "complaint"]);
const FeedbackStatusSchema = z.enum(["new", "in_progress", "resolved", "closed"]);

const SubmitFeedbackSchema = z.object({
  profile_id: z.string().uuid().optional().nullable(),
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email address"),
  subject: z.string().min(1, "Subject is required").max(200),
  message: z.string().min(10, "Message must be at least 10 characters").max(5000),
  feedback_type: FeedbackTypeSchema,
});

// ============================================================================
// Types
// ============================================================================

export type FeedbackType = z.infer<typeof FeedbackTypeSchema>;
export type FeedbackStatus = z.infer<typeof FeedbackStatusSchema>;

export interface FeedbackSubmission {
  profile_id?: string | null;
  name: string;
  email: string;
  subject: string;
  message: string;
  feedback_type: FeedbackType;
}

export interface FeedbackRecord extends FeedbackSubmission {
  id: string;
  status: FeedbackStatus;
  created_at: string;
  updated_at: string;
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
// Public Actions
// ============================================================================

/**
 * Submit new feedback (public)
 */
export async function submitFeedback(
  feedback: FeedbackSubmission
): Promise<ServerActionResult<FeedbackRecord>> {
  try {
    // Validate input
    const validated = SubmitFeedbackSchema.safeParse(feedback);
    if (!validated.success) {
      const firstError = validated.error.issues[0];
      return serverActionError(firstError.message, "VALIDATION_ERROR");
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("feedback")
      .insert({
        profile_id: validated.data.profile_id || null,
        name: validated.data.name,
        email: validated.data.email,
        subject: validated.data.subject,
        message: validated.data.message,
        feedback_type: validated.data.feedback_type,
        status: "new",
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to submit feedback:", error);
      return serverActionError(error.message, "DATABASE_ERROR");
    }

    revalidatePath("/admin/feedback");

    return {
      success: true,
      data: data as FeedbackRecord,
    };
  } catch (error) {
    console.error("Failed to submit feedback:", error);
    return serverActionError("Failed to submit feedback", "UNKNOWN_ERROR");
  }
}

/**
 * Get user's own feedback submissions
 */
export async function getUserFeedback(
  userId: string
): Promise<ServerActionResult<FeedbackRecord[]>> {
  try {
    // Validate ID
    if (!userId || !z.string().uuid().safeParse(userId).success) {
      return serverActionError("Invalid user ID", "VALIDATION_ERROR");
    }

    const supabase = await createClient();

    // Verify user is requesting their own feedback
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || user.id !== userId) {
      return serverActionError("You can only view your own feedback", "FORBIDDEN");
    }

    const { data, error } = await supabase
      .from("feedback")
      .select("*")
      .eq("profile_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to get user feedback:", error);
      return serverActionError(error.message, "DATABASE_ERROR");
    }

    return {
      success: true,
      data: (data ?? []) as FeedbackRecord[],
    };
  } catch (error) {
    console.error("Failed to get user feedback:", error);
    return serverActionError("Failed to get feedback", "UNKNOWN_ERROR");
  }
}

// ============================================================================
// Admin Actions
// ============================================================================

/**
 * Get all feedback (admin only)
 */
export async function getAllFeedback(): Promise<ServerActionResult<FeedbackRecord[]>> {
  try {
    const auth = await verifyAdminAccess();
    if (isAuthError(auth)) {
      return serverActionError(auth.error, auth.code);
    }

    const { supabase } = auth;

    const { data, error } = await supabase
      .from("feedback")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to get all feedback:", error);
      return serverActionError(error.message, "DATABASE_ERROR");
    }

    return {
      success: true,
      data: (data ?? []) as FeedbackRecord[],
    };
  } catch (error) {
    console.error("Failed to get all feedback:", error);
    return serverActionError("Failed to get feedback", "UNKNOWN_ERROR");
  }
}

/**
 * Update feedback status (admin only)
 */
export async function updateFeedbackStatus(
  feedbackId: string,
  status: FeedbackStatus
): Promise<ServerActionResult<FeedbackRecord>> {
  try {
    // Validate inputs
    if (!feedbackId || !z.string().uuid().safeParse(feedbackId).success) {
      return serverActionError("Invalid feedback ID", "VALIDATION_ERROR");
    }

    const statusValidation = FeedbackStatusSchema.safeParse(status);
    if (!statusValidation.success) {
      return serverActionError("Invalid status", "VALIDATION_ERROR");
    }

    const auth = await verifyAdminAccess();
    if (isAuthError(auth)) {
      return serverActionError(auth.error, auth.code);
    }

    const { supabase, user } = auth;

    const { data, error } = await supabase
      .from("feedback")
      .update({ status: statusValidation.data, updated_at: new Date().toISOString() })
      .eq("id", feedbackId)
      .select()
      .single();

    if (error) {
      console.error("Failed to update feedback status:", error);
      return serverActionError(error.message, "DATABASE_ERROR");
    }

    await logAuditEvent(supabase, user.id, "UPDATE_STATUS", "feedback", feedbackId, {
      newStatus: status,
    });

    revalidatePath("/admin/feedback");

    return {
      success: true,
      data: data as FeedbackRecord,
    };
  } catch (error) {
    console.error("Failed to update feedback status:", error);
    return serverActionError("Failed to update feedback status", "UNKNOWN_ERROR");
  }
}

/**
 * Delete feedback (admin only)
 */
export async function deleteFeedback(feedbackId: string): Promise<ServerActionResult<void>> {
  try {
    // Validate ID
    if (!feedbackId || !z.string().uuid().safeParse(feedbackId).success) {
      return serverActionError("Invalid feedback ID", "VALIDATION_ERROR");
    }

    const auth = await verifyAdminAccess();
    if (isAuthError(auth)) {
      return serverActionError(auth.error, auth.code);
    }

    const { supabase, user } = auth;

    const { error } = await supabase.from("feedback").delete().eq("id", feedbackId);

    if (error) {
      console.error("Failed to delete feedback:", error);
      return serverActionError(error.message, "DATABASE_ERROR");
    }

    await logAuditEvent(supabase, user.id, "DELETE", "feedback", feedbackId);

    revalidatePath("/admin/feedback");

    return successVoid();
  } catch (error) {
    console.error("Failed to delete feedback:", error);
    return serverActionError("Failed to delete feedback", "UNKNOWN_ERROR");
  }
}

// ============================================================================
// Helper Actions
// ============================================================================

interface UserInfo {
  email: string | null;
  name: string | null;
  profileId: string | null;
}

/**
 * Get current user info for pre-filling feedback form
 */
export async function getCurrentUserInfo(): Promise<ServerActionResult<UserInfo | null>> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: true,
        data: null,
      };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("first_name, second_name")
      .eq("id", user.id)
      .single();

    return {
      success: true,
      data: {
        email: user.email || null,
        name: profile
          ? [profile.first_name, profile.second_name].filter(Boolean).join(" ") || null
          : null,
        profileId: user.id,
      },
    };
  } catch (error) {
    console.error("Failed to get user info:", error);
    return serverActionError("Failed to get user info", "UNKNOWN_ERROR");
  }
}
