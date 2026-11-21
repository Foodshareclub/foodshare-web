import { UserActions } from "@/app/food/[id]/UserActions";
import { ProductDetailSkeleton } from "@/components/skeletons/ProductDetailSkeleton";
import { getPostRating, getProductById } from "@/lib/data/products";
import {
  buildAggregateRating,
  generateBreadcrumbJsonLd,
  generateProductJsonLd,
  safeJsonLdStringify,
} from "@/lib/jsonld";
import { generatePageMetadata, siteConfig } from "@/lib/metadata";
import type { InitialProductStateType } from "@/types/product.types";
import { getProductCanonicalSlug } from "@/utils/categoryMapping";
import { notFound, redirect } from "next/navigation";
import { Suspense, cache } from "react";

interface PageProps {
  params: Promise<{ id: string }>;
}

function parseId(idParam: string): number | null {
  const m = idParam.match(/^(\d+)/);
  if (!m) return null;
  return Number.parseInt(m[1], 10);
}

function canonicalSlug(product: InitialProductStateType): string {
  return getProductCanonicalSlug(product);
}

// Dedupe fetches between generateMetadata and page component — Cache Components ready
const getCachedProduct = cache(async (id: number) => getProductById(id));
const getCachedRating = cache(async (id: number) => getPostRating(id));

export async function generateStaticParams(): Promise<{ id: string }[]> {
  // Phase 7: skip live Supabase reads during stubbed CI builds — keeps
  // `bun run build` fast and hermetic; runtime ISR/PPR still populates.
  // NOTE (Cache Components): generateStaticParams must return >= 1 result,
  // so stubbed builds prerender a single sentinel id that the page below
  // short-circuits to notFound() without any network access.
  const { shouldStubPrerender } = await import("@/lib/build-env");
  if (shouldStubPrerender()) return [{ id: "0" }];
  try {
    const { getPopularProductIds } = await import("@/lib/data/products");
    const ids = await getPopularProductIds(50);
    return ids.map((id) => ({ id: String(id) }));
  } catch {
    return [{ id: "0" }];
  }
}

/**
 * Agnostic Listing Detail — bleeding-edge SEO
 * Supports /product/123 and /product/123-slug, canonical is /product/123-slug
 * Uses blocking metadata for htmlLimitedBots, PPR-ready Suspense
 */
export default async function ListingDetailPage({ params }: PageProps) {
  const { id: idParam } = await params;
  const productId = parseId(idParam);

  // Real product ids are positive serials; <= 0 is the build-stub sentinel
  // (see generateStaticParams) — never fetch for it.
  if (productId === null || Number.isNaN(productId) || productId <= 0) notFound();

  const product = await getCachedProduct(productId).catch(() => null);
  if (!product) notFound();

  const expected = canonicalSlug(product);
  const paramId = parseId(idParam);

  // If paramId is null or the ID doesn't match, redirect to canonical
  if (!paramId || paramId !== productId) {
    redirect(`/product/${expected}`);
  }

  // If the URL has a slug component, verify it matches the computed slug
  // Format: /product/123-slug → idParam = "123-slug"
  const idParamParts = idParam.split("-");
  const urlSlug = idParamParts.slice(1).join("-"); // everything after the numeric ID

  // If there's a slug in the URL and it doesn't match the computed slug, redirect
  if (urlSlug && urlSlug !== expected.split("-").slice(1).join("-")) {
    redirect(`/product/${expected}`);
  }

  // Resolved only after the canonical-URL checks, so a redirect out of a
  // non-canonical URL never pays for the rating aggregate. `cache()` means
  // this shares one round trip with anything else on the request.
  const rating = await getCachedRating(productId);
  const aggregateRating = buildAggregateRating(rating.avg_rating, rating.total_reviews);
  const jsonLd = generateProductJsonLd({
    id: product.id,
    name: product.post_name || "Food Item",
    description: product.post_description || "Available for sharing",
    image: product.images?.[0],
    category: product.post_type || "Food",
    datePosted: product.created_at,
    location: product.post_stripped_address,
    aggregateRating: aggregateRating || undefined,
    canonicalSlug: expected,
  });

  const breadcrumbJsonLd = generateBreadcrumbJsonLd([
    { name: "Home", url: siteConfig.url },
    { name: "Listings", url: `${siteConfig.url}/food` },
    { name: product.post_name || "Item", url: `${siteConfig.url}/product/${expected}` },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD needs a raw script tag; safeJsonLdStringify escapes angle brackets and ampersands so a script-tag breakout is impossible
        dangerouslySetInnerHTML={{ __html: safeJsonLdStringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD needs a raw script tag; safeJsonLdStringify escapes angle brackets and ampersands so a script-tag breakout is impossible
        dangerouslySetInnerHTML={{ __html: safeJsonLdStringify(breadcrumbJsonLd) }}
      />
      <Suspense fallback={<PostDetailSkeleton />}>
        <UserActions product={product} />
      </Suspense>
    </>
  );
}

export async function generateMetadata({ params }: PageProps) {
  const { id: idParam } = await params;
  const productId = parseId(idParam);

  // Same guard as the page body, for the same reason. The build stubs
  // `generateStaticParams` with the sentinel id `0`, and the page refuses to
  // fetch for it — but metadata ran first and did fetch anyway, so the build
  // still needed the database. A sentinel is a sentinel everywhere, including
  // here.
  if (productId === null || Number.isNaN(productId) || productId <= 0) return { title: "Not Found" };

  const product = await getCachedProduct(productId).catch(() => null);
  if (!product) return { title: "Not Found" };

  const title = product.post_name || "Food Item";
  const description = product.post_description?.slice(0, 160) || `${product.post_type || "Food"} available for sharing`;
  const slug = canonicalSlug(product);
  const imageUrl = product.images?.[0] || siteConfig.ogImage;

  return generatePageMetadata({
    title,
    description,
    path: `/product/${slug}`,
    keywords: [product.post_type || "food", title.toLowerCase()],
    images: [
      {
        url: imageUrl,
        width: 1200,
        height: 630,
        alt: `${title} - Free on FoodShare`,
      },
    ],
    type: "article",
    article: {
      publishedTime: product.created_at,
      modifiedTime: product.created_at,
      section: product.post_type || "Food",
      tags: [product.post_type || "food"],
    },
  });
}

function PostDetailSkeleton() {
  return <ProductDetailSkeleton withNavbar={false} />;
}
