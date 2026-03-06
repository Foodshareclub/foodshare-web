/**
 * App Secrets Service
 *
 * Retrieves credentials and API keys from environment variables.
 * In production, these are injected into `.env.production` during the deployment
 * process by fetching them from the backend's `supabase/functions/.env.functions` 
 * and the database vault.
 */

// Types
export interface EmailSecrets {
  resendApiKey: string | null;
  brevoApiKey: string | null;
  mailersendApiKey: string | null;
  awsAccessKeyId: string | null;
  awsSecretAccessKey: string | null;
  awsRegion: string;
  motherDuckToken: string | null;
  facebookAppId: string | null;
}

// Cache configuration
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// In-memory cache for secrets
let secretsCache: EmailSecrets | null = null;
let cacheExpiry = 0;

/** Mask a secret for safe logging (show first 6 and last 4 chars) */
function maskSecret(secret: string | null): string {
  if (!secret) return "null";
  if (secret.length <= 12) return "***";
  return `${secret.slice(0, 6)}...${secret.slice(-4)} (${secret.length} chars)`;
}

/**
 * Get all email secrets from environment variables (with caching)
 */
export async function getEmailSecrets(): Promise<EmailSecrets> {
  // Check cache first
  if (secretsCache && Date.now() < cacheExpiry) {
    const ttlRemaining = Math.round((cacheExpiry - Date.now()) / 1000);
    console.info(`[Secrets] ✅ Cache hit (TTL: ${ttlRemaining}s remaining)`);
    return secretsCache;
  }

  const envSecrets: EmailSecrets = {
    resendApiKey: process.env.RESEND_API_KEY ?? null,
    brevoApiKey: process.env.BREVO_API_KEY ?? null,
    mailersendApiKey: process.env.MAILERSEND_API_KEY ?? null,
    awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID ?? null,
    awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? null,
    awsRegion: process.env.AWS_REGION ?? "us-east-1",
    motherDuckToken: process.env.MOTHERDUCK_TOKEN ?? null,
    facebookAppId: process.env.FACEBOOK_APP_ID ?? null,
  };

  const hasEnvSecrets =
    envSecrets.resendApiKey || envSecrets.brevoApiKey || envSecrets.mailersendApiKey || envSecrets.awsAccessKeyId;

  if (hasEnvSecrets) {
    console.info(`[Secrets] ✅ Using environment variables (Env: ${process.env.NODE_ENV ?? "production"}):`, {
      resend: maskSecret(envSecrets.resendApiKey),
      brevo: maskSecret(envSecrets.brevoApiKey),
      mailersend: maskSecret(envSecrets.mailersendApiKey),
      aws: maskSecret(envSecrets.awsAccessKeyId),
    });
  } else {
    console.warn("[Secrets] ⚠️ No secrets found in environment variables. Email features may fail.");
  }

  secretsCache = envSecrets;
  cacheExpiry = Date.now() + CACHE_TTL;
  return envSecrets;
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
 * Get MailerSend API key specifically
 */
export async function getMailerSendApiKey(): Promise<string | null> {
  const secrets = await getEmailSecrets();
  return secrets.mailersendApiKey;
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
 * Get MotherDuck Token specifically
 */
export async function getMotherDuckToken(): Promise<string | null> {
  const secrets = await getEmailSecrets();
  return secrets.motherDuckToken;
}

/**
 * Get Facebook App ID specifically
 */
export async function getFacebookAppId(): Promise<string | null> {
  const secrets = await getEmailSecrets();
  return secrets.facebookAppId;
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
  mailersend: boolean;
  awsSes: boolean;
}> {
  const secrets = await getEmailSecrets();
  return {
    resend: !!secrets.resendApiKey,
    brevo: !!secrets.brevoApiKey,
    mailersend: !!secrets.mailersendApiKey,
    awsSes: !!secrets.awsAccessKeyId && !!secrets.awsSecretAccessKey,
  };
}
