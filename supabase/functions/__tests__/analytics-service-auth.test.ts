import { assertEquals, assertRejects } from "@std/assert";
import { ForbiddenError } from "../_shared/errors.ts";
import type { HandlerContext } from "../_shared/api-handler.ts";
import type { createHealthHandler } from "../_shared/health-handler.ts";
import { createRouteHandlers } from "../api-v1-analytics/lib/handlers.ts";

function context(
  path: string,
  headers: Record<string, string>,
  method = "GET",
): HandlerContext<{ mode: "incremental" }> {
  const request = new Request(`https://api.example.test/api-v1-analytics${path}`, {
    method,
    headers,
  });
  return { request, headers: request.headers, body: { mode: "incremental" } } as HandlerContext<{
    mode: "incremental";
  }>;
}

const health = (() => Promise.resolve(new Response("health-only"))) as ReturnType<
  typeof createHealthHandler
>;
const handlers = createRouteHandlers(health);

Deno.test("analytics health remains public without touching warehouse data", async () => {
  const response = await handlers.handleGetStatus(context("/health", {}));
  assertEquals(await response.text(), "health-only");
});

for (
  const [name, path, headers, method] of [
    ["anonymous status", "/", {}, "GET"],
    ["forged cron header", "/", { "x-supabase-cron": "true" }, "GET"],
    ["cron query parameter", "/?cron=true", {}, "GET"],
    ["anonymous sync", "/sync", {}, "POST"],
    ["forged cron sync", "/sync", { "x-supabase-cron": "true" }, "POST"],
  ] as const
) {
  Deno.test(`analytics rejects ${name} before database or warehouse access`, async () => {
    // The context deliberately has no database client. Authorization must fail
    // before attempting any privileged operation, including token retrieval.
    const ctx = context(path, headers, method);
    await assertRejects(
      () => (method === "POST" ? handlers.handleSync(ctx) : handlers.handleGetStatus(ctx)),
      ForbiddenError,
    );
  });
}
