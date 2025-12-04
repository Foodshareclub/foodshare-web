import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

/**
 * Auth Callback Route Handler
 * Exchanges the OAuth code for a session server-side
 *
 * This handler:
 * 1. Receives the auth code from OAuth provider
 * 2. Exchanges it for a session (sets cookies)
 * 3. Revalidates the app to reflect the new auth state
 * 4. Redirects to the intended destination
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') ?? '/';
  const type = requestUrl.searchParams.get('type');

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Revalidate the entire app to reflect the new auth state
      revalidatePath('/', 'layout');

      // Handle password recovery redirect
      if (type === 'recovery') {
        const redirectUrl = new URL('/auth/reset-password', requestUrl.origin);
        return NextResponse.redirect(redirectUrl);
      }

      // Redirect to the intended destination
      const redirectUrl = new URL(next, requestUrl.origin);
      return NextResponse.redirect(redirectUrl);
    }

    // Log error in development
    if (process.env.NODE_ENV === 'development') {
      console.error('[Auth Callback] Error exchanging code for session:', error);
    }
  }

  // Return the user to an error page with instructions
  const errorUrl = new URL('/auth/login?error=auth_error', requestUrl.origin);
  return NextResponse.redirect(errorUrl);
}
