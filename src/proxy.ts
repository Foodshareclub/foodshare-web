import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// ============================================================================
// Admin Client
// ============================================================================

let _adminClient: ReturnType<typeof createClient> | null = null;
function getAdminClient() {
  if (
    !_adminClient &&
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    _adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
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

function recordIPViolation(ip: string) {
  const rep = ipReputations.get(ip) || { violations: 0, lastViolation: 0, blocked: false };
  rep.violations++;
  rep.lastViolation = Date.now();

  if (rep.violations >= IP_VIOLATION_THRESHOLD) {
    rep.blocked = true;
    console.warn(`[Security] IP blocked due to violations: ${ip}`);
  }

  ipReputations.set(ip, rep);
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
  (
    global as { proxyMetrics?: { getMetricsSummary: () => ReturnType<typeof getMetricsSummary> } }
  ).proxyMetrics = { getMetricsSummary };
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

// ============================================================================
// Security Configuration
// ============================================================================
// NOTE: CSP and security headers are configured in next.config.ts
// The proxy only handles CSRF protection and rate limiting

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
  process.env.NODE_ENV === "development" ? "http://localhost:3000" : null,
  process.env.NODE_ENV === "development" ? "http://127.0.0.1:3000" : null,
].filter((origin): origin is string => Boolean(origin));

/**
 * HTTP methods that modify state (require CSRF protection)
 */
const MUTATION_METHODS = ["POST", "PUT", "PATCH", "DELETE"];

// ============================================================================
// Security Helpers
// ============================================================================

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-real-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    "unknown"
  );
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
  const isProd = process.env.NODE_ENV === "production";

  if (isProd) {
    const isAuthEndpoint = pathname.startsWith("/auth") || pathname.startsWith("/api/auth");
    const isMutation = MUTATION_METHODS.includes(request.method.toUpperCase());

    if (authLimiter && isAuthEndpoint) {
      const { success, reset } = await authLimiter.limit(fingerprint);
      if (!success) {
        console.warn(`[RateLimit] Auth limit exceeded`, { ip, pathname });
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
        console.warn(`[RateLimit] Mutation limit exceeded`, { ip, pathname });
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
        console.warn(`[RateLimit] Global limit exceeded`, { ip });
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

  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const isHealthCheck = pathname.startsWith("/api/health");
  let user = null;

  if (!isHealthCheck) {
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
      const { data: userRoles } = await adminClient
        .from("user_roles")
        .select("role_id, roles(name)")
        .eq("profile_id", user.id);

      type RoleRow = { role_id: string; roles: { name: string } | null };
      const roles = ((userRoles as RoleRow[] | null) || [])
        .map((r) => r.roles?.name)
        .filter((name): name is string => Boolean(name));
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

  // Add aggressive caching for static-like routes to reduce function invocations
  if (pathname.match(/^\/(food|forum|about|privacy|terms)/)) {
    response.headers.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
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
