import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const envCheck = {
    hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    serviceRoleKeyLength: process.env.SUPABASE_SERVICE_ROLE_KEY?.length ?? 0,
    serviceRoleKeyPrefix: process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 30) ?? "NOT_SET",
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV ?? "not-vercel",
  };

  // Try to get secrets from vault
  let vaultResult: unknown = null;
  let vaultError: string | null = null;

  try {
    const { getEmailSecrets, clearSecretsCache } = await import("@/lib/email/vault");
    clearSecretsCache(); // Force fresh fetch
    const secrets = await getEmailSecrets();
    vaultResult = {
      hasResend: !!secrets.resendApiKey,
      resendLength: secrets.resendApiKey?.length ?? 0,
      resendPrefix: secrets.resendApiKey?.slice(0, 8) ?? "NOT_SET",
      hasBrevo: !!secrets.brevoApiKey,
      hasAws: !!secrets.awsAccessKeyId,
    };
  } catch (err) {
    vaultError = err instanceof Error ? err.message : String(err);
  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    envCheck,
    vaultResult,
    vaultError,
  });
}
