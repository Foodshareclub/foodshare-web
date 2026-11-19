import { assertRejects } from "@std/assert";
import type { HandlerContext } from "../_shared/api-handler.ts";
import { AuthenticationError } from "../_shared/errors.ts";
import type { createHealthHandler } from "../_shared/health-handler.ts";
import { createRouteHandlers } from "../api-v1-ai/lib/handlers.ts";
import type { PostBody } from "../api-v1-ai/lib/schemas.ts";
const health = (() => Promise.resolve(new Response("healthy"))) as ReturnType<
  typeof createHealthHandler
>;
const handlers = createRouteHandlers(health);
const callerHeaders: Record<string, string>[] = [{}, { "x-supabase-cron": "true" }, {
  authorization: "Bearer not-a-service-credential",
}];
for (const headers of callerHeaders) {
  Deno.test(`AI inference rejects unauthenticated/forged caller ${JSON.stringify(headers)}`, async () => {
    // No database client or provider credentials: authorization must run first.
    const request = new Request(
      "https://api.foodshare.club/functions/v1/api-v1-ai/inference/textToImage",
      {
        method: "POST",
        headers,
      },
    );
    await assertRejects(
      () =>
        handlers.handlePost(
          { request, body: { inputs: "apples" }, userId: null } as HandlerContext<PostBody>,
        ),
      AuthenticationError,
    );
  });
}
