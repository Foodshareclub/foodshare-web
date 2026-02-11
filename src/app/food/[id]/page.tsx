import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { UserActions } from "./UserActions";
import { getProductById, getPopularProductIds } from "@/lib/data/products";
import { getChallengeById } from "@/lib/data/challenges";
import type { InitialProductStateType } from "@/types/product.types";
import {
  generateProductJsonLd,
  generateBreadcrumbJsonLd,
  safeJsonLdStringify,
  calculateAggregateRating,
} from "@/lib/jsonld";
import { isDatabaseHealthy } from "@/lib/data/health";

export async function generateStaticParams(): Promise<{ id: string }[]> {
  try {
    const productIds = await getPopularProductIds(50);
    return productIds.map((id) => ({ id: String(id) }));
  } catch {
    return [];
  }
}

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ type?: string }>;
}

function transformChallengeToProduct(
  challenge: NonNullable<Awaited<ReturnType<typeof getChallengeById>>>
): InitialProductStateType {
  return {
    id: challenge.id,
    post_name: challenge.challenge_title || "",
    post_description: challenge.challenge_description || "",
    images: challenge.challenge_image ? [challenge.challenge_image] : [],
    post_type: "challenge",
    post_views: Number(challenge.challenge_views) || 0,
    post_like_counter: Number(challenge.challenge_likes_counter) || 0,
    profile_id: challenge.profile_id,
    created_at: challenge.challenge_created_at,
    is_active: challenge.challenge_published,
    is_arranged: false,
    post_address: "",
    post_stripped_address: challenge.challenge_difficulty || "",
    available_hours: "",
    condition: challenge.challenge_difficulty || "",
    transportation: "",
    location: null as unknown as InitialProductStateType["location"],
    five_star: null,
    four_star: null,
  };
}

/**
 * Product Detail Page - Server Component
 * Gracefully handles DB unavailability
 */
export default async function ProductDetailPage({ params, searchParams }: PageProps) {
  // First check if DB is healthy
  const dbHealthy = await isDatabaseHealthy();

  if (!dbHealthy) {
    redirect("/maintenance");
  }

  try {
    const [{ id }, search] = await Promise.all([params, searchParams]);
    const productId = parseInt(id, 10);
    const isChallenge = search.type === "challenge";

    if (isNaN(productId)) {
      notFound();
    }

    // Fetch product first
    let product;
    try {
      product = isChallenge
        ? await getChallengeById(productId).then((c) => (c ? transformChallengeToProduct(c) : null))
        : await getProductById(productId);
    } catch {
      redirect("/maintenance");
    }

    if (!product) {
      notFound();
    }

    // Generate JSON-LD structured data for SEO (no auth needed)
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
      { name: "Home", url: "https://foodshare.club" },
      { name: "Food", url: "https://foodshare.club/food" },
      { name: product.post_name || "Item", url: `https://foodshare.club/food/${product.id}` },
    ]);

    // JSON-LD renders immediately. UserActions streams independently -
    // it fetches user/admin auth data in its own Suspense boundary,
    // so the page shell paints before auth resolves.
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
  } catch {
    redirect("/maintenance");
  }
}

export async function generateMetadata({ params, searchParams }: PageProps) {
  try {
    const [{ id }, search] = await Promise.all([params, searchParams]);
    const productId = parseInt(id, 10);
    const isChallenge = search.type === "challenge";

    if (isNaN(productId)) {
      return { title: "Not Found" };
    }

    const product = await (
      isChallenge
        ? getChallengeById(productId).then((c) => (c ? transformChallengeToProduct(c) : null))
        : getProductById(productId)
    ).catch(() => null);

    if (!product) {
      return { title: "Not Found" };
    }

    const title = product.post_name || "Food Item";
    const description =
      product.post_description?.slice(0, 160) ||
      `${product.post_type || "Food"} available for sharing`;
    const pageUrl = `https://foodshare.club/food/${productId}`;
    const imageUrl = product.images?.[0] || "https://foodshare.club/og-image.jpg";

    return {
      title: isChallenge ? `${title} Challenge` : title,
      description,
      alternates: {
        canonical: pageUrl,
      },
      // OpenGraph: Facebook, LinkedIn, WhatsApp, Telegram, iMessage
      openGraph: {
        type: "article",
        locale: "en_US",
        url: pageUrl,
        siteName: "FoodShare",
        title,
        description,
        images: [
          {
            url: imageUrl,
            width: 1200,
            height: 630,
            alt: `${title} - Free on FoodShare`,
            type: "image/jpeg",
          },
        ],
        publishedTime: product.created_at,
        section: product.post_type || "Food",
      },
      // Twitter / X Cards
      twitter: {
        card: "summary_large_image",
        site: "@foodshareapp",
        creator: "@foodshareapp",
        title: `${title} | FoodShare`,
        description,
        images: [
          {
            url: imageUrl,
            alt: `${title} - Free on FoodShare`,
          },
        ],
      },
    };
  } catch {
    return { title: "FoodShare" };
  }
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
