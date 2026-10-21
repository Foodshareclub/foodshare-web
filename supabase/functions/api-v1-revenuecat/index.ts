import { z } from "zod";
import type { Database } from "../_shared/database.types.ts";
import { createAPIHandler } from "../_shared/api-handler.ts";
import { getSupabaseClient } from "../_shared/supabase.ts";
import { getSecret } from "../_shared/vault.ts";
import { BillingAuthenticationError, createRevenueCatApp, equalAuthorization } from "./app.ts";
import { readProductionRecords } from "./reconcile.ts";

function required(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error("Billing configuration missing");
  return value;
}

/** Arguments are checked against the Postgres-generated contract; provider and
 * PostgREST responses are validated at runtime before affecting access. */
async function rpc<Name extends keyof Database["public"]["Functions"]>(
  name: Name,
  body: Database["public"]["Functions"][Name]["Args"],
  authorization?: string,
): Promise<unknown> {
  const key = required("SUPABASE_SERVICE_ROLE_KEY");
  const response = await fetch(
    `${required("SUPABASE_URL").replace(/\/$/, "")}/rest/v1/rpc/${name}`,
    {
      method: "POST",
      redirect: "error",
      signal: AbortSignal.timeout(8000),
      headers: {
        apikey: key,
        Authorization: authorization ?? `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );
  if (!response.ok) throw new Error("Billing database unavailable");
  return response.json();
}

const app = createRevenueCatApp({
  webhookAuthorization: async () => await getSecret("REVENUECAT_WEBHOOK_AUTHORIZATION") ?? "",
  status: async (authorization) => {
    const { data, error } = await getSupabaseClient().auth.getUser(authorization.slice(7));
    if (error || !data.user) throw new BillingAuthenticationError();
    return z.object({
      identity_ready: z.boolean(),
      customer_id: z.string().optional(),
      has_access: z.boolean(),
      expires_at: z.string().nullable().optional(),
      reconciled_at: z.string().nullable().optional(),
    }).parse(await rpc("revenuecat_my_status", {}, authorization));
  },
  reconciliation: {
    begin: async (customerID) =>
      z.number().int().positive().nullable().parse(
        await rpc("revenuecat_begin_reconciliation", { p_customer_id: customerID }),
      ),
    read: async (customerID, resource) => {
      const token = await getSecret("REVENUECAT_API_V2_KEY");
      if (!token) throw new Error("RevenueCat configuration missing");
      return readProductionRecords(customerID, resource, token);
    },
    complete: async (customerID, revision, snapshot) =>
      z.boolean().parse(
        await rpc("revenuecat_commit", {
          p_customer_id: customerID,
          p_revision: revision,
          p_has_access: snapshot.active,
          p_expires_at: snapshot.expiresAt,
        }),
      ),
  },
});

const handler = createAPIHandler({
  service: "api-v1-revenuecat",
  version: "1.0.0",
  requireAuth: false,
  csrf: false,
  maxBodySize: 32768,
  rateLimit: { limit: 120, windowMs: 60000, keyBy: "ip" },
  routes: {
    GET: { requireAuth: true, handler: async (ctx) => await app.fetch(ctx.request) },
    POST: {
      handler: async (ctx) => {
        const headers = new Headers(ctx.request.headers);
        headers.delete("content-length");
        headers.set("content-type", "application/json");
        return app.fetch(
          new Request(ctx.request.url, {
            method: "POST",
            headers,
            body: JSON.stringify(ctx.body),
            signal: ctx.request.signal,
          }),
        );
      },
    },
  },
});

// Authenticate billing notifications before the common JSON parser touches the
// body. Non-2xx on transient failure is intentional: RevenueCat must retry an
// unprocessed financial event rather than receive a false acknowledgement.
Deno.serve(async (request) => {
  if (request.method === "POST" && new URL(request.url).pathname.endsWith("/webhook")) {
    try {
      const expected = await getSecret("REVENUECAT_WEBHOOK_AUTHORIZATION") ?? "";
      if (!expected) return new Response(null, { status: 503 });
      if (!await equalAuthorization(request.headers.get("Authorization") ?? "", expected)) {
        return new Response(null, { status: 401 });
      }
    } catch {
      return new Response(null, { status: 503 });
    }
  }
  return handler(request);
});
