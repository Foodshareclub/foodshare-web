import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { Providers } from "./providers";
import { defaultMetadata } from "@/lib/metadata";
import type { Locale } from "@/i18n/config";
import Footer from "@/components/footer/Footer";
import { DevTools } from "@/components/dev";
import { MaintenanceBanner } from "@/components/maintenance/MaintenanceBanner";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";
import { NavbarWrapper } from "@/components/header/navbar/NavbarWrapper";
import { getUser } from "@/app/actions/auth";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  preload: true,
  fallback: ["system-ui", "arial"],
});

export const metadata: Metadata = defaultMetadata;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Read locale from cookie to prevent hydration mismatch
  const cookieStore = await cookies();
  const locale = (cookieStore.get("locale")?.value || "en") as Locale;
  
  // Get user data for navbar (server-side)
  const user = await getUser();

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
        <GoogleAnalytics />
        <Providers initialLocale={locale}>
          <MaintenanceBanner />
          <NavbarWrapper initialUser={user} />
          <main className="min-h-screen">{children}</main>
          <Footer />
          <DevTools />
        </Providers>
      </body>
    </html>
  );
}
