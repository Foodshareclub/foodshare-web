import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { cookies } from "next/headers";
import dynamic from "next/dynamic";
import "./globals.css";
import { Providers } from "./providers";
import { defaultMetadata } from "@/lib/metadata";
import type { Locale } from "@/i18n/config";
import Footer from "@/components/footer/Footer";

// Lazy load DevTools - only in development
const DevTools = dynamic(
  () => import("@/components/dev/DevTools").then((mod) => mod.DevTools),
  { ssr: false }
);

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

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={inter.className}>
        <Providers initialLocale={locale}>
          {children}
          <Footer />
          {process.env.NODE_ENV === "development" && <DevTools />}
        </Providers>
      </body>
    </html>
  );
}
