/**
 * Supabase Middleware Helper
 * Handles session refresh, cookie management, and request correlation in Edge runtime
 */
import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Generate a correlation ID for request tracing
 * Uses crypto.randomUUID() for unique identifiers
 */
function generateCorrelationId(): string {
  return crypto.randomUUID();
}

/**
 * Update Supabase session in middleware
 * Refreshes expired sessions and manages auth cookies
 * Adds correlation ID for distributed tracing
 */
export async function updateSession(request: NextRequest) {
  // Get or generate correlation ID for request tracing
  const correlationId = request.headers.get("x-correlation-id") || generateCorrelationId();

  let supabaseResponse = NextResponse.next({
    request,
  });

  // Add correlation ID to response headers for tracing
  supabaseResponse.headers.set("x-correlation-id", correlationId);
  supabaseResponse.headers.set("x-request-id", correlationId);

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // Refresh session if expired - required for Server Components
  // https://supabase.com/docs/guides/auth/server-side/nextjs
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Optional: Redirect unauthenticated users from protected routes
  const protectedRoutes = ["/profile", "/settings", "/my-posts", "/admin"];
  const isProtectedRoute = protectedRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  );

  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    url.searchParams.set("redirectTo", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // Admin route protection
  if (request.nextUrl.pathname.startsWith("/admin") && user) {
    // Note: Full admin check happens in the page/action
    // This is just a quick session validation at the edge
  }

  return supabaseResponse;
}
