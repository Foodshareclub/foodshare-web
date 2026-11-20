/**
 * URL Validation and SSRF Protection
 *
 * Protection against Server-Side Request Forgery (SSRF) attacks, in three
 * layers:
 *
 * - validateUrl / validateImageUrl — synchronous checks: scheme, length,
 *   ports, credentials, blocked hostnames, IP-literal ranges. These do NOT
 *   resolve hostnames.
 * - resolveAndValidateUrl — the SSRF gate: resolves A + AAAA records and
 *   rejects the URL if ANY resolved IP is private/internal (RFC1918,
 *   loopback, link-local/metadata, CGNAT, IPv6 ULA, TEST-NETs, multicast),
 *   including decimal/octal/hex IP encodings and IPv4-mapped IPv6.
 * - fetchPinned — the fetch: connects with DNS pinned to a validated IP
 *   (rebinding-proof), SNI/Host/cert on the original hostname (cert
 *   validation never disabled), redirects rejected, streaming byte cap and
 *   total deadline enforced.
 *
 * Every server-side fetch path MUST call resolveAndValidateUrl and then
 * fetchPinned with one of the validated IPs — never a bare fetch().
 */

/**
 * Private IP ranges that should be blocked
 */
const PRIVATE_IP_RANGES = [
  // IPv4 Private ranges
  { start: "10.0.0.0", end: "10.255.255.255" }, // Class A
  { start: "172.16.0.0", end: "172.31.255.255" }, // Class B
  { start: "192.168.0.0", end: "192.168.255.255" }, // Class C
  { start: "127.0.0.0", end: "127.255.255.255" }, // Loopback
  { start: "169.254.0.0", end: "169.254.255.255" }, // Link-local
  { start: "0.0.0.0", end: "0.255.255.255" }, // Current network

  // IPv4 Special ranges
  { start: "100.64.0.0", end: "100.127.255.255" }, // Carrier-grade NAT
  { start: "192.0.0.0", end: "192.0.0.255" }, // IETF Protocol Assignments
  { start: "192.0.2.0", end: "192.0.2.255" }, // TEST-NET-1
  { start: "198.51.100.0", end: "198.51.100.255" }, // TEST-NET-2
  { start: "203.0.113.0", end: "203.0.113.255" }, // TEST-NET-3
  { start: "224.0.0.0", end: "255.255.255.255" }, // Multicast + Reserved
];

/**
 * Cloud metadata endpoints that should be blocked
 */
const BLOCKED_HOSTNAMES = [
  // AWS
  "169.254.169.254",
  "fd00:ec2::254",
  "metadata.google.internal",
  // GCP
  "metadata.goog",
  "169.254.169.254",
  // Azure
  "169.254.169.254",
  // DigitalOcean
  "169.254.169.254",
  // Kubernetes
  "kubernetes.default",
  "kubernetes.default.svc",
  // Container runtimes (Docker Desktop + Podman)
  "host.docker.internal",
  "host.containers.internal",
  // Local
  "localhost",
  "127.0.0.1",
  "::1",
  "[::1]",
];

/**
 * Allowed URL schemes for external requests
 */
const ALLOWED_SCHEMES = ["http:", "https:"];

/**
 * URL validation result
 */
export interface UrlValidationResult {
  valid: boolean;
  reason?: string;
  hostname?: string;
  ip?: string;
}

/**
 * Options for URL validation
 */
export interface UrlValidationOptions {
  /** Allow HTTP scheme (default: true for development, false for production) */
  allowHttp?: boolean;
  /** Additional hostnames to block */
  additionalBlockedHostnames?: string[];
  /** Allow localhost in development mode */
  allowLocalhost?: boolean;
  /** Maximum URL length (default: 2048) */
  maxLength?: number;
}

/**
 * Convert IP address string to numeric value for range checking
 */
function ipToNumber(ip: string): number {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    return -1;
  }
  return (parts[0] << 24) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
}

/**
 * Normalize an IP address string, handling:
 * - IPv4-mapped IPv6 (::ffff:1.2.3.4 → 1.2.3.4)
 * - IPv4-translated IPv6 (::ffff:1.2.3.4 variant)
 * - Bracketed IPv6 ([::1] → ::1)
 *
 * Returns the normalized IP string.
 */
function normalizeIp(ip: string): string {
  const normalized = ip.replace(/^\[|\]$/g, "").toLowerCase();

  // IPv4-mapped IPv6 (dotted): ::ffff:a.b.c.d → a.b.c.d
  const mappedMatch = normalized.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (mappedMatch) {
    return mappedMatch[1];
  }

  // IPv4-mapped IPv6 (hex groups, as produced by `new URL()` normalization):
  // ::ffff:XXXX:YYYY → a.b.c.d
  // e.g. ::ffff:a9fe:a9fe → 169.254.169.254, ::ffff:a00:1 → 10.0.0.1
  const hexMatch = normalized.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (hexMatch) {
    const high = parseInt(hexMatch[1], 16);
    const low = parseInt(hexMatch[2], 16);
    if (high <= 0xffff && low <= 0xffff) {
      return [
        (high >> 8) & 0xff,
        high & 0xff,
        (low >> 8) & 0xff,
        low & 0xff,
      ].join(".");
    }
  }

  return normalized;
}

/**
 * Parse a possibly-encoded IPv4 address (decimal, octal, hex, dotted) to a
 * canonical 4-octet string, or return null if it's not a valid IPv4.
 *
 * Deno.resolveDns can return "2130706433" (decimal 127.0.0.1) or
 * "0x7f.0.0.1" — normalize all encodings so isPrivateIp can range-check them.
 */
function parseIpv4Encoded(ip: string): string | null {
  // Already dotted decimal
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip)) {
    const parts = ip.split(".").map(Number);
    if (parts.some((p) => p > 255)) return null;
    return ip;
  }

  // Pure decimal: 2130706433 → 127.0.0.1
  if (/^\d+$/.test(ip)) {
    const n = parseInt(ip, 10);
    if (n > 0xFFFFFFFF) return null;
    return [
      (n >>> 24) & 0xff,
      (n >>> 16) & 0xff,
      (n >>> 8) & 0xff,
      n & 0xff,
    ].join(".");
  }

  // Hex: 0x7f000001
  if (/^0x[0-9a-f]+$/i.test(ip)) {
    const n = parseInt(ip, 16);
    if (n > 0xFFFFFFFF) return null;
    return [
      (n >>> 24) & 0xff,
      (n >>> 16) & 0xff,
      (n >>> 8) & 0xff,
      n & 0xff,
    ].join(".");
  }

  // Octal/hex dotted: 0177.0.0.1, 0x7f.0.0.1
  if (/^(\d{1,3}|0[xX][0-9a-fA-F]{1,2})\.(.)*$/.test(ip) && ip.includes(".")) {
    const parts = ip.split(".");
    if (parts.length !== 4) return null;
    const parsed = parts.map((p) => {
      if (/^0[xX]/i.test(p)) return parseInt(p, 16);
      if (/^0\d/.test(p)) return parseInt(p, 8); // leading-zero octal
      return parseInt(p, 10);
    });
    if (parsed.some((p) => isNaN(p) || p > 255)) return null;
    return parsed.join(".");
  }

  return null;
}

/**
 * Check if an IP address is in a private range.
 *
 * Handles: dotted IPv4, decimal/octal/hex-encoded IPv4, IPv4-mapped IPv6,
 * IPv6 loopback/link-local/unique-local.
 */
function isPrivateIp(ip: string): boolean {
  // Normalize (strip brackets, unwrap IPv4-mapped IPv6)
  const normalized = normalizeIp(ip);

  // Try to parse as IPv4 (handles encoded forms)
  const ipv4 = parseIpv4Encoded(normalized);
  if (ipv4) {
    const ipNum = ipToNumber(ipv4);
    if (ipNum !== -1) {
      for (const range of PRIVATE_IP_RANGES) {
        const startNum = ipToNumber(range.start);
        const endNum = ipToNumber(range.end);
        if (ipNum >= startNum && ipNum <= endNum) {
          return true;
        }
      }
      return false; // valid public IPv4
    }
  }

  // IPv6 checks
  if (normalized === "::1" || normalized === "[::1]") return true; // loopback
  if (normalized.startsWith("fe80:")) return true; // link-local
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true; // ULA (fc00::/7)
  if (normalized === "::") return true; // unspecified
  if (normalized.startsWith("2001:db8:")) return true; // documentation (2001:db8::/32)
  if (normalized.startsWith("64:ff9b")) return true; // NAT64 well-known prefix
  if (normalized.startsWith("2001:2:")) return true; // benchmarking
  if (normalized.startsWith("100:")) return true; // discarded (100::/64)
  // IPv4-mapped IPv6 that parseIpv4Encoded didn't catch (e.g. ::ffff:7f00:1)
  if (normalized.startsWith("::ffff:")) {
    const tail = normalized.slice(7);
    // Could be hex groups or dotted
    const ipv4FromHex = parseIpv4Encoded(tail);
    if (ipv4FromHex) {
      const ipNum = ipToNumber(ipv4FromHex);
      if (ipNum !== -1) {
        for (const range of PRIVATE_IP_RANGES) {
          if (ipNum >= ipToNumber(range.start) && ipNum <= ipToNumber(range.end)) {
            return true;
          }
        }
      }
    }
    // IPv4-mapped with a public IPv4 → public
    return false;
  }
  // Global unicast (2000::/3): first hex digit is 2 or 3 → PUBLIC
  if (normalized.startsWith("2") || normalized.startsWith("3")) {
    return false;
  }

  // Unknown IPv6 → treat as private (fail-closed)
  return true;
}

/**
 * Check if hostname looks like an IP address
 */
function looksLikeIp(hostname: string): boolean {
  // IPv4 pattern
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
    return true;
  }
  // IPv6 pattern (simplified)
  if (hostname.includes(":") || hostname.startsWith("[")) {
    return true;
  }
  return false;
}

/**
 * Check if a hostname is blocked
 */
function isBlockedHostname(
  hostname: string,
  additionalBlocked: string[] = [],
): boolean {
  const normalizedHostname = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  const allBlocked = [...BLOCKED_HOSTNAMES, ...additionalBlocked].map((h) => h.toLowerCase());

  // Exact match
  if (allBlocked.includes(normalizedHostname)) {
    return true;
  }

  // Check for IP in private range
  if (looksLikeIp(normalizedHostname) && isPrivateIp(normalizedHostname)) {
    return true;
  }

  // Check for DNS rebinding attempts (numeric-looking hostnames)
  if (/^\d{1,3}[-_.]\d{1,3}[-_.]\d{1,3}[-_.]\d{1,3}/.test(normalizedHostname)) {
    return true;
  }

  return false;
}

/**
 * Validate a URL for SSRF protection
 *
 * @param urlString - The URL to validate
 * @param options - Validation options
 * @returns Validation result with reason if invalid
 */
export function validateUrl(
  urlString: string,
  options: UrlValidationOptions = {},
): UrlValidationResult {
  const {
    allowHttp = true,
    additionalBlockedHostnames = [],
    allowLocalhost = false,
    maxLength = 2048,
  } = options;

  // Check URL length
  if (urlString.length > maxLength) {
    return {
      valid: false,
      reason: `URL exceeds maximum length of ${maxLength}`,
    };
  }

  // Parse URL
  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    return { valid: false, reason: "Invalid URL format" };
  }

  // Check scheme
  if (!ALLOWED_SCHEMES.includes(url.protocol)) {
    return { valid: false, reason: `Scheme '${url.protocol}' not allowed` };
  }

  // Check HTTP vs HTTPS
  if (url.protocol === "http:" && !allowHttp) {
    return { valid: false, reason: "HTTP not allowed, use HTTPS" };
  }

  // Get hostname
  const hostname = url.hostname;
  if (!hostname) {
    return { valid: false, reason: "Missing hostname" };
  }

  // Check for localhost
  if (!allowLocalhost) {
    const localhostPatterns = [
      "localhost",
      "127.0.0.1",
      "::1",
      "[::1]",
      "0.0.0.0",
    ];
    if (localhostPatterns.some((p) => hostname.toLowerCase() === p)) {
      return { valid: false, reason: "Localhost not allowed", hostname };
    }
  }

  // Check blocked hostnames
  if (isBlockedHostname(hostname, additionalBlockedHostnames)) {
    return { valid: false, reason: "Hostname is blocked", hostname };
  }

  // Check for auth in URL (potential SSRF technique)
  if (url.username || url.password) {
    return { valid: false, reason: "URL credentials not allowed" };
  }

  // Check for unusual ports on non-standard schemes
  const port = url.port ? parseInt(url.port, 10) : (url.protocol === "https:" ? 443 : 80);
  const suspiciousPorts = [22, 23, 25, 110, 143, 3306, 5432, 6379, 27017];
  if (suspiciousPorts.includes(port)) {
    return {
      valid: false,
      reason: `Port ${port} is not allowed for external requests`,
    };
  }

  return { valid: true, hostname };
}

/**
 * Resolved-IP validation result — includes the pinned resolution so the
 * caller can pin the fetch to the validated IPs (rebinding protection).
 */
export interface ResolvedValidationResult {
  valid: boolean;
  reason?: string;
  hostname?: string;
  /** The IPs that were validated (pin the fetch to these). */
  resolvedIps?: string[];
  /** The pinned URL (IP-literal) to fetch, if validation passed. */
  pinnedUrl?: string;
}

/**
 * Validate a URL AND resolve its hostname to check the actual IP addresses.
 *
 * This is the SSRF-safe fetch primitive. Every server-side fetch path
 * (upload-from-url, proxy, downloadImage, covers fetch, real-photo crawl)
 * MUST route through this function before fetching.
 *
 * @param urlString - The URL to validate and resolve.
 * @param options - Validation options.
 * @returns Validation result with resolved IPs if valid.
 */
export async function resolveAndValidateUrl(
  urlString: string,
  options: UrlValidationOptions = {},
): Promise<ResolvedValidationResult> {
  const base = validateUrl(urlString, options);
  if (!base.valid) {
    return { valid: false, reason: base.reason, hostname: base.hostname };
  }

  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    return { valid: false, reason: "Invalid URL format" };
  }

  const hostname = url.hostname;

  // If the hostname is already an IP literal, validate it directly
  if (looksLikeIp(hostname)) {
    const normalized = normalizeIp(hostname);
    if (isPrivateIp(normalized)) {
      return { valid: false, reason: "Resolved IP is private/internal", hostname };
    }
    return { valid: true, hostname, resolvedIps: [normalized] };
  }

  // Resolve A + AAAA records
  const resolvedIps: string[] = [];
  try {
    const aRecords = await Deno.resolveDns(hostname, "A");
    resolvedIps.push(...aRecords);
  } catch {
    // A record failed; try AAAA only
  }
  try {
    const aaaaRecords = await Deno.resolveDns(hostname, "AAAA");
    resolvedIps.push(...aaaaRecords);
  } catch {
    // AAAA failed
  }

  if (resolvedIps.length === 0) {
    return { valid: false, reason: "DNS resolution failed", hostname };
  }

  // Reject if ANY resolved IP is private/internal
  for (const ip of resolvedIps) {
    const normalized = normalizeIp(ip);
    if (isPrivateIp(normalized)) {
      return {
        valid: false,
        reason: `Resolved IP ${normalized} is private/internal`,
        hostname,
      };
    }
  }

  // Build a pinned URL using the first resolved IP (to prevent rebinding).
  // The caller fetches the ORIGINAL url via fetchPinned(url, validatedIp),
  // which pins DNS to the validated IP while SNI/Host/cert use the original
  // hostname. pinnedUrl is retained for diagnostics.
  const pinnedHostname = resolvedIps[0].includes(":") ? `[${resolvedIps[0]}]` : resolvedIps[0];
  const pinnedUrl = url.toString().replace(hostname, pinnedHostname);

  return {
    valid: true,
    hostname,
    resolvedIps,
    pinnedUrl,
  };
}

/**
 * SSRF-safe fetch with a PINNED connection (rebinding-proof by construction).
 *
 * Opens the connection DIRECTLY to the validated IP (Deno.connect). No DNS
 * resolution happens at fetch time — there is no second resolution for an
 * attacker to rebind between validation and fetch. The Host header, and for
 * TLS the SNI + certificate validation, use the ORIGINAL hostname, so
 * vhosting and certs stay correct and strict. Cert validation is never
 * disabled (Deno.connect has no switch to disable it).
 *
 * Why not node:https with a custom `lookup`? Probed on the deployed
 * edge-runtime v1.70.1 (t_a199d39d, 2026-11-20):
 * `ClientRequest.options.lookup` is ERR_NOT_IMPLEMENTED there — a hard error,
 * so the node path cannot fetch at all on the deployed runtime.
 * Deno.connect is a core API on every Deno (local 2.9.8 and the edge
 * runtime alike), so one code path serves both.
 *
 * Redirects are NOT followed: any 3xx is an error (fetch redirect:"error").
 *
 * Resource bounds — an unbounded buffer OOMs the 150 MB edge isolate before
 * any downstream cap can fire (@reviewer round 1, t_d12b4ce9):
 * - `maxBytes` (default 10 MiB, the image-utils downloadImage cap) is
 *   enforced MID-READ: a declared content-length over the cap is refused
 *   before a byte is buffered, and the connection is closed on overflow.
 * - `deadlineMs` (default: `timeout`) is a TOTAL wall-clock deadline. A
 *   socket that dribbles one byte per tick, or one that goes silent, cannot
 *   run past it.
 *
 * @param originalUrl - The original URL (hostname used for SNI/Host).
 * @param validatedIp - The IP that resolveAndValidateUrl validated.
 * @param options - timeout (default 20 s; seeds deadlineMs when deadlineMs
 *   is absent), deadlineMs (total wall-clock ms), maxBytes, headers.
 * @returns A fetch-like Response.
 */
export async function fetchPinned(
  originalUrl: string,
  validatedIp: string,
  options: {
    /** Default 20 s: also the default total deadline (see deadlineMs). */
    timeout?: number;
    /** Total wall-clock deadline in ms (default: `timeout`). */
    deadlineMs?: number;
    /** Maximum response body in bytes (default 10 MiB). Enforced mid-read. */
    maxBytes?: number;
    headers?: Record<string, string>;
  } = {},
): Promise<Response> {
  const url = new URL(originalUrl);
  const isHttps = url.protocol === "https:";
  const idleMs = options.timeout ?? 20_000;
  const deadlineMs = options.deadlineMs ?? idleMs;
  const maxBytes = options.maxBytes ?? 10 * 1024 * 1024;
  const port = url.port ? Number(url.port) : isHttps ? 443 : 80;
  const requestPath = (url.pathname || "/") + (url.search || "");
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  // PIN: connect to the VALIDATED IP. No hostname resolution happens in this
  // function — that is the entire rebind guarantee.
  // Deno.connect + Deno.createSecureConn exist on every Deno the estate
  // runs (1.x edge-runtime and 2.x local); createSecureConn has no option
  // to skip certificate validation.
  let conn: Deno.Conn;
  try {
    const tcp = await Deno.connect({ hostname: validatedIp, port });
    conn = isHttps ? await upgradeTls(tcp, url.hostname) : tcp;
  } catch (err) {
    throw new Error(`Pinned connect failed for ${url.hostname}: ${String(err)}`);
  }

  let deadlineFired = false;
  const deadlineTimer = setTimeout(() => {
    deadlineFired = true;
    conn.close();
  }, deadlineMs);
  // conn.close() on an already-closed resource throws BadResource (Deno),
  // so every close goes through this guard.
  const safeClose = (): void => {
    try {
      conn.close();
    } catch {
      // already closed (deadline timer or the peer) — nothing to do
    }
  };

  // Byte-stream state: `pending` holds bytes read from the socket; `pos` is
  // how much of it has been consumed.
  let pending: Uint8Array<ArrayBuffer> = new Uint8Array(0);
  let pos = 0;
  const have = (): number => pending.length - pos;
  const take = (n: number): Uint8Array<ArrayBuffer> => {
    const out = pending.slice(pos, pos + n);
    pos += n;
    return out;
  };
  const fill = async (): Promise<boolean> => {
    if (pos > 0) {
      pending = pending.slice(pos);
      pos = 0;
    }
    const buf = new Uint8Array(8192);
    const n = await conn.read(buf);
    if (n === null) return false;
    const chunk = buf.slice(0, n);
    pending = pending.length ? concatBytes(pending, chunk) : chunk;
    return true;
  };
  const ensure = async (n: number): Promise<boolean> => {
    while (have() < n) {
      if (!(await fill())) return false;
    }
    return true;
  };
  const findSeq = (seq: number[]): number => {
    for (let i = pos; i + seq.length <= pending.length; i++) {
      let match = true;
      for (let j = 0; j < seq.length; j++) {
        if (pending[i + j] !== seq[j]) {
          match = false;
          break;
        }
      }
      if (match) return i;
    }
    return -1;
  };
  const CRLF = [13, 10];
  const CRLFCRLF = [13, 10, 13, 10];
  const readLine = async (): Promise<Uint8Array | null> => {
    for (;;) {
      const idx = findSeq(CRLF);
      if (idx !== -1) {
        const line = take(idx - pos);
        take(2);
        return line;
      }
      if (have() > 65536) {
        throw new Error("Response line too long");
      }
      if (!(await fill())) {
        return have() > 0 ? take(have()) : null;
      }
    }
  };

  try {
    // --- request (GET only) ---
    const lines = [
      `GET ${requestPath} HTTP/1.1`,
      `Host: ${url.host}`,
      "Connection: close",
      ...Object.entries(options.headers ?? {}).map(([key, value]) => `${key}: ${value}`),
    ];
    await conn.write(encoder.encode(lines.join("\r\n") + "\r\n\r\n"));

    // --- response head ---
    let headEnd = findSeq(CRLFCRLF);
    for (;;) {
      if (headEnd !== -1) break;
      if (have() > 65536) throw new Error("Response headers too large");
      if (!(await fill())) throw new Error("Connection closed before response");
      headEnd = findSeq(CRLFCRLF);
    }
    const headStr = decoder.decode(take(headEnd - pos));
    take(4); // the \r\n\r\n
    const headParts = headStr.split("\r\n");
    const statusMatch = (headParts[0] ?? "").match(/^HTTP\/1\.[01] (\d{3})/);
    if (!statusMatch) {
      throw new Error(`Malformed status line: ${headParts[0] ?? "<empty>"}`);
    }
    const status = Number(statusMatch[1]);
    const respHeaderMap: Record<string, string> = {};
    for (const line of headParts.slice(1)) {
      const colon = line.indexOf(":");
      if (colon > 0) {
        respHeaderMap[line.slice(0, colon).trim().toLowerCase()] = line.slice(colon + 1).trim();
      }
    }

    // redirect:"error" — never follow a 3xx.
    if (status >= 300 && status < 400) {
      throw new Error(`Redirect not allowed (HTTP ${status})`);
    }
    // Declared-length precheck: refuse before buffering a single byte.
    const declaredLen = Number(respHeaderMap["content-length"]);
    if (Number.isFinite(declaredLen) && declaredLen > maxBytes) {
      throw new Error(`Response exceeds byte cap (${maxBytes} bytes)`);
    }

    // --- body, with the cap enforced mid-read ---
    let body: Uint8Array<ArrayBuffer> = new Uint8Array(0);
    const append = (chunk: Uint8Array<ArrayBuffer>): void => {
      body = body.length ? concatBytes(body, chunk) : chunk;
      if (body.length > maxBytes) {
        throw new Error(`Response exceeds byte cap (${maxBytes} bytes)`);
      }
    };
    if (Number.isFinite(declaredLen)) {
      while (body.length < declaredLen) {
        const need = Math.min(declaredLen - body.length, 65536);
        if (!(await ensure(need))) {
          throw new Error("Connection closed before body complete");
        }
        append(take(Math.min(need, have())));
      }
    } else if (/(^|,|\s)chunked(\s|,|$)/i.test(respHeaderMap["transfer-encoding"] ?? "")) {
      for (;;) {
        const sizeLine = await readLine();
        if (sizeLine === null) {
          throw new Error("Connection closed in chunked body");
        }
        let sizeText = "";
        for (const byte of sizeLine) {
          sizeText += byte >= 32 && byte < 127 ? String.fromCharCode(byte) : " ";
        }
        const semi = sizeText.indexOf(";");
        if (semi >= 0) sizeText = sizeText.slice(0, semi);
        const size = parseInt(sizeText.trim(), 16);
        if (Number.isNaN(size)) throw new Error("Malformed chunk size");
        if (size === 0) break;
        let remaining = size;
        while (remaining > 0) {
          const need = Math.min(remaining, 65536);
          if (!(await ensure(need))) {
            throw new Error("Connection closed in chunked body");
          }
          const chunk = take(Math.min(need, have()));
          remaining -= chunk.length;
          append(chunk);
        }
        const postChunk = await readLine();
        if (postChunk === null || postChunk.length !== 0) {
          throw new Error("Malformed chunked framing");
        }
      }
    } else {
      // No length, no chunking: read until the connection closes.
      for (;;) {
        if (!(await ensure(1))) break;
        append(take(have()));
      }
    }
    if (deadlineFired) {
      throw new Error(`Fetch deadline exceeded (${deadlineMs}ms)`);
    }

    const respHeaders = new Headers();
    for (const [key, value] of Object.entries(respHeaderMap)) {
      if (key === "content-length" || key === "transfer-encoding") continue;
      respHeaders.set(key, value);
    }
    respHeaders.set("content-length", String(body.length));
    safeClose();
    return new Response(body, { status, headers: respHeaders });
  } catch (err) {
    if (deadlineFired) {
      throw new Error(`Fetch deadline exceeded (${deadlineMs}ms)`);
    }
    safeClose();
    throw err instanceof Error ? err : new Error(`Pinned fetch failed: ${String(err)}`);
  } finally {
    clearTimeout(deadlineTimer);
  }
}

/**
 * Upgrade a TCP connection to TLS, with SNI + strict certificate validation
 * against `hostname`. Deno renamed this primitive across major versions:
 * `startTls` (2.x, local) and `createSecureConn` (1.x, the deployed
 * edge-runtime). Neither has an option to skip certificate validation. The
 * probe keeps one code path working on every Deno the estate runs.
 */
async function upgradeTls(conn: Deno.Conn, hostname: string): Promise<Deno.Conn> {
  const deno = Deno as unknown as {
    startTls?: (
      c: Deno.Conn,
      options?: { hostname?: string },
    ) => Promise<Deno.Conn>;
    createSecureConn?: (
      c: Deno.Conn,
      options?: { hostname?: string },
    ) => Promise<Deno.Conn>;
  };
  const upgrade = deno.startTls ?? deno.createSecureConn;
  if (!upgrade) {
    throw new Error(
      "No TLS upgrade API in this runtime (Deno.startTls / Deno.createSecureConn)",
    );
  }
  return upgrade(conn, { hostname });
}

/** Join two byte arrays into a new one. */
function concatBytes(
  a: Uint8Array<ArrayBuffer>,
  b: Uint8Array<ArrayBuffer>,
): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(a.length + b.length);
  out.set(a, 0);
  out.set(b, a.length);
  return out;
}

/**
 * Validate an image URL specifically
 *
 * More restrictive validation for image URLs:
 * - Must be HTTPS (except in development)
 * - Must have image-like extension or be from known CDN
 */
export function validateImageUrl(
  urlString: string,
  options: UrlValidationOptions = {},
): UrlValidationResult {
  const baseResult = validateUrl(urlString, options);
  if (!baseResult.valid) {
    return baseResult;
  }

  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    return { valid: false, reason: "Invalid URL format" };
  }

  // Check for image-like extension
  const imageExtensions = [
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".webp",
    ".svg",
    ".ico",
    ".bmp",
  ];
  const pathname = url.pathname.toLowerCase();
  const hasImageExtension = imageExtensions.some((ext) => pathname.endsWith(ext));

  // Known CDN/image hosting domains
  // Use exact matching only — endsWith() would allow subdomain spoofing
  // (e.g. attacker.cloudinary.com would match "cloudinary.com")
  const knownImageHosts = new Set<string>([
    "cloudinary.com",
    "imgix.net",
    "imagekit.io",
    "cloudflare.com",
    "amazonaws.com",
    "supabase.co",
    "supabase.com",
    "googleapis.com",
    "cdn.foodshare.app",
    Deno.env.get("CDN_DOMAIN") || "cdn.foodshare.club",
    Deno.env.get("SITE_DOMAIN") || "foodshare.club",
    "images.foodshare.app",
  ]);
  const isKnownHost = knownImageHosts.has(url.hostname);

  // Must have image extension or be from known host
  if (!hasImageExtension && !isKnownHost) {
    // Check if pathname suggests image serving
    const imagePathPatterns = [
      "/image",
      "/img",
      "/photo",
      "/avatar",
      "/media",
      "/upload",
    ];
    const hasImagePath = imagePathPatterns.some((p) => pathname.includes(p));

    if (!hasImagePath) {
      return {
        valid: false,
        reason: "URL does not appear to be an image",
        hostname: url.hostname,
      };
    }
  }

  return { valid: true, hostname: url.hostname };
}

/**
 * Sanitize a URL by removing potentially dangerous parts
 */
export function sanitizeUrl(urlString: string): string | null {
  try {
    const url = new URL(urlString);

    // Remove credentials
    url.username = "";
    url.password = "";

    // Keep only allowed schemes
    if (!ALLOWED_SCHEMES.includes(url.protocol)) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

/**
 * Check if a URL is safe to fetch (combines validation + sanitization)
 */
export function isSafeToFetch(
  urlString: string,
  options: UrlValidationOptions = {},
): { safe: boolean; sanitizedUrl?: string; reason?: string } {
  const validation = validateUrl(urlString, options);

  if (!validation.valid) {
    return { safe: false, reason: validation.reason };
  }

  const sanitized = sanitizeUrl(urlString);
  if (!sanitized) {
    return { safe: false, reason: "URL could not be sanitized" };
  }

  return { safe: true, sanitizedUrl: sanitized };
}
