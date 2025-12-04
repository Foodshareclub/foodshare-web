/**
 * Email Provider Health API
 * Backend endpoints for provider health monitoring and management
 */

import { createEnhancedEmailService } from "@/lib/email/enhanced-service";
import { emailCircuitBreaker } from "@/lib/email/circuit-breaker";
import {
  resetCircuitBreakerDB,
  getProviderHealthSummary,
  getRecentHealthEvents,
} from "@/lib/email/circuit-breaker-db";
import type { EmailProvider } from "@/lib/email/types";

let emailService: ReturnType<typeof createEnhancedEmailService> | null = null;

/**
 * Get or create email service singleton
 */
function getEmailService() {
  if (!emailService) {
    emailService = createEnhancedEmailService();
  }
  return emailService;
}

/**
 * Get comprehensive health status for all providers
 */
export async function getProviderHealth() {
  try {
    const service = getEmailService();
    const health = await service.getHealthStatus();

    return {
      success: true,
      health,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("[EmailHealth] Failed to get health status:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get provider performance metrics
 */
export async function getProviderMetrics() {
  try {
    const service = getEmailService();
    const metrics = service.getProviderMetrics();

    return {
      success: true,
      metrics,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("[EmailHealth] Failed to get metrics:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get circuit breaker status for all providers
 */
export function getCircuitBreakerStatus() {
  try {
    const healthMetrics = emailCircuitBreaker.getHealthMetrics();

    return {
      success: true,
      circuitBreakers: healthMetrics,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("[EmailHealth] Failed to get circuit breaker status:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Reset provider circuit breaker (admin action)
 */
export async function resetProviderCircuit(provider: EmailProvider) {
  try {
    // Reset in database (this also resets in-memory state)
    const result = await resetCircuitBreakerDB(provider);

    if (!result.success) {
      throw new Error(result.error);
    }

    return {
      success: true,
      message: `Circuit breaker reset for ${provider}`,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("[EmailHealth] Failed to reset circuit:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Disable provider (admin action)
 */
export function disableProvider(provider: EmailProvider, durationMs: number = 3600000) {
  try {
    const service = getEmailService();
    service.disableProvider(provider, durationMs);

    const durationMinutes = Math.round(durationMs / 60000);

    return {
      success: true,
      message: `${provider} disabled for ${durationMinutes} minutes`,
      timestamp: new Date().toISOString(),
      expiresAt: new Date(Date.now() + durationMs).toISOString(),
    };
  } catch (error) {
    console.error("[EmailHealth] Failed to disable provider:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Test provider connectivity and configuration
 */
export async function testProvider(provider: EmailProvider) {
  try {
    const service = getEmailService();
    const quotaStatus = await service.getQuotaStatus();
    const providerQuota = quotaStatus[provider];

    if (!providerQuota) {
      throw new Error(`Provider ${provider} not found`);
    }

    // Check if provider is configured
    const isConfigured = providerQuota.dailyLimit > 0;

    // Check circuit breaker status
    const circuitStatus = emailCircuitBreaker.getStatus(provider);
    const isCircuitClosed = circuitStatus?.state === "closed";

    return {
      success: true,
      provider,
      isConfigured,
      isCircuitClosed,
      hasQuota: providerQuota.remaining > 0,
      quota: {
        used: providerQuota.emailsSent,
        limit: providerQuota.dailyLimit,
        remaining: providerQuota.remaining,
      },
      circuitState: circuitStatus?.state || "unknown",
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("[EmailHealth] Failed to test provider:", error);
    return {
      success: false,
      provider,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get provider health summary from database
 */
export async function getProviderHealthSummaryDB() {
  try {
    const summary = await getProviderHealthSummary();

    if (!summary) {
      throw new Error("Failed to fetch health summary from database");
    }

    return {
      success: true,
      summary,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("[EmailHealth] Failed to get health summary:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get recent health events from database
 */
export async function getHealthEvents(limit: number = 50) {
  try {
    const events = await getRecentHealthEvents(limit);

    return {
      success: true,
      events,
      count: events.length,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("[EmailHealth] Failed to get health events:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get comprehensive system status for dashboard
 */
export async function getSystemStatus() {
  try {
    const service = getEmailService();

    const [health, metrics, quotaStatus, circuitStatus] = await Promise.all([
      service.getHealthStatus(),
      Promise.resolve(service.getProviderMetrics()),
      service.getQuotaStatus(),
      Promise.resolve(emailCircuitBreaker.getAllStatus()),
    ]);

    // Calculate overall system health
    const providers: EmailProvider[] = ["resend", "brevo", "aws_ses"];
    const healthyCount = providers.filter((p) => health[p]?.isHealthy).length;
    const totalProviders = providers.length;
    const systemHealthPercentage = (healthyCount / totalProviders) * 100;

    // Calculate total capacity
    const totalQuotaUsed = providers.reduce((sum, p) => sum + (quotaStatus[p]?.emailsSent || 0), 0);
    const totalQuotaLimit = providers.reduce(
      (sum, p) => sum + (quotaStatus[p]?.dailyLimit || 0),
      0
    );
    const totalQuotaRemaining = totalQuotaLimit - totalQuotaUsed;

    // Calculate average success rate
    const avgSuccessRate =
      providers.reduce((sum, p) => sum + (metrics[p]?.successRate || 0), 0) / totalProviders;

    return {
      success: true,
      system: {
        health: {
          percentage: systemHealthPercentage,
          healthyProviders: healthyCount,
          totalProviders,
          isHealthy: healthyCount >= 2, // At least 2 providers must be healthy
        },
        quota: {
          used: totalQuotaUsed,
          limit: totalQuotaLimit,
          remaining: totalQuotaRemaining,
          usagePercentage: (totalQuotaUsed / totalQuotaLimit) * 100,
        },
        performance: {
          avgSuccessRate,
          avgLatency:
            providers.reduce((sum, p) => sum + (metrics[p]?.averageLatency || 0), 0) /
            totalProviders,
        },
      },
      providers: {
        health,
        metrics,
        quotas: quotaStatus,
        circuits: Array.from(circuitStatus.entries()).reduce(
          (acc, [provider, status]) => {
            acc[provider] = status;
            return acc;
          },
          {} as Record<EmailProvider, any>
        ),
      },
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("[EmailHealth] Failed to get system status:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
