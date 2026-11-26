import { assertEquals } from "@std/assert";
import { sendFcm } from "../api-v1-notifications/lib/providers/fcm.ts";
import { resetCircuit } from "../_shared/circuit-breaker.ts";

Deno.test("FCM sends visibility enums and only retires explicitly unregistered tokens", async () => {
  const keys = await crypto.subtle.generateKey(
    {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["sign", "verify"],
  );
  const der = new Uint8Array(await crypto.subtle.exportKey("pkcs8", keys.privateKey));
  const pem = `-----BEGIN PRIVATE KEY-----\n${
    btoa(String.fromCharCode(...der))
  }\n-----END PRIVATE KEY-----`;
  const environment = {
    FCM_PROJECT_ID: "contract-project",
    FCM_CLIENT_EMAIL: "contract@example.invalid",
    FCM_PRIVATE_KEY: pem,
  };
  const previous = Object.fromEntries(
    Object.keys(environment).map((key) => [key, Deno.env.get(key)]),
  );
  const originalFetch = globalThis.fetch;
  const requests: Record<string, unknown>[] = [];
  let responseError: Record<string, unknown> | undefined;
  globalThis.fetch = async (url, init) => {
    if (String(url) === "https://oauth2.googleapis.com/token") {
      return Response.json({ access_token: "contract-token", expires_in: 3600 });
    }
    assertEquals(
      String(url),
      "https://fcm.googleapis.com/v1/projects/contract-project/messages:send",
    );
    requests.push(JSON.parse(String(init?.body)));
    return responseError
      ? Response.json({ error: responseError }, { status: Number(responseError.code) })
      : Response.json({ name: "projects/contract-project/messages/1" });
  };
  try {
    for (const [key, value] of Object.entries(environment)) Deno.env.set(key, value);
    const device = { profile_id: "owner", token: "device-token", platform: "android" as const };
    const payload = { title: "Contract", body: "Contract", type: "new_message" };
    for (const visibility of ["private", "public", "secret"] as const) {
      const result = await sendFcm(device, { ...payload, android: { visibility } });
      assertEquals(result.success, true);
      const request = requests.at(-1) as {
        message: { android: { notification: { visibility: string } } };
      };
      assertEquals(request.message.android.notification.visibility, visibility.toUpperCase());
    }
    const guarded = await sendFcm({ ...device, user_agent: "foodshare-skip-fcm-v1" }, {
      ...payload,
      android: { channelId: "messages" },
      data: {
        recipient_profile_id: "wrong-owner",
        title: "spoofed",
        url: "https://untrusted.invalid",
      },
    });
    assertEquals(guarded.success, true);
    const guardedMessage = (requests.at(-1) as { message: Record<string, unknown> }).message;
    assertEquals(guardedMessage.notification, undefined);
    assertEquals((guardedMessage.android as Record<string, unknown>).notification, undefined);
    assertEquals(
      (guardedMessage.android as Record<string, unknown>).restricted_package_name,
      "com.flutterflow.foodshare",
    );
    const guardedData = guardedMessage.data as Record<string, string>;
    assertEquals(guardedData.recipient_profile_id, device.profile_id);
    assertEquals(guardedData.title, payload.title);
    assertEquals(guardedData.body, payload.body);
    assertEquals(guardedData.channel_id, "messages");
    assertEquals(guardedData.url, "foodshare://notifications");
    const type = "type.googleapis.com/google.firebase.fcm.v1.FcmError";
    responseError = {
      code: 400,
      status: "INVALID_ARGUMENT",
      details: [{ "@type": type, errorCode: "INVALID_ARGUMENT" }],
    };
    const invalidPayload = await sendFcm(device, payload);
    assertEquals(invalidPayload.success, false);
    assertEquals(invalidPayload.token, undefined);
    resetCircuit("push-android");
    responseError = {
      code: 404,
      status: "NOT_FOUND",
      details: [{ "@type": "type.googleapis.com/google.rpc.BadRequest" }, {
        "@type": type,
        errorCode: "UNREGISTERED",
      }],
    };
    const retired = await sendFcm(device, payload);
    assertEquals(retired.token, device.token);
    assertEquals(retired.retryable, false);
    assertEquals(retired.errorCode, "UNREGISTERED");
  } finally {
    globalThis.fetch = originalFetch;
    resetCircuit("push-android");
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) Deno.env.delete(key);
      else Deno.env.set(key, value);
    }
  }
});
