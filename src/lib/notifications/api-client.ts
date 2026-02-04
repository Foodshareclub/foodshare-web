/**
 * Unified Notification API Client
 *
 * Type-safe wrapper for calling the api-v1-notifications edge function.
 * Consolidates all notification operations (email, push, SMS, in-app).
 *
 * Usage:
 * ```typescript
 * import { sendNotification, sendBatchNotifications } from '@/lib/notifications/api-client';
 *
 * await sendNotification({
 *   userId: "user-id",
 *   type: "new_message",
 *   title: "New message",
 *   body: "You have a new message",
 *   channels: ["email"]
 * });
 * ```
 */

import type { NotificationType, NotificationChannel, PriorityLevel } from "./types";
import { createClient } from "@/lib/supabase/server";

// ============================================================================
// Request Types
// ============================================================================

export interface SendNotificationRequest {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, string>;
  channels?: NotificationChannel[];
  priority?: PriorityLevel;
  scheduledFor?: string;
  imageUrl?: string;
  sound?: string;
  badge?: number;
  ttl?: number;
  collapseKey?: string;
  channelId?: string;
  category?: string;
  threadId?: string;
}

export interface SendTemplateNotificationRequest {
  userId: string;
  template: string;
  variables: Record<string, unknown>;
  channels?: NotificationChannel[];
  priority?: PriorityLevel;
}

export interface BatchNotificationRequest {
  notifications: SendNotificationRequest[];
  options?: {
    parallel?: boolean;
    stopOnError?: boolean;
  };
}

// ============================================================================
// Response Types
// ============================================================================

export interface ChannelDeliveryResult {
  channel: NotificationChannel;
  success: boolean;
  provider?: string;
  deliveredTo?: string[];
  failedDevices?: string[];
  error?: string;
  attemptedAt: string;
  deliveredAt?: string;
}

export interface DeliveryResult {
  success: boolean;
  notificationId: string;
  userId: string;
  channels: ChannelDeliveryResult[];
  scheduled?: boolean;
  scheduledFor?: string;
  blocked?: boolean;
  reason?: string;
  error?: string;
  timestamp: string;
}

export interface BatchDeliveryResult {
  success: boolean;
  total: number;
  delivered: number;
  failed: number;
  scheduled: number;
  blocked: number;
  results: DeliveryResult[];
  durationMs: number;
}

// ============================================================================
// API Client
// ============================================================================

/**
 * Get the base URL for the notification API
 */
function getNotificationApiUrl(): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not defined");
  }
  return `${supabaseUrl}/functions/v1/api-v1-notifications`;
}

/**
 * Call the notification API with authentication
 */
async function callNotificationApi<T>(
  endpoint: string,
  body: unknown
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const supabase = await createClient();

    // Get the session token for authentication
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return {
        success: false,
        error: "Not authenticated",
      };
    }

    const url = `${getNotificationApiUrl()}${endpoint}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(body),
    });

    const result = await response.json();

    if (!response.ok) {
      // Error can be at top level (validation errors) or nested in data (delivery failures)
      const errorMessage = result.error || result.data?.error || `HTTP ${response.status}`;
      return {
        success: false,
        error: errorMessage,
      };
    }

    return {
      success: result.success,
      data: result.data,
      // Error can be at top level or nested in data
      error: result.error || result.data?.error,
    };
  } catch (error) {
    console.error(`[NotificationAPI] ${endpoint} failed:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Send a single notification
 *
 * @example
 * await sendNotification({
 *   userId: "user-id",
 *   type: "new_message",
 *   title: "New message",
 *   body: "You have a new message",
 *   channels: ["email", "push"]
 * });
 */
export async function sendNotification(
  request: SendNotificationRequest
): Promise<{ success: boolean; data?: DeliveryResult; error?: string }> {
  return callNotificationApi<DeliveryResult>("/send", request);
}

/**
 * Send a batch of notifications
 *
 * @example
 * await sendBatchNotifications({
 *   notifications: [
 *     { userId: "user1", type: "new_message", title: "...", body: "..." },
 *     { userId: "user2", type: "new_message", title: "...", body: "..." }
 *   ],
 *   options: { parallel: true }
 * });
 */
export async function sendBatchNotifications(
  request: BatchNotificationRequest
): Promise<{ success: boolean; data?: BatchDeliveryResult; error?: string }> {
  return callNotificationApi<BatchDeliveryResult>("/send/batch", request);
}

/**
 * Send a templated notification
 *
 * @example
 * await sendTemplateNotification({
 *   userId: "user-id",
 *   template: "welcome",
 *   variables: { name: "John" },
 *   channels: ["email"]
 * });
 */
export async function sendTemplateNotification(
  request: SendTemplateNotificationRequest
): Promise<{ success: boolean; data?: DeliveryResult; error?: string }> {
  return callNotificationApi<DeliveryResult>("/send/template", request);
}

// ============================================================================
// Email-Specific Helpers
// ============================================================================

/**
 * Send an email notification (convenience wrapper)
 *
 * @example
 * await sendEmailNotification({
 *   userId: "user-id",
 *   type: "new_message",
 *   title: "New message",
 *   body: "You have a new message",
 *   data: { messageId: "123" }
 * });
 */
export async function sendEmailNotification(
  request: Omit<SendNotificationRequest, "channels">
): Promise<{ success: boolean; data?: DeliveryResult; error?: string }> {
  return sendNotification({
    ...request,
    channels: ["email"],
  });
}

/**
 * Send batch email notifications (convenience wrapper)
 *
 * @example
 * await sendBatchEmailNotifications({
 *   notifications: [
 *     { userId: "user1", type: "welcome", title: "...", body: "..." },
 *     { userId: "user2", type: "welcome", title: "...", body: "..." }
 *   ],
 *   parallel: true
 * });
 */
export async function sendBatchEmailNotifications(
  notifications: Omit<SendNotificationRequest, "channels">[],
  parallel = true
): Promise<{ success: boolean; data?: BatchDeliveryResult; error?: string }> {
  return sendBatchNotifications({
    notifications: notifications.map((n) => ({ ...n, channels: ["email"] })),
    options: { parallel },
  });
}
