"use server";

/**
 * Email Server Actions
 * Handles email preferences and sending operations with proper server-side validation
 */

import { createClient } from "@/lib/supabase/server";
import { serverActionError, successVoid, type ServerActionResult } from "@/lib/errors";
import { CACHE_TAGS, invalidateTag } from "@/lib/data/cache-keys";
import type { EmailType, EmailProvider } from "@/lib/email/types";

// ============================================================================
// Types
// ============================================================================

export interface EmailPreferences {
  chat_notifications: boolean;
  food_listings_notifications: boolean;
  feedback_notifications: boolean;
  review_reminders: boolean;
  notification_frequency: "instant" | "daily_digest" | "weekly_digest";
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
}

// ============================================================================
// Actions
// ============================================================================

/**
 * Get email preferences for the current user
 */
export async function getEmailPreferences(): Promise<ServerActionResult<EmailPreferences | null>> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return serverActionError("You must be logged in to view preferences", "UNAUTHORIZED");
    }

    const { data, error } = await supabase
      .from("email_preferences")
      .select("*")
      .eq("profile_id", user.id)
      .single();

    // PGRST116 means no rows found - return default preferences
    if (error && error.code === "PGRST116") {
      return {
        success: true,
        data: null,
      };
    }

    if (error) {
      return serverActionError(error.message, "DATABASE_ERROR");
    }

    return {
      success: true,
      data: {
        chat_notifications: data.chat_notifications,
        food_listings_notifications: data.food_listings_notifications,
        feedback_notifications: data.feedback_notifications,
        review_reminders: data.review_reminders,
        notification_frequency: data.notification_frequency,
        quiet_hours_start: data.quiet_hours_start,
        quiet_hours_end: data.quiet_hours_end,
      },
    };
  } catch (error) {
    console.error("Failed to get email preferences:", error);
    return serverActionError("Failed to load preferences", "UNKNOWN_ERROR");
  }
}

/**
 * Update email preferences for the current user
 */
export async function updateEmailPreferences(
  preferences: EmailPreferences
): Promise<ServerActionResult<void>> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return serverActionError("You must be logged in to update preferences", "UNAUTHORIZED");
    }

    const { error } = await supabase.from("email_preferences").upsert({
      profile_id: user.id,
      ...preferences,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      return serverActionError(error.message, "DATABASE_ERROR");
    }

    invalidateTag(CACHE_TAGS.PROFILES);

    return successVoid();
  } catch (error) {
    console.error("Failed to update email preferences:", error);
    return serverActionError("Failed to save preferences", "UNKNOWN_ERROR");
  }
}

/**
 * Reset email preferences to defaults
 */
export async function resetEmailPreferences(): Promise<ServerActionResult<void>> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return serverActionError("You must be logged in to reset preferences", "UNAUTHORIZED");
    }

    const { error } = await supabase.from("email_preferences").delete().eq("profile_id", user.id);

    if (error) {
      return serverActionError(error.message, "DATABASE_ERROR");
    }

    invalidateTag(CACHE_TAGS.PROFILES);

    return successVoid();
  } catch (error) {
    console.error("Failed to reset email preferences:", error);
    return serverActionError("Failed to reset preferences", "UNKNOWN_ERROR");
  }
}

// ============================================================================
// Admin Email Sending
// ============================================================================

export interface SendEmailRequest {
  to: string;
  subject: string;
  html: string;
  emailType: EmailType;
  provider?: EmailProvider;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  provider?: EmailProvider;
  error?: string;
}

/**
 * Send an email immediately (admin only)
 * Uses the enhanced email service with smart routing and fallback
 */
/**
 * Send a test email directly via Resend (bypasses smart routing)
 * For debugging purposes
 */
export async function sendTestEmailDirect(
  to: string,
  subject: string,
  html: string
): Promise<ServerActionResult<SendEmailResult>> {
  try {
    const supabase = await createClient();

    // Verify user is authenticated and is admin
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return serverActionError("You must be logged in to send emails", "UNAUTHORIZED");
    }

    // Check if user is admin
    const { data: userRole } = await supabase
      .from("user_roles")
      .select("roles!inner(name)")
      .eq("profile_id", user.id)
      .in("roles.name", ["admin", "superadmin"])
      .single();

    if (!userRole) {
      return serverActionError("Admin access required", "FORBIDDEN");
    }

    // Get Resend API key from Vault
    console.info("[sendTestEmailDirect] 🔐 Fetching Resend API key from vault...");
    const { getResendApiKey } = await import("@/lib/email/vault");
    const apiKey = await getResendApiKey();

    const fromEmail = process.env.EMAIL_FROM || "contact@foodshare.club";
    const fromName = process.env.EMAIL_FROM_NAME || "FoodShare";

    console.info("[sendTestEmailDirect] 📧 Email config:", {
      hasApiKey: !!apiKey,
      apiKeyPreview: apiKey ? `${apiKey.slice(0, 8)}...${apiKey.slice(-4)}` : "NOT_FOUND",
      apiKeyLength: apiKey?.length ?? 0,
      fromEmail,
      fromName,
      to,
      subjectLength: subject.length,
    });

    if (!apiKey) {
      console.error("[sendTestEmailDirect] ❌ No API key available from vault or environment");
      return serverActionError(
        "RESEND_API_KEY not configured in Vault or environment",
        "INTERNAL_ERROR"
      );
    }

    // Import Resend
    console.info("[sendTestEmailDirect] 📤 Sending email via Resend...");
    const { Resend } = await import("resend");

    const resend = new Resend(apiKey);

    const response = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: [to],
      subject,
      html,
    });

    console.info("[sendTestEmailDirect] 📬 Resend response:", {
      success: !response.error,
      messageId: response.data?.id,
      error: response.error?.message,
      errorName: response.error?.name,
    });

    if (response.error) {
      return {
        success: true,
        data: {
          success: false,
          error: response.error.message || "Resend API error",
          provider: "resend",
        },
      };
    }

    return {
      success: true,
      data: {
        success: true,
        messageId: response.data?.id || "unknown",
        provider: "resend",
      },
    };
  } catch (error) {
    console.error("[sendTestEmailDirect] Error:", error);
    return serverActionError(
      error instanceof Error ? error.message : "Failed to send email",
      "UNKNOWN_ERROR"
    );
  }
}

export async function sendAdminEmail(
  request: SendEmailRequest
): Promise<ServerActionResult<SendEmailResult>> {
  try {
    const supabase = await createClient();

    // Verify user is authenticated and is admin
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return serverActionError("You must be logged in to send emails", "UNAUTHORIZED");
    }

    // Check if user is admin
    const { data: userRole } = await supabase
      .from("user_roles")
      .select("roles!inner(name)")
      .eq("profile_id", user.id)
      .in("roles.name", ["admin", "superadmin"])
      .single();

    if (!userRole) {
      return serverActionError("Admin access required", "FORBIDDEN");
    }

    // Validate email address
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(request.to)) {
      return serverActionError("Invalid email address", "VALIDATION_ERROR");
    }

    // Get configured providers from Vault
    const { getConfiguredProviders } = await import("@/lib/email/vault");
    const configuredProviders = await getConfiguredProviders();

    const fromEmail = process.env.EMAIL_FROM || "noreply@foodshare.app";
    const fromName = process.env.EMAIL_FROM_NAME || "FoodShare";

    console.log("[sendAdminEmail] Config:", {
      fromEmail,
      fromName,
      providers: configuredProviders,
      emailType: request.emailType,
      to: request.to,
    });

    // Create email service (now async, fetches secrets from Vault)
    const { createUnifiedEmailService } = await import("@/lib/email/unified-service");
    const emailService = await createUnifiedEmailService();

    const result = await emailService.sendEmail({
      content: {
        subject: request.subject,
        html: request.html,
      },
      options: {
        to: { email: request.to },
        from: {
          email: fromEmail,
          name: fromName,
        },
      },
      emailType: request.emailType,
    });

    console.log("[sendAdminEmail] Result:", {
      success: result.success,
      provider: result.provider,
      messageId: result.messageId,
      error: result.error,
    });

    if (result.success) {
      return {
        success: true,
        data: {
          success: true,
          messageId: result.messageId,
          provider: result.provider,
        },
      };
    } else {
      return {
        success: true,
        data: {
          success: false,
          error: result.error || "Failed to send email",
          provider: result.provider,
        },
      };
    }
  } catch (error) {
    console.error("Failed to send admin email:", error);
    return serverActionError(
      error instanceof Error ? error.message : "Failed to send email",
      "UNKNOWN_ERROR"
    );
  }
}
