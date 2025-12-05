/**
 * Email Preferences Data Layer
 * Server-side functions for fetching email preferences
 */

import { createClient } from "@/lib/supabase/server";

export interface EmailPreferences {
  profile_id: string;
  chat_notifications: boolean;
  food_listings_notifications: boolean;
  feedback_notifications: boolean;
  review_reminders: boolean;
  notification_frequency: "instant" | "daily_digest" | "weekly_digest";
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  created_at?: string;
  updated_at?: string;
}

/**
 * Get email preferences for the current user
 */
export async function getEmailPreferences(): Promise<EmailPreferences | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("email_preferences")
    .select("*")
    .eq("profile_id", user.id)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("Error fetching email preferences:", error);
    return null;
  }

  return data as EmailPreferences | null;
}

/**
 * Get email preferences for a specific user (admin use)
 */
export async function getEmailPreferencesForUser(
  profileId: string
): Promise<EmailPreferences | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("email_preferences")
    .select("*")
    .eq("profile_id", profileId)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("Error fetching email preferences:", error);
    return null;
  }

  return data as EmailPreferences | null;
}
