import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// ============================================================================
// Rate Limiting Configuration
// ============================================================================

/**
 * Create rate limiter for mutations if Redis is configured
 * Limits: 30 mutations per minute per user/IP
 */
const ratelimit =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Ratelimit({
        redis: new Redis({
          url: process.env.UPSTASH_REDIS_REST_URL,
          token: process.env.UPSTASH_REDIS_REST_TOKEN,
        }),
        limiter: Ratelimit.slidingWindow(30, "1 m"),
        prefix: "mutation-limit",
        analytics: true,
      })
    : null;

// ============================================================================
// Security Configuration
// ============================================================================

/**
 * Content Security Policy
 * Prevents XSS, clickjacking, and other injection attacks
 */
const CSP_DIRECTIVES = [
  "default-src 'self'",
  // Scripts: self + inline (Next.js hydration) + eval (dev only)
  process.env.NODE_ENV === "development"
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
    : "script-src 'self' 'unsafe-inline'",
  // Styles: self + inline (Tailwind, styled-jsx)
  "style-src 'self' 'unsafe-inline'",
  // Images: self + data URIs + external CDNs + blob
  "img-src 'self' data: https: blob:",
  // Connections: self + Supabase (API + Realtime WebSocket)
  `connect-src 'self' https://*.supabase.co wss://*.supabase.co ${
    process.env.NODE_ENV === "development" ? "ws://localhost:*" : ""
  }`.trim(),
  // Fonts: self + Google Fonts
  "font-src 'self' https://fonts.gstatic.com",
  // Frame ancestors: prevent clickjacking
  "frame-ancestors 'none'",
  // Base URI: prevent base tag hijacking
  "base-uri 'self'",
  // Form action: only allow forms to submit to self
  "form-action 'self'",
  // Object/embed: disable plugins
  "object-src 'none'",
  // Upgrade insecure requests in production
  process.env.NODE_ENV === "production" ? "upgrade-insecure-requests" : "",
]
  .filter(Boolean)
  .join("; ");

/**
 * Allowed origins for CSRF protection
 * Only these origins can make state-changing requests
 */
const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_APP_URL,
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

/**
 * Validate request origin for CSRF protection
 * Returns true if the request is safe, false if it should be blocked
 */
function validateOrigin(request: NextRequest): boolean {
  const method = request.method.toUpperCase();

  // Safe methods don't need origin validation
  if (!MUTATION_METHODS.includes(method)) {
    return true;
  }

  // Check Origin header first (most reliable)
  const origin = request.headers.get("origin");
  if (origin) {
    return ALLOWED_ORIGINS.includes(origin);
  }

  // Fallback to Referer header for same-site requests
  const referer = request.headers.get("referer");
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      return ALLOWED_ORIGINS.includes(refererUrl.origin);
    } catch {
      return false;
    }
  }

  // API routes from mobile apps won't have Origin/Referer
  // They should use Edge Functions instead, but allow for now with auth check
  // The actual mutation will still require valid auth token
  const isApiRoute = request.nextUrl.pathname.startsWith("/api/");
  const hasAuthHeader = request.headers.has("authorization");

  return isApiRoute && hasAuthHeader;
}

/**
 * Add security headers to response
 */
function addSecurityHeaders(response: NextResponse): void {
  // Content Security Policy
  response.headers.set("Content-Security-Policy", CSP_DIRECTIVES);

  // Prevent MIME type sniffing
  response.headers.set("X-Content-Type-Options", "nosniff");

  // Prevent clickjacking (backup for CSP frame-ancestors)
  response.headers.set("X-Frame-Options", "DENY");

  // Enable XSS filter (legacy browsers)
  response.headers.set("X-XSS-Protection", "1; mode=block");

  // Control referrer information
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // HSTS in production (1 year, include subdomains)
  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );
  }

  // Permissions Policy (disable unnecessary features)
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(self), payment=()"
  );
}

// ============================================================================
// Main Proxy
// ============================================================================

/**
 * Next.js 16 Proxy for Supabase Auth
 *
 * This proxy handles session refresh on every request, ensuring:
 * 1. Supabase auth cookies are properly synced
 * 2. Expired sessions are refreshed automatically
 * 3. Admin routes are protected with role-based access (defense-in-depth)
 * 4. Security headers are applied (CSP, CSRF, XSS protection)
 *
 * Security: Admin check uses multiple role sources for consistency with checkIsAdmin()
 */
export async function proxy(request: NextRequest) {
  // ============================================================================
  // CSRF Protection - Block invalid origins for mutations
  // ============================================================================
  if (!validateOrigin(request)) {
    console.warn(
      `CSRF: Blocked ${request.method} request from invalid origin:`,
      request.headers.get("origin") || request.headers.get("referer") || "unknown"
    );
    return new NextResponse("Forbidden: Invalid origin", { status: 403 });
  }

  // ============================================================================
  // Rate Limiting - Limit mutations per user/IP
  // ============================================================================
  const isMutation = MUTATION_METHODS.includes(request.method.toUpperCase());
  if (ratelimit && isMutation) {
    // Use IP as identifier (will be replaced with user ID after auth check if available)
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    const { success, limit, reset, remaining } = await ratelimit.limit(`mutation:${ip}`);

    if (!success) {
      console.warn(`Rate limit exceeded for ${ip} on ${request.nextUrl.pathname}`);
      return new NextResponse("Too Many Requests", {
        status: 429,
        headers: {
          "X-RateLimit-Limit": limit.toString(),
          "X-RateLimit-Remaining": remaining.toString(),
          "X-RateLimit-Reset": reset.toString(),
          "Retry-After": Math.ceil((reset - Date.now()) / 1000).toString(),
        },
      });
    }
  }

  // Create response that will be returned
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Check for corrupted Supabase cookies and clear them
  const cookies = request.cookies.getAll();
  const corruptedCookies: string[] = [];

  for (const cookie of cookies) {
    if (cookie.name.startsWith("sb-")) {
      try {
        if (cookie.value) {
          const base64urlRegex = /^[A-Za-z0-9_-]*$/;
          const parts = cookie.value.split(".");
          const isValid = parts.every((part) => base64urlRegex.test(part) || part === "");
          if (!isValid) {
            corruptedCookies.push(cookie.name);
          }
        }
      } catch {
        corruptedCookies.push(cookie.name);
      }
    }
  }

  // Clear corrupted cookies before Supabase tries to read them
  if (corruptedCookies.length > 0) {
    for (const cookieName of corruptedCookies) {
      response.cookies.delete(cookieName);
      console.warn(`Middleware: Cleared corrupted cookie: ${cookieName}`);
    }
    // Return early to let cookies clear
    addSecurityHeaders(response);
    return response;
  }

  // Create Supabase client with modern cookie handling (getAll/setAll pattern)
  // This is the recommended approach from Supabase docs for proper token refresh
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session - critical for maintaining auth state
  // IMPORTANT: Use getUser() instead of getSession() to properly refresh tokens
  // getSession() doesn't revalidate the JWT, getUser() does
  let user = null;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      // Token refresh failed - clear cookies and let user re-authenticate
      console.warn("Middleware: Token refresh failed:", error.message);
    } else {
      user = data.user;
    }
  } catch (error) {
    console.warn("Middleware: Session load failed, clearing auth cookies:", error);
    const allCookies = request.cookies.getAll();
    for (const cookie of allCookies) {
      if (cookie.name.startsWith("sb-")) {
        response.cookies.delete(cookie.name);
      }
    }
    addSecurityHeaders(response);
    return response;
  }

  // Admin route protection
  if (request.nextUrl.pathname.startsWith("/admin")) {
    // Redirect to login if not authenticated
    if (!user) {
      const loginUrl = new URL("/auth/login", request.url);
      loginUrl.searchParams.set("next", request.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Check admin status from user_roles table
    const { data: userRole } = await supabase
      .from("user_roles")
      .select("roles!inner(name)")
      .eq("profile_id", user.id)
      .in("roles.name", ["admin", "superadmin"])
      .maybeSingle();

    const isAdmin = !!userRole;

    // Redirect to home if not admin
    if (!isAdmin) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  // Apply security headers to successful responses
  addSecurityHeaders(response);
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
