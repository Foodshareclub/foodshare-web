import type { Metadata } from "next";
import CategoryPageContent, { generateCategoryMetadata, PageProps } from "../food/CategoryPageContent";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  return generateCategoryMetadata("business", props.searchParams);
}

export default async function BusinessPage(props: PageProps) {
  return <CategoryPageContent type="business" searchParams={props.searchParams} />;
}
