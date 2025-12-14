import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as jose from "https://deno.land/x/jose@v5.2.0/index.ts";

// Environment variables
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// APNs Configuration (iOS)
const APNS_KEY_ID = Deno.env.get("APNS_KEY_ID");
const APNS_TEAM_ID = Deno.env.get("APNS_TEAM_ID");
const APNS_BUNDLE_ID = Deno.env.get("APNS_BUNDLE_ID") || "co.nz.foodshare.FoodShare";
const APNS_PRIVATE_KEY = Deno.env.get("APNS_PRIVATE_KEY");
const APNS_ENVIRONMENT = Deno.env.get("APNS_ENVIRONMENT") || "production";

// Web Push Configuration (VAPID)
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY");
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY");
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:hello@foodshare.club";

const supabase = createClient(supabaseUrl, supabaseKey);

// ============================================================================
// Types
// ============================================================================

interface PushPayload {
  type: string;
  title: string;
  body: string;
  icon?: string;
  badge?: string | number;
  image?: string;
  url?: string;
  tag?: string;
  data?: Record<string, string>;
  sound?: string;
  actions?: Array<{ action: string; title: string; icon?: string }>;
}

interface SendRequest {
  user_ids?: string[];
  tokens?: string[];
  platforms?: ("ios" | "android" | "web")[];
  payload: PushPayload;
}

interface DeviceToken {
  profile_id: string;
  token: string;
  platform: "ios" | "android" | "web";
  endpoint?: string;
  p256dh?: string;
  auth?: string;
}

interface SendResult {
  success: boolean;
  platform: string;
  error?: string;
}

// ============================================================================
// APNs (iOS) Functions
// ============================================================================

async function generateAPNsToken(): Promise<string> {
  if (!APNS_PRIVATE_KEY || !APNS_KEY_ID || !APNS_TEAM_ID) {
    throw new Error("APNs credentials not configured");
  }

  const privateKey = await jose.importPKCS8(APNS_PRIVATE_KEY.replace(/\\n/g, "\n"), "ES256");

  const jwt = await new jose.SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: APNS_KEY_ID })
    .setIssuedAt()
    .setIssuer(APNS_TEAM_ID)
    .sign(privateKey);

  return jwt;
}

async function sendToAPNs(
  token: string,
  payload: PushPayload,
  apnsToken: string
): Promise<SendResult> {
  const apnsHost =
    APNS_ENVIRONMENT === "production" ? "api.push.apple.com" : "api.sandbox.push.apple.com";

  const apnsPayload = {
    aps: {
      alert: {
        title: payload.title,
        body: payload.body,
      },
      sound: payload.sound || "default",
      badge: typeof payload.badge === "number" ? payload.badge : undefined,
      "mutable-content": 1,
      "content-available": 1,
    },
    type: payload.type,
    url: payload.url,
    ...payload.data,
  };

  try {
    const response = await fetch(`https://${apnsHost}/3/device/${token}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apnsToken}`,
        "apns-topic": APNS_BUNDLE_ID,
        "apns-push-type": "alert",
        "apns-priority": "10",
        "apns-expiration": "0",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(apnsPayload),
    });

    if (response.status === 200) {
      return { success: true, platform: "ios" };
    }

    const errorBody = await response.text();
    console.error(`APNs error for token ${token.substring(0, 20)}...:`, response.status, errorBody);

    if (response.status === 410 || response.status === 400) {
      await removeInvalidToken(token, "ios");
    }

    return { success: false, platform: "ios", error: `APNs ${response.status}: ${errorBody}` };
  } catch (error) {
    console.error(`Error sending to iOS:`, error);
    return { success: false, platform: "ios", error: (error as Error).message };
  }
}

// ============================================================================
// Web Push Functions
// ============================================================================

function base64UrlToUint8Array(base64Url: string): Uint8Array {
  const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/") + padding;
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function uint8ArrayToBase64Url(uint8Array: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < uint8Array.length; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function generateVAPIDHeaders(
  endpoint: string
): Promise<{ authorization: string; cryptoKey: string }> {
  if (!VAPID_PRIVATE_KEY || !VAPID_PUBLIC_KEY) {
    throw new Error("VAPID credentials not configured");
  }

  const audience = new URL(endpoint).origin;
  const expiration = Math.floor(Date.now() / 1000) + 12 * 60 * 60; // 12 hours

  // Import the private key
  const privateKeyData = base64UrlToUint8Array(VAPID_PRIVATE_KEY);
  const privateKey = await crypto.subtle
    .importKey("pkcs8", privateKeyData, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"])
    .catch(async () => {
      // Try JWK format if PKCS8 fails
      const jwk = {
        kty: "EC",
        crv: "P-256",
        d: VAPID_PRIVATE_KEY,
        x: VAPID_PUBLIC_KEY.substring(0, 43),
        y: VAPID_PUBLIC_KEY.substring(43),
      };
      return crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, [
        "sign",
      ]);
    });

  // Create JWT header and payload
  const header = { typ: "JWT", alg: "ES256" };
  const jwtPayload = {
    aud: audience,
    exp: expiration,
    sub: VAPID_SUBJECT,
  };

  const encodedHeader = uint8ArrayToBase64Url(new TextEncoder().encode(JSON.stringify(header)));
  const encodedPayload = uint8ArrayToBase64Url(
    new TextEncoder().encode(JSON.stringify(jwtPayload))
  );
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;

  // Sign the token
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    privateKey,
    new TextEncoder().encode(unsignedToken)
  );

  const jwt = `${unsignedToken}.${uint8ArrayToBase64Url(new Uint8Array(signature))}`;

  return {
    authorization: `vapid t=${jwt}, k=${VAPID_PUBLIC_KEY}`,
    cryptoKey: `p256ecdsa=${VAPID_PUBLIC_KEY}`,
  };
}

async function sendToWebPush(device: DeviceToken, payload: PushPayload): Promise<SendResult> {
  if (!device.endpoint || !device.p256dh || !device.auth) {
    return { success: false, platform: "web", error: "Missing web push subscription data" };
  }

  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return { success: false, platform: "web", error: "VAPID credentials not configured" };
  }

  try {
    // Build notification payload
    const notificationPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || "/icons/icon-192x192.png",
      badge: payload.badge || "/icons/badge-72x72.png",
      image: payload.image,
      tag: payload.tag || payload.type,
      data: {
        url: payload.url || "/",
        type: payload.type,
        ...payload.data,
      },
      actions: payload.actions,
      requireInteraction: false,
      renotify: true,
    });

    // Generate VAPID headers
    const vapidHeaders = await generateVAPIDHeaders(device.endpoint);

    const response = await fetch(device.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Encoding": "identity",
        Authorization: vapidHeaders.authorization,
        TTL: "86400",
        Urgency: "high",
      },
      body: notificationPayload,
    });

    if (response.status === 201 || response.status === 200) {
      await supabase
        .from("device_tokens")
        .update({ last_used_at: new Date().toISOString() })
        .eq("endpoint", device.endpoint);

      return { success: true, platform: "web" };
    }

    const errorBody = await response.text();
    console.error(`Web Push error:`, response.status, errorBody);

    if (response.status === 404 || response.status === 410) {
      await removeInvalidWebSubscription(device.endpoint);
    }

    return { success: false, platform: "web", error: `WebPush ${response.status}: ${errorBody}` };
  } catch (error) {
    console.error(`Error sending web push:`, error);
    return { success: false, platform: "web", error: (error as Error).message };
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

async function removeInvalidToken(token: string, platform: string): Promise<void> {
  try {
    await supabase.from("device_tokens").delete().eq("token", token).eq("platform", platform);
    console.log(`Removed invalid ${platform} token: ${token.substring(0, 20)}...`);
  } catch (error) {
    console.error("Error removing invalid token:", error);
  }
}

async function removeInvalidWebSubscription(endpoint: string): Promise<void> {
  try {
    await supabase.from("device_tokens").delete().eq("endpoint", endpoint);
    console.log(`Removed invalid web subscription: ${endpoint.substring(0, 50)}...`);
  } catch (error) {
    console.error("Error removing invalid subscription:", error);
  }
}

async function getDeviceTokens(
  userIds: string[],
  platforms?: ("ios" | "android" | "web")[]
): Promise<DeviceToken[]> {
  let query = supabase
    .from("device_tokens")
    .select("profile_id, token, platform, endpoint, p256dh, auth")
    .in("profile_id", userIds);

  if (platforms && platforms.length > 0) {
    query = query.in("platform", platforms);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching tokens:", error);
    return [];
  }

  return (data as DeviceToken[]) || [];
}

// ============================================================================
// Main Handler
// ============================================================================

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  try {
    const request: SendRequest = await req.json();
    const { user_ids, tokens, platforms, payload } = request;

    if (!payload || !payload.title || !payload.body) {
      return new Response(
        JSON.stringify({ error: "Missing required payload fields (title, body)" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get device tokens
    let deviceTokens: DeviceToken[] = [];

    if (user_ids && user_ids.length > 0) {
      deviceTokens = await getDeviceTokens(user_ids, platforms);
    } else if (tokens && tokens.length > 0) {
      // Direct token sending (legacy support)
      deviceTokens = tokens.map((token) => ({
        profile_id: "",
        token,
        platform: "ios" as const,
      }));
    } else {
      return new Response(JSON.stringify({ error: "Must provide user_ids or tokens" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (deviceTokens.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: "No device tokens found" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // Group by platform
    const iosTokens = deviceTokens.filter((d) => d.platform === "ios");
    const webTokens = deviceTokens.filter((d) => d.platform === "web");

    const results: SendResult[] = [];

    // Send to iOS devices
    if (iosTokens.length > 0) {
      try {
        const apnsToken = await generateAPNsToken();
        const iosResults = await Promise.all(
          iosTokens.map((device) => sendToAPNs(device.token, payload, apnsToken))
        );
        results.push(...iosResults);
      } catch (error) {
        console.error("APNs token generation failed:", error);
        results.push(
          ...iosTokens.map(() => ({
            success: false,
            platform: "ios",
            error: "APNs not configured",
          }))
        );
      }
    }

    // Send to Web devices
    if (webTokens.length > 0) {
      const webResults = await Promise.all(
        webTokens.map((device) => sendToWebPush(device, payload))
      );
      results.push(...webResults);
    }

    // Calculate stats
    const successCount = results.filter((r) => r.success).length;
    const failedCount = results.filter((r) => !r.success).length;
    const byPlatform = {
      ios: {
        sent: results.filter((r) => r.platform === "ios" && r.success).length,
        failed: results.filter((r) => r.platform === "ios" && !r.success).length,
      },
      web: {
        sent: results.filter((r) => r.platform === "web" && r.success).length,
        failed: results.filter((r) => r.platform === "web" && !r.success).length,
      },
    };

    console.log(`Push notifications: ${successCount} success, ${failedCount} failed`, byPlatform);

    return new Response(
      JSON.stringify({
        success: true,
        sent: successCount,
        failed: failedCount,
        total: deviceTokens.length,
        byPlatform,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error) {
    console.error("Edge function error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
});
