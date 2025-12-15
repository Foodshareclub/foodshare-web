/**
 * Cloudflare R2 Storage Client
 * S3-compatible object storage with zero egress fees
 *
 * Uses AWS Signature V4 for authentication (no SDK dependency)
 * Credentials fetched from Supabase Vault in production
 */

import { getR2Secrets, type R2Secrets } from "./vault";

// Cached config (populated on first use)
let cachedConfig: R2Secrets | null = null;

/**
 * Get R2 configuration (from vault in production, env in dev)
 */
async function getConfig(): Promise<R2Secrets> {
  if (cachedConfig) return cachedConfig;
  cachedConfig = await getR2Secrets();
  return cachedConfig;
}

/**
 * Get config synchronously (for non-async functions)
 * Falls back to env vars if cache not populated
 */
function getConfigSync(): R2Secrets {
  if (cachedConfig) return cachedConfig;
  return {
    accountId: process.env.R2_ACCOUNT_ID || null,
    accessKeyId: process.env.R2_ACCESS_KEY_ID || null,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || null,
    bucketName: process.env.R2_BUCKET_NAME || "foodshare",
    publicUrl: process.env.NEXT_PUBLIC_R2_PUBLIC_URL || "",
  };
}

/** R2 upload result type */
export type R2UploadResult = {
  success: boolean;
  path?: string;
  publicUrl?: string;
  error?: string;
};

/** R2 operation result type */
export type R2OperationResult = {
  success: boolean;
  error?: string;
};

/**
 * Check if R2 is properly configured (sync check using env/cache)
 */
export function isR2Configured(): boolean {
  const config = getConfigSync();
  return !!(config.accountId && config.accessKeyId && config.secretAccessKey && config.publicUrl);
}

/**
 * Check if R2 is configured (async - fetches from vault if needed)
 */
export async function isR2ConfiguredAsync(): Promise<boolean> {
  const config = await getConfig();
  return !!(config.accountId && config.accessKeyId && config.secretAccessKey && config.publicUrl);
}

/**
 * Get the public URL for an R2 object
 */
export function getR2PublicUrl(path: string): string {
  const config = getConfigSync();
  return `${config.publicUrl}/${path}`;
}

/**
 * Get the R2 S3-compatible endpoint
 */
function getEndpoint(accountId: string): string {
  return `https://${accountId}.r2.cloudflarestorage.com`;
}

/**
 * Compute SHA-256 hash of data
 */
async function sha256(data: ArrayBuffer | string): Promise<string> {
  const encoder = new TextEncoder();
  const buffer = typeof data === "string" ? encoder.encode(data) : data;
  const hash = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * HMAC-SHA256 signing
 */
async function hmacSha256(key: ArrayBuffer, data: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(data));
}

/**
 * Generate AWS Signature V4 signing key
 */
async function getSigningKey(secretAccessKey: string, dateStamp: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const kDate = await hmacSha256(
    encoder.encode("AWS4" + secretAccessKey).buffer as ArrayBuffer,
    dateStamp
  );
  const kRegion = await hmacSha256(kDate, "auto");
  const kService = await hmacSha256(kRegion, "s3");
  return hmacSha256(kService, "aws4_request");
}

/**
 * Sign a request using AWS Signature V4
 */
async function signRequest(
  config: R2Secrets,
  method: string,
  path: string,
  headers: Record<string, string>,
  body?: ArrayBuffer
): Promise<Record<string, string>> {
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);

  const canonicalUri = path.startsWith("/") ? path : `/${path}`;
  const payloadHash = body ? await sha256(body) : "UNSIGNED-PAYLOAD";

  // Build canonical headers
  const canonicalHeaders: Record<string, string> = {
    host: `${config.accountId}.r2.cloudflarestorage.com`,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
    ...headers,
  };

  const sortedKeys = Object.keys(canonicalHeaders).sort();
  const canonicalHeadersStr = sortedKeys
    .map((k) => `${k.toLowerCase()}:${canonicalHeaders[k]}`)
    .join("\n");
  const signedHeaders = sortedKeys.map((k) => k.toLowerCase()).join(";");

  // Create canonical request
  const canonicalRequest = [
    method,
    canonicalUri,
    "", // query string
    canonicalHeadersStr + "\n",
    signedHeaders,
    payloadHash,
  ].join("\n");

  // Create string to sign
  const credentialScope = `${dateStamp}/auto/s3/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    await sha256(canonicalRequest),
  ].join("\n");

  // Calculate signature
  const signingKey = await getSigningKey(config.secretAccessKey!, dateStamp);
  const signatureBuffer = await hmacSha256(signingKey, stringToSign);
  const signature = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return {
    ...canonicalHeaders,
    Authorization: `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
  };
}

/**
 * Upload a file to R2
 *
 * @param file - File or Blob to upload
 * @param path - Object path (e.g., "posts/123/image.jpg")
 * @param contentType - Optional MIME type override
 */
export async function uploadToR2(
  file: File | Blob,
  path: string,
  contentType?: string
): Promise<R2UploadResult> {
  const config = await getConfig();

  if (!config.accountId || !config.accessKeyId || !config.secretAccessKey) {
    return { success: false, error: "R2 is not configured" };
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const objectPath = `/${config.bucketName}/${path}`;
    const mimeType = contentType || (file as File).type || "application/octet-stream";

    const headers = await signRequest(
      config,
      "PUT",
      objectPath,
      {
        "Content-Type": mimeType,
        "Content-Length": arrayBuffer.byteLength.toString(),
      },
      arrayBuffer
    );

    const response = await fetch(`${getEndpoint(config.accountId)}${objectPath}`, {
      method: "PUT",
      headers,
      body: arrayBuffer,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[R2] Upload failed:", response.status, errorText);
      return { success: false, error: `Upload failed: ${response.status}` };
    }

    const publicUrl = `${config.publicUrl}/${path}`;
    console.log("[R2] ✅ Upload successful:", publicUrl);

    return { success: true, path, publicUrl };
  } catch (error) {
    console.error("[R2] Upload error:", error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Delete a file from R2
 *
 * @param path - Object path to delete
 */
export async function deleteFromR2(path: string): Promise<R2OperationResult> {
  const config = await getConfig();

  if (!config.accountId || !config.accessKeyId || !config.secretAccessKey) {
    return { success: false, error: "R2 is not configured" };
  }

  try {
    const objectPath = `/${config.bucketName}/${path}`;
    const headers = await signRequest(config, "DELETE", objectPath, {});

    const response = await fetch(`${getEndpoint(config.accountId)}${objectPath}`, {
      method: "DELETE",
      headers,
    });

    // 204 No Content or 404 Not Found are both success cases for delete
    if (!response.ok && response.status !== 404) {
      const errorText = await response.text();
      console.error("[R2] Delete failed:", response.status, errorText);
      return { success: false, error: `Delete failed: ${response.status}` };
    }

    console.log("[R2] ✅ Delete successful:", path);
    return { success: true };
  } catch (error) {
    console.error("[R2] Delete error:", error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Check if a file exists in R2
 *
 * @param path - Object path to check
 */
export async function existsInR2(path: string): Promise<boolean> {
  const config = await getConfig();

  if (!config.accountId || !config.accessKeyId || !config.secretAccessKey) {
    return false;
  }

  try {
    const objectPath = `/${config.bucketName}/${path}`;
    const headers = await signRequest(config, "HEAD", objectPath, {});

    const response = await fetch(`${getEndpoint(config.accountId)}${objectPath}`, {
      method: "HEAD",
      headers,
    });

    return response.ok;
  } catch {
    return false;
  }
}
