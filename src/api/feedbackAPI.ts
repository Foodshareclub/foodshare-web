import { supabase } from "@/lib/supabase/client";
import type { PostgrestSingleResponse } from "@supabase/supabase-js";

export type FeedbackType = "bug" | "feature" | "general" | "complaint";

export type FeedbackSubmission = {
  profile_id?: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  feedback_type: FeedbackType;
};

export type FeedbackRecord = FeedbackSubmission & {
  id: string;
  status: "new" | "in_progress" | "resolved" | "closed";
  created_at: string;
  updated_at: string;
};

export const feedbackAPI = {
  /**
   * Submit new feedback
   */
  submitFeedback(
    feedback: FeedbackSubmission
  ): PromiseLike<PostgrestSingleResponse<FeedbackRecord>> {
    return supabase.from("feedback").insert(feedback).select().single();
  },

  /**
   * Get user's own feedback submissions
   */
  getUserFeedback(
    userId: string
  ): PromiseLike<PostgrestSingleResponse<Array<FeedbackRecord>>> {
    return supabase
      .from("feedback")
      .select("*")
      .eq("profile_id", userId)
      .order("created_at", { ascending: false });
  },

  /**
   * Get all feedback (admin only)
   */
  getAllFeedback(): PromiseLike<PostgrestSingleResponse<Array<FeedbackRecord>>> {
    return supabase
      .from("feedback")
      .select("*")
      .order("created_at", { ascending: false });
  },

  /**
   * Update feedback status (admin only)
   */
  updateFeedbackStatus(
    feedbackId: string,
    status: FeedbackRecord["status"]
  ): PromiseLike<PostgrestSingleResponse<FeedbackRecord>> {
    return supabase
      .from("feedback")
      .update({ status })
      .eq("id", feedbackId)
      .select()
      .single();
  },
};
