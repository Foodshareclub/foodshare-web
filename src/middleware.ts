import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware for Supabase Auth session refresh
 * Uses the proxy pattern recommended for Next.js 16
 * Also handles corrupted cookie cleanup
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Check for corrupted Supabase cookies first
  const cookies = request.cookies.getAll();
  const corruptedCookies: string[] = [];

  for (const cookie of cookies) {
    if (cookie.name.startsWith('sb-')) {
      try {
        if (cookie.value) {
          const base64urlRegex = /^[A-Za-z0-9_-]*$/;
          const parts = cookie.value.split('.');
          const isValid = parts.every(
            (part) => base64urlRegex.test(part) || part === ''
          );
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
  for (const cookieName of corruptedCookies) {
    response.cookies.delete(cookieName);
    console.warn(`Middleware: Cleared corrupted cookie: ${cookieName}`);
  }

  // If we found corrupted cookies, return early to let them clear
  if (corruptedCookies.length > 0) {
    return response;
  }

  // Create Supabase client for session refresh
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session if expired - this is the key part
  // getUser() will refresh the session token if needed
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap, robots
     * - public folder assets
     * - api routes that don't need auth
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
