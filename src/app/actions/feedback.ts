'use server';

/**
 * Feedback Server Actions
 * Mutations for submitting and managing feedback
 */

import { createClient } from "@/lib/supabase/server";

export type FeedbackType = "bug" | "feature" | "general" | "complaint";

export interface FeedbackSubmission {
  name: string;
  email: string;
  subject: string;
  message: string;
  feedback_type: FeedbackType;
}

export interface ActionResult {
  success: boolean;
  error?: string;
}

/**
 * Submit feedback from the current user
 */
export async function submitFeedback(
  feedback: FeedbackSubmission
): Promise<ActionResult> {
  const supabase = await createClient();

  // Get current user if authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("feedback").insert({
    profile_id: user?.id || null,
    name: feedback.name,
    email: feedback.email,
    subject: feedback.subject,
    message: feedback.message,
    feedback_type: feedback.feedback_type,
  });

  if (error) {
    console.error("Error submitting feedback:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
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
    .select("full_name")
    .eq("id", user.id)
    .single();

  return {
    email: user.email || null,
    name: profile?.full_name || null,
  };
}
