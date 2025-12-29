/**
 * Shared SEO Metadata Configuration
 * Centralized metadata for consistent SEO across the application
 */

import type { Metadata } from "next";

export const siteConfig = {
  name: "FoodShare",
  title: "FoodShare - Share Food, Reduce Waste, Build Community",
  description:
    "Join the FoodShare community to share surplus food, reduce waste, and help neighbors in need. Find free food, community fridges, food banks, and connect with local volunteers.",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://foodshare.club",
  ogImage: `${process.env.NEXT_PUBLIC_SITE_URL || "https://foodshare.club"}/og-image.jpg`,

  // Social handles
  twitterHandle: "@foodshareapp",
  facebookAppId: "", // Fetched from Supabase Vault at runtime via generateMetadata()

  // Locale configuration
  locale: "en_NZ",
  alternateLocales: ["en_US", "en_AU", "en_GB"],

  // Contact info for structured data
  email: "hello@foodshare.club",
  phone: "",
  address: {
    country: "New Zealand",
    region: "Auckland",
  },

  // Keywords
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
  // OpenGraph: Facebook, LinkedIn, WhatsApp, Telegram, iMessage
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteConfig.url,
    siteName: siteConfig.name,
    title: siteConfig.title,
    description: siteConfig.description,
    images: [
      {
        url: siteConfig.ogImage,
        width: 1200,
        height: 630,
        alt: `${siteConfig.name} - Share Food, Reduce Waste`,
        type: "image/jpeg",
      },
    ],
  },
  // Twitter / X Cards
  twitter: {
    card: "summary_large_image",
    site: siteConfig.twitterHandle,
    creator: siteConfig.twitterHandle,
    title: siteConfig.title,
    description: siteConfig.description,
    images: [
      {
        url: siteConfig.ogImage,
        alt: `${siteConfig.name} - Share Food, Reduce Waste`,
      },
    ],
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
  },
  // International SEO with hreflang alternates
  alternates: {
    canonical: siteConfig.url,
    languages: {
      "en-NZ": siteConfig.url,
      "en-US": siteConfig.url,
      "en-AU": siteConfig.url,
      "en-GB": siteConfig.url,
      "x-default": siteConfig.url,
    },
  },
  // App Links for mobile deep linking
  other: {
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": siteConfig.name,
    "mobile-web-app-capable": "yes",
    "msapplication-TileColor": "#FF2D55",
    "theme-color": "#FF2D55",
    // Pinterest
    "pinterest-rich-pin": "true",
    // Facebook
    "fb:app_id": siteConfig.facebookAppId,
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
    keywords: ["wanted items", "need help", "community support", "request items"],
  },
  foodbanks: {
    title: "Food Banks",
    description:
      "Find food banks and food pantries near you. Access emergency food assistance and support services in your area.",
    emoji: "🏪",
    keywords: ["food banks", "food pantries", "emergency food", "food assistance"],
  },
  fridges: {
    title: "Community Fridges",
    description:
      "Locate community fridges where you can freely take or donate fresh food 24/7. No questions asked, just take what you need.",
    emoji: "❄️",
    keywords: ["community fridge", "free fridge", "public fridge", "food access"],
  },
  organisations: {
    title: "Organisation Donations",
    description:
      "Organisations sharing surplus food and products. Connect with local businesses and charities donating excess inventory to reduce waste.",
    emoji: "🏛️",
    keywords: [
      "organisation food donation",
      "commercial surplus",
      "corporate giving",
      "charity donations",
    ],
  },
  volunteers: {
    title: "Volunteer Opportunities",
    description:
      "Join volunteer opportunities to fight food waste. Help distribute food, organize community events, and make a difference.",
    emoji: "🙋",
    keywords: ["volunteer", "food rescue volunteer", "community service"],
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

  // Default image with type hint
  const defaultImages = [
    {
      url: siteConfig.ogImage,
      width: 1200,
      height: 630,
      alt: title,
      type: "image/jpeg",
    },
  ];

  const ogImages =
    images?.map((img) => ({
      ...img,
      type: img.type || "image/jpeg",
    })) || defaultImages;

  return {
    title,
    description,
    keywords: pageKeywords,
    alternates: {
      canonical: pageUrl,
    },
    // OpenGraph: Facebook, LinkedIn, WhatsApp, Telegram, iMessage
    openGraph: {
      type,
      locale: "en_US",
      url: pageUrl,
      siteName: siteConfig.name,
      title: `${title} | ${siteConfig.name}`,
      description,
      images: ogImages,
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
    twitter: {
      card: "summary_large_image",
      site: siteConfig.twitterHandle,
      creator: siteConfig.twitterHandle,
      title: `${title} | ${siteConfig.name}`,
      description,
      images: ogImages.map((img) => ({ url: img.url, alt: img.alt })),
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
