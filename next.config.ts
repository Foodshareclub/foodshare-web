import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { withSentryConfig } from "@sentry/nextjs";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  // React Compiler - automatic memoization for +15-20% render performance
  reactCompiler: true,

  // Trim client bundles: tree-shake large icon/data libs via modular imports
  experimental: {
    optimizePackageImports: ["lucide-react", "date-fns", "lodash-es"],
  },

  // Remote images (avatars, listing photos) — Supabase Storage + R2 CDN
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "**.r2.cloudflarestorage.com" },
      { protocol: "https", hostname: "**.foodshare.club" },
    ],
  },

  // TypeScript is checked in CI (`bun run type-check`); fail builds on type errors.
  typescript: {
    ignoreBuildErrors: false,
  },

  // HTML-limited bots that cannot execute JavaScript
  // These bots receive blocking metadata instead of streaming metadata
  // to ensure they always get complete meta tags in <head>
  htmlLimitedBots:
    /Googlebot|Bingbot|Yandex|YandexBot|DuckDuckBot|Slurp|Baiduspider|facebookexternalhit|Twitterbot|LinkedInBot|WhatsApp|TelegramBot|Applebot|PinterestBot|Discordbot|GPTBot|ChatGPT-User|PerplexityBot|Google-Extended|anthropic-ai|CCBot/,

  // Enable incremental static regeneration (ISR) with cacheComponents
  cacheComponents: true,

  // Full caching profile — revalidation times per data layer resource
  cacheLife: {
    // Short-lived (real-time data, chat, notifications)
    short: { stale: 30, revalidate: 30, expire: 300 },
    // Products cache — 60s revalidation (frequently updated inventory)
    products: { stale: 300, revalidate: 60, expire: 3600 },
    // Product detail — 120s revalidation
    "product-detail": { stale: 300, revalidate: 120, expire: 3600 },
    // Product locations — 300s revalidation
    "product-locations": { stale: 300, revalidate: 300, expire: 3600 },
    // Profiles — 300s revalidation
    profiles: { stale: 300, revalidate: 300, expire: 3600 },
    // Profile stats — 600s revalidation
    "profile-stats": { stale: 300, revalidate: 600, expire: 7200 },
    // Challenges — 300s revalidation
    challenges: { stale: 300, revalidate: 300, expire: 3600 },
    // Challenge leaderboard — 120s revalidation
    "challenge-leaderboard": { stale: 300, revalidate: 120, expire: 3600 },
    // Forum threads — 120s revalidation
    forum: { stale: 300, revalidate: 120, expire: 3600 },
    // Chat — 30s revalidation (real-time)
    chat: { stale: 30, revalidate: 30, expire: 300 },
    // Admin stats — 300s revalidation
    "admin-stats": { stale: 300, revalidate: 300, expire: 3600 },
    // Email system — 60s revalidation
    email: { stale: 60, revalidate: 60, expire: 600 },
    // Post activity — 60s revalidation
    "post-activity": { stale: 60, revalidate: 60, expire: 600 },
    // Long-lived (rarely changing, evergreen content)
    long: { stale: 3600, revalidate: 3600, expire: 86400 },
  },

  // WGSL shaders for GPU-accelerated features (if enabled)
  turbopack: {
    root: __dirname,
    rules: {
      "*.wgsl": {
        loaders: ["@vgpu/wgsl/loader-webpack"],
        as: "*.js",
      },
    },
  },

  // Custom webpack rules for legacy support
  webpack: (config) => {
    // Add your custom webpack configuration here
    return config;
  },

  // Custom redirects — 308 permanent for SEO reindex to agnostic /product/[id]-[slug]
  async redirects() {
    return [
      // Legacy /listing/* routes → /product/:id* (single hop to agnostic product)
      {
        source: "/listing/:id*",
        destination: "/product/:id*",
        permanent: true,
      },
      // Legacy /products/:id routes → /product/:id
      {
        source: "/products/:id*",
        destination: "/product/:id*",
        permanent: true,
      },
      // Type-prefixed detail aliases → agnostic product (slug now contains category)
      {
        source: "/thing/:id*",
        destination: "/product/:id*",
        permanent: true,
      },
      {
        source: "/things/:id*",
        destination: "/product/:id*",
        permanent: true,
      },
      {
        source: "/borrow/:id*",
        destination: "/product/:id*",
        permanent: true,
      },
      {
        source: "/wanted/:id*",
        destination: "/product/:id*",
        permanent: true,
      },
      {
        source: "/fridge/:id*",
        destination: "/product/:id*",
        permanent: true,
      },
      {
        source: "/foodbank/:id*",
        destination: "/product/:id*",
        permanent: true,
      },
      {
        source: "/organisation/:id*",
        destination: "/product/:id*",
        permanent: true,
      },
      {
        source: "/organisations/:id*",
        destination: "/product/:id*",
        permanent: true,
      },
      {
        source: "/volunteer/:id*",
        destination: "/product/:id*",
        permanent: true,
      },
      {
        source: "/volunteers/:id*",
        destination: "/product/:id*",
        permanent: true,
      },
      {
        source: "/zerowaste/:id*",
        destination: "/product/:id*",
        permanent: true,
      },
      {
        source: "/vegan/:id*",
        destination: "/product/:id*",
        permanent: true,
      },
      // /community → /forum (community is now the forum)
      {
        source: "/community",
        destination: "/forum",
        permanent: true,
      },
    ];
  },

  // Rewrites for clean category URLs
  // Type values must match database post_type values (singular forms)
  async rewrites() {
    return [
      // Category listing rewrites: /:type -> /food?type=:type
      // Singular forms (canonical)
      {
        source: "/thing",
        destination: "/food?type=thing",
      },
      // Plural forms (user-friendly aliases)
      {
        source: "/things",
        destination: "/food?type=thing",
      },
      {
        source: "/fridges",
        destination: "/food?type=fridge",
      },
      {
        source: "/foodbanks",
        destination: "/food?type=foodbank",
      },
      {
        source: "/organisations",
        destination: "/food?type=business",
      },
      {
        source: "/volunteers",
        destination: "/food?type=volunteer",
      },
      {
        source: "/challenges",
        destination: "/challenge",
      },
      {
        source: "/borrow",
        destination: "/food?type=borrow",
      },
      {
        source: "/wanted",
        destination: "/food?type=wanted",
      },
      {
        source: "/fridge",
        destination: "/food?type=fridge",
      },
      {
        source: "/foodbank",
        destination: "/food?type=foodbank",
      },
      {
        source: "/organisation",
        destination: "/food?type=business",
      },
      {
        source: "/volunteer",
        destination: "/food?type=volunteer",
      },
      // Challenge has its own dedicated route at /challenge
      // No rewrite needed
      {
        source: "/zerowaste",
        destination: "/food?type=zerowaste",
      },
      {
        source: "/vegan",
        destination: "/food?type=vegan",
      },
    ];
  },

  // Security headers
  async headers() {
    return [
      // Cross-origin isolation for MotherDuck/WASM analytics (admin only)
      {
        source: "/admin/analytics/:path*",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
          {
            key: "Cross-Origin-Embedder-Policy",
            value: "require-corp",
          },
        ],
      },
      // API routes - stricter security headers
      {
        source: "/api/:path*",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
      // Public routes - comprehensive headers
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self)",
          },
        ],
      },
    ];
  },
};

// Sentry configuration options — only in production
const sentryWebpackPluginOptions = {
  silent: true,
  org: process.env.SENTRY_ORG || "organicnz",
  project: process.env.SENTRY_PROJECT || "foodshare-web",
  authToken: process.env.SENTRY_AUTH_TOKEN,
  disableServerWebpackPlugin: process.env.NODE_ENV !== "production",
  disableClientWebpackPlugin: process.env.NODE_ENV !== "production",
  hideSourceMaps: true,
  tunnelRoute: "/monitoring",
  webpack: {
    treeshake: {
      removeDebugLogging: true,
    },
  },
};

// Chain: nextIntl -> sentry
export default withSentryConfig(withNextIntl(nextConfig), sentryWebpackPluginOptions);
