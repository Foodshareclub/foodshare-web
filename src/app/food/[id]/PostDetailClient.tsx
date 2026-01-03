"use client";

import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import Link from "next/link";
import Image from "next/image";
import {
  Flag,
  ArrowLeft,
  Heart,
  Eye,
  Calendar,
  Clock,
  MapPin,
  Truck,
  FileText,
  Sparkles,
} from "lucide-react";
import Navbar from "@/components/header/navbar/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { StarIcon } from "@/utils/icons";
import { ReportPostDialog } from "@/components/reports";
import { ShareButton } from "@/components/share/ShareButton";
import { PostTypeBadge } from "@/components/post/PostTypeBadge";
import { PostStatsCard } from "@/components/post/PostStatsCard";
import { PostDetailSection } from "@/components/post/PostDetailSection";
import { cn } from "@/lib/utils";
import { getPostTypeConfig } from "@/lib/constants";
import type { InitialProductStateType } from "@/types/product.types";
import type { AuthUser } from "@/lib/data/auth";
import { isValidImageUrl } from "@/lib/image";

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
  const canEdit = isOwner || isAdmin; // Admins can edit any post
  const postType = post?.post_type || "food";
  const typeConfig = getPostTypeConfig(postType);

  // Avatar URL: Avatar component handles default fallback
  const avatarUrl = profile?.avatar_url || "";

  // Rating state for interactive stars
  const [rating, setRating] = useState(0);

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

  const onStarClick = (index: number) => {
    setRating(index + 1);
  };

  const handleContactSharer = () => {
    if (!isAuth) {
      router.push("/auth/login");
      return;
    }
    router.push(`/chat?food=${post?.id}`);
  };

  const handleEditPost = () => {
    router.push(`/food/${post?.id}/edit`);
  };

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
          <div className="flex flex-col gap-6">
            {/* Main Post Card */}
            <div
              className={cn(
                "relative overflow-hidden rounded-2xl border border-border/40 bg-card/80 backdrop-blur-xl shadow-sm transition-all duration-500",
                "hover:shadow-xl hover:border-border/60",
                isLoaded ? "translate-y-0" : "translate-y-8"
              )}
            >
              {/* Decorative gradient orbs */}
              <div className="absolute -top-32 -right-32 h-64 w-64 rounded-full bg-gradient-to-br from-orange-500/10 to-rose-500/5 blur-3xl animate-pulse pointer-events-none" />
              <div className="absolute -bottom-32 -left-32 h-64 w-64 rounded-full bg-gradient-to-br from-teal-500/10 to-emerald-500/5 blur-3xl animate-pulse delay-1000 pointer-events-none" />

              {/* Hero Image with Back Button Overlay */}
              <div className="relative w-full group" style={{ aspectRatio: "16/9" }}>
                {post.images?.[0] && isValidImageUrl(post.images[0]) ? (
                  <Image
                    src={post.images[0]}
                    alt={post.post_name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    priority
                    quality={90}
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
                    <span className="text-7xl">📦</span>
                  </div>
                )}

                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                {/* Back Button on Image */}
                <button
                  onClick={() => router.back()}
                  className="absolute top-4 left-4 flex items-center gap-2 px-4 py-2.5 bg-background/90 backdrop-blur-md rounded-xl text-muted-foreground hover:bg-background hover:text-foreground transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span className="text-sm font-medium">{t("back")}</span>
                </button>

                {/* Photo count badge */}
                {post.images && post.images.length > 1 && (
                  <Badge className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-sm text-white border-0 px-3 py-1.5">
                    📷 {post.images.length} photos
                  </Badge>
                )}

                {/* Status badges */}
                {!post.is_active && (
                  <Badge className="absolute top-4 right-4 bg-yellow-500/90 backdrop-blur-sm text-white border-0">
                    ⏸️ Inactive
                  </Badge>
                )}
                {post.is_arranged && (
                  <Badge className="absolute top-4 right-4 bg-emerald-500/90 backdrop-blur-sm text-white border-0">
                    ✅ Arranged
                  </Badge>
                )}
              </div>

              {/* Content */}
              <div className="relative p-6">
                {/* Category Badge */}
                <div
                  className={cn(
                    "mb-4 transform transition-all duration-500 delay-100",
                    isLoaded ? "translate-y-0" : "translate-y-4"
                  )}
                >
                  <PostTypeBadge postType={post.post_type} variant="gradient" />
                </div>

                {/* Title */}
                <h1
                  className={cn(
                    "text-2xl sm:text-3xl font-bold text-foreground mb-4 transform transition-all duration-500 delay-150",
                    isLoaded ? "translate-y-0" : "translate-y-4"
                  )}
                >
                  {post.post_name}
                </h1>

                {/* Location */}
                <div
                  className={cn(
                    "flex flex-col gap-2 mb-6 transform transition-all duration-500 delay-200",
                    isLoaded ? "translate-y-0" : "translate-y-4"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-950/50 dark:to-emerald-950/30">
                      <MapPin className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                    </div>
                    <p className="text-muted-foreground">{post.post_stripped_address}</p>
                  </div>
                  <p className="text-xs text-muted-foreground/70 flex items-center gap-1.5 ml-13">
                    <span className="text-amber-500">&#9888;</span>
                    {t("location_approximate_disclaimer")}
                  </p>
                </div>

                <Separator className="my-6" />

                {/* Stats Row */}
                <div
                  className={cn(
                    "grid grid-cols-3 gap-3 mb-6 transform transition-all duration-500 delay-250",
                    isLoaded ? "translate-y-0" : "translate-y-4"
                  )}
                >
                  <PostStatsCard
                    icon={Heart}
                    value={post.post_like_counter || 0}
                    label="likes"
                    colorScheme="rose"
                  />
                  <PostStatsCard
                    icon={Eye}
                    value={post.post_views || 0}
                    label="views"
                    colorScheme="blue"
                  />
                  <PostStatsCard
                    icon={Calendar}
                    value={new Date(post.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                    label="posted"
                    colorScheme="amber"
                  />
                </div>

                {/* Rating */}
                {!isOwner && (
                  <div
                    className={cn(
                      "flex justify-center gap-2 mb-6 p-4 rounded-xl bg-muted/30 transform transition-all duration-500 delay-300",
                      isLoaded ? "translate-y-0" : "translate-y-4"
                    )}
                  >
                    <span className="text-sm text-muted-foreground mr-2">Rate this listing:</span>
                    {Array(5)
                      .fill("")
                      .map((_, i) => (
                        <StarIcon
                          key={i}
                          onClick={() => onStarClick(i)}
                          color={i < rating ? "teal.500" : "gray.300"}
                          cursor="pointer"
                        />
                      ))}
                  </div>
                )}

                <Separator className="my-6" />

                {/* Details */}
                <div
                  className={cn(
                    "space-y-4 mb-6 transform transition-all duration-500 delay-350",
                    isLoaded ? "translate-y-0" : "translate-y-4"
                  )}
                >
                  {/* Available Hours */}
                  <PostDetailSection
                    icon={Clock}
                    title={t("available")}
                    colorScheme="purple"
                    variant="inline"
                  >
                    {post.available_hours || "Anytime"}
                  </PostDetailSection>

                  {/* Description */}
                  {post.post_description && (
                    <PostDetailSection
                      icon={FileText}
                      title={t("description")}
                      colorScheme="emerald"
                    >
                      {post.post_description}
                    </PostDetailSection>
                  )}

                  {/* Transportation */}
                  {post.transportation && (
                    <PostDetailSection
                      icon={Truck}
                      title={t("transport")}
                      colorScheme="sky"
                      variant="inline"
                    >
                      <Badge variant="outline" className="uppercase text-xs">
                        {post.transportation}
                      </Badge>
                    </PostDetailSection>
                  )}
                </div>

                {/* Action Buttons */}
                <div
                  className={cn(
                    "mt-8 flex gap-3 transform transition-all duration-500 delay-400",
                    isLoaded ? "translate-y-0" : "translate-y-4"
                  )}
                >
                  {canEdit ? (
                    <>
                      <Button
                        onClick={handleEditPost}
                        size="lg"
                        className="flex-1 h-12 rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 shadow-lg shadow-orange-500/25 transition-all duration-300 hover:shadow-xl hover:shadow-orange-500/30 hover:scale-[1.02] font-semibold"
                      >
                        {isAdmin && !isOwner ? t("edit_listing") + " (Admin)" : t("edit_listing")}
                      </Button>
                      {isOwner && (
                        <Link href="/user-listings" className="flex-1">
                          <Button
                            variant="outline"
                            size="lg"
                            className="w-full h-12 rounded-xl border-border/50 hover:bg-muted/50 transition-all duration-300 hover:scale-[1.02] font-semibold"
                          >
                            {t("my_listings")}
                          </Button>
                        </Link>
                      )}
                      {/* Share button for owners */}
                      <ShareButton
                        url={`https://foodshare.club/food/${post.id}`}
                        title={post.post_name}
                        description={post.post_description}
                      />
                    </>
                  ) : (
                    <>
                      <Button
                        onClick={handleContactSharer}
                        size="lg"
                        className="flex-1 h-12 rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 shadow-lg shadow-orange-500/25 transition-all duration-300 hover:shadow-xl hover:shadow-orange-500/30 hover:scale-[1.02] font-semibold"
                      >
                        {isAuth ? t("contact_sharer") : t("login_to_contact")}
                      </Button>
                      {/* Share button */}
                      <ShareButton
                        url={`https://foodshare.club/food/${post.id}`}
                        title={post.post_name}
                        description={post.post_description}
                      />
                      {/* Report button - only for logged-in users */}
                      {isAuth && (
                        <ReportPostDialog
                          postId={post.id}
                          postName={post.post_name}
                          trigger={
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-12 w-12 rounded-xl border-border/50 text-muted-foreground hover:text-destructive hover:border-destructive/50 hover:bg-destructive/10 transition-all duration-300"
                            >
                              <Flag className="h-5 w-5" />
                            </Button>
                          }
                        />
                      )}
                    </>
                  )}
                </div>

                {/* Status Indicators */}
                {!post.is_active && (
                  <div
                    className={cn(
                      "mt-6 p-4 rounded-xl bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-950/30 dark:to-amber-950/20 border border-yellow-200/50 dark:border-yellow-800/30 text-center transform transition-all duration-500 delay-450",
                      isLoaded ? "translate-y-0" : "translate-y-4"
                    )}
                  >
                    <p className="text-yellow-800 dark:text-yellow-300 text-sm font-medium flex items-center justify-center gap-2">
                      <span>⚠️</span>
                      {t("this_listing_is_no_longer_active")}
                    </p>
                  </div>
                )}

                {post.is_arranged && (
                  <div
                    className={cn(
                      "mt-6 p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/20 border border-emerald-200/50 dark:border-emerald-800/30 text-center transform transition-all duration-500 delay-450",
                      isLoaded ? "translate-y-0" : "translate-y-4"
                    )}
                  >
                    <p className="text-emerald-800 dark:text-emerald-300 text-sm font-medium flex items-center justify-center gap-2">
                      <span>🎉</span>
                      {t("this_item_has_been_arranged")}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* About This Post - Mobile Only */}
            <div
              className={cn(
                "lg:hidden transform transition-all duration-500 delay-500",
                isLoaded ? "translate-y-0" : "translate-y-8"
              )}
            >
              <AboutPostCard post={post} />
            </div>
          </div>
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

function AboutPostCard({ post }: { post: InitialProductStateType }) {
  const t = useTranslations();

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-card/80 backdrop-blur-xl p-6 shadow-sm hover:shadow-lg transition-all duration-300">
      {/* Decorative gradient */}
      <div className="absolute -top-16 -right-16 h-32 w-32 rounded-full bg-gradient-to-br from-teal-500/20 to-emerald-500/10 blur-3xl animate-pulse pointer-events-none" />

      <div className="relative">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-lg font-semibold text-foreground">{t("about_this_listing")}</h3>
          <Sparkles className="h-4 w-4 text-teal-500 animate-pulse" />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
            <span className="text-sm text-muted-foreground">{t("category")}</span>
            <PostTypeBadge postType={post.post_type} variant="gradient" size="sm" />
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
            <span className="text-sm text-muted-foreground">{t("posted")}</span>
            <span className="text-sm font-medium text-foreground">
              {new Date(post.created_at).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
            <span className="text-sm text-muted-foreground">{t("status")}</span>
            <Badge
              variant="outline"
              className={cn(
                "font-medium",
                post.is_active
                  ? "border-emerald-500/50 bg-emerald-50/80 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
                  : "border-muted-foreground/30 text-muted-foreground"
              )}
            >
              {post.is_active ? "Active" : "Inactive"}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PostDetailClient;
