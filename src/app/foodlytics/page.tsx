import { FoodlyticsClient } from "@/components/foodlytics/FoodlyticsClient";
import { siteConfig } from "@/lib/metadata";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: `Foodlytics — Sustainable Household Food Waste Tracker & AI Advisor | ${siteConfig.name}`,
  description:
    "Track household food waste cost, weight, carbon emissions, and water footprint alongside US supply-chain benchmarks and an AI preservation advisor.",
  alternates: {
    canonical: `${siteConfig.url}/foodlytics`,
  },
};

export default function FoodlyticsPage() {
  return <FoodlyticsClient />;
}
