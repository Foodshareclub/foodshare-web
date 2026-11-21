"use client";
import { LISTING_CONTAINER } from "@/components/productCard/listing-layout";
import { Button } from "@/components/ui/button";
import type { AuthUser } from "@/lib/data/auth";
import { cn } from "@/lib/utils";
import type { InitialProductStateType } from "@/types/product.types";
import { ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { PostDetailContent } from "./PostDetailContent";

// Dynamically import Leaflet (requires client-side rendering)
const Leaflet = dynamic(() => import("@/components/leaflet/Leaflet"), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-muted" aria-hidden="true" />,
});

interface PostDetailClientProps {
  post: InitialProductStateType | null;
  user: AuthUser | null;
  isAdmin?: boolean;
}

/**
 * PostDetailClient - Client component for post detail page
 * Receives post data from Server Component
 */
export function PostDetailClient({ post, user, isAdmin = false }: PostDetailClientProps) {
  const t = useTranslations();
  const router = useRouter();

  if (!post) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-16">
          <div className="mx-auto max-w-md rounded-xl border border-border p-8 text-center shadow-sm sm:p-12">
            <div className="mb-6 text-6xl" aria-hidden="true">
              📭
            </div>
            <h2 className="mb-3 text-xl font-semibold text-foreground sm:text-2xl">{t("product_not_found")}</h2>
            <p className="mb-8 text-sm text-muted-foreground sm:text-base">
              This listing may have been removed or is no longer available.
            </p>
            <Button onClick={() => router.push("/food")} variant="brand" size="xl">
              {t("browse_products")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className={cn(LISTING_CONTAINER, "max-w-[1120px] py-6 sm:py-8")}>
        <div className="pb-4">
          <Button type="button" onClick={() => router.back()} variant="ghost" className="-ms-3 h-11 rounded-full px-3">
            <ArrowLeft aria-hidden="true" />
            <span className="text-sm font-medium">{t("back")}</span>
          </Button>
        </div>
        <PostDetailContent post={post} user={user} isAdmin={isAdmin} locationSlot={<Leaflet product={post} />} />
      </div>
    </div>
  );
}

export default PostDetailClient;
