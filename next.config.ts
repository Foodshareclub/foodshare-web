import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  // Enable React Compiler (stable in Next.js 16)
  reactCompiler: true,

  // Set Turbopack root to silence monorepo lockfile warning
  turbopack: {
    root: __dirname,
  },

  experimental: {
    // Optimize package imports for better tree-shaking
    optimizePackageImports: [
      "@radix-ui/react-accordion",
      "@radix-ui/react-alert-dialog",
      "@radix-ui/react-aspect-ratio",
      "@radix-ui/react-avatar",
      "@radix-ui/react-checkbox",
      "@radix-ui/react-collapsible",
      "@radix-ui/react-context-menu",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-hover-card",
      "@radix-ui/react-menubar",
      "@radix-ui/react-navigation-menu",
      "@radix-ui/react-popover",
      "@radix-ui/react-progress",
      "@radix-ui/react-radio-group",
      "@radix-ui/react-scroll-area",
      "@radix-ui/react-select",
      "@radix-ui/react-separator",
      "@radix-ui/react-slider",
      "@radix-ui/react-slot",
      "@radix-ui/react-switch",
      "@radix-ui/react-tabs",
      "@radix-ui/react-toast",
      "@radix-ui/react-toggle",
      "@radix-ui/react-toggle-group",
      "@radix-ui/react-tooltip",
      "react-icons",
      "framer-motion",
      "leaflet",
    ],

    // Enable Web Vitals attribution for debugging
    webVitalsAttribution: ["CLS", "FCP", "FID", "INP", "LCP", "TTFB"],
  },

  // Server-only packages (top-level in Next.js 15)
  serverExternalPackages: [
    "@aws-sdk/client-ses",
    "@getbrevo/brevo",
    "openai",
    "duckdb",
    "duckdb-async",
  ],

  // Webpack config to handle node-pre-gyp conditional requires
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "aws-sdk": false,
      nock: false,
      "mock-aws-s3": false,
    };
    return config;
  },

  // Enhanced image optimization
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "***REMOVED***.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        // Legacy Firebase Storage images (for data migration period)
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
        pathname: "/v0/b/**",
      },
    ],
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 2592000, // 30 days - images rarely change
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // Build insights and logging
  logging: {
    fetches: {
      fullUrl: true,
    },
  },

  // Compression
  compress: true,

  // Production optimization - no source maps in production
  productionBrowserSourceMaps: false,

  // Output standalone for Docker/container deployments
  output: process.env.BUILD_STANDALONE === "true" ? "standalone" : undefined,

  // Redirects for legacy detail page routes only
  async redirects() {
    return [
      // Legacy /products/:id routes → /food/:id (products route doesn't exist)
      {
        source: "/products/:id(\\d+)",
        destination: "/food/:id",
        permanent: true,
      },
      // Legacy /things/:id routes → /thing/:id (plural to singular)
      {
        source: "/things/:id(\\d+)",
        destination: "/thing/:id",
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
  // NOTE: type values must match database post_type values (singular forms)
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
        source: "/businesses",
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
        source: "/business",
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
      // Detail page rewrites: /:type/:id -> /food/:id
      {
        source: "/thing/:id",
        destination: "/food/:id",
      },
      {
        source: "/borrow/:id",
        destination: "/food/:id",
      },
      {
        source: "/wanted/:id",
        destination: "/food/:id",
      },
      {
        source: "/fridge/:id",
        destination: "/food/:id",
      },
      {
        source: "/foodbank/:id",
        destination: "/food/:id",
      },
      {
        source: "/business/:id",
        destination: "/food/:id",
      },
      {
        source: "/volunteer/:id",
        destination: "/food/:id",
      },
      // Challenge detail has its own dedicated route at /challenge/[id]
      // No rewrite needed
      {
        source: "/zerowaste/:id",
        destination: "/food/:id",
      },
      {
        source: "/vegan/:id",
        destination: "/food/:id",
      },
    ];
  },

  // Security headers
  async headers() {
    return [
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
            value: "origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self)",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://vercel.live https://*.vercel-scripts.com https://www.googletagmanager.com https://www.google-analytics.com",
              "worker-src 'self' blob:",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: blob: https://*.supabase.co https://*.r2.cloudflarestorage.com https://*.openstreetmap.org https://*.tile.openstreetmap.org https://*.basemaps.cartocdn.com https://firebasestorage.googleapis.com https://www.googletagmanager.com https://www.google-analytics.com",
              "font-src 'self' https://fonts.gstatic.com",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.r2.cloudflarestorage.com https://api.openai.com https://vercel.live wss://ws-us3.pusher.com https://www.google-analytics.com https://analytics.google.com https://*.google-analytics.com",
              "frame-ancestors 'self'",
              "frame-src 'self' https://vercel.live",
              "form-action 'self'",
              "base-uri 'self'",
              "object-src 'none'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
