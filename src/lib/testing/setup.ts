/**
 * Mock server setup.
 *
 * A thin lifecycle around `mock-server.ts`: start a server for a set of
 * routes, hand back its origin, and stop it when the test is done.
 *
 * @module lib/testing/setup
 */

import { type MockRoute, defaultRoutes } from "./mock-routes";
import { type MockServer, startMockServer } from "./mock-server";

let running: MockServer | null = null;

/**
 * Start the mock Edge Function server.
 *
 * The returned `url` is the origin to point the API client at: the client
 * builds `${SUPABASE_URL}/functions/v1/<edge-function>`, so
 * `process.env.NEXT_PUBLIC_SUPABASE_URL = server.url` routes it to the mock.
 *
 * Starting a second server stops the first, so a test that replaces the
 * routes does not leave the old one listening.
 */
export function setupMockServer(routes: MockRoute[] = defaultRoutes): MockServer {
  running?.stop();
  running = startMockServer(routes);
  return running;
}

/**
 * Stop the mock server, if one is running.
 */
export function teardownMockServer(): void {
  running?.stop();
  running = null;
}

/**
 * The server that is running, if any.
 */
export function getMockServer(): MockServer | null {
  return running;
}
