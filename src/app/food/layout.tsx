import type { Metadata } from "next";
import { generatePageMetadata, categoryMetadata } from "@/lib/metadata";
import { NavbarWrapper } from "@/components/header/navbar/NavbarWrapper";
import { getUser } from "@/app/actions/auth";

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
  // Navbar is rendered by HomeClient which receives user data directly
  return <>{children}</>;
}
