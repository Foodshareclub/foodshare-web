import { assertEquals } from "./test-utils.ts";
import {
  addMetadata,
  clearContext,
  createContext,
  getContext,
  getContextHeaders,
  handleWithContext,
  setUserId,
  withContext,
} from "../_shared/context.ts";
import { clearSpans, getSpans, startSpan } from "../_shared/performance.ts";
import { createAPIHandler, ok } from "../_shared/api-handler.ts";

Deno.env.set("SUPABASE_URL", "http://localhost:54321");
Deno.env.set("SUPABASE_ANON_KEY", "test-anon-key");

Deno.test("concurrent handlers retain their own user, trace, metadata, and spans", async () => {
  clearContext();
  clearSpans();
  const firstReady = Promise.withResolvers<void>();
  const secondReady = Promise.withResolvers<void>();
  const releaseFirst = Promise.withResolvers<void>();
  const releaseSecond = Promise.withResolvers<void>();
  const handler = handleWithContext("context-test", async (request, ctx) => {
    const first = request.url.endsWith("/first");
    const user = first ? "first-user" : "second-user";
    setUserId(user);
    addMetadata("owner", user);
    const span = startSpan(user);
    (first ? firstReady : secondReady).resolve();
    await (first ? releaseFirst : releaseSecond).promise;
    span.end();
    const result = {
      requestId: getContext()?.requestId,
      expectedId: ctx.requestId,
      userId: getContext()?.userId,
      owner: getContext()?.metadata.owner,
      headers: getContextHeaders(),
      spans: getSpans().map((item) => item.operation),
    };
    clearSpans();
    return Response.json(result);
  });

  const first = handler(
    new Request("https://example.com/first", { headers: { "x-correlation-id": "first-trace" } }),
  );
  await firstReady.promise;
  const second = handler(
    new Request("https://example.com/second", { headers: { "x-correlation-id": "second-trace" } }),
  );
  await secondReady.promise;
  releaseFirst.resolve();
  const firstResponse = await first;
  releaseSecond.resolve();
  const secondResponse = await second;
  const a = await firstResponse.json();
  const b = await secondResponse.json();
  assertEquals(a.requestId, a.expectedId);
  assertEquals(b.requestId, b.expectedId);
  assertEquals(a.userId, "first-user");
  assertEquals(b.userId, "second-user");
  assertEquals(a.owner, "first-user");
  assertEquals(b.owner, "second-user");
  assertEquals(a.headers["X-Correlation-Id"], "first-trace");
  assertEquals(b.headers["X-Correlation-Id"], "second-trace");
  assertEquals(a.spans, ["first-user"]);
  assertEquals(b.spans, ["second-user"]);
  assertEquals(getContext(), null);
});

Deno.test("nested context restores its parent after failure", async () => {
  const outer = createContext(new Request("https://example.com/outer"));
  const inner = createContext(new Request("https://example.com/inner"));
  clearContext();
  await withContext(outer, async () => {
    try {
      await withContext(inner, async () => {
        assertEquals(getContext(), inner);
        throw new Error("expected test failure");
      });
    } catch {
      assertEquals(getContext(), outer);
    }
  });
  assertEquals(getContext(), null);
});

Deno.test("API factory keeps response metadata bound to concurrent requests", async () => {
  clearContext();
  const ready = Promise.withResolvers<void>();
  const release = Promise.withResolvers<void>();
  const handler = createAPIHandler({
    service: "context-factory-test",
    requireAuth: false,
    routes: {
      GET: {
        handler: async (ctx) => {
          if (ctx.request.url.endsWith("/first")) {
            ready.resolve();
            await release.promise;
          }
          return ok({ expectedRequestId: ctx.ctx.requestId }, ctx);
        },
      },
    },
  });
  const first = handler(
    new Request("https://example.com/first", { headers: { "x-correlation-id": "first" } }),
  );
  await ready.promise;
  const second = await handler(
    new Request("https://example.com/second", { headers: { "x-correlation-id": "second" } }),
  );
  release.resolve();
  const response = await first;
  const body = await response.json();
  assertEquals(body.meta.requestId, body.data.expectedRequestId);
  assertEquals(response.headers.get("X-Correlation-Id"), "first");
  assertEquals(second.headers.get("X-Correlation-Id"), "second");
  assertEquals(getContext(), null);
});
