import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware to handle corrupted Supabase auth cookies
 * Validates sb-* cookies and clears them if corrupted
 */
export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Check for corrupted Supabase cookies
  const cookies = request.cookies.getAll();
  const corruptedCookies: string[] = [];

  for (const cookie of cookies) {
    if (cookie.name.startsWith('sb-')) {
      try {
        // Validate base64url encoding
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

  // Clear corrupted cookies
  for (const cookieName of corruptedCookies) {
    response.cookies.delete(cookieName);
    console.warn(`Cleared corrupted Supabase cookie: ${cookieName}`);
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
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
