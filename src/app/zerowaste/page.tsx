import type { Metadata } from "next";
import CategoryPageContent, { generateCategoryMetadata, PageProps } from "../food/CategoryPageContent";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  return generateCategoryMetadata("zerowaste", props.searchParams);
}

export default async function ZerowastePage(props: PageProps) {
  return <CategoryPageContent type="zerowaste" searchParams={props.searchParams} />;
}
