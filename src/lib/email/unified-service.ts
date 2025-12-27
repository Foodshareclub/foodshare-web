/**
 * Unified Email Service v2 - Bleeding Edge Implementation
 *
 * Key improvements:
 * - Single source of truth for provider selection
 * - Eliminates redundant Edge Function calls
 * - Uses database-first health scoring
 * - Lazy provider initialization
 * - Request coalescing for quota checks
 * - Streaming metrics (no blocking DB writes)
 * - Suppression list checking (bounces, complaints, unsubscribes)
 * - Monthly quota tracking alongside daily quota
 */

import type { EmailProvider, EmailType, SendEmailRequest, SendEmailResponse } from "./types";
import { toEmailProvider } from "./type-guards";

// Lazy-loaded providers (tree-shaking friendly)

interface IEmailProvider {
  sendEmail(request: SendEmailRequest): Promise<SendEmailResponse>;
  isAvailable(): Promise<boolean>;
}

interface ProviderHealth {
  provider: EmailProvider;
  healthScore: number;
  quotaRemaining: number;
  monthlyQuotaRemaining: number;
  avgLatencyMs: number;
  isAvailable: boolean;
}

interface UnifiedConfig {
  providers: {
    resend?: { apiKey: string; fromEmail: string; fromName: string };
    brevo?: { apiKey: string; fromEmail: string; fromName: string };
    aws_ses?: { region: string; accessKeyId: string; secretAccessKey: string; fromEmail: string };
    mailersend?: { apiKey: string; fromEmail: string; fromName: string };
  };
  defaultFrom: { email: string; name: string };
  enableMetrics?: boolean;
}

// Provider priority by email type (static, no DB needed)
// Resend is now prioritized for all types since it's the most reliable
const PROVIDER_PRIORITY: Record<EmailType, EmailProvider[]> = {
  auth: ["resend", "brevo", "mailersend", "aws_ses"],
  chat: ["resend", "brevo", "mailersend", "aws_ses"],
  food_listing: ["resend", "brevo", "mailersend", "aws_ses"],
  feedback: ["resend", "brevo", "mailersend", "aws_ses"],
  review_reminder: ["resend", "brevo", "mailersend", "aws_ses"],
  newsletter: ["resend", "brevo", "mailersend", "aws_ses"],
  announcement: ["resend", "brevo", "mailersend", "aws_ses"],
};

// Daily limits (static config)
const DAILY_LIMITS: Record<EmailProvider, number> = {
  resend: 100,
  brevo: 300,
  mailersend: 400,
  aws_ses: 50000,
};

// Monthly limits (static config)
const MONTHLY_LIMITS: Record<EmailProvider, number> = {
  resend: 3000,
  brevo: 9000,
  mailersend: 12000,
  aws_ses: 62000,
};

// Request coalescing for quota checks
const pendingQuotaChecks = new Map<string, Promise<ProviderHealth[]>>();

// Simple email validation regex (RFC 5322 simplified)
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email) && email.length <= 254;
}

// Metrics buffer (non-blocking writes)
const metricsBuffer: Array<{
  provider: EmailProvider;
  success: boolean;
  latencyMs: number;
  timestamp: number;
}> = [];

let metricsFlushTimer: ReturnType<typeof setTimeout> | null = null;

export class UnifiedEmailService {
  private config: UnifiedConfig;
  private providerInstances = new Map<EmailProvider, IEmailProvider>();
  private supabase: Awaited<
    ReturnType<typeof import("@/lib/supabase/server").createClient>
  > | null = null;

  constructor(config: UnifiedConfig) {
    this.config = {
      enableMetrics: true,
      ...config,
    };
  }

  /**
   * Send email with optimized provider selection
   * No Edge Function calls - all logic is local
   * Includes suppression list check and monthly quota consideration
   */
  async sendEmail(request: SendEmailRequest): Promise<SendEmailResponse> {
    const startTime = performance.now();

    try {
      // Validate recipient email
      const recipient = Array.isArray(request.options.to)
        ? request.options.to[0]
        : request.options.to;

      if (!isValidEmail(recipient.email)) {
        return {
          success: false,
          provider: "brevo",
          error: `Invalid email address format: ${recipient.email}`,
        };
      }

      // Check suppression list (unless explicitly skipped for transactional emails)
      if (!request.skipSuppressionCheck) {
        const isSuppressed = await this.checkSuppression(recipient.email);
        if (isSuppressed) {
          return {
            success: false,
            provider: "brevo",
            error: "Email address is on suppression list",
            suppressed: true,
          };
        }
      }

      // Get provider health (coalesced, cached)
      const healthData = await this.getProviderHealth();

      // Select best provider based on email type and health
      const provider = this.selectProvider(request.emailType, healthData);

      if (!provider) {
        return this.queueForRetry(request, "All providers unavailable");
      }

      // Get or create provider instance (lazy)
      const providerInstance = await this.getProvider(provider);

      // Ensure from address is set
      const enrichedRequest = this.enrichRequest(request);

      // Send email
      const result = await providerInstance.sendEmail(enrichedRequest);

      // Record metrics (non-blocking)
      if (this.config.enableMetrics) {
        this.recordMetric(provider, result.success, performance.now() - startTime);
      }

      return result;
    } catch (error) {
      console.error("[UnifiedEmailService] Send failed:", error);

      return {
        success: false,
        provider: "brevo",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get provider health with request coalescing
   * Multiple concurrent calls share the same DB query
   */
  private async getProviderHealth(): Promise<ProviderHealth[]> {
    const cacheKey = `health_${new Date().toISOString().slice(0, 16)}`; // 1-min granularity

    // Check for pending request
    const pending = pendingQuotaChecks.get(cacheKey);
    if (pending) {
      return pending;
    }

    // Create new request
    const promise = this.fetchProviderHealth();

    pendingQuotaChecks.set(cacheKey, promise);

    // Clean up after resolution
    promise.finally(() => {
      setTimeout(() => pendingQuotaChecks.delete(cacheKey), 60000);
    });

    return promise;
  }

  /**
   * Fetch health data from database (single query)
   * Uses comprehensive quota status for both daily and monthly limits
   */
  private async fetchProviderHealth(): Promise<ProviderHealth[]> {
    try {
      const supabase = await this.getSupabase();

      // Use comprehensive quota status which includes both daily and monthly
      const { data, error } = await supabase.rpc("get_comprehensive_quota_status");

      if (error) throw error;

      if (!data || data.length === 0) {
        // Return defaults if no data
        return this.getDefaultHealth();
      }

      return data.map((row: Record<string, unknown>) => {
        const provider = toEmailProvider(row.provider);
        return {
          provider,
          healthScore: 100, // Will be updated from health metrics if available
          quotaRemaining: (row.daily_remaining as number) ?? DAILY_LIMITS[provider],
          monthlyQuotaRemaining: (row.monthly_remaining as number) ?? MONTHLY_LIMITS[provider],
          avgLatencyMs: 500,
          isAvailable: (row.is_available as boolean) ?? true,
        };
      });
    } catch (error) {
      console.warn("[UnifiedEmailService] Health fetch failed, using defaults:", error);
      return this.getDefaultHealth();
    }
  }

  /**
   * Check if an email address is on the suppression list
   */
  private async checkSuppression(email: string): Promise<boolean> {
    try {
      const supabase = await this.getSupabase();
      const { data, error } = await supabase.rpc("is_email_suppressed", { p_email: email });

      if (error) {
        console.warn("[UnifiedEmailService] Suppression check failed:", error);
        return false; // Fail open - don't block emails if check fails
      }

      return data === true;
    } catch (error) {
      console.warn("[UnifiedEmailService] Suppression check error:", error);
      return false;
    }
  }

  /**
   * Select best provider based on type priority, health, and quota (daily + monthly)
   */
  private selectProvider(emailType: EmailType, healthData: ProviderHealth[]): EmailProvider | null {
    const priority = PROVIDER_PRIORITY[emailType] ?? ["brevo", "resend", "aws_ses"];

    // Sort by priority, then by health score
    const healthMap = new Map(healthData.map((h) => [h.provider, h]));

    for (const provider of priority) {
      const health = healthMap.get(provider);

      // Check if provider is configured
      if (!this.isProviderConfigured(provider)) continue;

      // Check availability
      if (!health?.isAvailable) continue;

      // Check daily quota
      if ((health?.quotaRemaining ?? 0) <= 0) continue;

      // Check monthly quota (critical for cost control)
      if ((health?.monthlyQuotaRemaining ?? 0) <= 0) continue;

      // Check health score (skip if critically unhealthy)
      if ((health?.healthScore ?? 100) < 20) continue;

      return provider;
    }

    return null;
  }

  /**
   * Check if provider is configured
   */
  private isProviderConfigured(provider: EmailProvider): boolean {
    switch (provider) {
      case "resend":
        return !!this.config.providers.resend?.apiKey;
      case "brevo":
        return !!this.config.providers.brevo?.apiKey;
      case "mailersend":
        return !!this.config.providers.mailersend?.apiKey;
      case "aws_ses":
        return !!this.config.providers.aws_ses?.accessKeyId;
      default:
        return false;
    }
  }

  /**
   * Get or create provider instance (lazy initialization)
   */
  private async getProvider(provider: EmailProvider): Promise<IEmailProvider> {
    const existing = this.providerInstances.get(provider);
    if (existing) return existing;

    let instance: IEmailProvider;

    switch (provider) {
      case "resend": {
        const { ResendProvider } = await import("./providers/resend");
        instance = new ResendProvider(this.config.providers.resend!);
        break;
      }
      case "brevo": {
        const { BrevoProvider } = await import("./providers/brevo");
        instance = new BrevoProvider(this.config.providers.brevo!);
        break;
      }
      case "mailersend": {
        const { MailerSendProvider } = await import("./providers/mailersend");
        instance = new MailerSendProvider(this.config.providers.mailersend!);
        break;
      }
      case "aws_ses": {
        const { AWSSESProvider } = await import("./providers/aws-ses");
        instance = new AWSSESProvider(this.config.providers.aws_ses!);
        break;
      }
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }

    this.providerInstances.set(provider, instance);
    return instance;
  }

  /**
   * Enrich request with default from address
   * @security-ignore A03:2021 - request is typed SendEmailRequest, not user input
   */
  private enrichRequest(request: SendEmailRequest): SendEmailRequest {
    // Explicitly construct new object to avoid prototype pollution concerns
    const enrichedOptions = {
      to: request.options.to,
      from: request.options.from ?? this.config.defaultFrom,
      replyTo: request.options.replyTo,
      cc: request.options.cc,
      bcc: request.options.bcc,
      attachments: request.options.attachments,
      headers: request.options.headers,
    };

    return {
      content: request.content,
      options: enrichedOptions,
      emailType: request.emailType,
    };
  }

  /**
   * Queue email for retry (when all providers fail)
   */
  private async queueForRetry(
    request: SendEmailRequest,
    reason: string
  ): Promise<SendEmailResponse> {
    try {
      const supabase = await this.getSupabase();
      const recipient = Array.isArray(request.options.to)
        ? request.options.to[0]
        : request.options.to;

      await supabase.from("email_queue").insert({
        recipient_email: recipient.email,
        email_type: request.emailType,
        template_name: `${request.emailType}-notification`,
        template_data: {
          subject: request.content.subject,
          html: request.content.html,
          text: request.content.text,
        },
        status: "pending",
        max_attempts: 5,
      });

      return {
        success: false,
        provider: "brevo",
        error: `Queued for retry: ${reason}`,
        messageId: "queued",
      };
    } catch (error) {
      return {
        success: false,
        provider: "brevo",
        error: `Failed to queue: ${error instanceof Error ? error.message : "Unknown"}`,
      };
    }
  }

  /**
   * Record metric (buffered, non-blocking)
   */
  private recordMetric(provider: EmailProvider, success: boolean, latencyMs: number): void {
    metricsBuffer.push({
      provider,
      success,
      latencyMs: Math.round(latencyMs),
      timestamp: Date.now(),
    });

    // Flush buffer every 10 seconds or when buffer is large
    if (!metricsFlushTimer) {
      metricsFlushTimer = setTimeout(() => this.flushMetrics(), 10000);
    }

    if (metricsBuffer.length >= 50) {
      this.flushMetrics();
    }
  }

  /**
   * Flush metrics buffer to database
   */
  private async flushMetrics(): Promise<void> {
    if (metricsFlushTimer) {
      clearTimeout(metricsFlushTimer);
      metricsFlushTimer = null;
    }

    if (metricsBuffer.length === 0) return;

    const batch = metricsBuffer.splice(0, metricsBuffer.length);

    try {
      const supabase = await this.getSupabase();

      // Batch insert metrics
      await supabase.rpc("batch_record_email_metrics", {
        p_metrics: JSON.stringify(batch),
      });
    } catch (error) {
      console.warn("[UnifiedEmailService] Metrics flush failed:", error);
      // Don't re-add to buffer - metrics are non-critical
    }
  }

  /**
   * Get default health data (fallback)
   */
  private getDefaultHealth(): ProviderHealth[] {
    return (["resend", "brevo", "mailersend", "aws_ses"] as EmailProvider[]).map((provider) => ({
      provider,
      healthScore: 100,
      quotaRemaining: DAILY_LIMITS[provider],
      monthlyQuotaRemaining: MONTHLY_LIMITS[provider],
      avgLatencyMs: 500,
      isAvailable: this.isProviderConfigured(provider),
    }));
  }

  /**
   * Lazy Supabase client getter
   */
  private async getSupabase() {
    if (!this.supabase) {
      // Dynamic import to avoid client-side issues
      const { createClient } = await import("@/lib/supabase/server");
      this.supabase = await createClient();
    }
    return this.supabase;
  }

  /**
   * Get service health status (for admin dashboard)
   */
  async getHealthStatus() {
    const health = await this.getProviderHealth();
    return {
      providers: health,
      metricsBufferSize: metricsBuffer.length,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Create unified email service (server-side only)
 * Fetches credentials from Supabase Vault
 */
export async function createUnifiedEmailService(): Promise<UnifiedEmailService> {
  if (typeof window !== "undefined") {
    throw new Error("UnifiedEmailService must only be used server-side");
  }

  // Import vault service dynamically to avoid circular deps
  const { getEmailSecrets } = await import("./vault");
  const secrets = await getEmailSecrets();

  const fromEmail = process.env.EMAIL_FROM || "contact@foodshare.club";
  const fromName = process.env.EMAIL_FROM_NAME || "FoodShare";

  return new UnifiedEmailService({
    providers: {
      resend: secrets.resendApiKey
        ? {
            apiKey: secrets.resendApiKey,
            fromEmail,
            fromName,
          }
        : undefined,
      brevo: secrets.brevoApiKey
        ? {
            apiKey: secrets.brevoApiKey,
            fromEmail,
            fromName,
          }
        : undefined,
      mailersend: secrets.mailersendApiKey
        ? {
            apiKey: secrets.mailersendApiKey,
            fromEmail,
            fromName,
          }
        : undefined,
      aws_ses:
        secrets.awsAccessKeyId && secrets.awsSecretAccessKey
          ? {
              region: secrets.awsRegion,
              accessKeyId: secrets.awsAccessKeyId,
              secretAccessKey: secrets.awsSecretAccessKey,
              fromEmail,
            }
          : undefined,
    },
    defaultFrom: {
      email: fromEmail,
      name: fromName,
    },
    enableMetrics: true,
  });
}
