import type { Metadata } from "next";
import CategoryPageContent, { generateCategoryMetadata, PageProps } from "../food/CategoryPageContent";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  return generateCategoryMetadata("thing", props.searchParams);
}

export default async function ThingPage(props: PageProps) {
  return <CategoryPageContent type="thing" searchParams={props.searchParams} />;
}
