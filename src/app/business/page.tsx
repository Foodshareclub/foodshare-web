import { redirect } from "next/navigation";
import { PageProps } from "../food/CategoryPageContent";

export default async function BusinessPage(props: PageProps) {
  const searchParams = await props.searchParams;
  const params = new URLSearchParams();
  Object.entries(searchParams).forEach(([key, value]) => {
    if (value !== undefined) {
      params.set(key, value as string);
    }
  });
  
  const queryString = params.toString();
  redirect(`/organisation${queryString ? `?${queryString}` : ""}`);
}
