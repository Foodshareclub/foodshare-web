import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as jose from "https://deno.land/x/jose@v5.2.0/index.ts";
import webpush from "npm:web-push@3.6.7";

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

// Initialize web-push if configured
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

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
      alert: { title: payload.title, body: payload.body },
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
    console.error(`APNs error:`, response.status, errorBody);

    if (response.status === 410 || response.status === 400) {
      await removeInvalidToken(token, "ios");
    }

    return { success: false, platform: "ios", error: `APNs ${response.status}` };
  } catch (error) {
    return { success: false, platform: "ios", error: (error as Error).message };
  }
}

// ============================================================================
// Web Push Functions (using web-push library)
// ============================================================================

async function sendToWebPush(device: DeviceToken, payload: PushPayload): Promise<SendResult> {
  if (!device.endpoint || !device.p256dh || !device.auth) {
    return { success: false, platform: "web", error: "Missing subscription data" };
  }

  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return { success: false, platform: "web", error: "VAPID not configured" };
  }

  const subscription = {
    endpoint: device.endpoint,
    keys: {
      p256dh: device.p256dh,
      auth: device.auth,
    },
  };

  const notificationPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: payload.icon || "/icons/icon-192x192.png",
    badge: payload.badge || "/icons/badge-72x72.png",
    image: payload.image,
    tag: payload.tag || payload.type,
    data: { url: payload.url || "/", type: payload.type, ...payload.data },
    actions: payload.actions,
    requireInteraction: false,
    renotify: true,
  });

  try {
    await webpush.sendNotification(subscription, notificationPayload, {
      TTL: 86400,
      urgency: "high",
    });

    // Update last_used_at
    await supabase
      .from("device_tokens")
      .update({ last_used_at: new Date().toISOString() })
      .eq("endpoint", device.endpoint);

    return { success: true, platform: "web" };
  } catch (error: unknown) {
    const err = error as { statusCode?: number; message?: string };
    console.error(`Web Push error:`, err.statusCode, err.message);

    // Handle expired/invalid subscriptions
    if (err.statusCode === 404 || err.statusCode === 410) {
      await removeInvalidWebSubscription(device.endpoint);
    }

    return { success: false, platform: "web", error: err.message || "Unknown error" };
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

async function removeInvalidToken(token: string, platform: string): Promise<void> {
  try {
    await supabase.from("device_tokens").delete().eq("token", token).eq("platform", platform);
    console.log(`Removed invalid ${platform} token`);
  } catch (error) {
    console.error("Error removing token:", error);
  }
}

async function removeInvalidWebSubscription(endpoint: string): Promise<void> {
  try {
    await supabase.from("device_tokens").delete().eq("endpoint", endpoint);
    console.log(`Removed invalid web subscription`);
  } catch (error) {
    console.error("Error removing subscription:", error);
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

  if (platforms?.length) {
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
    const { user_ids, tokens, platforms, payload }: SendRequest = await req.json();

    if (!payload?.title || !payload?.body) {
      return new Response(
        JSON.stringify({ error: "Missing required payload fields (title, body)" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get device tokens
    let deviceTokens: DeviceToken[] = [];

    if (user_ids?.length) {
      deviceTokens = await getDeviceTokens(user_ids, platforms);
    } else if (tokens?.length) {
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

    if (!deviceTokens.length) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: "No device tokens found" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    const iosTokens = deviceTokens.filter((d) => d.platform === "ios");
    const webTokens = deviceTokens.filter((d) => d.platform === "web");

    const results: SendResult[] = [];

    // iOS
    if (iosTokens.length) {
      try {
        const apnsToken = await generateAPNsToken();
        const iosResults = await Promise.all(
          iosTokens.map((d) => sendToAPNs(d.token, payload, apnsToken))
        );
        results.push(...iosResults);
      } catch {
        results.push(
          ...iosTokens.map(() => ({
            success: false,
            platform: "ios",
            error: "APNs not configured",
          }))
        );
      }
    }

    // Web
    if (webTokens.length) {
      const webResults = await Promise.all(webTokens.map((d) => sendToWebPush(d, payload)));
      results.push(...webResults);
    }

    const successCount = results.filter((r) => r.success).length;
    const failedCount = results.filter((r) => !r.success).length;

    return new Response(
      JSON.stringify({
        success: true,
        sent: successCount,
        failed: failedCount,
        total: deviceTokens.length,
        byPlatform: {
          ios: {
            sent: results.filter((r) => r.platform === "ios" && r.success).length,
            failed: results.filter((r) => r.platform === "ios" && !r.success).length,
          },
          web: {
            sent: results.filter((r) => r.platform === "web" && r.success).length,
            failed: results.filter((r) => r.platform === "web" && !r.success).length,
          },
        },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      }
    );
  } catch (error) {
    console.error("Edge function error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
});
