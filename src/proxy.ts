import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Next.js 16 Proxy for Supabase Auth
 *
 * This proxy handles session refresh on every request, ensuring:
 * 1. Supabase auth cookies are properly synced
 * 2. Expired sessions are refreshed automatically
 * 3. Admin routes are protected with role-based access (defense-in-depth)
 *
 * Security: Admin check uses multiple role sources for consistency with checkIsAdmin()
 */
export async function proxy(request: NextRequest) {
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
