/**
 * Request guards for the `main` edge router.
 *
 * Kong proxies the public `/functions/v1/*` surface to this router and always
 * sets `X-Forwarded-*` headers. Prometheus and the container healthcheck reach
 * the router directly on the stack network, so they never carry those headers.
 * Telemetry routes are therefore served only to direct, in-network callers.
 */

const PROXY_HEADERS = [
  "x-forwarded-for",
  "x-forwarded-host",
  "x-forwarded-proto",
  "x-forwarded-path",
  "x-real-ip",
  "forwarded",
];

const TELEMETRY_PATHS = new Set(["/_internal/health", "/_internal/metric", "/metrics"]);

export function isTelemetryPath(pathname: string): boolean {
  return TELEMETRY_PATHS.has(pathname);
}

/** True when the request arrived through the public gateway or another proxy. */
export function isProxiedRequest(headers: Headers): boolean {
  return PROXY_HEADERS.some((name) => headers.has(name));
}

// Function directory names are lowercase kebab/snake case. Rejecting every
// other character blocks `/`, `.`, `..` and percent-encoded traversal before
// the name is joined into a filesystem path.
const SERVICE_NAME_PATTERN = /^[a-z0-9][a-z0-9_-]{0,63}$/;

/** Names that are routers or shared code, never directly invocable functions. */
const RESERVED_SERVICE_NAMES = new Set(["main"]);

export function isValidServiceName(name: string): boolean {
  return SERVICE_NAME_PATTERN.test(name) && !RESERVED_SERVICE_NAMES.has(name);
}
