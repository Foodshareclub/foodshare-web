/**
 * Database Integration for Circuit Breaker
 * Syncs in-memory circuit breaker state with database for persistence
 */

import { supabase } from "@/lib/supabase/client";
import { emailCircuitBreaker } from "./circuit-breaker";
import type { EmailProvider } from "./types";
import { createLogger } from "@/lib/logger";

const logger = createLogger("CircuitBreakerDB");

/**
 * Load circuit breaker state from database on initialization
 */
export async function loadCircuitBreakerState() {
  try {
    const { data, error } = await supabase.from("email_circuit_breaker_state").select("*");

    if (error) {
      logger.error("Failed to load state", error);
      return;
    }

    if (!data || data.length === 0) {
      logger.debug("No persisted state found, using defaults");
      return;
    }

    // Restore state from database
    data.forEach((record) => {
      const provider = record.provider as EmailProvider;

      if (record.state === "open" && record.next_retry_time) {
        const nextRetryTime = new Date(record.next_retry_time).getTime();

        // Check if retry time has passed
        if (nextRetryTime > Date.now()) {
          // Still disabled, restore open state
          emailCircuitBreaker.disable(provider, nextRetryTime - Date.now());
          logger.warn(`Restored open circuit for ${provider}`, {
            until: new Date(nextRetryTime).toISOString(),
          });
        } else {
          // Retry time passed, transition to half-open
          logger.info(`${provider} circuit timeout passed, resetting to closed`);
          emailCircuitBreaker.reset(provider);
          void syncCircuitBreakerState(provider); // Sync back to DB
        }
      } else if (record.state === "half-open") {
        // For half-open, just reset to closed on restart for safety
        logger.info(`Resetting ${provider} from half-open to closed on startup`);
        emailCircuitBreaker.reset(provider);
        void syncCircuitBreakerState(provider);
      }
      // Closed state needs no special handling
    });

    logger.info("Circuit breaker state loaded successfully");
  } catch (error) {
    logger.error("Error loading state", error as Error);
  }
}

/**
 * Sync circuit breaker state to database
 */
export async function syncCircuitBreakerState(provider: EmailProvider) {
  try {
    const status = emailCircuitBreaker.getStatus(provider);
    if (!status) return;

    const { error } = await supabase.rpc("update_circuit_breaker_state", {
      p_provider: provider,
      p_state: status.state,
      p_failures: status.failures,
      p_consecutive_successes: status.consecutiveSuccesses,
      p_last_failure_time: status.lastFailureTime
        ? new Date(status.lastFailureTime).toISOString()
        : null,
      p_next_retry_time: status.nextRetryTime ? new Date(status.nextRetryTime).toISOString() : null,
    });

    if (error) {
      logger.error(`Failed to sync ${provider} state`, error);
    }
  } catch (error) {
    logger.error(`Error syncing ${provider} state`, error as Error);
  }
}

/**
 * Record provider failure in database
 */
export async function recordProviderFailure(
  provider: EmailProvider,
  errorMessage: string,
  metadata?: Record<string, any>
) {
  try {
    const { error } = await supabase.rpc("record_provider_failure", {
      p_provider: provider,
      p_error_message: errorMessage,
      p_metadata: metadata ? JSON.stringify(metadata) : null,
    });

    if (error) {
      logger.error(`Failed to record failure for ${provider}`, error);
    }
  } catch (error) {
    logger.error(`Error recording failure for ${provider}`, error as Error);
  }
}

/**
 * Record provider success in database
 */
export async function recordProviderSuccess(provider: EmailProvider) {
  try {
    const { error } = await supabase.rpc("record_provider_success", {
      p_provider: provider,
    });

    if (error) {
      logger.error(`Failed to record success for ${provider}`, error);
    }
  } catch (error) {
    logger.error(`Error recording success for ${provider}`, error as Error);
  }
}

/**
 * Record email metrics in database
 */
export async function recordEmailMetrics(
  provider: EmailProvider,
  success: boolean,
  latencyMs: number
) {
  try {
    const { error } = await supabase.rpc("record_email_metrics", {
      p_provider: provider,
      p_success: success,
      p_latency_ms: latencyMs,
    });

    if (error) {
      logger.error(`Failed to record metrics for ${provider}`, error);
    }
  } catch (error) {
    logger.error(`Error recording metrics for ${provider}`, error as Error);
  }
}

/**
 * Reset circuit breaker (admin action)
 */
export async function resetCircuitBreakerDB(provider: EmailProvider) {
  try {
    const { error } = await supabase.rpc("reset_circuit_breaker", {
      p_provider: provider,
    });

    if (error) {
      logger.error(`Failed to reset ${provider}`, error);
      return { success: false, error: error.message };
    }

    // Also reset in-memory state
    emailCircuitBreaker.reset(provider);

    return { success: true };
  } catch (error) {
    logger.error(`Error resetting ${provider}`, error as Error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get comprehensive health summary from database
 */
export async function getProviderHealthSummary() {
  try {
    const { data, error } = await supabase.rpc("get_provider_health_summary");

    if (error) {
      logger.error("Failed to get health summary", error);
      return null;
    }

    return data;
  } catch (error) {
    logger.error("Error getting health summary", error as Error);
    return null;
  }
}

/**
 * Get recent health events
 */
export async function getRecentHealthEvents(limit: number = 50) {
  try {
    const { data, error } = await supabase
      .from("email_health_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      logger.error("Failed to get health events", error);
      return [];
    }

    return data || [];
  } catch (error) {
    logger.error("Error getting health events", error as Error);
    return [];
  }
}

/**
 * Initialize circuit breaker with database persistence
 * Call this on application startup
 */
export async function initializeCircuitBreaker() {
  logger.info("Initializing circuit breaker with database persistence...");

  // Load persisted state
  await loadCircuitBreakerState();

  // Set up periodic sync (every 30 seconds)
  setInterval(() => {
    const providers: EmailProvider[] = ["resend", "brevo", "aws_ses"];
    providers.forEach((provider) => {
      void syncCircuitBreakerState(provider);
    });
  }, 30000);

  logger.info("Circuit breaker initialized with periodic sync");
}
