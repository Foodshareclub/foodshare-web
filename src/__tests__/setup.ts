/**
 * Bun Test Setup
 * Global configuration for all tests
 */

import { mock } from "bun:test";
import "@testing-library/jest-dom";

// =============================================================================
// Environment Variables (set before module loading)
// =============================================================================

process.env.NEXT_PUBLIC_SUPABASE_URL ??= "https://test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= "test-anon-key";

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

// Mock @supabase/ssr (prevents real client creation in tests)
mock.module("@supabase/ssr", () => ({
  createBrowserClient: () => ({
    auth: {
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      signInWithPassword: () => Promise.resolve({ data: null, error: null }),
      signUp: () => Promise.resolve({ data: null, error: null }),
      signOut: () => Promise.resolve({ error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
    from: () => ({
      select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }),
    }),
  }),
  createServerClient: () => ({}),
}));

// Mock cache-keys (avoid importing actual module which depends on next/cache)
// Static tags return strings; function tags return functions matching real signatures
const STATIC_CACHE_TAGS: Record<string, string> = {
  PRODUCTS: "products", PRODUCT_LOCATIONS: "product-locations", PRODUCT_SEARCH: "product-search",
  NEARBY_POSTS: "nearby-posts", NEARBY_POSTS_COUNTS: "nearby-posts-counts",
  PROFILES: "profiles", VOLUNTEERS: "volunteers",
  CHALLENGES: "challenges", CHALLENGE_LEADERBOARD: "challenge-leaderboard",
  FORUM: "forum", CHATS: "chats",
  ADMIN: "admin", ADMIN_STATS: "admin-stats", ADMIN_ANALYTICS: "admin-analytics",
  ADMIN_LISTINGS: "admin-listings", ADMIN_USERS: "admin-users",
  ADMIN_REPORTS: "admin-reports", ADMIN_CRM: "admin-crm", AUDIT_LOGS: "audit-logs",
  POST_ACTIVITY: "post-activity", POST_ACTIVITY_STATS: "post-activity-stats",
  NEWSLETTER: "newsletter", CAMPAIGNS: "campaigns", SEGMENTS: "segments",
  AUTOMATIONS: "automations", SUBSCRIBERS: "subscribers",
  AUTH: "auth", SESSION: "session",
  NOTIFICATIONS: "notifications", NOTIFICATIONS_UNREAD: "notifications-unread",
  EMAIL_HEALTH: "email-health", PROVIDER_HEALTH: "provider-health",
  PROVIDER_QUOTAS: "provider-quotas", EMAIL_QUEUE: "email-queue",
  EMAIL_LOGS: "email-logs", EMAIL_STATS: "email-stats", PROVIDER_METRICS: "provider-metrics",
};

mock.module("@/lib/data/cache-keys", () => ({
  CACHE_TAGS: new Proxy({}, {
    get: (_t, prop) => {
      if (typeof prop !== "string") return "";
      if (prop in STATIC_CACHE_TAGS) return STATIC_CACHE_TAGS[prop];
      return (id: unknown) => `${prop.toLowerCase().replace(/_/g, "-")}-${id}`;
    },
  }),
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
