/**
 * Email module exports
 *
 * v2: Uses UnifiedEmailService as primary (optimized)
 * v1: EnhancedEmailService kept for backward compatibility
 */

// Unified service v2 (recommended)
export { UnifiedEmailService, createUnifiedEmailService } from "./unified-service";

// Enhanced service v1 (legacy)
export { EnhancedEmailService, createEnhancedEmailService } from "./enhanced-service";

// Default export: Use unified service
export {
  UnifiedEmailService as EmailService,
  createUnifiedEmailService as createEmailService,
} from "./unified-service";

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
