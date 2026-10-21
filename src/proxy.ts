import { defaultLocale, isValidLocale } from "@/i18n/config";
import { negotiateLocale, resolveRequestLocale } from "@/i18n/resolve";
import { isRateLimitingRequired } from "@/lib/security/rateLimitPolicy";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { type NextRequest, NextResponse } from "next/server";

// ============================================================================
// Admin Client (Service Role — singleton, request-safe)
//
// SAFETY: This singleton is intentionally shared across all requests.
// It uses the service_role key (not user context) and is ONLY used for
// admin operations like checking user_roles. Never pass user-scoped
// queries through this client — use the per-request Supabase client instead.
// ============================================================================

let _adminClient: ReturnType<typeof createClient> | null = null;
function getAdminClient() {
  if (!_adminClient && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    _adminClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return _adminClient;
}

// ============================================================================
// IP Reputation & Threat Detection
// ============================================================================

interface IPReputation {
  violations: number;
  lastViolation: number;
  blocked: boolean;
}

const ipReputations = new Map<string, IPReputation>();
const IP_VIOLATION_THRESHOLD = 10;
const IP_BLOCK_DURATION = 3600000; // 1 hour

/**
 * Ceiling on tracked IPs.
 *
 * Entries were only ever removed when the *same* IP was checked again, so
 * every distinct address that tripped a suspicious-URL or CSRF check added a
 * permanent entry. The container runs with `Memory=1G` and
 * `label=autoheal=true`, so an attacker walking the header could grow this
 * until the process was OOM-killed and restarted — turning a throttling map
 * into a denial of service. Past the ceiling the oldest entry is evicted: an
 * unreviewed IP that has not been seen since is the cheapest thing to lose.
 */
const MAX_TRACKED_IPS = 10000;

function recordIPViolation(ip: string) {
  const rep = ipReputations.get(ip) || { violations: 0, lastViolation: 0, blocked: false };
  rep.violations++;
  rep.lastViolation = Date.now();

  if (rep.violations >= IP_VIOLATION_THRESHOLD) {
    rep.blocked = true;
    console.warn(`[Security] IP blocked due to violations: ${ip}`);
  }

  if (!ipReputations.has(ip) && ipReputations.size >= MAX_TRACKED_IPS) {
    evictOldestIP();
  }

  ipReputations.set(ip, rep);
}

/**
 * Drop expired entries first, and only then the oldest surviving one.
 *
 * Dropping by insertion order alone would evict the very addresses that are
 * blocked, which is the opposite of what the map is for. `Map` preserves
 * insertion order, and `recordIPViolation` re-`set`s an existing key without
 * moving it, so the sweep is cheap and needs no extra bookkeeping structure.
 */
function evictOldestIP(): void {
  const now = Date.now();

  for (const [ip, rep] of ipReputations) {
    if (now - rep.lastViolation > IP_BLOCK_DURATION) {
      ipReputations.delete(ip);
    }
  }

  if (ipReputations.size >= MAX_TRACKED_IPS) {
    const oldest = ipReputations.keys().next();
    if (!oldest.done) {
      const victim = ipReputations.get(oldest.value);
      // Never evict an address that is currently blocked.
      if (!victim?.blocked) ipReputations.delete(oldest.value);
    }
  }
}

function isIPBlocked(ip: string): boolean {
  const rep = ipReputations.get(ip);
  if (!rep || !rep.blocked) return false;

  const now = Date.now();
  if (now - rep.lastViolation > IP_BLOCK_DURATION) {
    rep.blocked = false;
    rep.violations = 0;
    ipReputations.set(ip, rep);
    return false;
  }

  return true;
}

// ============================================================================
// Observability
// ============================================================================

interface ProxyMetrics {
  timestamp: number;
  path: string;
  method: string;
  ip: string;
  userAgent: string;
  duration: number;
  status: number;
  rateLimitHit?: string;
  csrfBlocked?: boolean;
  authRefreshFailed?: boolean;
}

const metrics: ProxyMetrics[] = [];
const MAX_METRICS = 1000;

function recordMetric(metric: ProxyMetrics) {
  metrics.push(metric);
  if (metrics.length > MAX_METRICS) metrics.shift();
}

function getMetricsSummary() {
  const now = Date.now();
  const last5min = metrics.filter((m) => now - m.timestamp < 300000);
  return {
    total: last5min.length,
    rateLimited: last5min.filter((m) => m.rateLimitHit).length,
    csrfBlocked: last5min.filter((m) => m.csrfBlocked).length,
    authFailures: last5min.filter((m) => m.authRefreshFailed).length,
    avgDuration: last5min.reduce((sum, m) => sum + m.duration, 0) / last5min.length || 0,
  };
}

// Expose metrics globally for admin endpoint
if (typeof global !== "undefined") {
  (global as { proxyMetrics?: { getMetricsSummary: () => ReturnType<typeof getMetricsSummary> } }).proxyMetrics = {
    getMetricsSummary,
  };
}

// ============================================================================
// Circuit Breaker (proxy-local, in-memory)
// NOTE: Intentionally separate from src/lib/api/circuit-breaker.ts which is the
// shared, configurable circuit breaker for API client use. This implementation
// is simpler and scoped to the proxy runtime (cannot import from lib at this layer).
// ============================================================================

interface CircuitState {
  failures: number;
  lastFailure: number;
  state: "closed" | "open" | "half-open";
}

const circuits = new Map<string, CircuitState>();
const CIRCUIT_THRESHOLD = 5;
const CIRCUIT_TIMEOUT = 60000; // 1 minute
const CIRCUIT_HALF_OPEN_TIMEOUT = 30000; // 30 seconds

function getCircuitState(key: string): CircuitState {
  if (!circuits.has(key)) {
    circuits.set(key, { failures: 0, lastFailure: 0, state: "closed" });
  }
  return circuits.get(key)!;
}

function recordCircuitFailure(key: string) {
  const circuit = getCircuitState(key);
  circuit.failures++;
  circuit.lastFailure = Date.now();

  if (circuit.failures >= CIRCUIT_THRESHOLD) {
    circuit.state = "open";
    console.warn(`[Circuit] Opened circuit for ${key}`);
  }
}

function recordCircuitSuccess(key: string) {
  const circuit = getCircuitState(key);
  circuit.failures = 0;
  circuit.state = "closed";
}

function isCircuitOpen(key: string): boolean {
  const circuit = getCircuitState(key);
  const now = Date.now();

  if (circuit.state === "open") {
    if (now - circuit.lastFailure > CIRCUIT_TIMEOUT) {
      circuit.state = "half-open";
      return false;
    }
    return true;
  }

  if (circuit.state === "half-open") {
    if (now - circuit.lastFailure > CIRCUIT_HALF_OPEN_TIMEOUT) {
      circuit.state = "closed";
      circuit.failures = 0;
    }
  }

  return false;
}

// ============================================================================
// Rate Limiting Configuration
// ============================================================================

// Initialize Redis for rate limiting (only with env vars)
const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

/**
 * Global rate limiter: 100 requests per 10 seconds per IP
 * Protects against general abuse and DDoS
 */
const globalLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(100, "10 s"),
      analytics: true,
      prefix: "ratelimit:global",
    })
  : null;

/**
 * Auth endpoint rate limiter: 10 requests per minute per IP
 * Stricter limit to prevent brute force attacks
 */
const authLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, "1 m"),
      analytics: true,
      prefix: "ratelimit:auth",
    })
  : null;

/**
 * Mutation rate limiter: 30 mutations per minute per user/IP
 * Protects against spam and abuse of write operations
 */
const mutationLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(30, "1 m"),
      analytics: true,
      prefix: "ratelimit:mutations",
    })
  : null;

/**
 * True when the limiters are wired up. Separate from `redis` being non-null so
 * a future limiter added here is covered by the same assertion.
 */
const rateLimitingConfigured = Boolean(globalLimiter && authLimiter && mutationLimiter);

/**
 * Whether a missing limiter is a misconfiguration that has to be answered with
 * a 503, or a deployment that simply does not rate limit.
 *
 * The reasoning is in `src/lib/security/rateLimitPolicy.ts`, which is where
 * the test for it lives: the proxy is a middleware file, and importing it
 * into a test would bring the whole request path with it.
 */
const rateLimitingRequired = isRateLimitingRequired(process.env);

if (rateLimitingRequired && !rateLimitingConfigured && typeof console !== "undefined") {
  console.error(
    "[proxy] FATAL: rate limiting is disabled in production because UPSTASH_REDIS_REST_URL / " +
      "UPSTASH_REDIS_REST_TOKEN are missing. Every request will be answered with 503. " +
      "Set both GitHub production secrets, and add them to the env file the deploy " +
      "workflow writes, or this deployment has no abuse controls at all.",
  );
}

// ============================================================================
// Security Configuration
// ============================================================================
// CSP and the other security headers are configured in next.config.ts
// (Content-Security-Policy is built by src/lib/security/csp.ts, which is
// unit-tested). The proxy only handles CSRF protection and rate limiting.

/**
 * Allowed origins for CSRF protection
 * Only these origins can make state-changing requests
 */
const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_APP_URL,
  "https://foodshare.club",
  "https://www.foodshare.club",
  "https://foodshare.app",
  "https://www.foodshare.app",
  // Loopback for local development and for the E2E job, which runs the app
  // directly. Listed once each: development *and* CI used to append the same
  // two origins, so the comparison below walked duplicates on every mutation.
  process.env.NODE_ENV === "development" || process.env.CI === "true" ? "http://localhost:3000" : null,
  process.env.NODE_ENV === "development" || process.env.CI === "true" ? "http://127.0.0.1:3000" : null,
]
  .filter((origin): origin is string => Boolean(origin))
  // NEXT_PUBLIC_APP_URL is usually https://foodshare.club, so the literal above
  // is a duplicate. A Set is the honest representation of "a set of origins".
  .filter((origin, index, all) => all.indexOf(origin) === index);

/**
 * HTTP methods that modify state (require CSRF protection)
 */
const MUTATION_METHODS = ["POST", "PUT", "PATCH", "DELETE"];

// ============================================================================
// Security Helpers
// ============================================================================

/**
 * The IP every rate limit, ban and reputation decision is keyed on, so it has
 * to be one the client cannot choose.
 *
 * The headers this used to trust — `cf-connecting-ip`, then `x-real-ip`, then
 * `x-forwarded-for` — are only meaningful because Cloudflare rewrites them,
 * and that assumption needs the origin to be unreachable except through the
 * tunnel. `foodshare-web.container` published `3000:3000`, which binds
 * `0.0.0.0:3000` on the VPS: the origin was directly reachable from the
 * internet, so `curl -H 'X-Forwarded-For: 10.0.0.1'` rotated the key of every
 * IP-keyed limiter, of the reputation ban, and of the 400-request block on
 * suspicious URLs. The port is now bound to loopback, which is what makes the
 * header trustworthy.
 *
 * Belt and braces, so a future change to the port binding cannot silently
 * reopen it: a forwarded header is only honoured when the request also
 * carries Cloudflare's own `CF-Ray`. An attacker reaching the origin directly
 * can set any single header, so this is not a security boundary on its own —
 * it is the check that fails loudly instead of quietly trusting a header from a
 * source that has no reason to have one.
 *
 * Everything else shares one bucket. An unidentifiable client is not an
 * unlimited one, because the global limiter still applies to the bucket — it
 * is just a shared budget, which is the correct trade when the identity is
 * unknown.
 */
function getClientIp(request: NextRequest): string {
  const viaTunnel = request.headers.has("cf-ray");
  if (viaTunnel) {
    const cfIp = request.headers.get("cf-connecting-ip");
    if (cfIp) return cfIp;
  }

  // Local development and CI have no tunnel in front of them, and the app
  // reaches itself over loopback. Trusting a forwarded header there would be
  // trusting the developer's own curl.
  if (process.env.NODE_ENV !== "production") {
    return request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  }

  return "unidentified";
}

function getClientFingerprint(request: NextRequest): string {
  const ip = getClientIp(request);
  const ua = request.headers.get("user-agent") || "";
  return `${ip}:${ua.slice(0, 50)}`;
}

function validateOrigin(request: NextRequest): boolean {
  const method = request.method.toUpperCase();
  if (!MUTATION_METHODS.includes(method)) return true;

  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/api/health/") || pathname.startsWith("/api/cron/")) return true;

  const origin = request.headers.get("origin");
  if (origin && ALLOWED_ORIGINS.includes(origin)) return true;

  const referer = request.headers.get("referer");
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      if (ALLOWED_ORIGINS.includes(refererUrl.origin)) return true;
    } catch {}
  }

  const isApiRoute = pathname.startsWith("/api/");
  const hasAuthHeader = request.headers.has("authorization");
  return isApiRoute && hasAuthHeader;
}

const SUSPICIOUS_PATTERNS = [
  /\.\.\//,
  /<script/i,
  /javascript:/i,
  /on\w+=/i,
  /eval\(/i,
  /union.*select/i,
  /drop.*table/i,
];

function detectSuspiciousRequest(request: NextRequest): string | null {
  const url = request.nextUrl.toString();
  const ua = request.headers.get("user-agent") || "";

  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(url)) return `Suspicious URL pattern: ${pattern}`;
    if (pattern.test(ua)) return `Suspicious User-Agent: ${pattern}`;
  }

  return null;
}

// NOTE: Security headers (CSP, X-Frame-Options, etc.) are configured in next.config.ts
// This avoids duplicate/conflicting headers

// ============================================================================
// Main Proxy
// ============================================================================

export async function proxy(request: NextRequest) {
  const startTime = Date.now();
  const correlationId = request.headers.get("x-correlation-id") || crypto.randomUUID();
  const ip = getClientIp(request);
  const fingerprint = getClientFingerprint(request);
  const { pathname } = request.nextUrl;

  // IP reputation check
  if (isIPBlocked(ip)) {
    console.warn(`[Security] Blocked request from banned IP: ${ip}`, { correlationId });
    return new NextResponse("Forbidden", { status: 403 });
  }

  const metricData: Partial<ProxyMetrics> = {
    timestamp: startTime,
    path: pathname,
    method: request.method,
    ip,
    userAgent: request.headers.get("user-agent") || "",
  };

  // Suspicious request detection
  const suspiciousReason = detectSuspiciousRequest(request);
  if (suspiciousReason) {
    console.warn(`[Security] Suspicious request blocked: ${suspiciousReason}`, {
      ip,
      pathname,
      correlationId,
    });
    recordIPViolation(ip);
    recordMetric({ ...metricData, duration: Date.now() - startTime, status: 400 } as ProxyMetrics);
    return new NextResponse("Bad Request", { status: 400 });
  }

  // CSRF Protection
  if (!validateOrigin(request)) {
    console.warn(`[CSRF] Blocked ${request.method} from invalid origin`, {
      ip,
      pathname,
      correlationId,
      origin: request.headers.get("origin") || request.headers.get("referer"),
    });
    recordIPViolation(ip);
    metricData.csrfBlocked = true;
    recordMetric({ ...metricData, duration: Date.now() - startTime, status: 403 } as ProxyMetrics);
    return new NextResponse("Forbidden", { status: 403 });
  }

  // Rate Limiting
  if (rateLimitingRequired) {
    // See the module-level note: a missing limiter is a misconfiguration, not an
    // unlimited allowance. This is the only place that decides it, so no call
    // site can forget. The predicate is the module-level one, so the log above
    // and the answer here cannot disagree about whether the limiters are
    // required.
    if (!rateLimitingConfigured) {
      return new NextResponse("Service Unavailable", {
        status: 503,
        headers: { "Retry-After": "30", "X-RateLimit-Type": "unavailable" },
      });
    }

    const isAuthEndpoint = pathname.startsWith("/auth") || pathname.startsWith("/api/auth");
    const isMutation = MUTATION_METHODS.includes(request.method.toUpperCase());

    if (authLimiter && isAuthEndpoint) {
      const { success, reset } = await authLimiter.limit(fingerprint);
      if (!success) {
        console.warn("[RateLimit] Auth limit exceeded", { ip, pathname });
        metricData.rateLimitHit = "auth";
        recordMetric({
          ...metricData,
          duration: Date.now() - startTime,
          status: 429,
        } as ProxyMetrics);
        return new NextResponse("Too Many Requests", {
          status: 429,
          headers: {
            "Retry-After": Math.ceil((reset - Date.now()) / 1000).toString(),
            "X-RateLimit-Type": "auth",
          },
        });
      }
    }

    if (mutationLimiter && isMutation) {
      const { success, reset } = await mutationLimiter.limit(`mutation:${fingerprint}`);
      if (!success) {
        console.warn("[RateLimit] Mutation limit exceeded", { ip, pathname });
        metricData.rateLimitHit = "mutation";
        recordMetric({
          ...metricData,
          duration: Date.now() - startTime,
          status: 429,
        } as ProxyMetrics);
        return new NextResponse("Too Many Requests", {
          status: 429,
          headers: {
            "Retry-After": Math.ceil((reset - Date.now()) / 1000).toString(),
            "X-RateLimit-Type": "mutation",
          },
        });
      }
    }

    if (globalLimiter) {
      const { success, reset } = await globalLimiter.limit(ip);
      if (!success) {
        console.warn("[RateLimit] Global limit exceeded", { ip });
        metricData.rateLimitHit = "global";
        recordMetric({
          ...metricData,
          duration: Date.now() - startTime,
          status: 429,
        } as ProxyMetrics);
        return new NextResponse("Too Many Requests", {
          status: 429,
          headers: {
            "Retry-After": Math.ceil((reset - Date.now()) / 1000).toString(),
            "X-RateLimit-Type": "global",
          },
        });
      }
    }
  }

  // `getTranslations()` in a Server Component resolves the locale from
  // `getRequestConfig`, which reads the `X-NEXT-INTL-LOCALE` **request** header.
  // next-intl's own middleware normally sets it, but this app has no
  // `[locale]` route segment and does not install that middleware, so without
  // this the server components calling `getTranslations` (admin pages and
  // /maintenance) rendered in English for every user.
  //
  // With no cookie yet, the locale comes from `Accept-Language` and is then
  // persisted below. Previously the fallback was `en`, written straight into the
  // cookie, which meant a visitor whose *browser* was set to German and who had
  // never picked a language got an English server render for the rest of the
  // session: `lang="en"` in the HTML, every Server Component in English, and a
  // silent swap to German after hydration. `Accept-Language` is on the request
  // the proxy already holds, so it was available and unread.
  const cookieLocale = request.cookies.get("locale")?.value;
  const hasValidLocaleCookie = Boolean(cookieLocale && isValidLocale(cookieLocale));
  const requestLocale = hasValidLocaleCookie
    ? resolveRequestLocale(cookieLocale)
    : (negotiateLocale(request.headers.get("accept-language")) ?? defaultLocale);

  const requestHeaders = new Headers(request.headers);
  // Overwrites any client-supplied value: the header is a function of the
  // validated cookie and nothing else, so it can select one of the 21 known
  // locales and never carry text.
  requestHeaders.set("X-NEXT-INTL-LOCALE", requestLocale);

  let response = NextResponse.next({ request: { headers: requestHeaders } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: {
        domain: process.env.NEXT_PUBLIC_COOKIE_DOMAIN || undefined,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      },
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          // Reuse requestHeaders, not `request`: rebuilding from the raw
          // request here would drop X-NEXT-INTL-LOCALE and silently send
          // Server Components back to the default locale.
          response = NextResponse.next({ request: { headers: requestHeaders } });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, {
              ...options,
              domain: process.env.NEXT_PUBLIC_COOKIE_DOMAIN || options.domain,
            }),
          );
        },
      },
    },
  );

  const isHealthCheck = pathname.startsWith("/api/health") || pathname.startsWith("/api/ready");
  const isCI = process.env.CI === "true";
  let user = null;

  if (!isHealthCheck && !isCI) {
    // Check if user has auth cookies before attempting refresh
    const hasAuthCookies =
      request.cookies.has("sb-access-token") ||
      request.cookies.has("sb-refresh-token") ||
      request.cookies.getAll().some((c) => c.name.startsWith("sb-"));

    if (!hasAuthCookies) {
      // No auth cookies = anonymous user, skip refresh entirely
      // This is normal and not a failure
    } else if (isCircuitOpen("supabase-auth")) {
      console.warn("[Circuit] Supabase auth circuit open, skipping refresh");
      metricData.authRefreshFailed = true;
    } else {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error) {
          // Only log and circuit break if we had cookies but refresh failed
          console.warn("[Auth] Token refresh failed:", error.message);
          metricData.authRefreshFailed = true;
          recordCircuitFailure("supabase-auth");
        } else {
          user = data.user;
          recordCircuitSuccess("supabase-auth");
        }
      } catch (error) {
        console.warn("[Auth] Session load error:", error);
        metricData.authRefreshFailed = true;
        recordCircuitFailure("supabase-auth");
      }
    }
  }

  // Admin route protection
  if (pathname.startsWith("/admin")) {
    if (!user) {
      const loginUrl = new URL("/auth/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      recordMetric({
        ...metricData,
        duration: Date.now() - startTime,
        status: 302,
      } as ProxyMetrics);
      return NextResponse.redirect(loginUrl);
    }

    const adminClient = getAdminClient();
    let isAdmin = false;

    if (adminClient) {
      const { data: userRoles } = await adminClient.from("user_roles").select("roles(name)").eq("profile_id", user.id);

      const roles = ((userRoles as unknown[]) || [])
        .map((r: unknown) => {
          const row = r as { roles: { name: string } | { name: string }[] | null };
          const role = row.roles;
          return Array.isArray(role) ? role[0]?.name : role?.name;
        })
        .filter((name): name is string => typeof name === "string");
      isAdmin = roles.includes("admin") || roles.includes("superadmin");
    }

    if (!isAdmin) {
      recordMetric({
        ...metricData,
        duration: Date.now() - startTime,
        status: 302,
      } as ProxyMetrics);
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  recordMetric({ ...metricData, duration: Date.now() - startTime, status: 200 } as ProxyMetrics);

  // Add correlation ID to response headers for tracing
  response.headers.set("x-correlation-id", correlationId);
  response.headers.set("x-request-duration", `${Date.now() - startTime}ms`);

  // Locale cookie (migrated from legacy `middleware.ts` — Next 16 uses `proxy.ts` only).
  //
  // Written only when the request carried no usable cookie, and with the
  // negotiated locale rather than a hard-coded `en`, so the *next* request is
  // resolved from the cookie and agrees with the client. A missing or invalid
  // cookie is rewritten too: leaving a bogus value in place means every request
  // re-runs negotiation for a visitor who has already expressed a preference.
  //
  // One year, and `secure` in production. The previous version wrote a session
  // cookie with no `secure` flag, which meant the one cookie that now drives
  // server-side rendering was both shorter-lived and less protected than every
  // other cookie the proxy sets.
  if (!hasValidLocaleCookie) {
    response.cookies.set("locale", requestLocale, {
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
      secure: process.env.NODE_ENV === "production",
    });
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder images
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
