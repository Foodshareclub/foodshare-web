/**
 * Client IP derivation for rate limiting and lockout.
 *
 * `X-Forwarded-For` is a list that each proxy appends to. Taking the *first*
 * entry trusts the value the caller supplied, so a client could choose the IP
 * that the login blocklist records and counts. This helper prefers headers the
 * edge proxy sets itself, and otherwise takes the *last* hop (the one appended
 * by the nearest proxy) rather than the first.
 *
 * The result is validated as an IP literal; anything else is discarded. A
 * missing IP is not a failure — callers fall back to account-only lockouts
 * rather than grouping every request under a shared empty key.
 */

const IPV4 = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;

// Deliberately permissive about IPv6 spelling, strict about characters and
// requiring at least one colon. `::1`, `2001:db8::1` and IPv4-mapped forms pass;
// hostnames, ports and bracketed forms do not.
const IPV6 = /^[0-9a-f:]+$/i;

function isValidIp(value: string): boolean {
  if (!value) return false;
  if (IPV4.test(value)) return true;
  if (!value.includes(":")) return false;
  if (!IPV6.test(value)) return false;
  return value.split(":").length >= 3;
}

function firstValid(candidates: string[]): string | null {
  for (const candidate of candidates) {
    const value = candidate.trim();
    if (isValidIp(value)) return value;
  }
  return null;
}

export function getClientIp(request: Request): string | null {
  // Set by the edge/CDN and not forwarded from the client.
  const direct = firstValid([
    request.headers.get("cf-connecting-ip") ?? "",
    request.headers.get("true-client-ip") ?? "",
    request.headers.get("x-real-ip") ?? "",
  ]);
  if (direct) return direct;

  const forwarded = request.headers.get("x-forwarded-for");
  if (!forwarded) return null;

  const hops = forwarded.split(",").map((hop) => hop.trim()).filter(Boolean);
  for (let i = hops.length - 1; i >= 0; i--) {
    if (isValidIp(hops[i])) return hops[i];
  }
  return null;
}
