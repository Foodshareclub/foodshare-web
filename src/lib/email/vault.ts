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

/**
 * Create a service role client for vault access
 * Vault secrets should only be accessed server-side with elevated privileges
 */
function createServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("[Vault] Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL");
    return null;
  }

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
  // Check cache first
  if (secretsCache && Date.now() < cacheExpiry) {
    console.log("[Vault] Returning cached secrets");
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
    console.log("[Vault] Using environment secrets");
    secretsCache = envSecrets;
    cacheExpiry = Date.now() + CACHE_TTL;
    return envSecrets;
  }

  // Fetch from Supabase Vault using service role client
  try {
    const supabase = createServiceRoleClient();

    if (!supabase) {
      console.error("[Vault] Could not create service role client");
      return envSecrets;
    }

    console.log("[Vault] Fetching secrets from vault...");

    // Batch fetch all secrets
    const { data, error } = await supabase.rpc("get_secrets", {
      secret_names: Object.values(SECRET_NAMES),
    });

    if (error) {
      console.error("[Vault] RPC error:", error.message, error.code, error.details);
      return envSecrets; // Return env fallback
    }

    if (!data || !Array.isArray(data)) {
      console.error("[Vault] No data returned from get_secrets, data:", data);
      return envSecrets;
    }

    console.log("[Vault] Retrieved", data.length, "secrets from vault");

    const secretsMap = new Map((data as VaultSecret[]).map((s) => [s.name, s.value]));

    const secrets: EmailSecrets = {
      resendApiKey: secretsMap.get(SECRET_NAMES.RESEND_API_KEY) ?? null,
      brevoApiKey: secretsMap.get(SECRET_NAMES.BREVO_API_KEY) ?? null,
      awsAccessKeyId: secretsMap.get(SECRET_NAMES.AWS_ACCESS_KEY_ID) ?? null,
      awsSecretAccessKey: secretsMap.get(SECRET_NAMES.AWS_SECRET_ACCESS_KEY) ?? null,
      awsRegion: process.env.AWS_REGION ?? "us-east-1",
    };

    console.log("[Vault] Secrets loaded:", {
      hasResend: !!secrets.resendApiKey,
      hasBrevo: !!secrets.brevoApiKey,
      hasAws: !!secrets.awsAccessKeyId,
    });

    // Cache the secrets
    secretsCache = secrets;
    cacheExpiry = Date.now() + CACHE_TTL;

    return secrets;
  } catch (err) {
    console.error("[Vault] Error fetching email secrets:", err);
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
