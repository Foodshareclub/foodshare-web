import { getChallengeById, transformChallengeToProduct } from "@/lib/data/challenges";
import { getProductById } from "@/lib/data/products";
import { Loader2 } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { InterceptingUserActions } from "./InterceptingUserActions";

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * Which table the id refers to.
 *
 * This used to be decided by `searchParams.type === "challenge"`, but nothing
 * in the codebase ever set that parameter — a repo-wide search for `type=challenge`
 * returns zero results. So a soft navigation to `/challenge/42` took the
 * product branch, called `getProductById(42)` against `posts_with_location`, got
 * null, and 404'd. The kind is now passed explicitly by each intercept folder,
 * which knows its own route segment.
 */
export type InterceptKind = "product" | "challenge";

async function loadEntity(kind: InterceptKind, id: string) {
  // `id` may carry a slug suffix (`/product/123-tomatoes`); take the numeric head.
  const match = id.match(/^(\d+)/);
  const entityId = match ? Number.parseInt(match[1], 10) : Number.NaN;
  if (!Number.isFinite(entityId) || entityId <= 0) return null;

  if (kind === "challenge") {
    const challenge = await getChallengeById(entityId);
    return challenge ? transformChallengeToProduct(challenge) : null;
  }

  return getProductById(entityId);
}

/**
 * Shared Intercepted Product Detail - Server Component
 */
export default async function ProductInterceptPage({ params, kind = "product" }: PageProps & { kind?: InterceptKind }) {
  const { id } = await params;

  // No try/catch: a genuine data-layer failure should surface at the nearest
  // error boundary, not be converted into a 404. `notFound()` below is called
  // outside any try for the same reason — it used to be inside one, so the
  // catch intercepted its own NEXT_HTTP_ERROR_FALLBACK throw, re-threw it via a
  // digest-prefix check, and logged "Failed to fetch intercepted product
  // details" for every legitimate 404.
  const product = await loadEntity(kind, id);

  if (!product) {
    notFound();
  }

  return (
    <Suspense fallback={<ModalSkeleton />}>
      <InterceptingUserActions product={product} />
    </Suspense>
  );
}

async function ModalSkeleton() {
  const t = await getTranslations();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm pointer-events-none">
      <div className="bg-background/80 backdrop-blur-xl rounded-2xl p-6 shadow-2xl flex items-center gap-3 border border-border/40">
        <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
        <p className="text-sm text-muted-foreground font-medium">{t("loading_details")}</p>
      </div>
    </div>
  );
}
