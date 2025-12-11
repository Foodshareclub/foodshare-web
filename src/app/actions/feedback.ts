"use server";

/**
 * Feedback Server Actions
 * Server-side mutations for feedback management
 */

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, logAdminAction } from "@/lib/data/admin-auth";

export type FeedbackType = "bug" | "feature" | "general" | "complaint";
export type FeedbackStatus = "new" | "in_progress" | "resolved" | "closed";

export interface FeedbackSubmission {
  profile_id?: string;
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

interface ActionResult {
  success: boolean;
  error?: string;
  data?: FeedbackRecord;
}

/**
 * Submit new feedback (public)
 */
export async function submitFeedback(feedback: FeedbackSubmission): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase.from("feedback").insert(feedback).select().single();

    if (error) return { success: false, error: error.message };

    revalidatePath("/admin/feedback");
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

/**
 * Get user's own feedback submissions
 */
export async function getUserFeedback(userId: string): Promise<FeedbackRecord[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("feedback")
    .select("*")
    .eq("profile_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

/**
 * Get all feedback (admin only)
 */
export async function getAllFeedback(): Promise<FeedbackRecord[]> {
  await requireAdmin();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("feedback")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

/**
 * Update feedback status (admin only)
 */
export async function updateFeedbackStatus(
  feedbackId: string,
  status: FeedbackStatus
): Promise<ActionResult> {
  try {
    const adminId = await requireAdmin();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("feedback")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", feedbackId)
      .select()
      .single();

    if (error) return { success: false, error: error.message };

    await logAdminAction("update_feedback_status", "feedback", feedbackId, adminId, { status });
    revalidatePath("/admin/feedback");

    return { success: true, data };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

/**
 * Delete feedback (admin only)
 */
export async function deleteFeedback(feedbackId: string): Promise<ActionResult> {
  try {
    const adminId = await requireAdmin();
    const supabase = await createClient();

    const { error } = await supabase.from("feedback").delete().eq("id", feedbackId);

    if (error) return { success: false, error: error.message };

    await logAdminAction("delete_feedback", "feedback", feedbackId, adminId);
    revalidatePath("/admin/feedback");

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

/**
 * Get current user info for pre-filling feedback form
 */
export async function getCurrentUserInfo(): Promise<{
  email: string | null;
  name: string | null;
} | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, second_name")
    .eq("id", user.id)
    .single();

  return {
    email: user.email || null,
    name: profile
      ? [profile.first_name, profile.second_name].filter(Boolean).join(" ") || null
      : null,
  };
}
