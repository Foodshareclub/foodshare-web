/**
 * Email Secrets Vault Service
 *
 * Fetches email provider credentials from Supabase Vault.
 * Falls back to environment variables for local development.
 *
 * Secrets stored in Vault:
 * - RESEND_API_KEY
 * - BREVO_API_KEY
 * - AWS_ACCESS_KEY_ID
 * - AWS_SECRET_ACCESS_KEY
 */

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Types
interface VaultSecret {
  name: string;
  value: string;
}

interface EmailSecrets {
  resendApiKey: string | null;
  brevoApiKey: string | null;
  awsAccessKeyId: string | null;
  awsSecretAccessKey: string | null;
  awsRegion: string;
}

// Cache configuration
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// In-memory cache for secrets
let secretsCache: EmailSecrets | null = null;
let cacheExpiry = 0;

// Secret names in Vault
const SECRET_NAMES = {
  RESEND_API_KEY: "RESEND_API_KEY",
  BREVO_API_KEY: "BREVO_API_KEY",
  AWS_ACCESS_KEY_ID: "AWS_ACCESS_KEY_ID",
  AWS_SECRET_ACCESS_KEY: "AWS_SECRET_ACCESS_KEY",
} as const;

/** Mask a secret for safe logging (show first 6 and last 4 chars) */
function maskSecret(secret: string | null): string {
  if (!secret) return "null";
  if (secret.length <= 12) return "***";
  return `${secret.slice(0, 6)}...${secret.slice(-4)} (${secret.length} chars)`;
}

/**
 * Create a service role client for vault access
 * Vault secrets should only be accessed server-side with elevated privileges
 */
function createServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.info("[Vault] 🔧 Environment check:", {
    hasSupabaseUrl: !!supabaseUrl,
    hasServiceRoleKey: !!serviceRoleKey,
    serviceRoleKeyLength: serviceRoleKey?.length ?? 0,
    serviceRoleKeyPrefix: serviceRoleKey?.slice(0, 20) ?? "NOT_SET",
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV ?? "not-vercel",
  });

  if (!supabaseUrl) {
    console.error("[Vault] ❌ Missing NEXT_PUBLIC_SUPABASE_URL");
    return null;
  }

  if (!serviceRoleKey) {
    console.error("[Vault] ❌ Missing SUPABASE_SERVICE_ROLE_KEY - vault access disabled");
    console.error(
      "[Vault] 💡 Add SUPABASE_SERVICE_ROLE_KEY to Vercel env vars, or add RESEND_API_KEY directly"
    );
    return null;
  }

  console.info("[Vault] ✅ Creating service role client for:", supabaseUrl);

  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Get all email secrets from Vault (with caching)
 */
export async function getEmailSecrets(): Promise<EmailSecrets> {
  const startTime = Date.now();

  // Check cache first
  if (secretsCache && Date.now() < cacheExpiry) {
    const ttlRemaining = Math.round((cacheExpiry - Date.now()) / 1000);
    console.info(`[Vault] ✅ Cache hit (TTL: ${ttlRemaining}s remaining)`);
    return secretsCache;
  }

  // Check if all secrets are in environment (local dev shortcut)
  const envSecrets: EmailSecrets = {
    resendApiKey: process.env.RESEND_API_KEY ?? null,
    brevoApiKey: process.env.BREVO_API_KEY ?? null,
    awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID ?? null,
    awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? null,
    awsRegion: process.env.AWS_REGION ?? "us-east-1",
  };

  // If any provider is configured via env, use env-only mode
  const hasEnvSecrets =
    envSecrets.resendApiKey || envSecrets.brevoApiKey || envSecrets.awsAccessKeyId;

  if (hasEnvSecrets) {
    console.info("[Vault] ✅ Using environment variables:", {
      resend: maskSecret(envSecrets.resendApiKey),
      brevo: maskSecret(envSecrets.brevoApiKey),
      aws: maskSecret(envSecrets.awsAccessKeyId),
    });
    secretsCache = envSecrets;
    cacheExpiry = Date.now() + CACHE_TTL;
    return envSecrets;
  }

  // Fetch from Supabase Vault using service role client
  console.info("[Vault] 🔐 No env secrets found, fetching from Supabase Vault...");

  try {
    const supabase = createServiceRoleClient();

    if (!supabase) {
      console.error("[Vault] ❌ Failed to create service role client - returning empty secrets");
      return envSecrets;
    }

    // Batch fetch all secrets
    const { data, error } = await supabase.rpc("get_secrets", {
      secret_names: Object.values(SECRET_NAMES),
    });

    const duration = Date.now() - startTime;

    if (error) {
      console.error("[Vault] ❌ RPC get_secrets failed:", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        duration: `${duration}ms`,
      });
      return envSecrets;
    }

    if (!data || !Array.isArray(data)) {
      console.error("[Vault] ❌ Invalid response from get_secrets:", {
        dataType: typeof data,
        isArray: Array.isArray(data),
        data: data,
        duration: `${duration}ms`,
      });
      return envSecrets;
    }

    // Log which secrets were found
    const foundSecrets = (data as VaultSecret[]).map((s) => s.name);
    const missingSecrets = Object.values(SECRET_NAMES).filter((n) => !foundSecrets.includes(n));

    console.info(`[Vault] ✅ Retrieved ${data.length} secrets in ${duration}ms:`, {
      found: foundSecrets,
      missing: missingSecrets.length > 0 ? missingSecrets : "none",
    });

    const secretsMap = new Map((data as VaultSecret[]).map((s) => [s.name, s.value]));

    const secrets: EmailSecrets = {
      resendApiKey: secretsMap.get(SECRET_NAMES.RESEND_API_KEY) ?? null,
      brevoApiKey: secretsMap.get(SECRET_NAMES.BREVO_API_KEY) ?? null,
      awsAccessKeyId: secretsMap.get(SECRET_NAMES.AWS_ACCESS_KEY_ID) ?? null,
      awsSecretAccessKey: secretsMap.get(SECRET_NAMES.AWS_SECRET_ACCESS_KEY) ?? null,
      awsRegion: process.env.AWS_REGION ?? "us-east-1",
    };

    // Log masked values for debugging
    console.info("[Vault] 🔑 Secret values:", {
      resend: maskSecret(secrets.resendApiKey),
      brevo: maskSecret(secrets.brevoApiKey),
      awsKey: maskSecret(secrets.awsAccessKeyId),
    });

    // Cache the secrets
    secretsCache = secrets;
    cacheExpiry = Date.now() + CACHE_TTL;
    console.info(`[Vault] 💾 Cached secrets for ${CACHE_TTL / 1000}s`);

    return secrets;
  } catch (err) {
    const duration = Date.now() - startTime;
    console.error("[Vault] ❌ Exception fetching secrets:", {
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
      duration: `${duration}ms`,
    });
    return envSecrets;
  }
}

/**
 * Get Resend API key specifically
 */
export async function getResendApiKey(): Promise<string | null> {
  const secrets = await getEmailSecrets();
  return secrets.resendApiKey;
}

/**
 * Get Brevo API key specifically
 */
export async function getBrevoApiKey(): Promise<string | null> {
  const secrets = await getEmailSecrets();
  return secrets.brevoApiKey;
}

/**
 * Get AWS credentials specifically
 */
export async function getAwsCredentials(): Promise<{
  accessKeyId: string | null;
  secretAccessKey: string | null;
  region: string;
}> {
  const secrets = await getEmailSecrets();
  return {
    accessKeyId: secrets.awsAccessKeyId,
    secretAccessKey: secrets.awsSecretAccessKey,
    region: secrets.awsRegion,
  };
}

/**
 * Clear the secrets cache (useful for testing or forced refresh)
 */
export function clearSecretsCache(): void {
  secretsCache = null;
  cacheExpiry = 0;
}

/**
 * Check which providers are configured
 */
export async function getConfiguredProviders(): Promise<{
  resend: boolean;
  brevo: boolean;
  awsSes: boolean;
}> {
  const secrets = await getEmailSecrets();
  return {
    resend: !!secrets.resendApiKey,
    brevo: !!secrets.brevoApiKey,
    awsSes: !!secrets.awsAccessKeyId && !!secrets.awsSecretAccessKey,
  };
}
