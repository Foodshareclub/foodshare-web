/**
 * Email provider types and interfaces
 * Comprehensive type definitions for robust email handling
 */

export type EmailProvider = "resend" | "brevo" | "aws_ses";

export type EmailType =
  | "auth"
  | "chat"
  | "food_listing"
  | "feedback"
  | "review_reminder"
  | "newsletter"
  | "announcement";

export type EmailStatus = "pending" | "sent" | "delivered" | "failed" | "bounced" | "complained";

export type BounceType = "hard" | "soft";
export type BounceCategory = "invalid" | "full_mailbox" | "blocked" | "spam" | "other";
export type SuppressionReason =
  | "hard_bounce"
  | "soft_bounce"
  | "complaint"
  | "unsubscribe"
  | "manual";

export interface EmailAddress {
  email: string;
  name?: string;
}

export interface EmailContent {
  subject: string;
  html: string;
  text?: string;
}

export interface EmailOptions {
  to: EmailAddress | EmailAddress[];
  from: EmailAddress;
  replyTo?: EmailAddress;
  cc?: EmailAddress | EmailAddress[];
  bcc?: EmailAddress | EmailAddress[];
  attachments?: EmailAttachment[];
  headers?: Record<string, string>;
}

export interface EmailAttachment {
  filename: string;
  content: string | Buffer;
  contentType?: string;
  encoding?: string;
}

export interface SendEmailRequest {
  content: EmailContent;
  options: EmailOptions;
  emailType: EmailType;
  skipSuppressionCheck?: boolean; // For transactional emails that must be sent
}

export interface SendEmailResponse {
  success: boolean;
  messageId?: string;
  provider: EmailProvider;
  error?: string;
  suppressed?: boolean; // True if email was blocked due to suppression
}

// Daily quota
export interface ProviderQuota {
  provider: EmailProvider;
  dailyLimit: number;
  sent: number;
  remaining: number;
  resetDate: Date;
}

// Comprehensive quota (daily + monthly)
export interface ComprehensiveQuota {
  provider: EmailProvider;
  daily: {
    sent: number;
    limit: number;
    remaining: number;
    percentUsed: number;
  };
  monthly: {
    sent: number;
    limit: number;
    remaining: number;
    percentUsed: number;
  };
  isAvailable: boolean;
}

// Bounce event from webhook
export interface BounceEvent {
  email: string;
  provider: EmailProvider;
  eventType: "bounce" | "complaint" | "delivery" | "open" | "click" | "unsubscribe";
  bounceType?: BounceType;
  bounceCategory?: BounceCategory;
  messageId?: string;
  timestamp: Date;
  rawPayload?: Record<string, unknown>;
}

// Suppression list entry
export interface SuppressionEntry {
  id: string;
  email: string;
  reason: SuppressionReason;
  provider?: EmailProvider;
  bounceType?: string;
  bounceSubtype?: string;
  suppressedAt: Date;
  expiresAt?: Date;
}

export interface EmailProviderConfig {
  apiKey: string;
  fromEmail: string;
  fromName: string;
}

// ResendConfig uses base EmailProviderConfig directly
export type ResendConfig = EmailProviderConfig;

export interface BrevoConfig extends EmailProviderConfig {
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
}

export interface AWSSESConfig {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  fromEmail: string;
  fromName?: string;
}
