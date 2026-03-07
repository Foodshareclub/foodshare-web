import { redirect } from "next/navigation";
import type { Metadata } from "next";
import CategoryPageContent, { 
  generateCategoryMetadata, 
  CATEGORY_PATHS, 
  PageProps 
} from "./CategoryPageContent";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const searchParams = await props.searchParams;
  const type = searchParams.type || "food";
  return generateCategoryMetadata(type, props.searchParams);
}

/**
 * Food/Products Listings Page - Server Component
 * 
 * Supports legacy ?type=thing redirection to /thing
 */
export default async function ProductsPage(props: PageProps) {
  const searchParams = await props.searchParams;
  const productType = searchParams.type;

  // If type is specified and it's not "food", redirect to the dedicated route
  if (productType && productType !== "food") {
    const normalizedType = LEGACY_TYPE_MAP[productType] || productType;
    
    // Check if this type belongs in a dedicated route
    if (REDIRECT_TARGETS.includes(normalizedType)) {
      const params = new URLSearchParams();
      Object.entries(searchParams).forEach(([key, value]) => {
        if (key !== "type" && value !== undefined) {
          params.set(key, value as string);
        }
      });
      
      const queryString = params.toString();
      const targetPath = `/${normalizedType}${queryString ? `?${queryString}` : ""}`;
      redirect(targetPath);
    }
  }

  return <CategoryPageContent type="food" searchParams={props.searchParams} />;
}

const REDIRECT_TARGETS = [
  "thing",
  "borrow",
  "wanted",
  "fridge",
  "foodbank",
  "organisation",
  "volunteer",
  "challenge",
  "zerowaste",
  "vegan",
  "forum"
];

const LEGACY_TYPE_MAP: Record<string, string> = {
  "things": "thing",
  "foodbanks": "foodbank",
  "fridges": "fridge",
  "organisations": "organisation",
  "business": "organisation",
  "volunteers": "volunteer",
  "challenges": "challenge",
  "organisation": "organisation"
};
