import type { Metadata } from "next";
import CategoryPageContent, { generateCategoryMetadata, PageProps } from "../food/CategoryPageContent";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  return generateCategoryMetadata("fridge", props.searchParams);
}

export default async function FridgePage(props: PageProps) {
  return <CategoryPageContent type="fridge" searchParams={props.searchParams} />;
}
