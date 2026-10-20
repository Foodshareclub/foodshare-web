"use server";

/**
 * Email Server Actions
 * Bleeding-edge implementation with:
 * - Zod schema validation
 * - Type-safe action results
 * - Proper admin auth via user_roles
 * - Unified notification API integration
 */

import type { EmailTemplateName, EmailTemplateProps } from "@/emails/types";
import { checkUserIsAdmin } from "@/lib/data/admin-check";
import { previewEmail } from "@/lib/email/send";
import { type ServerActionResult, serverActionError } from "@/lib/errors";
import type { ErrorCode } from "@/lib/errors";
import { sendEmailNotification } from "@/lib/notifications";
import { createClient } from "@/lib/supabase/server";
import { escapeHtml } from "@/lib/utils";
import { z } from "zod";

// ============================================================================
// Zod Schemas
// ============================================================================

const EmailAddressSchema = z.string().email("Invalid email address");

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

  const { isAdmin } = await checkUserIsAdmin(user.id);

  if (!isAdmin) {
    return { error: "Admin access required", code: "FORBIDDEN" };
  }

  return { user: { id: user.id }, supabase };
}

function isAuthError(result: AuthError | AuthSuccess): result is AuthError {
  return "error" in result && "code" in result && !("supabase" in result);
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
  props: Extract<EmailTemplateProps, { template: T }>["props"],
): Promise<ServerActionResult<EmailPreviewResult>> {
  try {
    const auth = await verifyAdminAccess();
    if (isAuthError(auth)) {
      return serverActionError(auth.error, auth.code);
    }

    const result = await previewEmail<T>(template, props as never);

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error("Failed to preview email template:", error);
    return serverActionError(error instanceof Error ? error.message : "Failed to preview email", "INTERNAL_ERROR");
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
  input: z.input<typeof SendAdminEmailSchema>,
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

    // Get user ID from email
    const { supabase } = auth;
    const { data: profile } = await supabase.from("profiles").select("id").eq("email", validated.data.to).single();

    if (!profile) {
      return serverActionError("Recipient user not found", "NOT_FOUND");
    }

    // Determine content type
    let bodyText = validated.data.message;
    if (!validated.data.useHtml) {
      // If not using HTML mode, escape HTML and format
      const escapedMessage = escapeHtml(validated.data.message);
      bodyText = escapedMessage.replace(/\n/g, " ");
    } else {
      // If using HTML mode, strip tags for text version
      bodyText = validated.data.message.replace(/<[^>]*>?/gm, "");
    }

    // Send via unified notification API
    const result = await sendEmailNotification({
      userId: profile.id,
      type: "system_announcement",
      title: validated.data.subject,
      body: bodyText,
      data: {
        fromAdmin: "true",
        useHtml: String(validated.data.useHtml),
        rawMessage: validated.data.message,
      },
    });

    if (!result.success) {
      return serverActionError(result.error || "Failed to send notification", "INTERNAL_ERROR");
    }

    return {
      success: true,
      data: { messageId: result.data?.notificationId },
    };
  } catch (error) {
    console.error("Failed to send admin email:", error);
    return serverActionError(error instanceof Error ? error.message : "Failed to send email", "INTERNAL_ERROR");
  }
}

/**
 * Send a quick test email (direct)
 */
export async function sendTestEmailDirect(
  to: string,
  subject: string,
  message: string,
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
