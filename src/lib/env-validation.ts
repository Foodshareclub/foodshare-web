/**
 * Environment Variable Validation
 *
 * Validates all required environment variables on server startup.
 * Uses Zod for type-safe validation with clear error messages.
 *
 * @example
 * // In instrumentation.ts or layout.tsx
 * import { validateEnv } from "@/lib/env-validation";
 * validateEnv(); // Throws if required vars are missing
 */

import { z } from "zod";

// ============================================================================
// Schema Definitions
// ============================================================================

/**
 * Server-side environment variables (not exposed to client)
 */
const serverEnvSchema = z.object({
  // Supabase [REQUIRED]
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "SUPABASE_SERVICE_ROLE_KEY is required"),

  // Upstash Redis (optional but recommended)
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  // Upstash Vector (optional)
  UPSTASH_VECTOR_REST_URL: z.string().url().optional(),
  UPSTASH_VECTOR_REST_TOKEN: z.string().optional(),

  // Upstash KV (optional)
  KV_REST_API_URL: z.string().url().optional(),
  KV_REST_API_TOKEN: z.string().optional(),

  // QStash (optional)
  QSTASH_TOKEN: z.string().optional(),
  QSTASH_CURRENT_SIGNING_KEY: z.string().optional(),
  QSTASH_NEXT_SIGNING_KEY: z.string().optional(),

  // Cloudflare R2 (optional)
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_NAME: z.string().optional(),

  // Email providers (at least one recommended)
  EMAIL_FROM: z.string().email().optional(),
  EMAIL_FROM_NAME: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  BREVO_API_KEY: z.string().optional(),
  MAILERSEND_API_KEY: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().optional(),

  // AI Services (optional)
  XAI_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  AI_GATEWAY_API_KEY: z.string().optional(),
  MOTHERDUCK_TOKEN: z.string().optional(),

  // Sentry (optional but recommended for production)
  SENTRY_ORG: z.string().optional(),
  SENTRY_PROJECT: z.string().optional(),
  SENTRY_AUTH_TOKEN: z.string().optional(),

  // Trigger.dev (optional)
  TRIGGER_SECRET_KEY: z.string().optional(),

  // Node environment
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).optional(),
});

/**
 * Client-side environment variables (exposed via NEXT_PUBLIC_)
 */
const clientEnvSchema = z.object({
  // Supabase [REQUIRED]
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY is required"),

  // Application URLs [REQUIRED for production]
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  NEXT_PUBLIC_SITE_URL: z.string().url().optional(),

  // Email
  NEXT_PUBLIC_EMAIL_FROM: z.string().email().optional(),
  NEXT_PUBLIC_EMAIL_FROM_NAME: z.string().optional(),

  // R2 Public URL
  NEXT_PUBLIC_R2_PUBLIC_URL: z.string().url().optional(),

  // Sentry
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),

  // Analytics
  NEXT_PUBLIC_GA_MEASUREMENT_ID: z.string().optional(),
});

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate server environment variables
 * Call this on server startup
 */
export function validateServerEnv(): z.infer<typeof serverEnvSchema> {
  const result = serverEnvSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    const errorMessages = Object.entries(errors)
      .map(([field, messages]) => `  ${field}: ${messages?.join(", ")}`)
      .join("\n");

    console.error(`\n❌ Invalid server environment variables:\n${errorMessages}\n`);
    throw new Error("Invalid server environment configuration");
  }

  return result.data;
}

/**
 * Validate client environment variables
 */
export function validateClientEnv(): z.infer<typeof clientEnvSchema> {
  const result = clientEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_EMAIL_FROM: process.env.NEXT_PUBLIC_EMAIL_FROM,
    NEXT_PUBLIC_EMAIL_FROM_NAME: process.env.NEXT_PUBLIC_EMAIL_FROM_NAME,
    NEXT_PUBLIC_R2_PUBLIC_URL: process.env.NEXT_PUBLIC_R2_PUBLIC_URL,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
    NEXT_PUBLIC_GA_MEASUREMENT_ID: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID,
  });

  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    const errorMessages = Object.entries(errors)
      .map(([field, messages]) => `  ${field}: ${messages?.join(", ")}`)
      .join("\n");

    console.error(`\n❌ Invalid client environment variables:\n${errorMessages}\n`);
    throw new Error("Invalid client environment configuration");
  }

  return result.data;
}

/**
 * Validate all environment variables
 * Call this in instrumentation.ts or server startup
 */
export function validateEnv(): {
  server: z.infer<typeof serverEnvSchema>;
  client: z.infer<typeof clientEnvSchema>;
} {
  return {
    server: validateServerEnv(),
    client: validateClientEnv(),
  };
}

// ============================================================================
// Type-Safe Environment Access
// ============================================================================

/**
 * Type-safe server environment
 * Use this instead of process.env for type safety
 */
export const serverEnv = {
  get supabaseServiceKey() {
    return process.env.SUPABASE_SERVICE_ROLE_KEY!;
  },
  get upstashRedisUrl() {
    return process.env.UPSTASH_REDIS_REST_URL;
  },
  get upstashRedisToken() {
    return process.env.UPSTASH_REDIS_REST_TOKEN;
  },
  get nodeEnv() {
    return (process.env.NODE_ENV || "development") as "development" | "production" | "test";
  },
  get isProduction() {
    return process.env.NODE_ENV === "production";
  },
  get isDevelopment() {
    return process.env.NODE_ENV === "development";
  },
};

/**
 * Type-safe client environment
 */
export const clientEnv = {
  get supabaseUrl() {
    return process.env.NEXT_PUBLIC_SUPABASE_URL!;
  },
  get supabaseAnonKey() {
    return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  },
  get appUrl() {
    return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  },
  get siteUrl() {
    return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  },
  get sentryDsn() {
    return process.env.NEXT_PUBLIC_SENTRY_DSN;
  },
};

// ============================================================================
// Feature Detection
// ============================================================================

/**
 * Check which services are configured
 */
export function getConfiguredServices(): {
  redis: boolean;
  vector: boolean;
  kv: boolean;
  qstash: boolean;
  r2: boolean;
  resend: boolean;
  brevo: boolean;
  mailersend: boolean;
  awsSes: boolean;
  openai: boolean;
  xai: boolean;
  sentry: boolean;
  analytics: boolean;
} {
  return {
    redis: !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN),
    vector: !!(process.env.UPSTASH_VECTOR_REST_URL && process.env.UPSTASH_VECTOR_REST_TOKEN),
    kv: !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN),
    qstash: !!process.env.QSTASH_TOKEN,
    r2: !!(process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID),
    resend: !!process.env.RESEND_API_KEY,
    brevo: !!process.env.BREVO_API_KEY,
    mailersend: !!process.env.MAILERSEND_API_KEY,
    awsSes: !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY),
    openai: !!process.env.OPENAI_API_KEY,
    xai: !!process.env.XAI_API_KEY,
    sentry: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
    analytics: !!process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID,
  };
}

/**
 * Log configured services on startup (for debugging)
 */
export function logConfiguredServices(): void {
  const services = getConfiguredServices();
  const configured = Object.entries(services)
    .filter(([, enabled]) => enabled)
    .map(([name]) => name);

  console.info(
    `\n✅ Configured services: ${configured.length > 0 ? configured.join(", ") : "none"}\n`
  );
}
