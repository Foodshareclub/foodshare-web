import type { Metadata } from "next";
import CategoryPageContent, { generateCategoryMetadata, PageProps } from "../food/CategoryPageContent";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  return generateCategoryMetadata("volunteer", props.searchParams);
}

export default async function VolunteerPage(props: PageProps) {
  return <CategoryPageContent type="volunteer" searchParams={props.searchParams} />;
}
