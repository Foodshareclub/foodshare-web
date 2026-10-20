/**
 * Email Templates - React Email Implementation
 *
 * Bleeding-edge email templates using @react-email/components.
 * All templates are type-safe, server-rendered, and cross-client compatible.
 */

// Auth emails
export { WelcomeConfirmationEmail } from "./welcome-confirmation";
export { PasswordResetEmail } from "./password-reset";
export { MagicLinkEmail } from "./magic-link";

// Notification emails
export { NewMessageEmail } from "./new-message";
export { ListingInterestEmail } from "./listing-interest";
export { PickupReminderEmail } from "./pickup-reminder";
export { ReviewRequestEmail } from "./review-request";
export { ListingExpiredEmail } from "./listing-expired";
export { WeeklyDigestEmail } from "./weekly-digest";

// Base components for custom emails
export * from "./components/base";

// Render utility
export { renderEmail, renderEmailToHtml, renderEmailToText } from "./render";

// Template types
export type { EmailTemplateProps, EmailTemplateName } from "./types";
