"use server";

/**
 * Email Automation Server Actions
 * Barrel export for all automation-related server actions
 *
 * Refactored from a 1316-line monolithic file into a clean module structure:
 * - types.ts: Type definitions and helper functions
 * - schemas.ts: Zod validation schemas
 * - helpers.ts: Shared utilities (auth, audit, cache)
 * - flow-crud.ts: Automation flow CRUD operations
 * - enrollment.ts: User enrollment management
 * - templates.ts: Email template management
 * - presets.ts: Preset automation creation
 * - queue.ts: Queue management, cron control, analytics
 */

// Export types
export type { ActionResult, ActionSuccess, ActionError } from "./types";

// Re-export all public server actions

// Flow CRUD operations
export {
  createAutomationFlow,
  updateAutomationFlow,
  deleteAutomationFlow,
  toggleAutomationStatus,
  duplicateAutomation,
  bulkUpdateAutomationStatus,
} from "./flow-crud";

// Enrollment management
export { enrollUserInAutomation, exitUserFromAutomation } from "./enrollment";

// Template management
export { saveEmailTemplate, deleteEmailTemplate } from "./templates";

// Preset automations
export { createPresetAutomation } from "./presets";

// Queue management, cron control, and analytics
export {
  triggerQueueProcessing,
  toggleAutomationCron,
  getQueueStatus,
  cancelPendingEmails,
  retryFailedEmails,
  getAutomationInsights,
} from "./queue";
