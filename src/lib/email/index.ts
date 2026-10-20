/**
 * Email module exports
 *
 * UnifiedEmailService - Optimized email service with:
 * - Smart provider routing based on email type
 * - Request coalescing for health checks
 * - Buffered metrics (non-blocking)
 * - Lazy provider initialization
 *
 * React Email Templates - Bleeding edge implementation:
 * - Type-safe templates with @react-email/components
 * - Server-side rendering
 * - Cross-client compatibility
 */

// Main service
export { UnifiedEmailService, createUnifiedEmailService } from "./unified-service";

// Aliases for convenience
export {
  UnifiedEmailService as EmailService,
  createUnifiedEmailService as createEmailService,
} from "./unified-service";

// Template-based sending (recommended)
export { sendTemplateEmail, sendBatchTemplateEmail, previewEmail } from "./send";

// Database-driven templates (enterprise)
export {
  sendDatabaseTemplateEmail,
  sendBatchDatabaseTemplateEmail,
  previewDatabaseTemplate,
} from "./send";

export {
  fetchDatabaseTemplate,
  fetchAllTemplates,
  renderDatabaseTemplate,
  renderTemplateContent,
  prepareVariables,
  hasDatabaseTemplate,
  clearTemplateCache,
  clearTemplateCacheEntry,
  getTemplateCacheStats,
  TEMPLATE_SLUG_MAP,
} from "./database-templates";

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

// Database template types
export type { DatabaseTemplate, RenderedTemplate, TemplateVariable } from "./database-templates";
