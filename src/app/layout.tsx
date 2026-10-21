import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { Suspense } from "react";
import "./globals.css";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";
import { DevTools } from "@/components/dev";
import Footer from "@/components/footer/Footer";
import { NavbarWrapper } from "@/components/header/navbar/NavbarWrapper";
import { MaintenanceBanner } from "@/components/maintenance/MaintenanceBanner";
import { defaultLocale, getLocaleDirection, isValidLocale, locales } from "@/i18n/config";
import { loadMessagesWithFallback } from "@/i18n/merge";
import { getAuthSession } from "@/lib/data/auth";
import { getAppRatingStats } from "@/lib/data/og-stats";
import { getFacebookAppId } from "@/lib/email/vault";
import {
  generateOrganizationJsonLd,
  generateSoftwareApplicationJsonLd,
  generateWebsiteJsonLd,
  safeJsonLdStringify,
} from "@/lib/jsonld";
import { defaultMetadata } from "@/lib/metadata";
import { Providers } from "./providers";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  preload: true,
  fallback: ["system-ui", "arial"],
});

// Use default metadata (fb:app_id is added directly in head with property attribute)
export const metadata: Metadata = defaultMetadata;

type RootLayoutProps = Readonly<{
  children: React.ReactNode;
  modal?: React.ReactNode;
}>;

// The document shell must not read request data with Cache Components enabled —
// awaiting `cookies()` in the root layout would opt every route's shell out of
// prerendering, which is a far larger cost than this script. So `lang` and
// `dir` are applied here, synchronously, before the first paint, and Providers
// keeps them in sync afterwards.
//
// Two corrections to the version this replaces:
//
//   - Direction came from a hard-coded `locale === "ar" ? "rtl" : "ltr"`, so
//     adding `he`, `fa` or `ur` to the catalogue would have left them
//     left-to-right with no error anywhere. The table is generated from
//     `localeMetadata`, which is the same source `getLocaleDirection` reads.
//   - The allowlist is embedded, so the same validation the server applies runs
//     here: a tampered cookie cannot put an arbitrary string into `lang`.
const localeDirections = Object.fromEntries(locales.map((locale) => [locale, getLocaleDirection(locale)]));

const localeScript = `(() => { try {
  const supported = ${JSON.stringify(locales)};
  const directions = ${JSON.stringify(localeDirections)};
  const match = document.cookie.match(/(?:^|;\\s*)locale=([^;]*)/);
  const locale = match && supported.includes(match[1]) ? match[1] : "${defaultLocale}";
  document.documentElement.lang = locale;
  document.documentElement.dir = directions[locale] || "ltr";
} catch {} })();`;

async function RequestContent({ children, modal }: RootLayoutProps) {
  const [cookieStore, session] = await Promise.all([cookies(), getAuthSession()]);
  const requestedLocale = cookieStore.get("locale")?.value ?? defaultLocale;
  const locale = isValidLocale(requestedLocale) ? requestedLocale : defaultLocale;
  const messages = await loadMessagesWithFallback(locale);

  return (
    <Providers initialLocale={locale} initialMessages={messages}>
      <MaintenanceBanner />
      <NavbarWrapper initialUser={session.user} initialIsAdmin={session.isAdmin} />
      <main id="main-content" className="min-h-screen">
        {children}
      </main>
      {modal}
      <Footer />
      <DevTools />
    </Providers>
  );
}

async function StructuredMetadata() {
  // The secret cache uses the current time and must run after a request arrives.
  await connection();
  const [facebookAppId, appRating] = await Promise.all([getFacebookAppId(), getAppRatingStats()]);
  const jsonLd = safeJsonLdStringify({
    "@context": "https://schema.org",
    "@graph": [generateOrganizationJsonLd(), generateWebsiteJsonLd(), generateSoftwareApplicationJsonLd(appRating)],
  });
  return (
    <>
      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD is escaped by safeJsonLdStringify. */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      {facebookAppId && <meta property="fb:app_id" content={facebookAppId} />}
    </>
  );
}

export default function RootLayout({ children, modal }: RootLayoutProps) {
  return (
    <html lang={defaultLocale} dir="ltr" suppressHydrationWarning>
      <head>
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: Static script interpolates only the trusted locale allowlist. */}
        <script dangerouslySetInnerHTML={{ __html: localeScript }} />
        <Suspense fallback={null}>
          <StructuredMetadata />
        </Suspense>
        {/* OpenSearch - enables browser address bar search */}
        <link
          rel="search"
          type="application/opensearchdescription+xml"
          title="FoodShare Search"
          href="/opensearch.xml"
        />
        {/* RSS Feed autodiscovery */}
        <link rel="alternate" type="application/rss+xml" title="FoodShare Forum Feed" href="/forum/feed.xml" />
        {/* Preconnect to third-party origins for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://ko-fi.com" />
        <link rel="dns-prefetch" href="https://api.foodshare.club" />
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
        {/* Apple Sign-In SDK */}
        <script
          type="text/javascript"
          src="https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js"
          async
        />
        {/* Theme color for dark mode support */}
        <meta name="theme-color" content="#FF2D55" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#1a1a2e" media="(prefers-color-scheme: dark)" />
        <meta name="color-scheme" content="light dark" />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        {/* Skip to main content link for keyboard accessibility */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:start-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          Skip to main content
        </a>
        <Suspense fallback={null}>
          <GoogleAnalytics />
        </Suspense>
        <Suspense fallback={<main id="main-content" className="min-h-screen" aria-busy="true" />}>
          <RequestContent modal={modal}>{children}</RequestContent>
        </Suspense>
      </body>
    </html>
  );
}
