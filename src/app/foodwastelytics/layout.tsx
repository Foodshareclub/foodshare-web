import { siteConfig } from "@/lib/metadata";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "Foodwastelytics — Global Food Waste Intelligence & International Impact Analytics | FoodShare",
    template: "%s | FoodShare",
  },
  description:
    "Explore global food waste analytics and planetary benchmarks, track international carbon and water footprints, model UN SDG 12.3 50% waste reduction targets, and access international supply chain intelligence.",
  keywords: [
    "global food waste analytics",
    "international food loss index",
    "UNEP food waste index",
    "UN SDG 12.3",
    "planetary food loss",
    "carbon footprint food waste",
    "freshwater food waste calculator",
    "farm to fork supply chain",
    "food loss reduction",
    "foodlytics",
  ],
  alternates: {
    canonical: `${siteConfig.url}/foodwastelytics`,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: `${siteConfig.url}/foodwastelytics`,
    siteName: siteConfig.name,
    title: `Foodwastelytics — Global Food Waste Intelligence | ${siteConfig.name}`,
    description:
      "Explore global food waste analytics and planetary benchmarks, track international carbon and water footprints, and model UN SDG 12.3 50% waste reduction targets across world economies.",
    images: [
      {
        url: siteConfig.ogImage,
        width: 1200,
        height: 630,
        alt: "FoodShare Foodwastelytics Global Impact Analytics",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: siteConfig.twitterHandle,
    title: `Foodwastelytics — Global Food Waste Intelligence | ${siteConfig.name}`,
    description:
      "Explore global food waste analytics and planetary benchmarks, track international carbon and water footprints, and model UN SDG 12.3 50% waste reduction targets across world economies.",
    images: [siteConfig.ogImage],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Foodwastelytics",
  applicationCategory: "AnalyticsApplication",
  operatingSystem: "All",
  url: `${siteConfig.url}/foodwastelytics`,
  description:
    "Global food waste intelligence platform modeling international planetary impact, CO2e savings, freshwater conservation, and UN SDG 12.3 waste reduction targets.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
};

export default function FoodwastelyticsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {children}
    </>
  );
}
