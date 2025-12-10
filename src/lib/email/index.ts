/**
 * Email module exports
 *
 * UnifiedEmailService - Optimized email service with:
 * - Smart provider routing based on email type
 * - Request coalescing for health checks
 * - Buffered metrics (non-blocking)
 * - Lazy provider initialization
 */

// Main service
export { UnifiedEmailService, createUnifiedEmailService } from "./unified-service";

// Aliases for convenience
export {
  UnifiedEmailService as EmailService,
  createUnifiedEmailService as createEmailService,
} from "./unified-service";

// Providers
export { ResendProvider, BrevoProvider, AWSSESProvider, type IEmailProvider } from "./providers";

// Vault (secrets management)
export {
  getEmailSecrets,
  getResendApiKey,
  getBrevoApiKey,
  getAwsCredentials,
  getConfiguredProviders,
  clearSecretsCache,
} from "./vault";

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
