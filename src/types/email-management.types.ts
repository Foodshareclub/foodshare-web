/**
 * Email Management Type Definitions
 * Types for email quotas, logs, queue, and manual sending
 *
 * These types were extracted from component files to follow proper architecture:
 * - Hooks should not import types from components
 * - Types belong in src/types/ for proper separation of concerns
 */

import type { EmailProvider, EmailType } from "@/lib/email/types";

// =============================================================================
// PROVIDER QUOTA TYPES
// =============================================================================

/**
 * Provider quota status for monitoring email provider limits
 */
export interface ProviderQuotaStatus {
  provider: string;
  status: "ok" | "warning" | "exhausted";
  usage_percentage: number;
  emails_sent: number;
  remaining: number;
  daily_limit: number;
}

// =============================================================================
// EMAIL LOG TYPES
// =============================================================================

/**
 * Email log entry from the email sending history
 */
export interface EmailLogEntry {
  id: string;
  recipient_email: string;
  email_type: EmailType;
  subject: string;
  provider: EmailProvider;
  status: string;
  sent_at: string;
  provider_message_id?: string;
  error?: string;
}

// =============================================================================
// EMAIL QUEUE TYPES
// =============================================================================

/**
 * Queued email entry awaiting delivery
 */
export interface QueuedEmailEntry {
  id: string;
  recipient_email: string;
  email_type: EmailType;
  template_name: string;
  attempts: number;
  max_attempts: number;
  status: string;
  last_error?: string;
  next_retry_at?: string;
  created_at: string;
}

// =============================================================================
// MANUAL EMAIL TYPES
// =============================================================================

/**
 * Request payload for sending manual emails via admin interface
 */
export interface ManualEmailRequest {
  to: string;
  subject: string;
  html: string;
  emailType: EmailType;
  provider?: EmailProvider;
}
