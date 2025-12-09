"use client";

import { useState, useEffect } from "react";
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
import { cn } from "@/lib/utils";
import type { InitialProductStateType } from "@/types/product.types";
import type { AuthUser } from "@/app/actions/auth";
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

interface ProductDetailClientProps {
  product: InitialProductStateType | null;
  user: AuthUser | null;
  isAdmin?: boolean;
}

/**
 * ProductDetailClient - Client component for product detail page
 * Receives product data from Server Component
 */
export function ProductDetailClient({ product, user, isAdmin = false }: ProductDetailClientProps) {
  const t = useTranslations();
  const router = useRouter();

  // Auth state from user prop
  const isAuth = !!user;
  const userId = user?.id || "";
  const profile = user?.profile;
  const isOwner = userId === product?.profile_id;
  const canEdit = isOwner || isAdmin; // Admins can edit any post
  const productType = product?.post_type || "food";

  // Avatar URL: Avatar component handles default fallback
  const avatarUrl = profile?.avatar_url || "";

  // Rating state for interactive stars
  const [rating, setRating] = useState(0);

  // Entrance animation state
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const onStarClick = (index: number) => {
    setRating(index + 1);
  };

  const handleContactSeller = () => {
    if (!isAuth) {
      router.push("/auth/login");
      return;
    }
    router.push(`/chat?food=${product?.id}`);
  };

  const handleEditListing = () => {
    router.push(`/food/${product?.id}/edit`);
  };

  // Empty Navbar handlers (navigation handled internally by Navbar)
  const handleRouteChange = () => {};
  const handleProductTypeChange = () => {};

  if (!product) {
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
              isLoaded ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
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
        productType={productType}
        onRouteChange={handleRouteChange}
        onProductTypeChange={handleProductTypeChange}
        imgUrl={avatarUrl}
        firstName={profile?.first_name || ""}
        secondName={profile?.second_name || ""}
        email={profile?.email || ""}
        signalOfNewMessage={[]}
      />

      {/* Main Content - Two Column Layout */}
      <div className="flex flex-col lg:flex-row pt-20 lg:h-[calc(100vh-5rem)]">
        {/* Left Column - Product Detail (Scrollable) */}
        <div className="w-full lg:w-1/2 px-4 pb-12 lg:overflow-y-auto lg:h-full">
          <div className="flex flex-col gap-6">
            {/* Main Product Card */}
            <div
              className={cn(
                "relative overflow-hidden rounded-2xl border border-border/40 bg-card/80 backdrop-blur-xl shadow-sm transition-all duration-500",
                "hover:shadow-xl hover:border-border/60",
                isLoaded ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
              )}
            >
              {/* Decorative gradient orbs */}
              <div className="absolute -top-32 -right-32 h-64 w-64 rounded-full bg-gradient-to-br from-orange-500/10 to-rose-500/5 blur-3xl animate-pulse pointer-events-none" />
              <div className="absolute -bottom-32 -left-32 h-64 w-64 rounded-full bg-gradient-to-br from-teal-500/10 to-emerald-500/5 blur-3xl animate-pulse delay-1000 pointer-events-none" />

              {/* Hero Image with Back Button Overlay */}
              <div className="relative w-full group" style={{ aspectRatio: "16/9" }}>
                {product.images?.[0] && isValidImageUrl(product.images[0]) ? (
                  <Image
                    src={product.images[0]}
                    alt={product.post_name}
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
                {product.images && product.images.length > 1 && (
                  <Badge className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-sm text-white border-0 px-3 py-1.5">
                    📷 {product.images.length} photos
                  </Badge>
                )}

                {/* Status badges */}
                {!product.is_active && (
                  <Badge className="absolute top-4 right-4 bg-yellow-500/90 backdrop-blur-sm text-white border-0">
                    ⏸️ Inactive
                  </Badge>
                )}
                {product.is_arranged && (
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
                    isLoaded ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
                  )}
                >
                  <Badge className="bg-gradient-to-r from-orange-500 to-rose-500 text-white border-0 px-4 py-1.5 text-sm font-medium capitalize shadow-md shadow-orange-500/25">
                    {product.post_type}
                  </Badge>
                </div>

                {/* Title */}
                <h1
                  className={cn(
                    "text-2xl sm:text-3xl font-bold text-foreground mb-4 transform transition-all duration-500 delay-150",
                    isLoaded ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
                  )}
                >
                  {product.post_name}
                </h1>

                {/* Location */}
                <div
                  className={cn(
                    "flex items-center gap-3 mb-6 transform transition-all duration-500 delay-200",
                    isLoaded ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
                  )}
                >
                  <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-950/50 dark:to-emerald-950/30">
                    <MapPin className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                  </div>
                  <p className="text-muted-foreground">{product.post_stripped_address}</p>
                </div>

                <Separator className="my-6" />

                {/* Stats Row */}
                <div
                  className={cn(
                    "grid grid-cols-3 gap-3 mb-6 transform transition-all duration-500 delay-250",
                    isLoaded ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
                  )}
                >
                  <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-950/30 dark:to-pink-950/20 p-4 text-center transition-all duration-300 hover:shadow-md hover:scale-105 cursor-default">
                    <div className="absolute inset-0 bg-gradient-to-br from-rose-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative">
                      <Heart className="h-5 w-5 mx-auto mb-1 text-rose-500" />
                      <div className="text-lg font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                        {product.post_like_counter || 0}
                      </div>
                      <div className="text-xs text-rose-600/70 dark:text-rose-400/70">likes</div>
                    </div>
                  </div>
                  <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/20 p-4 text-center transition-all duration-300 hover:shadow-md hover:scale-105 cursor-default">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative">
                      <Eye className="h-5 w-5 mx-auto mb-1 text-blue-500" />
                      <div className="text-lg font-bold text-blue-600 dark:text-blue-400 tabular-nums">
                        {product.post_views || 0}
                      </div>
                      <div className="text-xs text-blue-600/70 dark:text-blue-400/70">views</div>
                    </div>
                  </div>
                  <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20 p-4 text-center transition-all duration-300 hover:shadow-md hover:scale-105 cursor-default">
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative">
                      <Calendar className="h-5 w-5 mx-auto mb-1 text-amber-500" />
                      <div className="text-sm font-bold text-amber-600 dark:text-amber-400">
                        {new Date(product.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </div>
                      <div className="text-xs text-amber-600/70 dark:text-amber-400/70">posted</div>
                    </div>
                  </div>
                </div>

                {/* Rating */}
                {!isOwner && (
                  <div
                    className={cn(
                      "flex justify-center gap-2 mb-6 p-4 rounded-xl bg-muted/30 transform transition-all duration-500 delay-300",
                      isLoaded ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
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
                    isLoaded ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
                  )}
                >
                  {/* Available Hours */}
                  <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/50 dark:to-violet-950/30">
                        <Clock className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <span className="font-medium text-foreground">{t("available")}</span>
                    </div>
                    <span className="text-muted-foreground">
                      {product.available_hours || "Anytime"}
                    </span>
                  </div>

                  {/* Description */}
                  {product.post_description && (
                    <div className="p-4 rounded-xl bg-muted/30">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/50 dark:to-teal-950/30">
                          <FileText className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <span className="font-medium text-foreground">{t("description")}</span>
                      </div>
                      <p className="text-muted-foreground leading-relaxed pl-13">
                        {product.post_description}
                      </p>
                    </div>
                  )}

                  {/* Transportation */}
                  {product.transportation && (
                    <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-gradient-to-br from-sky-50 to-cyan-50 dark:from-sky-950/50 dark:to-cyan-950/30">
                          <Truck className="h-5 w-5 text-sky-600 dark:text-sky-400" />
                        </div>
                        <span className="font-medium text-foreground">{t("transport")}</span>
                      </div>
                      <Badge variant="outline" className="uppercase text-xs">
                        {product.transportation}
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div
                  className={cn(
                    "mt-8 flex gap-3 transform transition-all duration-500 delay-400",
                    isLoaded ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
                  )}
                >
                  {canEdit ? (
                    <>
                      <Button
                        onClick={handleEditListing}
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
                    </>
                  ) : (
                    <>
                      <Button
                        onClick={handleContactSeller}
                        size="lg"
                        className="flex-1 h-12 rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 shadow-lg shadow-orange-500/25 transition-all duration-300 hover:shadow-xl hover:shadow-orange-500/30 hover:scale-[1.02] font-semibold"
                      >
                        {isAuth ? t("contact_sharer") : t("login_to_contact")}
                      </Button>
                      {/* Report button - only for logged-in users */}
                      {isAuth && (
                        <ReportPostDialog
                          postId={product.id}
                          postName={product.post_name}
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
                {!product.is_active && (
                  <div
                    className={cn(
                      "mt-6 p-4 rounded-xl bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-950/30 dark:to-amber-950/20 border border-yellow-200/50 dark:border-yellow-800/30 text-center transform transition-all duration-500 delay-450",
                      isLoaded ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
                    )}
                  >
                    <p className="text-yellow-800 dark:text-yellow-300 text-sm font-medium flex items-center justify-center gap-2">
                      <span>⚠️</span>
                      {t("this_listing_is_no_longer_active")}
                    </p>
                  </div>
                )}

                {product.is_arranged && (
                  <div
                    className={cn(
                      "mt-6 p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/20 border border-emerald-200/50 dark:border-emerald-800/30 text-center transform transition-all duration-500 delay-450",
                      isLoaded ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
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

            {/* About This Listing - Mobile Only */}
            <div
              className={cn(
                "lg:hidden transform transition-all duration-500 delay-500",
                isLoaded ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
              )}
            >
              <AboutListingCard product={product} isLoaded={isLoaded} />
            </div>
          </div>
        </div>

        {/* Right Column - Map (Fixed on Desktop) */}
        <div
          className={cn(
            "w-full lg:w-1/2 h-[400px] lg:h-auto lg:fixed lg:right-0 lg:top-20 lg:bottom-0 transform transition-all duration-700 delay-300",
            isLoaded ? "translate-x-0 opacity-100" : "translate-x-8 opacity-0"
          )}
        >
          <Leaflet product={product} />
        </div>
      </div>
    </div>
  );
}

function AboutListingCard({
  product,
  isLoaded,
}: {
  product: InitialProductStateType;
  isLoaded: boolean;
}) {
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
            <Badge className="bg-gradient-to-r from-orange-500 to-rose-500 text-white border-0 capitalize">
              {product.post_type}
            </Badge>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
            <span className="text-sm text-muted-foreground">{t("posted")}</span>
            <span className="text-sm font-medium text-foreground">
              {new Date(product.created_at).toLocaleDateString("en-US", {
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
                product.is_active
                  ? "border-emerald-500/50 bg-emerald-50/80 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
                  : "border-muted-foreground/30 text-muted-foreground"
              )}
            >
              {product.is_active ? "✅ Active" : "⏸️ Inactive"}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProductDetailClient;
