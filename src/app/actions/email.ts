"use server";

/**
 * Email Server Actions
 * Bleeding-edge implementation with:
 * - Zod schema validation
 * - Type-safe action results
 * - Proper admin auth via user_roles
 */

import { z } from "zod";
import { sendTemplateEmail, previewEmail } from "@/lib/email/send";
import type { EmailTemplateName, EmailTemplateProps } from "@/emails/types";
import { createClient } from "@/lib/supabase/server";
import { serverActionError, type ServerActionResult } from "@/lib/errors";
import type { ErrorCode } from "@/lib/errors";

// ============================================================================
// Zod Schemas
// ============================================================================

const EmailAddressSchema = z.string().email("Invalid email address");

const NewMessageNotificationSchema = z.object({
  senderName: z.string().min(1, "Sender name is required"),
  senderAvatar: z.string().url().optional().default(""),
  messagePreview: z.string().min(1, "Message preview is required").max(500),
  conversationUrl: z.string().url("Invalid conversation URL"),
  listingTitle: z.string().optional(),
  listingImage: z.string().url().optional(),
  listingType: z.string().optional(),
});

const ListingInterestSchema = z.object({
  interestedUserName: z.string().min(1),
  interestedUserAvatar: z.string().url().optional().default(""),
  interestedUserRating: z.string().optional().default(""),
  interestedUserShares: z.string().optional().default(""),
  listingTitle: z.string().min(1),
  listingImage: z.string().url().optional().default(""),
  listingType: z.string().min(1),
  listingLocation: z.string().min(1),
  messageUrl: z.string().url(),
  listingUrl: z.string().url(),
});

const PickupReminderSchema = z.object({
  pickupTime: z.string().min(1),
  pickupDate: z.string().min(1),
  listingTitle: z.string().min(1),
  listingImage: z.string().url().optional().default(""),
  sharerName: z.string().min(1),
  pickupAddress: z.string().min(1),
  pickupInstructions: z.string().optional(),
  directionsUrl: z.string().url(),
  messageUrl: z.string().url(),
});

const ReviewRequestSchema = z.object({
  recipientName: z.string().min(1),
  sharerName: z.string().min(1),
  listingTitle: z.string().min(1),
  listingImage: z.string().url().optional().default(""),
  pickupDate: z.string().min(1),
  reviewUrl: z.string().url(),
});

const ListingExpiredSchema = z.object({
  userName: z.string().min(1),
  listingTitle: z.string().min(1),
  listingImage: z.string().url().optional().default(""),
  listingType: z.string().min(1),
  expiryDate: z.string().min(1),
  renewUrl: z.string().url(),
  editUrl: z.string().url(),
  markSharedUrl: z.string().url(),
});

// ============================================================================
// Types
// ============================================================================

export interface SendEmailResult {
  messageId?: string;
}

// ============================================================================
// Helper: Verify Admin Access
// ============================================================================

type AuthError = { error: string; code: ErrorCode };
type AuthSuccess = {
  user: { id: string };
  supabase: Awaited<ReturnType<typeof createClient>>;
};

async function verifyAdminAccess(): Promise<AuthError | AuthSuccess> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: "You must be logged in", code: "UNAUTHORIZED" };
  }

  const { data: userRoles } = await supabase
    .from("user_roles")
    .select("roles!inner(name)")
    .eq("profile_id", user.id);

  const roles = (userRoles || [])
    .map((r) => (r.roles as unknown as { name: string })?.name)
    .filter(Boolean);

  const isAdmin = roles.includes("admin") || roles.includes("superadmin");

  if (!isAdmin) {
    return { error: "Admin access required", code: "FORBIDDEN" };
  }

  return { user: { id: user.id }, supabase };
}

function isAuthError(result: AuthError | AuthSuccess): result is AuthError {
  return "error" in result && "code" in result && !("supabase" in result);
}

// ============================================================================
// Email Actions
// ============================================================================

/**
 * Send a new message notification email
 */
export async function sendNewMessageNotification(
  recipientEmail: string,
  data: z.infer<typeof NewMessageNotificationSchema>
): Promise<ServerActionResult<SendEmailResult>> {
  try {
    // Validate email
    const emailValidation = EmailAddressSchema.safeParse(recipientEmail);
    if (!emailValidation.success) {
      return serverActionError("Invalid recipient email address", "VALIDATION_ERROR");
    }

    // Validate data
    const dataValidation = NewMessageNotificationSchema.safeParse(data);
    if (!dataValidation.success) {
      const firstError = dataValidation.error.issues[0];
      return serverActionError(firstError.message, "VALIDATION_ERROR");
    }

    const result = await sendTemplateEmail({
      to: emailValidation.data,
      template: "new-message",
      props: dataValidation.data,
    });

    if (!result.success) {
      return serverActionError(result.error || "Failed to send email", "INTERNAL_ERROR");
    }

    return {
      success: true,
      data: { messageId: result.messageId },
    };
  } catch (error) {
    console.error("Failed to send new message notification:", error);
    return serverActionError(
      error instanceof Error ? error.message : "Failed to send email",
      "INTERNAL_ERROR"
    );
  }
}

/**
 * Send a listing interest notification email
 */
export async function sendListingInterestNotification(
  recipientEmail: string,
  data: z.infer<typeof ListingInterestSchema>
): Promise<ServerActionResult<SendEmailResult>> {
  try {
    // Validate email
    const emailValidation = EmailAddressSchema.safeParse(recipientEmail);
    if (!emailValidation.success) {
      return serverActionError("Invalid recipient email address", "VALIDATION_ERROR");
    }

    // Validate data
    const dataValidation = ListingInterestSchema.safeParse(data);
    if (!dataValidation.success) {
      const firstError = dataValidation.error.issues[0];
      return serverActionError(firstError.message, "VALIDATION_ERROR");
    }

    const result = await sendTemplateEmail({
      to: emailValidation.data,
      template: "listing-interest",
      props: dataValidation.data,
    });

    if (!result.success) {
      return serverActionError(result.error || "Failed to send email", "INTERNAL_ERROR");
    }

    return {
      success: true,
      data: { messageId: result.messageId },
    };
  } catch (error) {
    console.error("Failed to send listing interest notification:", error);
    return serverActionError(
      error instanceof Error ? error.message : "Failed to send email",
      "INTERNAL_ERROR"
    );
  }
}

/**
 * Send a pickup reminder email
 */
export async function sendPickupReminder(
  recipientEmail: string,
  data: z.infer<typeof PickupReminderSchema>
): Promise<ServerActionResult<SendEmailResult>> {
  try {
    // Validate email
    const emailValidation = EmailAddressSchema.safeParse(recipientEmail);
    if (!emailValidation.success) {
      return serverActionError("Invalid recipient email address", "VALIDATION_ERROR");
    }

    // Validate data
    const dataValidation = PickupReminderSchema.safeParse(data);
    if (!dataValidation.success) {
      const firstError = dataValidation.error.issues[0];
      return serverActionError(firstError.message, "VALIDATION_ERROR");
    }

    const result = await sendTemplateEmail({
      to: emailValidation.data,
      template: "pickup-reminder",
      props: dataValidation.data,
    });

    if (!result.success) {
      return serverActionError(result.error || "Failed to send email", "INTERNAL_ERROR");
    }

    return {
      success: true,
      data: { messageId: result.messageId },
    };
  } catch (error) {
    console.error("Failed to send pickup reminder:", error);
    return serverActionError(
      error instanceof Error ? error.message : "Failed to send email",
      "INTERNAL_ERROR"
    );
  }
}

/**
 * Send a review request email
 */
export async function sendReviewRequest(
  recipientEmail: string,
  data: z.infer<typeof ReviewRequestSchema>
): Promise<ServerActionResult<SendEmailResult>> {
  try {
    // Validate email
    const emailValidation = EmailAddressSchema.safeParse(recipientEmail);
    if (!emailValidation.success) {
      return serverActionError("Invalid recipient email address", "VALIDATION_ERROR");
    }

    // Validate data
    const dataValidation = ReviewRequestSchema.safeParse(data);
    if (!dataValidation.success) {
      const firstError = dataValidation.error.issues[0];
      return serverActionError(firstError.message, "VALIDATION_ERROR");
    }

    // Generate star rating URLs
    const baseUrl = dataValidation.data.reviewUrl;
    const props = {
      ...dataValidation.data,
      review1StarUrl: `${baseUrl}?rating=1`,
      review2StarUrl: `${baseUrl}?rating=2`,
      review3StarUrl: `${baseUrl}?rating=3`,
      review4StarUrl: `${baseUrl}?rating=4`,
      review5StarUrl: `${baseUrl}?rating=5`,
    };

    const result = await sendTemplateEmail({
      to: emailValidation.data,
      template: "review-request",
      props,
    });

    if (!result.success) {
      return serverActionError(result.error || "Failed to send email", "INTERNAL_ERROR");
    }

    return {
      success: true,
      data: { messageId: result.messageId },
    };
  } catch (error) {
    console.error("Failed to send review request:", error);
    return serverActionError(
      error instanceof Error ? error.message : "Failed to send email",
      "INTERNAL_ERROR"
    );
  }
}

/**
 * Send a listing expired notification
 */
export async function sendListingExpiredNotification(
  recipientEmail: string,
  data: z.infer<typeof ListingExpiredSchema>
): Promise<ServerActionResult<SendEmailResult>> {
  try {
    // Validate email
    const emailValidation = EmailAddressSchema.safeParse(recipientEmail);
    if (!emailValidation.success) {
      return serverActionError("Invalid recipient email address", "VALIDATION_ERROR");
    }

    // Validate data
    const dataValidation = ListingExpiredSchema.safeParse(data);
    if (!dataValidation.success) {
      const firstError = dataValidation.error.issues[0];
      return serverActionError(firstError.message, "VALIDATION_ERROR");
    }

    const result = await sendTemplateEmail({
      to: emailValidation.data,
      template: "listing-expired",
      props: dataValidation.data,
    });

    if (!result.success) {
      return serverActionError(result.error || "Failed to send email", "INTERNAL_ERROR");
    }

    return {
      success: true,
      data: { messageId: result.messageId },
    };
  } catch (error) {
    console.error("Failed to send listing expired notification:", error);
    return serverActionError(
      error instanceof Error ? error.message : "Failed to send email",
      "INTERNAL_ERROR"
    );
  }
}

// ============================================================================
// Admin-Only Actions
// ============================================================================

interface EmailPreviewResult {
  html: string;
  text: string;
  subject: string;
}

/**
 * Preview an email template (admin only)
 */
export async function previewEmailTemplate<T extends EmailTemplateName>(
  template: T,
  props: Extract<EmailTemplateProps, { template: T }>["props"]
): Promise<ServerActionResult<EmailPreviewResult>> {
  try {
    const auth = await verifyAdminAccess();
    if (isAuthError(auth)) {
      return serverActionError(auth.error, auth.code);
    }

    // Cast props to any to avoid complex union type mismatch in TS
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await previewEmail(template, props as any);

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error("Failed to preview email template:", error);
    return serverActionError(
      error instanceof Error ? error.message : "Failed to preview email",
      "INTERNAL_ERROR"
    );
  }
}

/**
 * Send an arbitrary email from the admin dashboard
 */
const SendAdminEmailSchema = z.object({
  to: EmailAddressSchema,
  subject: z.string().min(1, "Subject is required"),
  message: z.string().min(1, "Message is required"),
  emailType: z.string().optional().default("newsletter"),
  provider: z.string().optional().default("auto"),
  useHtml: z.boolean().optional().default(false),
});

export async function sendAdminEmail(
  input: z.input<typeof SendAdminEmailSchema>
): Promise<ServerActionResult<SendEmailResult>> {
  try {
    const validated = SendAdminEmailSchema.safeParse(input);
    if (!validated.success) {
      return serverActionError(validated.error.issues[0].message, "VALIDATION_ERROR");
    }

    const auth = await verifyAdminAccess();
    if (isAuthError(auth)) {
      return serverActionError(auth.error, auth.code);
    }

    const { createUnifiedEmailService } = await import("@/lib/email/unified-service");
    const service = await createUnifiedEmailService();

    // Determine content type
    let html = validated.data.message;
    let text = validated.data.message;

    if (!validated.data.useHtml) {
      // If not using HTML mode, wrap text in simple paragraph
      html = `<p>${validated.data.message.replace(/\n/g, "<br>")}</p>`;
    } else {
      // If using HTML mode, strip tags for text version (rough approximation)
      text = validated.data.message.replace(/<[^>]*>?/gm, "");
    }

    const result = await service.sendEmail({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      emailType: validated.data.emailType as any,
      content: {
        subject: validated.data.subject,
        html,
        text,
      },
      options: {
        to: { email: validated.data.to },
        from: {
          email: process.env.EMAIL_FROM || "contact@foodshare.club",
          name: process.env.EMAIL_FROM_NAME || "FoodShare Admin",
        },
      },
    });

    if (!result.success) {
      return serverActionError(result.error || "Failed to send email", "INTERNAL_ERROR");
    }

    return {
      success: true,
      data: { messageId: result.messageId },
    };
  } catch (error) {
    console.error("Failed to send admin email:", error);
    return serverActionError(
      error instanceof Error ? error.message : "Failed to send email",
      "INTERNAL_ERROR"
    );
  }
}

/**
 * Send a quick test email (direct)
 */
export async function sendTestEmailDirect(
  to: string,
  subject: string,
  message: string
): Promise<ServerActionResult<SendEmailResult>> {
  return sendAdminEmail({
    to,
    subject,
    message,
    emailType: "newsletter", // Default to newsletter for tests
    provider: "auto",
    useHtml: false,
  });
}
