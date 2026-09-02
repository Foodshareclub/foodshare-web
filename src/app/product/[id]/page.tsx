import { cache, Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { UserActions } from "@/app/food/[id]/UserActions";
import { getProductById } from "@/lib/data/products";
import type { InitialProductStateType } from "@/types/product.types";
import {
  generateProductJsonLd,
  generateBreadcrumbJsonLd,
  safeJsonLdStringify,
  calculateAggregateRating,
} from "@/lib/jsonld";
import { siteConfig, generatePageMetadata } from "@/lib/metadata";

interface PageProps {
  params: Promise<{ id: string }>;
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

function parseId(idParam: string): number | null {
  const m = idParam.match(/^(\d+)/);
  if (!m) return null;
  return parseInt(m[1], 10);
}

function canonicalSlug(product: InitialProductStateType): string {
  const base = product.post_slug || product.slug || slugify(product.post_name || "item");
  const slug = slugify(base);
  return `${product.id}-${slug}`;
}

// Dedupe fetches between generateMetadata and page component — Cache Components ready
const getCachedProduct = cache(async (id: number) => getProductById(id));

export async function generateStaticParams(): Promise<{ id: string }[]> {
  try {
    const { getPopularProductIds } = await import("@/lib/data/products");
    const ids = await getPopularProductIds(50);
    return ids.map((id) => ({ id: String(id) }));
  } catch {
    return [];
  }
}

export const dynamicParams = true;

/**
 * Agnostic Listing Detail — bleeding-edge SEO
 * Supports /product/123 and /product/123-slug, canonical is /product/123-slug
 * Uses blocking metadata for htmlLimitedBots, PPR-ready Suspense
 */
export default async function ListingDetailPage({ params }: PageProps) {
  const { id: idParam } = await params;
  const productId = parseId(idParam);

  if (productId === null || isNaN(productId)) notFound();

  const product = await getCachedProduct(productId);
  if (!product) notFound();

  const expected = canonicalSlug(product);
  // If slug missing or wrong, 308 to canonical (preserves SEO juice)
  if (idParam !== String(productId) && idParam !== expected) {
    // Also handle bare /product/123 → canonical with slug
    redirect(`/product/${expected}`);
  }
  if (idParam === String(productId)) {
    redirect(`/product/${expected}`);
  }

  const aggregateRating = calculateAggregateRating(product.five_star, product.four_star);
  const jsonLd = generateProductJsonLd({
    id: product.id,
    name: product.post_name || "Food Item",
    description: product.post_description || "Available for sharing",
    image: product.images?.[0],
    category: product.post_type || "Food",
    datePosted: product.created_at,
    location: product.post_stripped_address,
    aggregateRating: aggregateRating || undefined,
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
        dangerouslySetInnerHTML={{ __html: safeJsonLdStringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
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
  if (productId === null || isNaN(productId)) return { title: "Not Found" };

  const product = await getCachedProduct(productId).catch(() => null);
  if (!product) return { title: "Not Found" };

  const title = product.post_name || "Food Item";
  const description =
    product.post_description?.slice(0, 160) ||
    `${product.post_type || "Food"} available for sharing`;
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
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      <div className="h-[140px] bg-white border-b animate-pulse" />
      <div className="flex flex-col lg:flex-row">
        <div className="w-full lg:w-1/2 px-4 pb-12">
          <div className="animate-pulse">
            <div className="glass w-full overflow-hidden rounded-xl">
              <div className="relative aspect-[16/9] bg-gray-200">
                <div className="absolute top-4 left-4 h-9 w-20 bg-white/90 rounded-lg" />
              </div>
              <div className="p-6">
                <div className="h-6 bg-gray-200 rounded w-20 mb-3" />
                <div className="h-8 bg-gray-200 rounded mb-3" />
                <div className="h-4 bg-gray-200 rounded w-2/3 mb-4" />
                <hr className="my-4 border-gray-200" />
                <div className="flex justify-between mb-4">
                  <div className="h-4 bg-gray-200 rounded w-20" />
                  <div className="h-4 bg-gray-200 rounded w-20" />
                  <div className="h-4 bg-gray-200 rounded w-20" />
                </div>
                <hr className="my-4 border-gray-200" />
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded" />
                  <div className="h-4 bg-gray-200 rounded" />
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                </div>
                <div className="mt-6 h-12 bg-gray-200 rounded" />
              </div>
            </div>
          </div>
        </div>
        <div className="w-full lg:w-1/2 h-[400px] lg:h-auto lg:fixed lg:right-0 lg:top-0 lg:bottom-0 bg-gray-200 animate-pulse flex items-center justify-center">
          <span className="text-4xl">🗺️</span>
        </div>
      </div>
    </div>
  );
}
