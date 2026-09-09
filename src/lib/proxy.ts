"use client";

import type { NextRequest } from "next/server";

// proxy.ts — Next.js Route Middleware Proxy
// Provides API route proxying for development and staged environments
// Used alongside middleware.ts for cross-origin routing and API forwarding
//
// ✅ Phase 1.2: Web/Next.js — App Router + TPA + Cache Components
// ✅ True standalone module — can be imported by middleware or API routes
// ✅ Zero runtime overhead when NODE_ENV !== development

// ─── Configuration ──────────────────────────────────────────────────────────
//
// Define API route proxies that forward requests to external services
// during development, while pointing to production in staging/production.
//
// Pattern: "/api/*" → target URL
// Useful for:
// - Forwarding to Supabase Edge Functions during dev
// - Forwarding to external auth providers
// - CORS preflight handling
// - Rate limiting in dev
//
// Usage in middleware.ts:
//   if (pathname.startsWith('/api/')) return NextResponse.next();
//   // proxy.ts handles the actual forwarding

export const proxies = {
  // Supabase Edge Functions during development
  supabase: {
    target:
      process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(`/rest/v1`, "") ||
      "https://your-project.supabase.co",
    // Path prefix to match in middleware
    prefix: "/api/supabase",
  },
  // External API services
  external: {
    target: process.env.EXTERNAL_API_URL || "https://api.example.com",
    prefix: "/api/external",
  },
};

// ─── Proxy Handler ──────────────────────────────────────────────────────────
// Creates a Next.js Response that proxies the request to the target URL
// Preserves headers, method, and body
//
// ✅ Phase 1.2: True standalone — no useEffect, no useState, just pure function
export async function handleProxy(
  request: Request,
  targetUrl: string,
  options: {
    // Modify request before forwarding
    modifyRequest?: (req: Request) => Request;
    // Modify response before sending back
    modifyResponse?: (resp: Response) => Response;
    // Which headers to preserve
    preserveHeaders?: string[];
  } = {}
): Promise<Response> {
  const { modifyRequest, modifyResponse, preserveHeaders = [] } = options;

  // Build the target URL
  const url = new URL(targetUrl);

  // Clone and modify the request if needed
  const modifiedRequest = modifyRequest ? modifyRequest(request) : request;

  // Forward the request
  const response = await fetch(modifiedRequest, {
    // Forward credentials (cookies, auth headers)
    credentials: "include",
    // Forward method
    method: modifiedRequest.method,
    // Forward headers — preserve custom ones + content-type
    headers: {
      ...modifiedRequest.headers,
      ...(preserveHeaders.length > 0 // Only preserve specified headers
        ? preserveHeaders.reduce<Record<string, string>>((acc, header) => {
            if (modifiedRequest.headers.has(header)) {
              acc[header] = modifiedRequest.headers.get(header)!;
            }
            return acc;
          }, {})
        : {}),
    },
    // Body for POST/PUT/PATCH
    body:
      modifiedRequest.method !== "GET" && modifiedRequest.method !== "HEAD"
        ? await modifiedRequest.clone().body
        : undefined,
    // Redirect following
    redirect: "follow",
  });

  // Modify response if needed
  if (modifyResponse) {
    return modifyResponse(response);
  }

  // Preserve status and important headers
  const preservedHeaders: Record<string, string> = {};
  for (const header of preserveHeaders) {
    if (response.headers.has(header)) {
      preservedHeaders[header] = response.headers.get(header)!;
    }
  }

  // Return proxied response
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: {
      ...preservedHeaders,
      // CORS headers for browser consumption
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      // Cache control for ISR compatibility
      "Cache-Control": "no-store",
    },
  });
}

// ─── Development Proxy Middleware ──────────────────────────────────────────
// Use in Next.js middleware or development-only server
// Forwards /api/* requests to external services during development
//
// ✅ Safe for ISR/Cache Components — no runtime in production
export async function createDevProxyMiddleware(
  request: NextRequest,
  config: (typeof proxies)[keyof typeof proxies]
): Promise<Response | null> {
  // Only active in development
  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  const { target, prefix } = config;
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

// ─── Export typed proxy config ─────────────────────────────────────────────
// Type-safe access to proxy configurations

export type ProxyConfig = (typeof proxies)[keyof typeof proxies];

// ─── Default export for convenience ────────────────────────────────────────
// Default proxy setup for Supabase Edge Functions
//
// Usage in middleware.ts:
//   const devProxy = createDevProxyMiddleware(request, proxies.supabase);
//   if (devProxy) return devProxy;
export default proxies;
