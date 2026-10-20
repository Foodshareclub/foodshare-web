/**
 * Email Data Layer - Barrel Export
 * Re-exports all email-related types and functions from sub-modules
 */

export { type EmailDashboardStats, type EmailCRMData, getEmailDashboardStats, getEmailCRMData } from "./stats";

export { type ProviderQuotaDetails, getComprehensiveQuotaStatus, getDefaultQuotaDetails } from "./quotas";

export {
  type BounceStats,
  type ProviderHealth,
  type CircuitBreakerState,
  type EmailTemplate,
  getBounceStats,
  getProviderHealth,
  getCircuitBreakerStates,
  getEmailTemplates,
} from "./health";

export {
  type ProviderStatus,
  type QuotaStatus,
  type RecentEmail,
  type HealthEvent,
  type EmailMonitoringData,
  getEmailMonitoringData,
  getEmailLogs,
} from "./monitoring";

export {
  type QueueStats,
  type RecentCampaign,
  type ActiveAutomation,
  type AudienceSegment,
  getQueueStats,
  getQueuedEmails,
  getRecentCampaigns,
  getActiveAutomations,
  getAudienceSegments,
} from "./queue";
