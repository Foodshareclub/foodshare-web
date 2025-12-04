/**
 * Email providers exports
 */

export { BaseEmailProvider, type IEmailProvider } from "./base";
export { ResendProvider } from "./resend";
export { BrevoProvider } from "./brevo";
export { AWSSESProvider } from "./aws-ses";

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
} from "../types";
