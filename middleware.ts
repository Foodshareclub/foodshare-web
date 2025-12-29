/**
 * Next.js Middleware
 * Handles edge-level rate limiting, auth session refresh, and security
 */
import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Cached rate limiter instances
let globalLimiter: InstanceType<typeof import("@upstash/ratelimit").Ratelimit> | null = null;
let authLimiter: InstanceType<typeof import("@upstash/ratelimit").Ratelimit> | null = null;
let rateLimitingInitialized = false;

/**
 * Initialize rate limiting modules lazily to avoid bundling issues
 */
async function initRateLimiting(): Promise<boolean> {
  if (rateLimitingInitialized) {
    return globalLimiter !== null;
  }

  rateLimitingInitialized = true;

  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return false;
  }

  try {
    const [{ Ratelimit }, { Redis }] = await Promise.all([
      import("@upstash/ratelimit"),
      import("@upstash/redis"),
    ]);

    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });

    // Global rate limiter: 100 requests per 10 seconds per IP
    globalLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(100, "10 s"),
      analytics: true,
      prefix: "ratelimit:global",
    });

    // Strict rate limiter for auth endpoints: 10 requests per minute
    authLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, "1 m"),
      analytics: true,
      prefix: "ratelimit:auth",
    });

    return true;
  } catch {
    // Rate limiting not available
    return false;
  }
}

/**
 * Get client IP from request headers
 */
function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const cfConnectingIp = request.headers.get("cf-connecting-ip");

  return cfConnectingIp || realIp || forwardedFor?.split(",")[0].trim() || "unknown";
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ip = getClientIp(request);

  // Skip rate limiting in development
  if (process.env.NODE_ENV === "production") {
    const hasRateLimiting = await initRateLimiting();

    if (hasRateLimiting && globalLimiter) {
      // Apply stricter rate limiting to auth endpoints
      if (pathname.startsWith("/auth") || pathname.startsWith("/api/auth")) {
        if (authLimiter) {
          const { success, reset } = await authLimiter.limit(ip);
          if (!success) {
            return new NextResponse("Too Many Requests", {
              status: 429,
              headers: {
                "Retry-After": String(Math.ceil((reset - Date.now()) / 1000)),
                "X-RateLimit-Limit": "10",
                "X-RateLimit-Remaining": "0",
              },
            });
          }
        }
      }

      // Apply global rate limiting to all requests
      const { success, limit, remaining, reset } = await globalLimiter.limit(ip);

      if (!success) {
        return new NextResponse("Too Many Requests", {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil((reset - Date.now()) / 1000)),
            "X-RateLimit-Limit": String(limit),
            "X-RateLimit-Remaining": "0",
          },
        });
      }

      // Add rate limit headers to successful responses
      const response = await updateSession(request);
      response.headers.set("X-RateLimit-Limit", String(limit));
      response.headers.set("X-RateLimit-Remaining", String(remaining));

      return response;
    }
  }

  // In development or without Redis, just handle session
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
