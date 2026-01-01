/**
 * MSW Test Setup
 *
 * Configures Mock Service Worker for testing environments.
 * Import this in your test setup file.
 *
 * @module lib/testing/setup
 */

import { defaultHandlers } from "./msw-handlers";

// =============================================================================
// Server Setup (Lazy initialization)
// =============================================================================

let _server: ReturnType<typeof import("msw/node").setupServer> | null = null;

/**
 * Get or create MSW server instance
 * Lazy initialization to avoid issues with missing globals
 */
async function getServer() {
  if (!_server) {
    const { setupServer } = await import("msw/node");
    _server = setupServer(...defaultHandlers);
  }
  return _server;
}

/**
 * MSW server instance for Node.js testing
 * Note: Use setupMSW() in your test setup instead of accessing this directly
 */
export const server = {
  listen: async (options?: { onUnhandledRequest?: "warn" | "error" | "bypass" }) => {
    const s = await getServer();
    s.listen(options);
  },
  resetHandlers: async () => {
    const s = await getServer();
    s.resetHandlers();
  },
  close: async () => {
    const s = await getServer();
    s.close();
  },
  use: async (...handlers: Parameters<Awaited<ReturnType<typeof getServer>>["use"]>) => {
    const s = await getServer();
    s.use(...handlers);
  },
};

/**
 * Setup function for Jest/Vitest
 * Call this in your test setup file
 */
export function setupMSW() {
  // Start server before all tests
  beforeAll(async () => {
    await server.listen({
      onUnhandledRequest: "warn",
    });
  });

  // Reset handlers after each test
  afterEach(async () => {
    await server.resetHandlers();
  });

  // Clean up after all tests
  afterAll(async () => {
    await server.close();
  });
}

/**
 * Add custom handlers for a specific test
 */
export async function useHandlers(...handlers: Parameters<typeof server.use>) {
  await server.use(...handlers);
}

/**
 * Reset to default handlers
 */
export async function resetHandlers() {
  await server.resetHandlers();
}

// =============================================================================
// Browser Setup (for Storybook/E2E)
// =============================================================================

/**
 * Initialize MSW in browser environment
 * Use this for Storybook or browser-based testing
 */
export async function initBrowserMSW() {
  if (typeof window === "undefined") {
    console.warn("initBrowserMSW should only be called in browser environment");
    return;
  }

  const { setupWorker } = await import("msw/browser");
  const worker = setupWorker(...defaultHandlers);

  await worker.start({
    onUnhandledRequest: "bypass",
    serviceWorker: {
      url: "/mockServiceWorker.js",
    },
  });

  return worker;
}
