import { redirect } from "next/navigation";

interface PageProps {
  searchParams: Promise<{ type?: string }>;
}

/**
 * Agnostic /new route - redirects to /food/new with type param preserved
 * Use /new?type=volunteer for volunteer applications
 */
export default async function NewPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const type = params.type;

  if (type) {
    redirect(`/food/new?type=${type}`);
  }

  redirect("/food/new");
}
