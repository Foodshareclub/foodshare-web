import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getProductById } from "@/lib/data/products";
import { getChallengeById } from "@/lib/data/challenges";
import type { InitialProductStateType } from "@/types/product.types";
import { InterceptingUserActions } from "./InterceptingUserActions";
import { Loader2 } from "lucide-react";

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
 * Shared Intercepted Product Detail - Server Component
 */
export default async function ProductInterceptPage({ params, searchParams }: PageProps) {
  try {
    const [{ id }, search] = await Promise.all([params, searchParams]);
    const productId = parseInt(id, 10);
    const isChallenge = search.type === "challenge";

    if (isNaN(productId)) {
      notFound();
    }

    const product = isChallenge
      ? await getChallengeById(productId).then((c) => (c ? transformChallengeToProduct(c) : null))
      : await getProductById(productId);

    if (!product) {
      notFound();
    }

    return (
      <Suspense fallback={<ModalSkeleton />}>
        <InterceptingUserActions product={product} />
      </Suspense>
    );
  } catch (error) {
    console.error("Failed to fetch intercepted product details:", error);
    notFound();
  }
}

function ModalSkeleton() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm pointer-events-none">
      <div className="bg-background/80 backdrop-blur-xl rounded-2xl p-6 shadow-2xl flex items-center gap-3 border border-border/40">
        <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
        <p className="text-sm text-muted-foreground font-medium">Loading details...</p>
      </div>
    </div>
  );
}
