import type { Metadata } from "next";
import CategoryPageContent, { generateCategoryMetadata, PageProps } from "../food/CategoryPageContent";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  return generateCategoryMetadata("wanted", props.searchParams);
}

export default async function WantedPage(props: PageProps) {
  return <CategoryPageContent type="wanted" searchParams={props.searchParams} />;
}
