/**
 * Email provider types and interfaces
 */

export type EmailProvider = "resend" | "brevo" | "aws_ses";

export type EmailType = "auth" | "chat" | "food_listing" | "feedback" | "review_reminder";

export type EmailStatus = "pending" | "sent" | "delivered" | "failed" | "bounced";

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
}

export interface SendEmailResponse {
  success: boolean;
  messageId?: string;
  provider: EmailProvider;
  error?: string;
}

export interface ProviderQuota {
  provider: EmailProvider;
  dailyLimit: number;
  sent: number;
  remaining: number;
  resetDate: Date;
}

export interface EmailProviderConfig {
  apiKey: string;
  fromEmail: string;
  fromName: string;
}

export interface ResendConfig extends EmailProviderConfig {}

export interface BrevoConfig extends EmailProviderConfig {
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
}

export interface AWSSESConfig extends EmailProviderConfig {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
}
