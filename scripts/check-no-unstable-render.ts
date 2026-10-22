#!/usr/bin/env bun
/**
 * Render every page with the database unreachable, and fail if the
 * framework refuses one.
 *
 * A prerender refuses `new Date()` and `Date.now()`: a value that changes
 * between renders cannot be baked into a prerendered page. The refusal
 * aborts the whole render, and the visitor gets an error page instead of
 * the page.
 *
 * It happens in the error path, which is why it is so easy to miss. A
 * page that catches a failed data fetch and logs it reads the clock on the
 * way, and the log line -- the thing written to report the failure -- is
 * what breaks the page. It was measured here: with the database
 * unreachable, the home page answered with a 295 KB error page after 7.4
 * seconds, and the server said
 *
 *     Error: Route "/": Next.js encountered the unstable value
 *     `new Date()` while prerendering.
 *
 * The same happens in a page that renders fine when the database is up
 * and fails when it is down, which is the worst time for it to fail.
 *
 * A static check cannot find these. A file that is imported by a page is
 * not necessarily *called* by it -- this repository re-exports most of
 * `src/lib` through barrels, so an import graph reaches code that never
 * runs during a render. The framework, on the other hand, knows exactly
 * which read aborted which render, and says so.
 *
 * So this check asks the framework. It starts the built application with
 * an unreachable database -- which is what makes the error paths run --
 * requests every page, and fails if the server refused an unstable value
 * on any of them.
 *
 * The pages are requested concurrently: with the database unreachable,
 * each one waits for the data layer's own timeout before it fails, and
 * there are sixty-odd of them.
 *
 * Usage: bun scripts/check-no-unstable-render.ts
 *
 * The build must exist: `bun run build` first.
 */

import { existsSync } from "bun:fs";
import { join } from "bun:path";

const ROOT = new URL("..", import.meta.url).pathname;
const PORT = Number(process.env.CHECK_PORT ?? 3199);
const BASE = `http://127.0.0.1:${PORT}`;

/** How many pages to request at once. */
const CONCURRENCY = 8;

/** The framework's own words for a refused value. */
const REFUSALS = ["encountered the unstable value", "blocking-prerender-current-time"];

if (!existsSync(join(ROOT, ".next", "BUILD_ID"))) {
  console.error("❌ there is no build to check. Run `bun run build` first.");
  process.exit(1);
}

/**
 * The pages to request.
 *
 * Every route the application serves, from the route files themselves, so
 * a new page is checked without anyone remembering to list it. The
 * dynamic segments are given a value that renders -- the point is to
 * reach the render, not to assert what the page says.
 */
async function pageRoutes(): Promise<string[]> {
  const routes: string[] = [];
  const glob = new Bun.Glob("src/app/**/page.tsx");
  for await (const path of glob.scan({ cwd: ROOT, onlyFiles: true })) {
    let route = path.replace(/^src\/app/, "").replace(/\/page\.tsx$/, "");
    route = route.replace(/\/\([^/]+\)/g, ""); // a route group
    route = route.replace(/@[^/]+\//, ""); // a parallel route slot
    if (route === "") route = "/";
    // A dynamic segment gets a value that renders.
    route = route.replace(/\[\.\.\.[^\]]+\]/g, "1");
    route = route.replace(/\[([^\]]+)\]/g, "1");
    routes.push(route);
  }
  return [...new Set(routes)].sort();
}

const server = Bun.spawn(["bun", "--bun", "next", "start", "--port", String(PORT)], {
  cwd: ROOT,
  // The server gets its own process group, so that stopping it does not
  // take this check with it: `kill()` signals the group, and the group
  // includes the check itself.
  detached: true,
  env: {
    ...process.env,
    // The point of the check: the database is not there, so the error
    // paths run.
    NEXT_PUBLIC_SUPABASE_URL: "https://unreachable.invalid",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "check",
    SKIP_ENV_VALIDATION: "true",
    // The proxy refuses every request without a rate limiter, so the
    // limiter is not required here.
    CI: "true",
  },
  stdout: "pipe",
  stderr: "pipe",
});

// The server's output is read here. The framework's refusal goes to
// stderr, and the startup banner to stdout, so both are collected -- into
// separate streams, because a `WritableStream` can be written to once.
let serverLog = "";
const decoder = new TextDecoder();
const collect = (chunk: Uint8Array) => {
  serverLog += decoder.decode(chunk, { stream: true });
};
server.stdout?.pipeTo(new WritableStream<Uint8Array>({ write: collect })).catch(() => {});
server.stderr?.pipeTo(new WritableStream<Uint8Array>({ write: collect })).catch(() => {});

async function waitForServer(deadlineMs: number): Promise<boolean> {
  const deadline = Date.now() + deadlineMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${BASE}/api/ready`, { signal: AbortSignal.timeout(2000) });
      if (response.ok) return true;
    } catch {
      // not up yet
    }
    await Bun.sleep(250);
  }
  return false;
}

const routes = await pageRoutes();

if (!(await waitForServer(60_000))) {
  server.kill("SIGKILL");
  console.error("❌ the application did not start, so nothing was checked.");
  console.error(serverLog.slice(-2000));
  process.exit(1);
}

const failures: { route: string; status: number }[] = [];

/** Request one page, and record it if it answered with an error. */
async function request(route: string): Promise<void> {
  try {
    const response = await fetch(`${BASE}${route}`, {
      headers: { "user-agent": "check-no-unstable-render" },
      signal: AbortSignal.timeout(60_000),
      redirect: "manual",
    });
    // Drain the body, so the connection is released.
    await response.arrayBuffer();
    // A 500 is the refusal surfacing as a response rather than as
    // a log line -- the same failure, seen from the other side.
    if (response.status >= 500) {
      failures.push({ route, status: response.status });
    }
  } catch {
    failures.push({ route, status: 0 });
  }
}

// The pages are requested concurrently: each one waits for the data
// layer's own timeout before it fails, and there are sixty-odd of them.
let next = 0;
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    while (next < routes.length) {
      const route = routes[next++];
      await request(route);
    }
  }),
);

// The server is stopped with SIGKILL. The server runs in its own process
// group, so the signal reaches it and not this check.
server.kill("SIGKILL");
await server.exited;
await Bun.sleep(100);

// The framework's message, if it refused anything.
const refusals = REFUSALS.filter((needle) => serverLog.includes(needle));

if (refusals.length > 0 || failures.length > 0) {
  console.error("❌ a prerender refused an unstable value.\n");
  for (const needle of refusals) {
    const line = serverLog.split("\n").find((l) => l.includes(needle)) ?? "";
    console.error(`   the server said: ${line.trim().slice(0, 160)}`);
  }
  if (failures.length > 0) {
    console.error(`\n   ${failures.length} page(s) answered with an error:`);
    for (const failure of failures.slice(0, 20)) {
      console.error(`     ${failure.route}  ->  ${failure.status || "no response"}`);
    }
  }
  console.error(
    "\nA prerender refuses `new Date()` and `Date.now()`, and the refusal\n" +
      "aborts the whole render -- so the page the visitor gets is an error\n" +
      "page, not the page. The two fixes the framework documents:\n" +
      '  - cache it: `"use cache"` with a `cacheLife`, so the value is\n' +
      "    prerendered rather than read\n" +
      "  - measure it: `performance.timeOrigin` and `performance.now()`,\n" +
      "    which the framework does not refuse\n",
  );
  process.exit(1);
}

console.log(`✅ no page refused an unstable value (${routes.length} pages rendered with the database unreachable)`);

// The server's pipes keep the event loop alive, so the check leaves
// explicitly rather than waiting for the loop to drain.
process.exit(0);
