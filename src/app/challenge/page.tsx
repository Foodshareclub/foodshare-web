import type { Metadata } from "next";
import CategoryPageContent, { generateCategoryMetadata, PageProps } from "../food/CategoryPageContent";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  return generateCategoryMetadata("challenge", props.searchParams);
}

export default async function ChallengePage(props: PageProps) {
  return <CategoryPageContent type="challenge" searchParams={props.searchParams} />;
}
