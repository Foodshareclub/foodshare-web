/**
 * Push Notification Queue Tasks
 *
 * Handles async push notification sending via Trigger.dev
 * - Single notification sending
 * - Broadcast to multiple devices
 * - Deferred notifications (quiet hours)
 */

import { task, schedules } from "@trigger.dev/sdk/v3";

// ============================================================================
// Types
// ============================================================================

export interface PushNotificationPayload {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  // Optional: specific device token (otherwise sends to all user devices)
  deviceToken?: string;
}

export interface BroadcastPayload {
  userIds: string[];
  title: string;
  body: string;
  data?: Record<string, string>;
}

export interface PushResult {
  success: boolean;
  sent: number;
  failed: number;
  errors?: string[];
}

// ============================================================================
// Send Push Notification Task
// ============================================================================

/**
 * Send push notification to a single user
 * Handles multiple device tokens per user
 */
export const sendPushTask = task({
  id: "send-push-notification",
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 5000,
  },
  run: async (payload: PushNotificationPayload): Promise<PushResult> => {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();

    // Get user's device tokens
    const { data: devices, error } = await supabase
      .from("push_subscriptions")
      .select("token, platform")
      .eq("user_id", payload.userId)
      .eq("is_active", true);

    if (error || !devices || devices.length === 0) {
      return {
        success: false,
        sent: 0,
        failed: 0,
        errors: ["No active device tokens found"],
      };
    }

    // If specific token requested, filter to that
    const tokensToSend = payload.deviceToken
      ? devices.filter((d) => d.token === payload.deviceToken)
      : devices;

    // Send to each device via Edge Function
    const results = await Promise.allSettled(
      tokensToSend.map(async (device) => {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-push-notification`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            },
            body: JSON.stringify({
              token: device.token,
              platform: device.platform,
              title: payload.title,
              body: payload.body,
              data: payload.data,
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`Push failed: ${response.status}`);
        }

        return response.json();
      })
    );

    const sent = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;
    const errors = results
      .filter((r): r is PromiseRejectedResult => r.status === "rejected")
      .map((r) => String(r.reason));

    return {
      success: sent > 0,
      sent,
      failed,
      errors: errors.length > 0 ? errors : undefined,
    };
  },
});

// ============================================================================
// Broadcast Push Task
// ============================================================================

/**
 * Broadcast push notification to multiple users
 * Processes in batches with concurrency control
 */
export const broadcastPushTask = task({
  id: "broadcast-push",
  retry: {
    maxAttempts: 2,
  },
  run: async (payload: BroadcastPayload): Promise<PushResult> => {
    const { userIds, title, body, data } = payload;
    const BATCH_SIZE = 10;

    let totalSent = 0;
    let totalFailed = 0;
    const allErrors: string[] = [];

    // Process in batches
    for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
      const batch = userIds.slice(i, i + BATCH_SIZE);

      const results = await Promise.allSettled(
        batch.map((userId) =>
          sendPushTask.triggerAndWait({
            userId,
            title,
            body,
            data,
          })
        )
      );

      for (const result of results) {
        if (result.status === "fulfilled") {
          // Check .ok before accessing .output
          if (result.value.ok) {
            totalSent += result.value.output.sent;
            totalFailed += result.value.output.failed;
            if (result.value.output.errors) {
              allErrors.push(...result.value.output.errors);
            }
          } else {
            totalFailed++;
            allErrors.push(String(result.value.error));
          }
        } else {
          totalFailed++;
          allErrors.push(String(result.reason));
        }
      }
    }

    return {
      success: totalSent > 0,
      sent: totalSent,
      failed: totalFailed,
      errors: allErrors.length > 0 ? allErrors.slice(0, 10) : undefined,
    };
  },
});

// ============================================================================
// Deferred Notification Sender (Quiet Hours)
// ============================================================================

/**
 * Scheduled task to send deferred notifications after quiet hours
 * Runs daily at 8 AM UTC
 */
export const sendDeferredNotificationsTask = schedules.task({
  id: "send-deferred-notifications",
  cron: "0 8 * * *", // 8 AM UTC daily
  run: async () => {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();

    // Fetch deferred notifications that should be sent now
    const { data: deferred, error } = await supabase
      .from("deferred_notifications")
      .select("*")
      .lte("resume_at", new Date().toISOString())
      .eq("status", "pending")
      .limit(100);

    if (error) {
      console.error("Failed to fetch deferred notifications:", error);
      return { processed: 0, error: error.message };
    }

    if (!deferred || deferred.length === 0) {
      return { processed: 0, message: "No deferred notifications" };
    }

    // Send each notification
    const results = await Promise.allSettled(
      deferred.map(async (notification) => {
        // Send the notification
        await sendPushTask.triggerAndWait({
          userId: notification.user_id,
          title: notification.title,
          body: notification.body,
          data: notification.data,
        });

        // Mark as sent
        await supabase
          .from("deferred_notifications")
          .update({ status: "sent", sent_at: new Date().toISOString() })
          .eq("id", notification.id);

        return notification.id;
      })
    );

    const sent = results.filter((r) => r.status === "fulfilled").length;

    return {
      processed: deferred.length,
      sent,
      failed: deferred.length - sent,
    };
  },
});

// ============================================================================
// Queue Notification for Quiet Hours
// ============================================================================

/**
 * Queue a notification for later if user is in quiet hours
 */
export const queueForQuietHoursTask = task({
  id: "queue-quiet-hours",
  run: async (payload: PushNotificationPayload & { resumeAt: string }) => {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();

    const { error } = await supabase.from("deferred_notifications").insert({
      user_id: payload.userId,
      title: payload.title,
      body: payload.body,
      data: payload.data,
      resume_at: payload.resumeAt,
      status: "pending",
    });

    if (error) {
      throw new Error(`Failed to queue notification: ${error.message}`);
    }

    return { queued: true, resumeAt: payload.resumeAt };
  },
});
