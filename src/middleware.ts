import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAuthSession } from "./lib/data/auth";
import { getBrowserLocale, type Locale } from "./i18n/config";

export async function middleware(request: NextRequest) {
  // Get auth session for auth guard
  const session = await getAuthSession();

  // Get locale from cookie or browser preference
  const localeCookie = request.cookies.get("locale");
  const browserLocale = getBrowserLocale();
  let locale: Locale = "en";

  if (localeCookie) {
    locale = localeCookie.value as Locale;
  } else if (browserLocale) {
    locale = browserLocale;
  }

  // Set locale cookie if not present
  if (!localeCookie) {
    const response = NextResponse.next();
    response.cookies.set("locale", locale);
    return response;
  }

  // Auth guard: protect routes that require authentication
  // Public pages that don't require auth
  const publicPaths = [
    "/",
    "/auth/sign-in",
    "/auth/sign-up",
    "/auth/reset-password",
    "/verify-email",
    "/locale-switcher",
  ];

  const isPublicPath = publicPaths.some((path) => request.nextUrl.pathname.startsWith(path));

  // If not a public path and no session, redirect to sign-in
  if (!isPublicPath && !session) {
    const url = new URL("/auth/sign-in", request.url);
    url.searchParams.set("redirectTo", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // If on auth page already signed in, redirect to home
  if (isPublicPath && session) {
    const url = new URL("/", request.url);
    return NextResponse.redirect(url);
  }

  // Locale redirect: if browser locale differs from cookie, update cookie
  if (browserLocale && browserLocale !== locale) {
    const response = NextResponse.next();
    response.cookies.set("locale", browserLocale);
    return response;
  }

  return NextResponse.next();
}

// Configure which routes run middleware on
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|next-intl).*)"],
};
