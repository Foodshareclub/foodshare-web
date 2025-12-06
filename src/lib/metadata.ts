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
  twitterHandle: "@foodshareapp",
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
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: siteConfig.twitterHandle,
    creator: siteConfig.twitterHandle,
    title: siteConfig.title,
    description: siteConfig.description,
    images: [siteConfig.ogImage],
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
  business: {
    title: "Business Donations",
    description:
      "Businesses sharing surplus food and products. Connect with local businesses donating excess inventory to reduce waste.",
    emoji: "🏢",
    keywords: ["business food donation", "commercial surplus", "corporate giving"],
  },
  volunteer: {
    title: "Volunteer Opportunities",
    description:
      "Join volunteer opportunities to fight food waste. Help distribute food, organize community events, and make a difference.",
    emoji: "🙋",
    keywords: ["volunteer", "food rescue volunteer", "community service"],
  },
};

/**
 * Helper to generate page-specific metadata
 */
export function generatePageMetadata({
  title,
  description,
  keywords,
  path,
  images,
  noIndex = false,
}: {
  title: string;
  description: string;
  keywords?: string[];
  path?: string;
  images?: { url: string; width?: number; height?: number; alt?: string }[];
  noIndex?: boolean;
}): Metadata {
  const pageUrl = path ? `${siteConfig.url}${path}` : siteConfig.url;
  const pageKeywords = keywords
    ? [...siteConfig.keywords, ...keywords]
    : siteConfig.keywords;

  return {
    title,
    description,
    keywords: pageKeywords,
    alternates: {
      canonical: pageUrl,
    },
    openGraph: {
      type: "website",
      locale: "en_US",
      url: pageUrl,
      siteName: siteConfig.name,
      title: `${title} | ${siteConfig.name}`,
      description,
      images: images || [
        {
          url: siteConfig.ogImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      site: siteConfig.twitterHandle,
      creator: siteConfig.twitterHandle,
      title: `${title} | ${siteConfig.name}`,
      description,
      images: images ? images.map((img) => img.url) : [siteConfig.ogImage],
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
