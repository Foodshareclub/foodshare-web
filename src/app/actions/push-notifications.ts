"use server";

import { createClient } from "@/lib/supabase/server";

interface PushPayload {
  type: string;
  title: string;
  body: string;
  icon?: string;
  image?: string;
  url?: string;
  tag?: string;
  data?: Record<string, string>;
}

interface SendPushResult {
  success: boolean;
  sent?: number;
  failed?: number;
  error?: string;
}

/**
 * Send push notification to specific users
 */
export async function sendPushNotification(
  userIds: string[],
  payload: PushPayload,
  platforms?: ("ios" | "android" | "web")[]
): Promise<SendPushResult> {
  const supabase = await createClient();

  // Verify caller is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-push-notification`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          user_ids: userIds,
          platforms,
          payload,
        }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      return { success: false, error: result.error || "Failed to send notification" };
    }

    return {
      success: true,
      sent: result.sent,
      failed: result.failed,
    };
  } catch (error) {
    console.error("Push notification error:", error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Send push notification to all users (admin only)
 */
export async function broadcastPushNotification(payload: PushPayload): Promise<SendPushResult> {
  const supabase = await createClient();

  // Verify caller is admin
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  // Check if user has admin role via user_roles table
  // Admin role_id = 6, superadmin role_id = 7
  const { data: adminRole } = await supabase
    .from("user_roles")
    .select("role_id")
    .eq("profile_id", user.id)
    .in("role_id", [6, 7])
    .limit(1)
    .maybeSingle();

  if (!adminRole) {
    return { success: false, error: "Admin access required" };
  }

  // Get all users with push subscriptions
  const { data: tokens } = await supabase
    .from("device_tokens")
    .select("profile_id")
    .eq("platform", "web");

  if (!tokens?.length) {
    return { success: true, sent: 0, failed: 0 };
  }

  const userIds = [...new Set(tokens.map((t) => t.profile_id))];

  return sendPushNotification(userIds, payload);
}
