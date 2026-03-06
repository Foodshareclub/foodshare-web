import type { Metadata } from "next";
import CategoryPageContent, { generateCategoryMetadata, PageProps } from "../food/CategoryPageContent";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  return generateCategoryMetadata("vegan", props.searchParams);
}

export default async function VeganPage(props: PageProps) {
  return <CategoryPageContent type="vegan" searchParams={props.searchParams} />;
}
