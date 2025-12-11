import { createClient as createSupabaseClient } from "@supabase/supabase-js";
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

  // Direct RPC call to debug
  let directRpcResult: unknown = null;
  let directRpcError: string | null = null;

  try {
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data, error } = await supabase.rpc("get_secrets", {
      secret_names: [
        "RESEND_API_KEY",
        "BREVO_API_KEY",
        "AWS_ACCESS_KEY_ID",
        "AWS_SECRET_ACCESS_KEY",
      ],
    });

    if (error) {
      directRpcError = JSON.stringify(error);
    } else {
      directRpcResult = {
        count: Array.isArray(data) ? data.length : 0,
        names: Array.isArray(data) ? data.map((s: { name: string }) => s.name) : [],
        hasResend:
          Array.isArray(data) && data.some((s: { name: string }) => s.name === "RESEND_API_KEY"),
      };
    }
  } catch (err) {
    directRpcError = err instanceof Error ? err.message : String(err);
  }

  // Try via vault module
  let vaultResult: unknown = null;
  let vaultError: string | null = null;

  try {
    const { getEmailSecrets, clearSecretsCache } = await import("@/lib/email/vault");
    clearSecretsCache();
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
    directRpcResult,
    directRpcError,
    vaultResult,
    vaultError,
  });
}
