'use server';

/**
 * Email Preferences Server Actions
 * Mutations for managing email notification settings
 */

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface EmailPreferencesInput {
  chat_notifications: boolean;
  food_listings_notifications: boolean;
  feedback_notifications: boolean;
  review_reminders: boolean;
  notification_frequency: "instant" | "daily_digest" | "weekly_digest";
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
}

export interface ActionResult {
  success: boolean;
  error?: string;
}

/**
 * Save email preferences for the current user
 */
export async function saveEmailPreferences(
  preferences: EmailPreferencesInput
): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const { error } = await supabase.from("email_preferences").upsert({
    profile_id: user.id,
    ...preferences,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    console.error("Error saving email preferences:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/settings");
  revalidatePath("/profile");

  return { success: true };
}
