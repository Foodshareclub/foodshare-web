import { notFound, permanentRedirect } from "next/navigation";
import { getProductById } from "@/lib/data/products";
import { getChallengeById } from "@/lib/data/challenges";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ type?: string }>;
}

function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "item"
  );
}

/**
 * Legacy /food/[id] — 308 to agnostic /product/[id]-[slug]
 * Keeps SEO equity, single-hop with keyword slug
 * Challenge type redirects to /challenge/[id]
 */
export default async function FoodLegacyRedirect({ params, searchParams }: PageProps) {
  const [{ id }, search] = await Promise.all([params, searchParams]);
  const productId = parseInt(id, 10);
  if (isNaN(productId)) notFound();

  const isChallenge = search.type === "challenge";
  if (isChallenge) {
    const challenge = await getChallengeById(productId).catch(() => null);
    if (!challenge) notFound();
    permanentRedirect(`/challenge/${productId}`);
  }

  const product = await getProductById(productId).catch(() => null);
  if (!product) notFound();

  const rawSlug =
    (product as unknown as { post_slug?: string }).post_slug ||
    slugify(product.post_name || "item");
  const slug = slugify(rawSlug);
  permanentRedirect(`/product/${productId}-${slug}`);
}

export async function generateMetadata({ params, searchParams }: PageProps) {
  // No metadata — redirect only. Provide minimal to avoid 500.
  const [{ id }, search] = await Promise.all([params, searchParams]);
  const productId = parseInt(id, 10);
  if (isNaN(productId)) return { title: "Not Found" };
  if (search.type === "challenge") {
    return { title: "Redirecting..." };
  }
  const product = await getProductById(productId).catch(() => null);
  if (!product) return { title: "Not Found" };
  return { title: "Redirecting..." };
}
