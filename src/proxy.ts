import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Supabase Auth Proxy
 *
 * This proxy handles session refresh on every request, ensuring:
 * 1. Supabase auth cookies are properly synced
 * 2. Expired sessions are refreshed automatically
 * 3. Admin routes are protected with role-based access
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
  if (corruptedCookies.length > 0) {
    for (const cookieName of corruptedCookies) {
      response.cookies.delete(cookieName);
      console.warn(`Proxy: Cleared corrupted cookie: ${cookieName}`);
    }
    // Return early to let cookies clear
    return response;
  }

  // Create Supabase client with cookie handling
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          // Update both request and response cookies
          request.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          // Remove from both request and response cookies
          request.cookies.set({
            name,
            value: '',
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  // Refresh session - this is critical for maintaining auth state
  // Wrap in try-catch to handle corrupted cookie errors gracefully
  let session = null;
  try {
    const { data } = await supabase.auth.getSession();
    session = data.session;
  } catch (error) {
    // If session loading fails (e.g., corrupted cookies), clear all sb- cookies
    console.warn('Proxy: Session load failed, clearing auth cookies:', error);
    const allCookies = request.cookies.getAll();
    for (const cookie of allCookies) {
      if (cookie.name.startsWith('sb-')) {
        response.cookies.delete(cookie.name);
      }
    }
    // Return response with cleared cookies - user will need to re-authenticate
    return response;
  }

  // Check if accessing admin routes
  if (request.nextUrl.pathname.startsWith('/admin')) {
    // Redirect to login if not authenticated
    if (!session?.user) {
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('next', request.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Check if user has admin role from profiles table
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_role')
      .eq('id', session.user.id)
      .single();

    // Redirect to home if not admin
    if (!profile || (profile.user_role !== 'admin' && profile.user_role !== 'superadmin')) {
      return NextResponse.redirect(new URL('/', request.url));
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
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
