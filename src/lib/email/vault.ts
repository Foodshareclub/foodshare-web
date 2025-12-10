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

import { createClient } from "@/lib/supabase/server";

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
 * Get a single secret from Vault or environment
 * @internal Used by getEmailSecrets for batch fetching
 */
async function _getSecretFromVault(
  supabase: Awaited<ReturnType<typeof createClient>>,
  secretName: string
): Promise<string | null> {
  // Check environment variable first (for local dev)
  const envValue = process.env[secretName];
  if (envValue) {
    return envValue;
  }

  try {
    const { data, error } = await supabase.rpc("get_secrets", {
      secret_names: [secretName],
    });

    if (error || !data || data.length === 0) {
      console.warn(`[Vault] Failed to fetch ${secretName}:`, error?.message);
      return null;
    }

    const secret = (data as VaultSecret[]).find((s) => s.name === secretName);
    return secret?.value ?? null;
  } catch (err) {
    console.error(`[Vault] Error fetching ${secretName}:`, err);
    return null;
  }
}

/**
 * Get all email secrets from Vault (with caching)
 */
export async function getEmailSecrets(): Promise<EmailSecrets> {
  // Check cache first
  if (secretsCache && Date.now() < cacheExpiry) {
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
    secretsCache = envSecrets;
    cacheExpiry = Date.now() + CACHE_TTL;
    return envSecrets;
  }

  // Fetch from Supabase Vault
  try {
    const supabase = await createClient();

    // Batch fetch all secrets
    const { data, error } = await supabase.rpc("get_secrets", {
      secret_names: Object.values(SECRET_NAMES),
    });

    if (error) {
      console.error("[Vault] Failed to fetch email secrets:", error.message);
      return envSecrets; // Return env fallback
    }

    const secretsMap = new Map((data as VaultSecret[])?.map((s) => [s.name, s.value]) ?? []);

    const secrets: EmailSecrets = {
      resendApiKey: secretsMap.get(SECRET_NAMES.RESEND_API_KEY) ?? null,
      brevoApiKey: secretsMap.get(SECRET_NAMES.BREVO_API_KEY) ?? null,
      awsAccessKeyId: secretsMap.get(SECRET_NAMES.AWS_ACCESS_KEY_ID) ?? null,
      awsSecretAccessKey: secretsMap.get(SECRET_NAMES.AWS_SECRET_ACCESS_KEY) ?? null,
      awsRegion: process.env.AWS_REGION ?? "us-east-1",
    };

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
