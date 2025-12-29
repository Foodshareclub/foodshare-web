import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { Providers } from "./providers";
import { defaultMetadata } from "@/lib/metadata";
import { getFacebookAppId } from "@/lib/email/vault";
import type { Locale } from "@/i18n/config";
import Footer from "@/components/footer/Footer";
import { DevTools } from "@/components/dev";
import { MaintenanceBanner } from "@/components/maintenance/MaintenanceBanner";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";
import { NavbarWrapper } from "@/components/header/navbar/NavbarWrapper";
import { getAuthSession } from "@/lib/data/auth";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  preload: true,
  fallback: ["system-ui", "arial"],
});

/**
 * Generate metadata with Facebook App ID fetched from Supabase Vault
 */
export async function generateMetadata(): Promise<Metadata> {
  const facebookAppId = await getFacebookAppId();

  // Build the other metadata object, filtering out undefined values
  const otherMetadata: Record<string, string | number | (string | number)[]> = {};

  if (defaultMetadata.other) {
    for (const [key, value] of Object.entries(defaultMetadata.other)) {
      if (value !== undefined && value !== null) {
        otherMetadata[key] = value as string | number | (string | number)[];
      }
    }
  }

  // Add Facebook App ID
  if (facebookAppId) {
    otherMetadata["fb:app_id"] = facebookAppId;
  }

  return {
    ...defaultMetadata,
    other: otherMetadata,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Read locale from cookie to prevent hydration mismatch
  const cookieStore = await cookies();
  const locale = (cookieStore.get("locale")?.value || "en") as Locale;

  // Get auth session for navbar (server-side)
  const session = await getAuthSession();

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        {/* OpenSearch - enables browser address bar search */}
        <link
          rel="search"
          type="application/opensearchdescription+xml"
          title="FoodShare Search"
          href="/opensearch.xml"
        />
        {/* RSS Feed autodiscovery */}
        <link
          rel="alternate"
          type="application/rss+xml"
          title="FoodShare Forum Feed"
          href="/forum/feed.xml"
        />
        {/* Preconnect to third-party origins for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://ko-fi.com" />
        <link rel="dns-prefetch" href="https://supabase.co" />
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        {/* Skip to main content link for keyboard accessibility */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          Skip to main content
        </a>
        <GoogleAnalytics />
        <Providers initialLocale={locale}>
          <MaintenanceBanner />
          <NavbarWrapper initialUser={session.user} initialIsAdmin={session.isAdmin} />
          <main id="main-content" className="min-h-screen">
            {children}
          </main>
          <Footer />
          <DevTools />
        </Providers>
      </body>
    </html>
  );
}
