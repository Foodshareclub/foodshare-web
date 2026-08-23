/**
 * Type Barrel Export
 * Centralized exports for all application types
 *
 * Usage:
 * import { PostStatus, Coordinates, AuthViewType } from '@/types';
 *
 * For CRM-specific types with potential conflicts:
 * import type { CRMCustomer, ... } from '@/types/crm.types';
 */

// Database types (auto-generated from Supabase)
export * from "./database.types";

// Auth types
export * from "./auth.types";

// Enums and constants
export * from "./enums";

// PostGIS/Geographic types
export * from "./postgis.types";

// Admin types (includes shared ApiError, ApiResponse, PaginationState)
export * from "./admin.types";

// CRM types - selective exports (avoid conflicts with admin.types)
export type {
  CustomerType,
  LifecycleStage,
  ContactMethod,
  NoteType,
  CRMCustomer,
  CRMCustomerWithProfile,
  CRMCustomerNote,
  CRMCustomerNoteWithAdmin,
  CRMCustomerTag,
  CRMCustomerTagAssignment,
  CRMCustomerTagAssignmentWithTag,
  CRMCustomerSummary,
  CRMCustomersFilter,
  CreateCustomerNotePayload,
  UpdateCustomerNotePayload,
  CreateCustomerTagPayload,
  UpdateCustomerTagPayload,
  AssignCustomerTagsPayload,
  ArchiveCustomerPayload,
  UpdateCustomerPreferencesPayload,
  CRMDashboardStats,
  EngagementScoreDistribution,
  LifecycleStageTransition,
  ChurnRiskAnalysis,
  CRMState,
  BulkOperationResponse,
  EngagementChartData,
  LifecycleFunnelData,
  ChurnRiskTimelineData,
  CustomerActivitySummary,
  CustomerInteractionTimelineItem,
} from "./crm.types";

export { DEFAULT_CRM_FILTERS, DEFAULT_PAGINATION } from "./crm.types";

// Campaign types
export * from "./campaign.types";

// Post Activity types
export * from "./post-activity.types";

// Product and review types
export * from "./product.types";

// Email automation and queue types
export type {
  AutomationFlow,
  AutomationStep,
  AutomationEnrollment,
  AutomationQueueItem,
  AutomationEmailTemplate,
} from "./automations.types";
export { TRIGGER_TYPES } from "./automations.types";

// Email management types
export * from "./email-management.types";

// Web API extension types
export * from "./web-apis.types";

// Notification domain types
export * from "./notifications.types";
