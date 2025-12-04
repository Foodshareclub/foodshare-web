import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable React Compiler (stable in Next.js 16)
  reactCompiler: true,

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
  ],

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
    minimumCacheTTL: 60,
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
      // Legacy /food/:id routes → /products/:id
      {
        source: "/food/:id(\\d+)",
        destination: "/products/:id",
        permanent: true,
      },
      // Legacy /things/:id routes → /products/:id
      {
        source: "/things/:id(\\d+)",
        destination: "/products/:id",
        permanent: true,
      },
      // Legacy /borrow/:id routes → /products/:id
      {
        source: "/borrow/:id(\\d+)",
        destination: "/products/:id",
        permanent: true,
      },
      // Legacy /wanted/:id routes → /products/:id
      {
        source: "/wanted/:id(\\d+)",
        destination: "/products/:id",
        permanent: true,
      },
    ];
  },

  // Rewrites for clean category URLs
  // NOTE: type values must match database post_type values (singular forms)
  async rewrites() {
    return [
      // Category listing rewrites: /:type -> /food?type=:type
      {
        source: "/thing",
        destination: "/food?type=thing",
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
      {
        source: "/challenge",
        destination: "/food?type=challenge",
      },
      {
        source: "/zerowaste",
        destination: "/food?type=zerowaste",
      },
      {
        source: "/vegan",
        destination: "/food?type=vegan",
      },
      {
        source: "/community",
        destination: "/food?type=community",
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
      {
        source: "/challenge/:id",
        destination: "/food/:id",
      },
      {
        source: "/zerowaste/:id",
        destination: "/food/:id",
      },
      {
        source: "/vegan/:id",
        destination: "/food/:id",
      },
      {
        source: "/community/:id",
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
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live https://*.vercel-scripts.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: blob: https://*.supabase.co https://*.openstreetmap.org https://*.tile.openstreetmap.org https://*.basemaps.cartocdn.com https://firebasestorage.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.openai.com https://vercel.live wss://ws-us3.pusher.com",
              "frame-ancestors 'self'",
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

export default nextConfig;
