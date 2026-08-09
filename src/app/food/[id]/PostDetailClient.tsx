"use client";

import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import { ArrowLeft } from "lucide-react";
import Navbar from "@/components/header/navbar/Navbar";
import { Button } from "@/components/ui/button";
import { PostDetailContent } from "./PostDetailContent";
import { cn } from "@/lib/utils";
import type { InitialProductStateType } from "@/types/product.types";
import type { AuthUser } from "@/lib/data/auth";

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

  // Auth state from user prop
  const isAuth = !!user;
  const userId = user?.id || "";
  const profile = user?.profile;
  const isOwner = userId === post?.profile_id;
  const _canEdit = isOwner || isAdmin; // Admins can edit any post
  const postType = post?.post_type || "food";

  // Avatar URL: Avatar component handles default fallback
  const avatarUrl = profile?.avatar_url || "";

  // Entrance animation state
  const [isLoaded, setIsLoaded] = useState(false);

  // Ref for the scrollable left column container
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Schedule state update to avoid synchronous setState in effect
    const frameId = requestAnimationFrame(() => setIsLoaded(true));
    return () => cancelAnimationFrame(frameId);
  }, []);

  // Reset scroll position to top on mount (useLayoutEffect runs before paint)
  useLayoutEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [post?.id]);

  // Empty Navbar handlers (navigation handled internally by Navbar)
  const handleRouteChange = () => {};
  const handleProductTypeChange = () => {};

  if (!post) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-muted/30 to-background">
        <Navbar
          userId={userId}
          isAuth={isAuth}
          productType="food"
          onRouteChange={handleRouteChange}
          onProductTypeChange={handleProductTypeChange}
          imgUrl={avatarUrl}
          firstName={profile?.first_name || ""}
          secondName={profile?.second_name || ""}
          email={profile?.email || ""}
          signalOfNewMessage={[]}
        />
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
      {/* Navbar */}
      <Navbar
        userId={userId}
        isAuth={isAuth}
        productType={postType}
        onRouteChange={handleRouteChange}
        onProductTypeChange={handleProductTypeChange}
        imgUrl={avatarUrl}
        firstName={profile?.first_name || ""}
        secondName={profile?.second_name || ""}
        email={profile?.email || ""}
        signalOfNewMessage={[]}
      />

      {/* Main Content - Two Column Layout */}
      <div className="flex flex-col lg:flex-row lg:h-[calc(100vh-var(--navbar-height))]">
        {/* Left Column - Post Detail (Scrollable) */}
        <div
          ref={scrollContainerRef}
          className="w-full lg:w-1/2 px-4 pb-12 lg:overflow-y-auto lg:h-full"
        >
          {/* Back Button on Page (Desktop/Tablet) */}
          <div className="py-4">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 px-4 py-2 bg-background/50 backdrop-blur-md rounded-xl text-muted-foreground hover:bg-background hover:text-foreground transition-all duration-300 border border-border/40"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm font-medium">{t("back")}</span>
            </button>
          </div>

          <PostDetailContent post={post} user={user} isAdmin={isAdmin} />
        </div>

        {/* Right Column - Map (Fixed on Desktop) */}
        <div
          className={cn(
            "w-full lg:w-1/2 h-[400px] lg:h-auto lg:fixed lg:right-0 lg:top-20 lg:bottom-0 transform transition-all duration-700 delay-300",
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
