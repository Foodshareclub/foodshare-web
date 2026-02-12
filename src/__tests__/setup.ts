/**
 * Bun Test Setup
 * Global configuration for all tests
 */

import { mock } from "bun:test";
import "@testing-library/jest-dom";

// =============================================================================
// Module Mocks (bun:test mock.module)
// =============================================================================

// Mock server-only package (prevents errors in test environment)
mock.module("server-only", () => ({}));

// Mock next/cache (Server Actions use this)
mock.module("next/cache", () => ({
  revalidatePath: () => {},
  revalidateTag: () => {},
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
  unstable_noStore: () => {},
  cacheLife: () => {},
  cacheTag: () => {},
}));

// Mock cache-keys (avoid importing actual module which depends on next/cache)
mock.module("@/lib/data/cache-keys", () => ({
  CACHE_TAGS: new Proxy({}, { get: (_t, prop) => (typeof prop === "string" ? prop : "") }),
  CACHE_DURATIONS: { short: 60, medium: 300, long: 3600 },
  CACHE_PROFILES: {},
  invalidateTag: () => {},
  logCacheOperation: () => {},
  getProductTags: () => [],
  getProfileTags: () => [],
  getForumTags: () => [],
  getChallengeTags: () => [],
  getNotificationTags: () => [],
  getAdminTags: () => [],
  getNewsletterTags: () => [],
  invalidateAdminCaches: () => {},
  getPostActivityTags: () => [],
  invalidatePostActivityCaches: () => {},
  invalidateNewsletterCaches: () => {},
  getEmailTags: () => [],
  invalidateEmailCaches: () => {},
}));

// Mock Supabase server (fallback — per-test mocks override this)
mock.module("@/lib/supabase/server", () => {
  const mockClient = {
    auth: {
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: null, error: null }),
          maybeSingle: () => Promise.resolve({ data: null, error: null }),
        }),
      }),
    }),
  };
  return {
    createClient: () => Promise.resolve(mockClient),
    createCachedClient: () => mockClient,
    createServerClient: () => Promise.resolve(mockClient),
  };
});

// Mock next/headers
mock.module("next/headers", () => ({
  headers: () => new Map(),
  cookies: () => ({
    get: () => null,
    set: () => {},
    delete: () => {},
    getAll: () => [],
    has: () => false,
  }),
}));

// Mock Next.js router
mock.module("next/navigation", () => ({
  useRouter: () => ({
    push: () => {},
    replace: () => {},
    prefetch: () => {},
    back: () => {},
    forward: () => {},
    refresh: () => {},
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
  redirect: () => {},
  notFound: () => {},
}));

// Mock next-intl
mock.module("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "en",
}));

// =============================================================================
// Browser API Polyfills
// =============================================================================

// Mock window.matchMedia
if (typeof window !== "undefined") {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

// Mock ResizeObserver
if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}

// Mock IntersectionObserver
if (typeof globalThis.IntersectionObserver === "undefined") {
  globalThis.IntersectionObserver = class IntersectionObserver {
    root = null;
    rootMargin = "";
    thresholds: number[] = [];
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  } as unknown as typeof IntersectionObserver;
}
