import type { Metadata } from "next";
import { generatePageMetadata } from "@/lib/metadata";

/**
 * Static metadata for product detail pages
 * Dynamic SEO metadata is handled at runtime
 */
export const metadata: Metadata = generatePageMetadata({
  title: "Product Listing",
  description: "View this food sharing listing on FoodShare - find free food, share surplus food, and connect with your community.",
  path: "/food",
  keywords: ["free food", "food sharing", "community", "share food", "reduce waste"],
});

export default function ProductDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
