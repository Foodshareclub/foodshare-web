import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Next.js Middleware for Supabase Auth
 *
 * This middleware handles session refresh on every request, ensuring:
 * 1. Supabase auth cookies are properly synced
 * 2. Expired sessions are refreshed automatically
 * 3. Admin routes are protected with role-based access (defense-in-depth)
 *
 * Security: Admin check uses multiple role sources for consistency with checkIsAdmin()
 */
export async function middleware(request: NextRequest) {
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
      console.warn(`Middleware: Cleared corrupted cookie: ${cookieName}`);
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

  // Refresh session - critical for maintaining auth state
  let session = null;
  try {
    const { data } = await supabase.auth.getSession();
    session = data.session;
  } catch (error) {
    console.warn('Middleware: Session load failed, clearing auth cookies:', error);
    const allCookies = request.cookies.getAll();
    for (const cookie of allCookies) {
      if (cookie.name.startsWith('sb-')) {
        response.cookies.delete(cookie.name);
      }
    }
    return response;
  }

  // Admin route protection
  if (request.nextUrl.pathname.startsWith('/admin')) {
    // Redirect to login if not authenticated
    if (!session?.user) {
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('next', request.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Check admin status from multiple sources (consistent with checkIsAdmin in auth.ts)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, user_role')
      .eq('id', session.user.id)
      .single();

    // Check JSONB role field (new system)
    const jsonbRoles = (profile?.role as Record<string, boolean>) || {};
    const isJsonbAdmin = jsonbRoles.admin === true;

    // Check legacy user_role field
    const isLegacyAdmin = profile?.user_role === 'admin' || profile?.user_role === 'superadmin';

    // Check user_roles junction table
    const { data: userRolesData } = await supabase
      .from('user_roles')
      .select('role_id, roles!user_roles_role_id_fkey(name)')
      .eq('profile_id', session.user.id);

    const tableRoles = (userRolesData ?? []).flatMap((r) => {
      const roleName = (r as { roles?: { name?: string } }).roles?.name;
      return roleName ? [roleName] : [];
    });
    const isTableAdmin = tableRoles.includes('admin') || tableRoles.includes('superadmin');

    // Redirect to home if not admin (any source)
    if (!isJsonbAdmin && !isLegacyAdmin && !isTableAdmin) {
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
