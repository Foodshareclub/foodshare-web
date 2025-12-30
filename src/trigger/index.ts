/**
 * Trigger.dev Tasks Index
 *
 * Export all tasks for easy importing
 */

// Email tasks
export {
  sendEmailTask,
  batchEmailTask,
  type SendEmailPayload,
  type SendEmailResult,
  type BatchEmailPayload,
  type BatchEmailResult,
} from "./email-queue";

// Campaign tasks
export {
  processCampaignTask,
  checkScheduledCampaignsTask,
  triggerCampaignNow,
} from "./campaign-processor";

// Push notification tasks
export {
  sendPushTask,
  broadcastPushTask,
  sendDeferredNotificationsTask,
  queueForQuietHoursTask,
  type PushNotificationPayload,
  type BroadcastPayload,
  type PushResult,
} from "./push-notifications";

// Automation tasks
export {
  processAutomationEmailTask,
  checkAutomationQueueTask,
  triggerAutomationTask,
} from "./automation-processor";
