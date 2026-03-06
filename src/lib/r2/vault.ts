/**
 * R2 Secrets Service
 *
 * Retrieves Cloudflare R2 credentials from environment variables.
 * In production, these are injected into `.env.production` during the deployment
 * process by fetching them from the backend's `supabase/functions/.env.functions`
 * and the database vault.
 */

// Types
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

/** Mask a secret for safe logging */
function maskSecret(secret: string | null): string {
  if (!secret) return "null";
  if (secret.length <= 12) return "***";
  return `${secret.slice(0, 6)}...${secret.slice(-4)}`;
}

/**
 * Get R2 secrets from environment variables (with caching)
 */
export async function getR2Secrets(): Promise<R2Secrets> {
  // Check cache first
  if (secretsCache && Date.now() < cacheExpiry) {
    return secretsCache;
  }

  // Public URL can come from env (NEXT_PUBLIC_ for client, R2_PUBLIC_URL for server)
  const publicUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || process.env.R2_PUBLIC_URL || "";

  const envSecrets: R2Secrets = {
    accountId: process.env.R2_ACCOUNT_ID || null,
    accessKeyId: process.env.R2_ACCESS_KEY_ID || null,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || null,
    bucketName: process.env.R2_BUCKET_NAME || "foodshare",
    publicUrl: process.env.NEXT_PUBLIC_R2_PUBLIC_URL || process.env.R2_PUBLIC_URL || publicUrl,
  };

  if (envSecrets.accountId && envSecrets.accessKeyId && envSecrets.secretAccessKey) {
    console.info(`[R2 Secrets] ✅ Using environment variables (Env: ${process.env.NODE_ENV ?? "production"}):`, {
      accountId: maskSecret(envSecrets.accountId),
      accessKeyId: maskSecret(envSecrets.accessKeyId),
      hasSecretKey: !!envSecrets.secretAccessKey,
      bucketName: envSecrets.bucketName,
      publicUrl: envSecrets.publicUrl ? `${envSecrets.publicUrl.slice(0, 30)}...` : "NOT SET",
    });
  } else {
    console.warn("[R2 Secrets] ⚠️ Missing R2 credentials in environment variables.");
  }

  secretsCache = envSecrets;
  cacheExpiry = Date.now() + CACHE_TTL;
  return envSecrets;
}

/**
 * Clear the R2 secrets cache
 */
export function clearR2SecretsCache(): void {
  secretsCache = null;
  cacheExpiry = 0;
}
