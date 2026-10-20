/**
 * Unified Notification API
 *
 * Barrel export for notification client
 */

export {
  sendNotification,
  sendBatchNotifications,
  sendTemplateNotification,
  sendEmailNotification,
  sendBatchEmailNotifications,
} from "./api-client";

export type {
  SendNotificationRequest,
  SendTemplateNotificationRequest,
  BatchNotificationRequest,
  DeliveryResult,
  BatchDeliveryResult,
  ChannelDeliveryResult,
} from "./api-client";

export type {
  NotificationType,
  NotificationChannel,
  PriorityLevel,
  NotificationCategory,
} from "./types";
