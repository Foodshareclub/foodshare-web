/**
 * A mock Edge Function server, on `Bun.serve`.
 *
 * The routes in `mock-routes.ts` are plain objects, so they can be called
 * directly and asserted on without a server anywhere. This module is the
 * optional adapter: it puts a set of routes behind a real HTTP server, so a
 * test can point the API client at it and exercise the whole request path —
 * the client's URL building, its headers, its parsing of the response.
 *
 * It is Bun's own server, on Bun's own runtime, with no interceptor library
 * in between. The response has to be built with Bun's `Response` rather than
 * the global one, which the test runner's happy-dom preload has replaced —
 * see `native.ts`.
 *
 * @module lib/testing/mock-server
 */

import { type MockRequestContext, type MockRoute, jsonResponse } from "./mock-routes";
import { NativeResponse } from "./native";

export type MockServer = {
  /** The origin to point the API client at. */
  url: string;
  /** Every request the server has seen, in order. */
  requests: MockRequestContext[];
  /** Stop the server. */
  stop: () => void;
};

type CompiledRoute = {
  route: MockRoute;
  regex: RegExp;
  keys: string[];
};

/** Escape the characters that mean something in a regular expression. */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Turn a path pattern into a matcher.
 *
 * `:name` becomes a capture group, and the group names are returned so the
 * handler can be handed them as `params`.
 */
function compilePath(path: string): { regex: RegExp; keys: string[] } {
  const keys: string[] = [];
  const pattern = path
    .split("/")
    .map((segment) => {
      if (!segment.startsWith(":")) return escapeRegExp(segment);
      keys.push(segment.slice(1));
      return "([^/]+)";
    })
    .join("/");

  return { regex: new RegExp(`^${pattern}$`), keys };
}

/**
 * Start a mock server for a set of routes.
 *
 * The server binds to an ephemeral port on the loopback interface, so
 * several can run at once and nothing is left listening afterwards.
 */
export function startMockServer(routes: MockRoute[]): MockServer {
  const compiled: CompiledRoute[] = routes.map((route) => ({
    route,
    ...compilePath(route.path),
  }));
  const requests: MockRequestContext[] = [];

  const server = Bun.serve({
    port: 0,
    hostname: "127.0.0.1",
    async fetch(request) {
      const url = new URL(request.url);

      for (const { route, regex, keys } of compiled) {
        if (route.method !== request.method) continue;

        const match = regex.exec(url.pathname);
        if (!match) continue;

        const params: Record<string, string> = {};
        keys.forEach((key, index) => {
          params[key] = decodeURIComponent(match[index + 1] ?? "");
        });

        const context: MockRequestContext = { params, request, url };
        requests.push(context);
        return await route.respond(context);
      }

      return new NativeResponse(
        JSON.stringify({
          success: false,
          error: {
            code: "NOT_FOUND",
            message: `No mock route for ${request.method} ${url.pathname}`,
          },
        }),
        { status: 404, headers: { "content-type": "application/json" } },
      );
    },
  });

  return {
    url: `http://127.0.0.1:${server.port}`,
    requests,
    stop: () => server.stop(true),
  };
}

/**
 * Start a mock server that answers nothing but 404s.
 *
 * Useful for a test that wants to prove the client handles a missing
 * endpoint, rather than a mocked one.
 */
export function startEmptyMockServer(): MockServer {
  return startMockServer([]);
}

/** Re-exported so a caller does not have to reach into `mock-routes.ts`. */
export { jsonResponse };
export type { MockRequestContext, MockRoute };
