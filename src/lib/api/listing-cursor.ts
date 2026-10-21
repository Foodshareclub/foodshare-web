import type { NearbyCursor } from "@/lib/data/nearby-posts";

/**
 * Keyset cursor codec for the location-scoped listing feed.
 *
 * Lives outside the route file because a Next.js route module may only
 * export the HTTP verbs and the route's config — anything else fails the
 * build's route-type check.
 *
 * A `NearbyCursor` is `{ distance, id }`. It travels in a query string, so
 * it is base64url-encoded JSON rather than a bare pair of numbers: the pair
 * would need its own delimiter and escaping rules, and an unvalidated pair
 * is a foot-gun — a malformed cursor must not silently reset the feed to
 * page one, because re-serving rows the client already has makes its dedupe
 * hide them and the feed appears to stall.
 *
 * `btoa`/`atob` rather than `Buffer`: the client encodes its server-rendered
 * starting cursor through this same function, and `Buffer` is not a browser
 * global. The payload is two finite numbers, so its JSON is pure ASCII and
 * the latin1 semantics of `btoa` cannot mangle it — that assumption is
 * stated here because it is the only thing making the two environments
 * agree.
 */

/** Encode a keyset position for the wire. Null in, null out. */
export function encodeNearbyCursor(cursor: NearbyCursor | null | undefined): string | null {
  if (!cursor) return null;
  if (!isUsableCursor(cursor)) return null;

  const json = JSON.stringify({ d: cursor.distance, i: cursor.id });
  return base64UrlEncode(json);
}

/**
 * Decode a keyset position. Anything unrecognised — absent, not base64, not
 * JSON, wrong shape, NaN — is treated as "no cursor", i.e. page one.
 */
export function decodeNearbyCursor(raw: string | null | undefined): NearbyCursor | null {
  if (!raw) return null;

  let decoded: unknown;
  try {
    decoded = JSON.parse(base64UrlDecode(raw));
  } catch {
    return null;
  }

  if (typeof decoded !== "object" || decoded === null) return null;

  const { d, i } = decoded as { d?: unknown; i?: unknown };
  if (typeof d !== "number" || typeof i !== "number") return null;
  if (!Number.isFinite(d) || !Number.isFinite(i)) return null;
  // `distance` is a sort key in metres and `id` is a serial: both are
  // non-negative. A negative value is a hand-edited cursor, and letting it
  // through produces a keyset predicate no row satisfies.
  if (d < 0 || i <= 0) return null;

  return { distance: d, id: i };
}

function isUsableCursor(cursor: NearbyCursor): boolean {
  return (
    typeof cursor.distance === "number" &&
    typeof cursor.id === "number" &&
    Number.isFinite(cursor.distance) &&
    Number.isFinite(cursor.id) &&
    cursor.distance >= 0 &&
    cursor.id > 0
  );
}

function base64UrlEncode(input: string): string {
  const b64 =
    typeof btoa === "function"
      ? btoa(input)
      : // Node without a global btoa (should not happen on 20+, but the
        // encode is a pure function of ASCII so the fallback is exact).
        Buffer.from(input, "binary").toString("base64");
  return b64.replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function base64UrlDecode(input: string): string {
  const b64 = input.replaceAll("-", "+").replaceAll("_", "/");
  const padded = b64.padEnd(b64.length + ((4 - (b64.length % 4)) % 4), "=");

  if (typeof atob === "function") return atob(padded);
  return Buffer.from(padded, "base64").toString("binary");
}
