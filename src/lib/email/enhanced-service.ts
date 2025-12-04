/**
 * Enhanced Email Service with Circuit Breaker and Smart Routing
 * Provides robust email delivery with automatic failover and health monitoring
 */

import { ResendProvider } from "./providers/resend";
import { BrevoProvider } from "./providers/brevo";
import { AWSSESProvider } from "./providers/aws-ses";
import { emailCircuitBreaker } from "./circuit-breaker";
import {
  syncCircuitBreakerState,
  recordProviderFailure,
  recordProviderSuccess,
  recordEmailMetrics,
} from "./circuit-breaker-db";
import type {
  IEmailProvider,
  SendEmailRequest,
  SendEmailResponse,
  EmailProvider,
  EmailType,
  ResendConfig,
  BrevoConfig,
  AWSSESConfig,
} from "./providers";
import { supabase } from "@/lib/supabase/client";

interface EmailServiceConfig {
  resend: ResendConfig;
  brevo: BrevoConfig;
  awsSes: AWSSESConfig;
  useSmartRouting?: boolean; // Enable Edge Function routing
  enableCircuitBreaker?: boolean; // Enable circuit breaker
  enableMetrics?: boolean; // Track performance metrics
}

interface ProviderMetrics {
  totalRequests: number;
  successCount: number;
  failureCount: number;
  averageLatency: number;
  lastUsed?: number;
}

interface SmartRouteResponse {
  success: boolean;
  recommendation?: {
    provider: EmailProvider;
    reason: string;
    quotaRemaining: number;
    alternates: EmailProvider[];
  };
  error?: string;
}

export class EnhancedEmailService {
  private providers: Map<EmailProvider, IEmailProvider>;
  private config: EmailServiceConfig;
  private metrics: Map<EmailProvider, ProviderMetrics>;
  private smartRoutingCache: {
    data: SmartRouteResponse | null;
    timestamp: number;
    emailType: EmailType | null;
  };

  constructor(config: EmailServiceConfig) {
    this.config = {
      useSmartRouting: true,
      enableCircuitBreaker: true,
      enableMetrics: true,
      ...config,
    };

    // Initialize all providers
    this.providers = new Map<EmailProvider, IEmailProvider>([
      ["resend", new ResendProvider(config.resend)],
      ["brevo", new BrevoProvider(config.brevo)],
      ["aws_ses", new AWSSESProvider(config.awsSes)],
    ]);

    // Initialize metrics tracking
    this.metrics = new Map();
    ["resend", "brevo", "aws_ses"].forEach((provider) => {
      this.metrics.set(provider as EmailProvider, {
        totalRequests: 0,
        successCount: 0,
        failureCount: 0,
        averageLatency: 0,
      });
    });

    // Initialize smart routing cache
    this.smartRoutingCache = {
      data: null,
      timestamp: 0,
      emailType: null,
    };
  }

  /**
   * Send email with intelligent routing and fallback
   */
  async sendEmail(request: SendEmailRequest): Promise<SendEmailResponse> {
    const startTime = Date.now();

    try {
      // Get provider priority using smart routing or fallback to default
      const priority = await this.getProviderPriority(request.emailType);

      // Try each provider in order
      for (let i = 0; i < priority.length; i++) {
        const providerName = priority[i];
        const provider = this.providers.get(providerName);

        if (!provider) {
          continue;
        }

        // Check circuit breaker
        if (this.config.enableCircuitBreaker && !emailCircuitBreaker.isAvailable(providerName)) {
          const status = emailCircuitBreaker.getStatus(providerName);
          const retryIn = status?.nextRetryTime
            ? Math.ceil((status.nextRetryTime - Date.now()) / 1000)
            : 0;
          continue;
        }

        // Check provider availability (quota)
        const isAvailable = await provider.isAvailable();
        if (!isAvailable) {
          continue;
        }

        // Attempt to send
        const response = await this.sendWithProvider(provider, providerName, request);

        if (response.success) {
          // Success! Record and return
          const latency = Date.now() - startTime;

          if (this.config.enableCircuitBreaker) {
            emailCircuitBreaker.recordSuccess(providerName);

            // Sync circuit breaker state to database
            void syncCircuitBreakerState(providerName);

            // Record success in database
            void recordProviderSuccess(providerName);
          }

          await this.logEmail(request, response);
          await this.updateQuota(providerName);

          if (this.config.enableMetrics) {
            this.updateMetrics(providerName, true, latency);

            // Record metrics in database
            void recordEmailMetrics(providerName, true, latency);
          }

          return response;
        } else {
          // Provider failed, record failure and try next
          const latency = Date.now() - startTime;

          if (this.config.enableCircuitBreaker) {
            const error = new Error(response.error);
            emailCircuitBreaker.recordFailure(providerName, error);

            // Record failure in database (this also updates circuit breaker state)
            void recordProviderFailure(providerName, response.error || "Unknown error", {
              emailType: request.emailType,
              attemptNumber: i + 1,
            });

            // Sync circuit breaker state to database
            void syncCircuitBreakerState(providerName);
          }

          if (this.config.enableMetrics) {
            this.updateMetrics(providerName, false, latency);

            // Record metrics in database
            void recordEmailMetrics(providerName, false, latency);
          }

          // Check if there are more providers to try
          const isLastProvider = i === priority.length - 1;
          if (!isLastProvider) {
            continue;
          }
        }
      }

      // All providers failed - queue for retry
      const queueId = await this.queueEmail(request);

      return {
        success: false,
        provider: priority[0], // Use first priority provider in error response
        error: "All email providers exhausted. Email queued for retry.",
        messageId: queueId,
      };
    } catch (error) {
      console.error("[EnhancedEmailService] Fatal error:", error);

      // Queue email and return error
      const queueId = await this.queueEmail(request);

      return {
        success: false,
        provider: "brevo",
        error: error instanceof Error ? error.message : "Unknown error",
        messageId: queueId,
      };
    }
  }

  /**
   * Send email using specific provider with timeout
   */
  private async sendWithProvider(
    provider: IEmailProvider,
    providerName: EmailProvider,
    request: SendEmailRequest,
    timeout: number = 30000
  ): Promise<SendEmailResponse> {
    return Promise.race([
      provider.sendEmail(request),
      new Promise<SendEmailResponse>((_, reject) =>
        setTimeout(() => reject(new Error("Provider timeout")), timeout)
      ),
    ]).catch((error) => {
      return {
        success: false,
        provider: providerName,
        error: error instanceof Error ? error.message : String(error),
      };
    });
  }

  /**
   * Get provider priority using smart routing
   */
  private async getProviderPriority(emailType: EmailType): Promise<EmailProvider[]> {
    // Use smart routing if enabled
    if (this.config.useSmartRouting) {
      const smartRoute = await this.getSmartRoute(emailType);

      if (smartRoute?.recommendation) {
        const { provider, alternates } = smartRoute.recommendation;
        return [provider, ...alternates];
      }
    }

    // Fallback to static priority
    return this.getStaticPriority(emailType);
  }

  /**
   * Get smart routing recommendation from Edge Function
   */
  private async getSmartRoute(emailType: EmailType): Promise<SmartRouteResponse | null> {
    try {
      // Check cache (valid for 30 seconds)
      const cacheAge = Date.now() - this.smartRoutingCache.timestamp;
      if (
        this.smartRoutingCache.data &&
        this.smartRoutingCache.emailType === emailType &&
        cacheAge < 30000
      ) {
        return this.smartRoutingCache.data;
      }

      // Call Edge Function
      const { data, error } = await supabase.functions.invoke("smart-email-route", {
        body: { emailType },
      });

      if (error) throw error;

      // Cache result
      this.smartRoutingCache = {
        data: data as SmartRouteResponse,
        timestamp: Date.now(),
        emailType,
      };

      return data as SmartRouteResponse;
    } catch (error) {
      console.error("[EnhancedEmailService] Smart routing failed:", error);
      return null;
    }
  }

  /**
   * Get static provider priority (fallback)
   */
  private getStaticPriority(emailType: EmailType): EmailProvider[] {
    switch (emailType) {
      case "auth":
        return ["resend", "brevo", "aws_ses"];
      case "chat":
      case "food_listing":
      case "feedback":
      case "review_reminder":
        return ["brevo", "aws_ses", "resend"];
      default:
        return ["brevo", "resend", "aws_ses"];
    }
  }

  /**
   * Update provider quota in database
   */
  private async updateQuota(provider: EmailProvider): Promise<void> {
    try {
      const today = new Date().toISOString().split("T")[0];

      await supabase.rpc("increment_email_quota", {
        p_provider: provider,
        p_date: today,
      });
    } catch (error) {
      console.error("[EnhancedEmailService] Failed to update quota:", error);
    }
  }

  /**
   * Log email send attempt
   */
  private async logEmail(request: SendEmailRequest, response: SendEmailResponse): Promise<void> {
    try {
      const recipient = Array.isArray(request.options.to)
        ? request.options.to[0]
        : request.options.to;

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", recipient.email)
        .single();

      await supabase.from("email_logs").insert({
        recipient_id: profile?.id || null,
        recipient_email: recipient.email,
        email_type: request.emailType,
        subject: request.content.subject,
        provider: response.provider,
        provider_message_id: response.messageId,
        status: response.success ? "sent" : "failed",
        error_message: response.error || null,
        template_data: request.options,
      });
    } catch (error) {
      console.error("[EnhancedEmailService] Failed to log email:", error);
    }
  }

  /**
   * Queue email for retry
   */
  private async queueEmail(request: SendEmailRequest): Promise<string> {
    try {
      const recipient = Array.isArray(request.options.to)
        ? request.options.to[0]
        : request.options.to;

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", recipient.email)
        .single();

      const { data, error } = await supabase.rpc("queue_email", {
        p_recipient_id: profile?.id || null,
        p_recipient_email: recipient.email,
        p_email_type: request.emailType,
        p_template_name: `${request.emailType}-notification`,
        p_template_data: {
          subject: request.content.subject,
          html: request.content.html,
          text: request.content.text,
          ...request.options,
        },
      });

      if (error) throw error;

      return data || "queued";
    } catch (error) {
      console.error("[EnhancedEmailService] Failed to queue email:", error);
      return "queue-failed";
    }
  }

  /**
   * Update provider metrics
   */
  private updateMetrics(provider: EmailProvider, success: boolean, latency: number): void {
    const metrics = this.metrics.get(provider);
    if (!metrics) return;

    const newTotalRequests = metrics.totalRequests + 1;
    const newSuccessCount = success ? metrics.successCount + 1 : metrics.successCount;
    const newFailureCount = success ? metrics.failureCount : metrics.failureCount + 1;

    // Calculate rolling average latency
    const newAverageLatency =
      (metrics.averageLatency * metrics.totalRequests + latency) / newTotalRequests;

    this.metrics.set(provider, {
      totalRequests: newTotalRequests,
      successCount: newSuccessCount,
      failureCount: newFailureCount,
      averageLatency: newAverageLatency,
      lastUsed: Date.now(),
    });
  }

  /**
   * Get provider metrics for monitoring
   */
  getProviderMetrics() {
    const metrics: Record<EmailProvider, ProviderMetrics & { successRate: number }> = {} as any;

    for (const [provider, data] of this.metrics.entries()) {
      const successRate = data.totalRequests > 0 ? data.successCount / data.totalRequests : 0;

      metrics[provider] = {
        ...data,
        successRate,
      };
    }

    return metrics;
  }

  /**
   * Get health status for all providers
   */
  async getHealthStatus() {
    const circuitStatus = emailCircuitBreaker.getAllStatus();
    const metrics = this.getProviderMetrics();

    const health: Record<
      EmailProvider,
      {
        isHealthy: boolean;
        circuitState: string;
        recentFailures: number;
        successRate: number;
        averageLatency: number;
        isAvailable: boolean;
      }
    > = {} as any;

    for (const [provider, circuitData] of circuitStatus.entries()) {
      const providerMetrics = metrics[provider];
      const providerInstance = this.providers.get(provider);
      const isAvailable = providerInstance ? await providerInstance.isAvailable() : false;

      health[provider] = {
        isHealthy: circuitData.state === "closed",
        circuitState: circuitData.state,
        recentFailures: circuitData.failures,
        successRate: providerMetrics?.successRate || 0,
        averageLatency: providerMetrics?.averageLatency || 0,
        isAvailable,
      };
    }

    return health;
  }

  /**
   * Admin: Manually reset provider circuit breaker
   */
  resetProvider(provider: EmailProvider): void {
    emailCircuitBreaker.reset(provider);
  }

  /**
   * Admin: Manually disable provider
   */
  disableProvider(provider: EmailProvider, durationMs: number = 3600000): void {
    emailCircuitBreaker.disable(provider, durationMs);
  }

  /**
   * Get quota status for all providers
   */
  async getQuotaStatus() {
    const quotas = await Promise.all(
      Array.from(this.providers.values()).map((provider) => provider.getQuota())
    );

    return quotas.reduce(
      (acc, quota) => {
        acc[quota.provider] = quota;
        return acc;
      },
      {} as Record<EmailProvider, any>
    );
  }
}

/**
 * Create enhanced email service singleton
 *
 * SECURITY: This function MUST only be called server-side.
 * Never expose this to client code or API keys will leak to browsers.
 *
 * Use server-side API routes (src/app/api/*) to send emails instead.
 */
export function createEnhancedEmailService(): EnhancedEmailService {
  // Validate we're running server-side only
  if (typeof window !== "undefined") {
    throw new Error(
      "SECURITY ERROR: createEnhancedEmailService() called in browser context. " +
        "This would expose API keys. Use /api/send-email endpoint instead."
    );
  }

  // SECURITY FIX: Removed all NEXT_PUBLIC_ prefixes
  // Only use server-side environment variables
  const config = {
    resend: {
      apiKey: process.env.RESEND_API_KEY || "",
      fromEmail: process.env.EMAIL_FROM || "noreply@foodshare.app",
      fromName: process.env.EMAIL_FROM_NAME || "FoodShare",
    },
    brevo: {
      apiKey: process.env.BREVO_API_KEY || "",
      fromEmail: process.env.EMAIL_FROM || "noreply@foodshare.app",
      fromName: process.env.EMAIL_FROM_NAME || "FoodShare",
      smtpHost: process.env.BREVO_SMTP_HOST || "smtp-relay.brevo.com",
      smtpPort: Number(process.env.BREVO_SMTP_PORT) || 587,
      smtpUser: process.env.BREVO_SMTP_USER || "",
    },
    awsSes: {
      apiKey: "",
      fromEmail: process.env.EMAIL_FROM || "noreply@foodshare.app",
      fromName: process.env.EMAIL_FROM_NAME || "FoodShare",
      region: process.env.AWS_REGION || "us-east-1",
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    },
    useSmartRouting: true,
    enableCircuitBreaker: true,
    enableMetrics: true,
  };

  // Validate critical API keys are present
  if (!config.resend.apiKey && !config.brevo.apiKey && !config.awsSes.accessKeyId) {
    console.warn(
      "[EmailService] No email provider API keys configured. " +
        "Set RESEND_API_KEY, BREVO_API_KEY, or AWS credentials in environment variables."
    );
  }

  return new EnhancedEmailService(config);
}
