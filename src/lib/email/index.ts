/**
 * Email module exports
 * Uses EnhancedEmailService as the primary implementation
 */

// Enhanced service (primary)
export {
  EnhancedEmailService,
  createEnhancedEmailService,
} from "./enhanced-service";

// Backward-compatible aliases
export {
  EnhancedEmailService as EmailService,
  createEnhancedEmailService as createEmailService,
} from "./enhanced-service";

// Providers
export { ResendProvider, BrevoProvider, AWSSESProvider, type IEmailProvider } from "./providers";

// Types
export type {
  EmailProvider,
  EmailType,
  EmailStatus,
  EmailAddress,
  EmailContent,
  EmailOptions,
  EmailAttachment,
  SendEmailRequest,
  SendEmailResponse,
  ProviderQuota,
  EmailProviderConfig,
  ResendConfig,
  BrevoConfig,
  AWSSESConfig,
} from "./types";
