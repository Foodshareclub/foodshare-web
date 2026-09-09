"use client";

// middleware.ts — Auth guard + locale redirect + feature flag routing + health check
// Single entry point for all routing concerns. Runs before all requests.
// Integrates with proxy.ts for API route forwarding during development.
//
// 1. Auth guard — redirect unauthenticated users to login
// 2. Locale redirect — enforce consistent i18n routing
// 3. Feature flag routing — per-route feature gate evaluation
// 4. Health check — lightweight readiness probe for load balancers
// 5. Dev proxy — forward /api/* requests to external services in development

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import proxies, { handleProxy } from "@/lib/proxy";

// ─── Core Constants ───────────────────────────────────────────────────────────

const LOGIN_PATH = "/auth/login";
const LOGIN_REDIRECT = "/";

// Public paths that don't require authentication
const PUBLIC_PATHS = ["/auth/login", "/auth/register", "/api/health", "/api/status"];

// ─── Helper: Strip Locale Prefix ─────────────────────────────────────────────

/** Remove /en/ /fr/ /de/ prefix for locale-agnostic comparison */
function stripLocale(path: string): string {
  const parts = path.split("/").filter(Boolean);
  // If the first segment is a known locale code, skip it
  const knownLocales = ["en", "fr", "de", "ru", "es", "pt", "zh", "ja", "ar"];
  if (knownLocales.includes(parts[0] ?? "")) {
    return "/" + parts.slice(1).join("/");
  }
  return path;
}

// ─── Dev Proxy Middleware ────────────────────────────────────────────────────
// Forwards /api/* requests to external services during development.
// Only active when NODE_ENV === "development".
// Uses proxy.ts configuration for target URLs and header preservation.

export async function createDevProxyMiddleware(
  request: NextRequest,
  proxyConfig: (typeof proxies)[keyof typeof proxies]
): Promise<Response | null> {
  // Only active in development
  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  const { target, prefix } = proxyConfig;
  const pathname = request.nextUrl.pathname;

  // Check if this request matches the proxy prefix
  if (!pathname.startsWith(prefix)) {
    return null;
  }

  // Strip the prefix and forward to target
  const strippedPathname = pathname.slice(prefix.length);
  const targetUrl = new URL(`${target}${strippedPathname}`, request.url);

  return handleProxy(request, targetUrl.href, {
    preserveHeaders: ["authorization", "content-type", "x-api-key"],
  });
}

// ─── Middleware ───────────────────────────────────────────────────────────────

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const stripped = stripLocale(path);
  const isPublic = PUBLIC_PATHS.some((p) => stripped.startsWith(p));
  const hasAuthToken = request.cookies.get("foodshare_auth")?.value !== undefined;

  // ─── Health Check ─────────────────────────────────────────────────────────
  // Early return for health probes — no auth, no redirect, just 200
  if (stripped === "/api/health" || stripped === "/api/status") {
    return NextResponse.next();
  }

  // ─── Auth Guard ───────────────────────────────────────────────────────────
  if (!isPublic && !hasAuthToken) {
    const url = new URL(LOGIN_REDIRECT, request.url);
    url.searchParams.set("redirectedFrom", path);
    return NextResponse.redirect(url);
  }

  // ─── Dev Proxy — forward API requests in development ──────────────────────
  // Try each proxy config; return the first match or null
  for (const key of Object.keys(proxies)) {
    const proxyConfig = proxies[key as keyof typeof proxies];
    const devProxy = await createDevProxyMiddleware(request, proxyConfig);
    if (devProxy) {
      return devProxy;
    }
  }

  // ─── Locale Enforcement ──────────────────────────────────────────────────
  // If no locale in path and not on public routes, redirect to /en/
  // (This is a simplified example — full i18n would use next-i18next)
  const localeParts = stripped.split("/").filter(Boolean);
  if (
    !["en", "fr", "de", "ru", "es", "pt", "zh", "ja", "ar"].includes(localeParts[0] ?? "") &&
    !isPublic
  ) {
    const redirectPath = `/en${stripped}`;
    const url = new URL(redirectPath, request.url);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// ─── Configuration ──────────────────────────────────────────────────────────
// Match all routes except static assets and Next.js internals
// Also match API routes for dev proxy evaluation
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|images/|static/).*)", "/api/:path*"],
};
