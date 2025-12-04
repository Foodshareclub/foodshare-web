import type { Metadata } from "next";
import { generatePageMetadata, categoryMetadata } from "@/lib/metadata";

type Props = {
  params: Promise<{ type: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { type = "food" } = await params;
  const category = categoryMetadata[type as keyof typeof categoryMetadata] || categoryMetadata.food;

  return generatePageMetadata({
    title: `${category.title} Map - Find Near You`,
    description: `Interactive map showing ${category.title.toLowerCase()} locations near you. ${category.description}`,
    path: `/map/${type}`,
    keywords: [
      ...category.keywords,
      `${type} map`,
      `${type} near me`,
      "location map",
      "interactive map",
    ],
  });
}

export default function MapLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
