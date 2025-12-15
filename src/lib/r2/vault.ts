/**
 * R2 Secrets Vault Service
 *
 * Fetches Cloudflare R2 credentials from Supabase Vault.
 * Falls back to environment variables for local development.
 *
 * Secrets stored in Vault:
 * - R2_ACCOUNT_ID
 * - R2_ACCESS_KEY_ID
 * - R2_SECRET_ACCESS_KEY
 * - R2_BUCKET_NAME
 */

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Types
interface VaultSecret {
  name: string;
  value: string;
}

export interface R2Secrets {
  accountId: string | null;
  accessKeyId: string | null;
  secretAccessKey: string | null;
  bucketName: string;
  publicUrl: string;
}

// Cache configuration
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// In-memory cache
let secretsCache: R2Secrets | null = null;
let cacheExpiry = 0;

// Secret names in Vault
const SECRET_NAMES = {
  R2_ACCOUNT_ID: "R2_ACCOUNT_ID",
  R2_ACCESS_KEY_ID: "R2_ACCESS_KEY_ID",
  R2_SECRET_ACCESS_KEY: "R2_SECRET_ACCESS_KEY",
  R2_BUCKET_NAME: "R2_BUCKET_NAME",
  R2_PUBLIC_URL: "R2_PUBLIC_URL",
} as const;

/** Mask a secret for safe logging */
function maskSecret(secret: string | null): string {
  if (!secret) return "null";
  if (secret.length <= 12) return "***";
  return `${secret.slice(0, 6)}...${secret.slice(-4)}`;
}

/**
 * Create a service role client for vault access
 */
function createServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
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
 * Get R2 secrets from Vault (with caching)
 */
export async function getR2Secrets(): Promise<R2Secrets> {
  // Check cache first
  if (secretsCache && Date.now() < cacheExpiry) {
    return secretsCache;
  }

  // Public URL is always from env (not sensitive)
  const publicUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || "";

  // Default empty secrets
  const emptySecrets: R2Secrets = {
    accountId: null,
    accessKeyId: null,
    secretAccessKey: null,
    bucketName: "foodshare",
    publicUrl,
  };

  // In development, use env vars directly
  if (process.env.NODE_ENV === "development") {
    const envSecrets: R2Secrets = {
      accountId: process.env.R2_ACCOUNT_ID || null,
      accessKeyId: process.env.R2_ACCESS_KEY_ID || null,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || null,
      bucketName: process.env.R2_BUCKET_NAME || "foodshare",
      publicUrl: process.env.NEXT_PUBLIC_R2_PUBLIC_URL || publicUrl,
    };

    if (envSecrets.accountId && envSecrets.accessKeyId && envSecrets.secretAccessKey) {
      console.info("[R2 Vault] ✅ DEV MODE - Using environment variables");
      secretsCache = envSecrets;
      cacheExpiry = Date.now() + CACHE_TTL;
      return envSecrets;
    }
  }

  // Fetch from Supabase Vault
  try {
    const supabase = createServiceRoleClient();

    if (!supabase) {
      console.warn("[R2 Vault] ⚠️ No service role client - using env vars");
      return {
        accountId: process.env.R2_ACCOUNT_ID || null,
        accessKeyId: process.env.R2_ACCESS_KEY_ID || null,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || null,
        bucketName: process.env.R2_BUCKET_NAME || "foodshare",
        publicUrl,
      };
    }

    const { data, error } = await supabase.rpc("get_secrets", {
      secret_names: Object.values(SECRET_NAMES),
    });

    if (error || !data || !Array.isArray(data)) {
      console.error("[R2 Vault] ❌ Failed to fetch secrets:", error?.message);
      return emptySecrets;
    }

    const secretsMap = new Map((data as VaultSecret[]).map((s) => [s.name, s.value]));

    const secrets: R2Secrets = {
      accountId: secretsMap.get(SECRET_NAMES.R2_ACCOUNT_ID) || null,
      accessKeyId: secretsMap.get(SECRET_NAMES.R2_ACCESS_KEY_ID) || null,
      secretAccessKey: secretsMap.get(SECRET_NAMES.R2_SECRET_ACCESS_KEY) || null,
      bucketName: secretsMap.get(SECRET_NAMES.R2_BUCKET_NAME) || "foodshare",
      publicUrl: secretsMap.get(SECRET_NAMES.R2_PUBLIC_URL) || publicUrl,
    };

    console.info("[R2 Vault] ✅ Retrieved R2 secrets:", {
      accountId: maskSecret(secrets.accountId),
      accessKeyId: maskSecret(secrets.accessKeyId),
      hasSecretKey: !!secrets.secretAccessKey,
      bucketName: secrets.bucketName,
    });

    secretsCache = secrets;
    cacheExpiry = Date.now() + CACHE_TTL;
    return secrets;
  } catch (err) {
    console.error("[R2 Vault] ❌ Exception:", err);
    return emptySecrets;
  }
}

/**
 * Clear the R2 secrets cache
 */
export function clearR2SecretsCache(): void {
  secretsCache = null;
  cacheExpiry = 0;
}
