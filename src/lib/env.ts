/**
 * Environment Variable Validation
 * Validates all required environment variables at startup
 * Prevents runtime errors from missing configuration
 *
 * @module lib/env
 */

import { z } from "zod";

/**
 * Server-side environment variables schema
 * These are only available on the server (not exposed to client)
 */
const serverEnvSchema = z.object({
  // Supabase (required)
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "SUPABASE_SERVICE_ROLE_KEY is required"),

  // Node environment
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

  // Email providers (at least one should be configured in production)
  RESEND_API_KEY: z.string().optional(),
  AWS_SES_ACCESS_KEY_ID: z.string().optional(),
  AWS_SES_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_SES_REGION: z.string().optional(),
  BREVO_API_KEY: z.string().optional(),

  // OpenAI (optional - for AI features)
  OPENAI_API_KEY: z.string().optional(),

  // Redis/Upstash (optional - for rate limiting)
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  // Analytics (optional)
  MOTHERDUCK_TOKEN: z.string().optional(),

  // Sentry (optional - for error tracking)
  SENTRY_DSN: z.string().url().optional(),
  SENTRY_ORG: z.string().optional(),
  SENTRY_PROJECT: z.string().optional(),
  SENTRY_AUTH_TOKEN: z.string().optional(),

  // Bot tokens (optional)
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  WHATSAPP_API_TOKEN: z.string().optional(),
});

/**
 * Client-side environment variables schema
 * These are exposed to the browser (NEXT_PUBLIC_ prefix)
 */
const clientEnvSchema = z.object({
  // Supabase (required)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY is required"),

  // App configuration
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  NEXT_PUBLIC_GOOGLE_ANALYTICS_ID: z.string().optional(),
});

/**
 * Combined environment schema
 */
const envSchema = serverEnvSchema.merge(clientEnvSchema);

/**
 * Type for validated environment
 */
export type Env = z.infer<typeof envSchema>;

/**
 * Validate environment variables
 * Call this at app startup to catch configuration errors early
 */
export function validateEnv(): { success: boolean; errors: string[] } {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.issues.map(
      (issue) => `${issue.path.join(".")}: ${issue.message}`
    );
    return { success: false, errors };
  }

  return { success: true, errors: [] };
}

/**
 * Get validated environment variables
 * Throws if validation fails
 */
export function getEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errorMessages = result.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");

    throw new Error(
      `Environment validation failed:\n${errorMessages}\n\nPlease check your .env file or environment configuration.`
    );
  }

  return result.data;
}

/**
 * Safe environment getter (doesn't throw)
 * Returns partial env with only valid values
 */
export function getSafeEnv(): Partial<Env> {
  const result = envSchema.safeParse(process.env);
  return result.success ? result.data : {};
}

/**
 * Check if a specific env var is configured
 */
export function hasEnvVar(key: keyof Env): boolean {
  return !!process.env[key];
}

/**
 * Check if email is configured (at least one provider)
 */
export function isEmailConfigured(): boolean {
  return !!(
    process.env.RESEND_API_KEY ||
    (process.env.AWS_SES_ACCESS_KEY_ID && process.env.AWS_SES_SECRET_ACCESS_KEY) ||
    process.env.BREVO_API_KEY
  );
}

/**
 * Check if analytics is configured
 */
export function isAnalyticsConfigured(): boolean {
  return !!process.env.MOTHERDUCK_TOKEN;
}

/**
 * Check if rate limiting is configured
 */
export function isRateLimitingConfigured(): boolean {
  return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

/**
 * Get environment name for display
 */
export function getEnvironmentName(): "development" | "production" | "test" {
  return (process.env.NODE_ENV as "development" | "production" | "test") || "development";
}
