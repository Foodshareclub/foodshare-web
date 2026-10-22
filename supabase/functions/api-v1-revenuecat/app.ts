import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { z } from "zod";
import { reconcile, type ReconciliationPorts } from "./reconcile.ts";

export interface BillingStatus {
  identity_ready: boolean;
  customer_id?: string;
  has_access: boolean;
  expires_at?: string | null;
  reconciled_at?: string | null;
}
export interface RevenueCatDependencies {
  webhookAuthorization: string | (() => Promise<string>);
  status(authorization: string): Promise<BillingStatus>;
  reconciliation: ReconciliationPorts;
}

export class BillingAuthenticationError extends Error {}

export async function equalAuthorization(actual: string, expected: string): Promise<boolean> {
  if (!expected || expected.length < 32) return false;
  const digest = (s: string) => crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  const [left, right] = await Promise.all([digest(actual), digest(expected)]);
  const a = new Uint8Array(left), b = new Uint8Array(right);
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a[i] ^ b[i];
  return difference === 0;
}

const customerID = z.string().min(1).max(1500);
const eventSchema = z.object({
  event: z.object({
    id: z.string().min(1).max(255),
    type: z.string().min(1),
    app_id: z.enum(["app7e195851d0", "appdbba5d020b"]).optional(),
    environment: z.enum(["PRODUCTION", "SANDBOX"]).optional(),
    app_user_id: customerID.optional(),
    transferred_from: z.array(customerID).max(10).optional(),
    transferred_to: z.array(customerID).max(10).optional(),
  }),
});

export function createRevenueCatApp(deps: RevenueCatDependencies) {
  const app = new Hono({ strict: false }).basePath("/api-v1-revenuecat");
  app.use("*", bodyLimit({ maxSize: 32768 }));
  app.use("*", async (c, next) => {
    c.header("Cache-Control", "no-store");
    await next();
  });
  // Never return upstream payloads/errors, which can contain customer data.
  app.onError((error) =>
    new Response(
      JSON.stringify({
        error: error instanceof BillingAuthenticationError
          ? "Authentication required"
          : "Billing temporarily unavailable",
      }),
      {
        status: error instanceof BillingAuthenticationError ? 401 : 503,
        headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      },
    )
  );
  app.get("/", async (c) => {
    const authorization = c.req.header("Authorization") ?? "";
    if (!/^Bearer \S+$/.test(authorization)) {
      return c.json({ error: "Authentication required" }, 401);
    }
    let status = await deps.status(authorization);
    if (!status.identity_ready || !status.customer_id) return c.json(status);
    const age = status.reconciled_at ? Date.now() - Date.parse(status.reconciled_at) : Infinity;
    if (!Number.isFinite(age) || age > 300000) {
      await reconcile(status.customer_id, deps.reconciliation);
      status = await deps.status(authorization);
    }
    return c.json(status);
  });
  app.post("/webhook", async (c) => {
    const webhookAuthorization = typeof deps.webhookAuthorization === "string"
      ? deps.webhookAuthorization
      : await deps.webhookAuthorization();
    if (!webhookAuthorization) return c.json({ error: "Webhook not configured" }, 503);
    if (!await equalAuthorization(c.req.header("Authorization") ?? "", webhookAuthorization)) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    const body = eventSchema.safeParse(await c.req.json().catch(() => null));
    if (!body.success) return c.json({ error: "Invalid event" }, 400);
    const event = body.data.event;
    if (event.type === "TEST") return c.json({ received: true });
    if (event.environment === "SANDBOX") return c.json({ ignored: "sandbox" });
    // Always query production resources. Never use event status/expiry as access.
    let ids: string[];
    if (event.type === "TRANSFER") {
      if (!event.transferred_from?.length || !event.transferred_to?.length) {
        return c.json({ error: "Missing transfer identities" }, 400);
      }
      ids = [...event.transferred_from, ...event.transferred_to];
    } else {
      if (!event.app_id || event.environment !== "PRODUCTION" || !event.app_user_id) {
        return c.json({ error: "Missing app or customer" }, 400);
      }
      ids = [event.app_user_id];
    }
    for (const id of new Set(ids)) await reconcile(id, deps.reconciliation);
    return c.json({ received: true });
  });
  return app;
}
