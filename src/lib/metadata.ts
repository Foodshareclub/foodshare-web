/**
 * Shared SEO Metadata Configuration
 * Centralized metadata for consistent SEO across the application
 */

import type { Metadata } from "next";
import { locales, localeMetadata } from "@/i18n/config";

export const siteConfig = {
  name: "FoodShare",
  title: "FoodShare - Share Food, Reduce Waste, Build Community",
  description:
    "Join the FoodShare community to share surplus food, reduce waste, and help neighbors in need. Find free food, community fridges, food banks, and connect with local volunteers.",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://foodshare.club",
  ogImage: `${process.env.NEXT_PUBLIC_SITE_URL || "https://foodshare.club"}/opengraph-image`,
  twitterHandle: "@foodshareapp",
  facebookAppId: "",
  locale: "en_NZ",
  alternateLocales: ["en_US", "en_AU", "en_GB"],
  email: "hello@foodshare.club",
  phone: "",
  address: {
    country: "New Zealand",
    region: "Auckland",
  },
  keywords: [
    "food sharing",
    "reduce food waste",
    "community",
    "sustainability",
    "free food",
    "food banks",
    "community fridges",
    "volunteer",
    "food rescue",
    "local food",
    "zero waste",
    "sharing economy",
  ],
};

/**
 * Generate hreflang alternates for all 21 supported languages
 * Used for international SEO to indicate language variants of a page
 */
export function generateHreflangAlternates(path: string = ""): Record<string, string> {
  const baseUrl = siteConfig.url;
  const pagePath = path.startsWith("/") ? path : `/${path}`;
  const pageUrl = `${baseUrl}${pagePath}`;

  const alternates: Record<string, string> = {};

  for (const locale of locales) {
    const code = localeMetadata[locale].code.toLowerCase();
    alternates[code] = pageUrl;
  }

  // Additional English variants for better international SEO
  alternates["en-nz"] = pageUrl;
  alternates["en-au"] = pageUrl;
  alternates["en-gb"] = pageUrl;
  alternates["x-default"] = pageUrl;

  return alternates;
}

export const defaultMetadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.title,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: siteConfig.keywords,
  authors: [{ name: "FoodShare Team" }],
  creator: "FoodShare",
  publisher: "FoodShare",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/logo192.png", sizes: "192x192", type: "image/png" },
      { url: "/logo512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteConfig.url,
    siteName: siteConfig.name,
    title: siteConfig.title,
    description: siteConfig.description,
  },
  twitter: {
    card: "summary_large_image",
    site: siteConfig.twitterHandle,
    creator: siteConfig.twitterHandle,
    title: siteConfig.title,
    description: siteConfig.description,
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
    yandex: process.env.NEXT_PUBLIC_YANDEX_VERIFICATION,
    other: {
      ...(process.env.NEXT_PUBLIC_BING_VERIFICATION && {
        "msvalidate.01": process.env.NEXT_PUBLIC_BING_VERIFICATION,
      }),
      ...(process.env.NEXT_PUBLIC_PINTEREST_VERIFICATION && {
        "p:domain_verify": process.env.NEXT_PUBLIC_PINTEREST_VERIFICATION,
      }),
    },
  },
  alternates: {
    canonical: siteConfig.url,
    languages: generateHreflangAlternates(),
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": siteConfig.name,
    "mobile-web-app-capable": "yes",
    "msapplication-TileColor": "#FF2D55",
    "theme-color": "#FF2D55",
    "pinterest-rich-pin": "true",
  },
};

/**
 * Category information for SEO-optimized titles and descriptions
 */
export const categoryMetadata = {
  food: {
    title: "Food Listings",
    description:
      "Browse and share surplus food items in your community. Help reduce food waste by giving away or claiming free food from neighbors.",
    emoji: "🍽️",
    keywords: ["free food", "surplus food", "food sharing", "leftover food"],
  },
  things: {
    title: "Things & Items",
    description:
      "Share household items, clothes, furniture, and other goods with your community. Give items a second life instead of throwing them away.",
    emoji: "📦",
    keywords: ["free stuff", "household items", "furniture sharing", "clothes donation"],
  },
  borrow: {
    title: "Borrow & Lend",
    description:
      "Borrow tools, equipment, and items from neighbors. Build a sharing economy in your local community.",
    emoji: "🤝",
    keywords: ["borrow tools", "equipment sharing", "community lending"],
  },
  wanted: {
    title: "Wanted Items",
    description:
      "Post what you need and let the community help. Request food, items, or resources from generous neighbors.",
    emoji: "🔍",
    keywords: ["wanted items", "needs", "community help", "community support", "request items"],
  },

  volunteers: {
    title: "Volunteer Opportunities",
    description:
      "Join volunteer opportunities to help distribute food and make a difference in your community.",
    emoji: "🙋",
    keywords: ["volunteer", "charity donations", "corporate giving", "community service"],
  },
  organisations: {
    title: "Organisation Donations",
    description:
      "Organisations sharing surplus food and products. Connect with local businesses and charities donating excess inventory to reduce waste.",
    emoji: "🏛️",
    keywords: [
      "organisation donation",
      "food donation",
      "commercial surplus",
      "corporate giving",
      "charity donations",
    ],
  },
  fridges: {
    title: "Community Fridges",
    description:
      "Locate community fridges where you can freely take or donate fresh food 24/7. No questions asked, just take what you need.",
    emoji: "❄️",
    keywords: ["community fridge", "free fridge", "public fridge", "food access"],
  },
  foodbanks: {
    title: "Food Banks",
    description:
      "Find food banks and food pantries near you. Access emergency food assistance and support services in your area.",
    emoji: "🏪",
    keywords: ["food banks", "food pantries", "emergency food", "food assistance"],
  },
  challenges: {
    title: "Community Challenges",
    description:
      "Join food waste reduction challenges and community initiatives. Compete with neighbors and track your impact.",
    emoji: "🏆",
    keywords: ["food waste challenge", "sustainability challenge", "community initiative"],
  },
  zerowaste: {
    title: "Zero Waste",
    description:
      "Discover zero waste products, tips, and resources. Join the movement to eliminate waste in your community.",
    emoji: "♻️",
    keywords: ["zero waste", "plastic free", "sustainable living", "waste reduction"],
  },
  vegan: {
    title: "Vegan Food",
    description:
      "Share and find plant-based food in your community. Connect with fellow vegans and discover delicious vegan offerings.",
    emoji: "🌱",
    keywords: ["vegan food", "plant-based", "vegan sharing", "vegetarian"],
  },
};

/**
 * Helper to generate page-specific metadata
 * Supports both website and article types for proper social sharing
 */
export function generatePageMetadata({
  title,
  description,
  keywords,
  path,
  images,
  noIndex = false,
  type = "website",
  article,
}: {
  title: string;
  description: string;
  keywords?: string[];
  path?: string;
  images?: { url: string; width?: number; height?: number; alt?: string; type?: string }[];
  noIndex?: boolean;
  /** OpenGraph type: 'website' for general pages, 'article' for blog/forum content */
  type?: "website" | "article";
  /** Article metadata for og:type='article' */
  article?: {
    publishedTime?: string;
    modifiedTime?: string;
    authors?: string[];
    section?: string;
    tags?: string[];
  };
}): Metadata {
  const pageUrl = path ? `${siteConfig.url}${path}` : siteConfig.url;
  const pageKeywords = keywords ? [...siteConfig.keywords, ...keywords] : siteConfig.keywords;

  // Only include images if explicitly provided
  // Otherwise, let opengraph-image.tsx / twitter-image.tsx handle it
  const ogImages = images?.map((img) => ({
    ...img,
    type: img.type || "image/jpeg",
  }));

  return {
    title,
    description,
    keywords: pageKeywords,
    alternates: {
      canonical: pageUrl,
      languages: generateHreflangAlternates(path || ""),
    },
    // OpenGraph: Facebook, LinkedIn, WhatsApp, Telegram, iMessage
    // Note: og:image auto-generated by opengraph-image.tsx if not explicitly provided
    openGraph: {
      type,
      locale: "en_US",
      url: pageUrl,
      siteName: siteConfig.name,
      title: `${title} | ${siteConfig.name}`,
      description,
      ...(ogImages && { images: ogImages }),
      ...(type === "article" && article
        ? {
            publishedTime: article.publishedTime,
            modifiedTime: article.modifiedTime,
            authors: article.authors,
            section: article.section,
            tags: article.tags,
          }
        : {}),
    },
    // Twitter / X Cards
    // Note: twitter:image auto-generated by twitter-image.tsx if not explicitly provided
    twitter: {
      card: "summary_large_image",
      site: siteConfig.twitterHandle,
      creator: siteConfig.twitterHandle,
      title: `${title} | ${siteConfig.name}`,
      description,
      ...(ogImages && { images: ogImages.map((img) => ({ url: img.url, alt: img.alt })) }),
    },
    robots: noIndex
      ? {
          index: false,
          follow: false,
        }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-video-preview": -1,
            "max-image-preview": "large",
            "max-snippet": -1,
          },
        },
  };
}

/**
 * Reusable noIndex metadata for private/authenticated pages
 * Use this for auth, admin, settings, and other non-public pages
 */
export const noIndexMetadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

/**
 * Generate noIndex metadata with a custom title
 * Use for pages that need a title but should not be indexed
 */
export function generateNoIndexMetadata(title: string, description?: string): Metadata {
  return {
    title,
    description: description || siteConfig.description,
    ...noIndexMetadata,
  };
}
