/**
 * React hooks for triggering email notifications
 */

import { useCallback } from "react";
import {
  sendChatNotification,
  sendFoodListingNotification,
  sendReviewReminder,
  notifyAdminsOfFeedback,
} from "./emailNotifications";
import { createLogger } from "@/lib/logger";

const logger = createLogger("NotificationHooks");

/**
 * Hook to send chat notifications
 */
export function useChatNotifications() {
  const notify = useCallback(
    async (params: {
      recipientEmail: string;
      recipientName?: string;
      senderName: string;
      messagePreview: string;
      roomId: string;
    }) => {
      try {
        return await sendChatNotification(params);
      } catch (error) {
        logger.error("Failed to send chat notification", error as Error);
        return null;
      }
    },
    []
  );

  return { notify };
}

/**
 * Hook to send food listing notifications
 */
export function useFoodListingNotifications() {
  const notify = useCallback(
    async (params: {
      recipientEmail: string;
      recipientName?: string;
      foodName: string;
      foodItemId: string;
      distanceKm: number;
    }) => {
      try {
        return await sendFoodListingNotification(params);
      } catch (error) {
        logger.error("Failed to send food listing notification", error as Error);
        return null;
      }
    },
    []
  );

  return { notify };
}

/**
 * Hook to send review reminders
 */
export function useReviewReminders() {
  const sendReminder = useCallback(
    async (params: {
      recipientEmail: string;
      recipientName?: string;
      transactionId: string;
      otherUserName: string;
    }) => {
      try {
        return await sendReviewReminder(params);
      } catch (error) {
        logger.error("Failed to send review reminder", error as Error);
        return null;
      }
    },
    []
  );

  return { sendReminder };
}

/**
 * Hook to notify admins of feedback
 */
export function useFeedbackNotifications() {
  const notifyAdmins = useCallback(
    async (params: {
      feedbackId: string;
      feedbackType: string;
      subject: string;
      submitterName: string;
      submitterEmail: string;
      messagePreview: string;
    }) => {
      try {
        return await notifyAdminsOfFeedback(params);
      } catch (error) {
        logger.error("Failed to notify admins of feedback", error as Error);
        return null;
      }
    },
    []
  );

  return { notifyAdmins };
}
