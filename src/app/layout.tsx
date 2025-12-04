import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { Providers } from "./providers";
import { defaultMetadata } from "@/lib/metadata";
import type { Locale } from "@/i18n/config";

const inter = Inter({ subsets: ["latin"], display: "swap" });

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
        </Providers>
      </body>
    </html>
  );
}
