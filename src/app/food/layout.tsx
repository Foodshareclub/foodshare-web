import { categoryMetadata, generatePageMetadata } from "@/lib/metadata";
import type { Metadata } from "next";

export const metadata: Metadata = generatePageMetadata({
  title: "Food Listings - Share & Discover Free Food",
  description: categoryMetadata.food.description,
  path: "/food",
  keywords: [...categoryMetadata.food.keywords, "food listings", "free food listings", "food near me"],
});

export default function ProductsLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal?: React.ReactNode;
}) {
  return (
    <>
      {children}
      {modal}
    </>
  );
}
