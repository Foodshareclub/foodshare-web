import type { Metadata } from "next";
import { generatePageMetadata, categoryMetadata } from "@/lib/metadata";
import { NavbarWrapper } from "@/components/header/navbar/NavbarWrapper";

export const metadata: Metadata = generatePageMetadata({
  title: "Food Listings - Share & Discover Free Food",
  description: categoryMetadata.food.description,
  path: "/food",
  keywords: [
    ...categoryMetadata.food.keywords,
    "food listings",
    "free food listings",
    "food near me",
  ],
});

export default function ProductsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <NavbarWrapper defaultProductType="food" />
      {children}
    </div>
  );
}
