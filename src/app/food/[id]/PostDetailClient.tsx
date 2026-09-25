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
import { useEffect, useState } from "react";
import { PostDetailContent } from "./PostDetailContent";

// Dynamically import Leaflet (requires client-side rendering)
const Leaflet = dynamic(() => import("@/components/leaflet/Leaflet"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[400px] md:h-full bg-gray-100 rounded-lg animate-pulse flex items-center justify-center">
      <span className="text-4xl">🗺️</span>
    </div>
  ),
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

  // Entrance animation state
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Schedule state update to avoid synchronous setState in effect
    const frameId = requestAnimationFrame(() => setIsLoaded(true));
    return () => cancelAnimationFrame(frameId);
  }, []);

  if (!post) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-muted/30 to-background">
        <div className="container mx-auto px-4 py-16">
          <div
            className={cn(
              "relative overflow-hidden rounded-3xl border border-border/40 bg-card/80 backdrop-blur-xl p-8 sm:p-12 text-center max-w-md mx-auto shadow-lg",
              "transform transition-all duration-700",
              isLoaded ? "translate-y-0" : "translate-y-8"
            )}
          >
            <div className="absolute -top-20 -right-20 h-40 w-40 rounded-full bg-gradient-to-br from-orange-500/20 to-rose-500/10 blur-3xl animate-pulse" />
            <div className="absolute -bottom-20 -left-20 h-40 w-40 rounded-full bg-gradient-to-br from-rose-500/10 to-orange-500/20 blur-3xl animate-pulse delay-1000" />
            <div className="relative">
              <div className="text-6xl sm:text-7xl mb-6 animate-bounce">📭</div>
              <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-3">
                {t("product_not_found")}
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground mb-8 leading-relaxed">
                This listing may have been removed or is no longer available.
              </p>
              <Button
                onClick={() => router.push("/food")}
                size="lg"
                className="h-12 px-6 sm:px-8 rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 shadow-lg shadow-orange-500/25 transition-all duration-300 hover:shadow-xl hover:shadow-orange-500/30 hover:scale-105"
              >
                {t("browse_products")}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/30 to-background">
      {/* Main Content - Two Column Layout */}
      <div
        className={cn(
          LISTING_CONTAINER,
          "grid items-start gap-6 py-6 sm:py-8 lg:grid-cols-2 lg:gap-8"
        )}
      >
        {/* The root layout owns navigation; both columns use the page scroll. */}
        <div className="min-w-0 pb-6">
          {/* Back Button on Page (Desktop/Tablet) */}
          <div className="pb-4">
            <Button
              type="button"
              onClick={() => router.back()}
              variant="outline"
              className="h-12 rounded-xl"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm font-medium">{t("back")}</span>
            </Button>
          </div>

          <PostDetailContent post={post} user={user} isAdmin={isAdmin} />
        </div>

        {/* Map stays in the layout so it cannot cover the header or footer. */}
        <div
          className={cn(
            "min-w-0 h-[400px] lg:h-[600px] overflow-hidden rounded-3xl border border-border transform transition-all duration-700 delay-300 motion-reduce:transform-none motion-reduce:transition-none",
            isLoaded ? "translate-x-0" : "translate-x-8"
          )}
        >
          <Leaflet product={post} />
        </div>
      </div>
    </div>
  );
}

export default PostDetailClient;
