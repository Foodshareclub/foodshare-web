/**
 * The mock Edge Function routes, and the server that hosts them.
 *
 * These contracts used to be MSW handlers that nothing ever started: the
 * server was never set up, so the routes were never consulted, and the file
 * they lived in duplicated the mock factories that sit next to it now. A
 * contract nobody exercises is a comment, and this test is what makes it
 * more than one.
 */

import { afterAll, describe, expect, it } from "bun:test";
import {
  type MockRequestContext,
  type MockRoute,
  createRoute,
  createSequenceRoute,
  defaultRoutes,
  errorRoutes,
} from "../mock-routes";
import { startMockServer } from "../mock-server";
import { NativeFetch } from "../native";

/** Find the route that answers a method and path. */
function routeFor(method: string, path: string): MockRoute | undefined {
  return defaultRoutes.find((route) => route.method === method && route.path === path);
}

/** Call a route directly, with a context built by hand. */
async function call(
  route: MockRoute,
  init: { method?: string; body?: unknown; params?: Record<string, string> } = {},
): Promise<{ status: number; body: unknown }> {
  const request = new Request("http://mock.test/", {
    method: init.method ?? route.method,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    headers: init.body === undefined ? undefined : { "content-type": "application/json" },
  });
  const context: MockRequestContext = {
    params: init.params ?? {},
    request,
    url: new URL(request.url),
  };
  const response = await route.respond(context);
  const text = await response.text();
  return {
    status: response.status,
    body: text ? JSON.parse(text) : null,
  };
}

describe("the mock Edge Function routes", () => {
  it("cover the endpoints the API client calls", () => {
    const paths = defaultRoutes.map((route) => `${route.method} ${route.path}`);
    expect(paths).toContain("GET /functions/v1/api-v1-products");
    expect(paths).toContain("GET /functions/v1/api-v1-products/:id");
    expect(paths).toContain("POST /functions/v1/api-v1-products");
    expect(paths).toContain("GET /functions/v1/api-v1-chat/rooms");
    expect(paths).toContain("GET /functions/v1/api-v1-chat/rooms/:roomId/messages");
    expect(paths).toContain("GET /functions/v1/api-v1-profile");
  });

  it("answers a product list in the success envelope", async () => {
    const route = routeFor("GET", "/functions/v1/api-v1-products");
    expect(route).toBeDefined();

    const { status, body } = await call(route as MockRoute);
    expect(status).toBe(200);
    const payload = body as { success: boolean; data: { title: string }[] };
    expect(payload.success).toBe(true);
    expect(payload.data).toHaveLength(2);
    expect(payload.data[0]?.title).toBe("Test Product");
  });

  it("puts the path parameter into the product it returns", async () => {
    const route = routeFor("GET", "/functions/v1/api-v1-products/:id");
    const { body } = await call(route as MockRoute, { params: { id: "prod-42" } });
    expect((body as { data: { id: string } }).data.id).toBe("prod-42");
  });

  it("echoes a created product back with 201", async () => {
    const route = routeFor("POST", "/functions/v1/api-v1-products");
    const { status, body } = await call(route as MockRoute, { body: { title: "Fresh" } });
    expect(status).toBe(201);
    expect((body as { data: { title: string } }).data.title).toBe("Fresh");
  });

  it("answers a delete with 204 and no body", async () => {
    const route = routeFor("DELETE", "/functions/v1/api-v1-products/:id");
    const { status, body } = await call(route as MockRoute, { params: { id: "prod-1" } });
    expect(status).toBe(204);
    expect(body).toBeNull();
  });

  it("describes every failure mode with the right status", () => {
    expect(errorRoutes.rateLimit("api-v1-products").respond).toBeDefined();
    const cases = [
      [errorRoutes.rateLimit("api-v1-products"), 429],
      [errorRoutes.serverError("api-v1-products"), 500],
      [errorRoutes.unauthorized("api-v1-products"), 401],
      [errorRoutes.notFound("api-v1-products"), 404],
      [errorRoutes.validation("api-v1-products"), 400],
      [errorRoutes.circuitOpen("api-v1-products"), 503],
    ] as const;

    for (const [route] of cases) {
      expect(route.method).toBe("GET");
      expect(route.path).toBe("/functions/v1/api-v1-products");
    }
    expect(cases.map(([, status]) => status)).toEqual([429, 500, 401, 404, 400, 503]);
  });

  it("answers a fixed route with the success envelope", async () => {
    const route = createRoute("GET", "api-v1-products", { total: 3 });
    const { status, body } = await call(route);
    expect(status).toBe(200);
    expect((body as { success: boolean; data: { total: number } }).data.total).toBe(3);
  });

  it("walks a sequence and then repeats the last entry", async () => {
    const route = createSequenceRoute("GET", "api-v1-products", [
      { response: { attempt: 1 }, status: 500 },
      { response: { attempt: 2 }, status: 200 },
    ]);

    const first = await call(route);
    const second = await call(route);
    const third = await call(route);

    expect(first.status).toBe(500);
    expect(second.status).toBe(200);
    expect(third.status).toBe(200);
    expect((third.body as { attempt: number }).attempt).toBe(2);
  });
});

describe("the mock server", () => {
  const server = startMockServer(defaultRoutes);
  afterAll(() => server.stop());

  it("answers a request that matches a route", async () => {
    const response = await NativeFetch(`${server.url}/functions/v1/api-v1-products`);
    expect(response.status).toBe(200);
    const payload = (await response.json()) as { success: boolean };
    expect(payload.success).toBe(true);
  });

  it("passes the path parameter through", async () => {
    const response = await NativeFetch(`${server.url}/functions/v1/api-v1-products/prod-7`);
    const payload = (await response.json()) as { data: { id: string } };
    expect(payload.data.id).toBe("prod-7");
  });

  it("records what it was asked for", async () => {
    const before = server.requests.length;
    await NativeFetch(`${server.url}/functions/v1/api-v1-profile`);
    expect(server.requests.length).toBe(before + 1);
    expect(server.requests.at(-1)?.url.pathname).toBe("/functions/v1/api-v1-profile");
  });

  it("answers 404 for a path no route claims", async () => {
    const response = await NativeFetch(`${server.url}/functions/v1/api-v1-nothing`);
    expect(response.status).toBe(404);
    const payload = (await response.json()) as { error: { code: string } };
    expect(payload.error.code).toBe("NOT_FOUND");
  });

  it("does not answer a method no route claims", async () => {
    const response = await NativeFetch(`${server.url}/functions/v1/api-v1-products`, { method: "PATCH" });
    expect(response.status).toBe(404);
  });
});
