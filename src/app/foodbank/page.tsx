import type { Metadata } from "next";
import CategoryPageContent, { generateCategoryMetadata, PageProps } from "../food/CategoryPageContent";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  return generateCategoryMetadata("foodbank", props.searchParams);
}

export default async function FoodbankPage(props: PageProps) {
  return <CategoryPageContent type="foodbank" searchParams={props.searchParams} />;
}
