import type { Metadata } from "next";
import CategoryPageContent, { generateCategoryMetadata, PageProps } from "../food/CategoryPageContent";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  return generateCategoryMetadata("borrow", props.searchParams);
}

export default async function BorrowPage(props: PageProps) {
  return <CategoryPageContent type="borrow" searchParams={props.searchParams} />;
}
