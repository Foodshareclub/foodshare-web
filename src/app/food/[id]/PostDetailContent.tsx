"use client";

const STAR_VALUES = [1, 2, 3, 4, 5] as const;

import { PostDetailSection } from "@/components/post/PostDetailSection";
import { PostStatsCard } from "@/components/post/PostStatsCard";
import { PostTypeBadge } from "@/components/post/PostTypeBadge";
import { ReportPostDialog } from "@/components/reports";
import { ShareButton } from "@/components/share/ShareButton";
import { Badge } from "@/components/ui/badge";
import { ReferencePhotoDisclosure } from "@/components/productCard/ReferencePhotoDisclosure";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { standardizeDisplayAddress } from "@/lib/address-standardizer";
import type { AuthUser } from "@/lib/data/auth";
import { formatFirstAuthorName } from "@/lib/data/author-display";
import { normalizeImageUrl } from "@/lib/image";
import { cn } from "@/lib/utils";
import type { InitialProductStateType } from "@/types/product.types";
import {
  AlertTriangle,
  Building2,
  Calendar,
  Camera,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  Flag,
  Heart,
  MapPin,
  Package,
  PauseCircle,
  Sparkles,
  Star,
  Truck,
  User,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface PostDetailContentProps {
  post: InitialProductStateType;
  user: AuthUser | null;
  isAdmin?: boolean;
  isModal?: boolean;
}

export function PostDetailContent({ post, user, isAdmin = false, isModal = false }: PostDetailContentProps) {
  const t = useTranslations();
  const router = useRouter();

  const isAuth = !!user;
  const userId = user?.id || "";
  const isOwner = userId === post.profile_id;
  const canEdit = isOwner || isAdmin;

  const [rating, setRating] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const validImages = [...new Set(post.images?.map(normalizeImageUrl).filter((url): url is string => !!url))];
  const heroImage = validImages.find((url) => !failedImages[url]);

  // Airbnb rating and review count computation
  const hasRating = (post.five_star != null && post.five_star > 0) || (post.four_star != null && post.four_star > 0);
  const totalReviews = (post.five_star ?? 0) + (post.four_star ?? 0);
  const ratingScore = hasRating
    ? (
        ((post.five_star ?? 0) * 5 + (post.four_star ?? 0) * 4) /
        ((post.five_star ?? 0) + (post.four_star ?? 0))
      ).toFixed(1)
    : null;

  useEffect(() => {
    const frameId = requestAnimationFrame(() => setIsLoaded(true));
    return () => cancelAnimationFrame(frameId);
  }, []);

  const onStarClick = (index: number) => {
    setRating(index + 1);
  };

  const handleContactSharer = () => {
    if (!isAuth) {
      router.push("/auth/login");
      return;
    }
    router.push(`/chat?food=${post.id}`);
  };

  const handleEditPost = () => {
    router.push(`/food/${post.id}/edit`);
  };

  const content = (
    <div className="flex flex-col gap-6">
      {/* Main Post Card */}
      <div
        className={cn(
          "relative overflow-hidden rounded-3xl border border-border/60 bg-card/90 backdrop-blur-xl shadow-sm transition-all duration-500",
          "hover:shadow-md hover:border-border/80",
          isLoaded ? "translate-y-0" : "translate-y-8",
        )}
      >
        {/* Decorative gradient orbs */}
        <div className="absolute -top-32 -end-32 h-64 w-64 rounded-full bg-gradient-to-br from-orange-500/10 to-rose-500/5 blur-3xl animate-pulse pointer-events-none" />
        <div className="absolute -bottom-32 -start-32 h-64 w-64 rounded-full bg-gradient-to-br from-teal-500/10 to-emerald-500/5 blur-3xl animate-pulse delay-1000 pointer-events-none" />

        {/* Top Header Row (Airbnb Signature Header) */}
        <div className="p-6 pb-4 border-b border-border/40">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <PostTypeBadge postType={post.post_type} variant="gradient" size="sm" />
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border",
                    post.is_arranged
                      ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                      : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
                  )}
                >
                  <span className={cn("size-1.5 rounded-full", post.is_arranged ? "bg-amber-500" : "bg-emerald-500")} />
                  {post.is_arranged ? "Reserved" : "Available"}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">{post.post_name}</h1>
              <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                <div className="flex items-center gap-1 font-semibold text-foreground">
                  <Star className="size-3.5 fill-foreground text-foreground" />
                  <span>{ratingScore ? `${ratingScore} (${totalReviews})` : "New"}</span>
                </div>
                <span>·</span>
                <div className="flex items-center gap-1">
                  <MapPin className="size-3.5 text-muted-foreground shrink-0" />
                  <span className="truncate">
                    {standardizeDisplayAddress(post.post_stripped_address || post.post_address)}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <ShareButton
                url={`https://foodshare.club/food/${post.id}`}
                title={post.post_name}
                description={post.post_description}
              />
            </div>
          </div>
        </div>

        {/* Hero Image */}
        <div className="relative w-full group overflow-hidden" style={{ aspectRatio: "16/9" }}>
          {heroImage ? (
            <Image
              src={heroImage}
              alt={post.post_name}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              style={{ viewTransitionName: `product-hero-${post.id}` }}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              priority
              onError={() => setFailedImages((previous) => ({ ...previous, [heroImage]: true }))}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-amber-500/10 via-emerald-500/5 to-teal-500/10 dark:from-amber-950/25 dark:via-neutral-900 dark:to-emerald-950/20 flex flex-col items-center justify-center p-6 text-muted-foreground relative">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent opacity-80" />
              <div className="relative flex flex-col items-center justify-center gap-2 rounded-2xl border border-white/60 bg-white/70 px-6 py-5 shadow-xs backdrop-blur-md dark:border-white/10 dark:bg-neutral-900/70">
                <span className="flex size-14 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Package className="size-7" strokeWidth={1.75} aria-hidden="true" />
                </span>
                <span className="text-xs font-semibold tracking-wider text-foreground/80 uppercase">
                  {post.post_type === "food" || post.post_type === "vegan" ? "Community Food" : "Community Listing"}
                </span>
              </div>
            </div>
          )}

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          <div className="pointer-events-none absolute start-4 top-4 max-w-[calc(100%-7rem)]">
            <ReferencePhotoDisclosure image={heroImage} />
          </div>

          {/* Photo count badge */}
          {validImages.length > 1 && (
            <Badge className="absolute bottom-4 end-4 bg-black/60 backdrop-blur-sm text-white border-0 px-3 py-1.5 flex items-center gap-1.5 text-xs">
              <Camera className="size-3.5" aria-hidden="true" />
              <span>{validImages.length} photos</span>
            </Badge>
          )}

          {/* Status badges */}
          {!post.is_active && (
            <Badge className="absolute top-4 end-4 bg-yellow-500/90 backdrop-blur-sm text-white border-0 flex items-center gap-1 text-xs">
              <PauseCircle className="size-3.5" aria-hidden="true" />
              <span>Inactive</span>
            </Badge>
          )}
        </div>

        {/* Content */}
        <div className="relative p-6 space-y-6">
          {/* Airbnb Host Attribution Section */}
          <div
            className={cn(
              "flex items-center justify-between p-4 rounded-2xl border border-border/60 bg-muted/20 transform transition-all duration-500 delay-175",
              isLoaded ? "translate-y-0" : "translate-y-4",
            )}
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="flex items-center justify-center size-12 rounded-full border border-border/80 bg-background/80 shadow-2xs shrink-0 text-foreground">
                {post.post_type === "fridge" || post.post_type === "foodbank" ? (
                  <Building2 className="size-6 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <User className="size-6 text-primary" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {post.post_type === "foodbank" ? "Food Bank Entity" : "Hosted by"}
                </p>
                <p className="text-base font-semibold text-foreground truncate">
                  {post.post_type === "fridge" || post.post_type === "foodbank"
                    ? post.host_entity ||
                      ((post.metadata as Record<string, unknown> | undefined)?.host_company as string) ||
                      (post.post_type === "foodbank" ? post.post_name : "Community Host")
                    : formatFirstAuthorName(post.author_name)}
                </p>
                {Boolean(
                  post.point_person_name || (post.metadata as Record<string, unknown> | undefined)?.point_person_name,
                ) && (
                  <p className="text-xs text-muted-foreground truncate">
                    {`Contact: ${String(
                      post.point_person_name ||
                        (post.metadata as Record<string, unknown> | undefined)?.point_person_name,
                    )}`}
                  </p>
                )}
              </div>
            </div>
            <Badge
              variant="outline"
              className="hidden sm:inline-flex rounded-full text-xs font-medium border-border/80"
            >
              {post.post_type === "fridge" || post.post_type === "foodbank"
                ? "Community Organization"
                : "Community Sharer"}
            </Badge>
          </div>

          {/* Location Details */}
          <div
            className={cn(
              "flex flex-col gap-2 transform transition-all duration-500 delay-200",
              isLoaded ? "translate-y-0" : "translate-y-4",
            )}
          >
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-950/50 dark:to-emerald-950/30">
                <MapPin className="h-5 w-5 text-teal-600 dark:text-teal-400" />
              </div>
              <p className="text-muted-foreground">
                {standardizeDisplayAddress(post.post_stripped_address || post.post_address)}
              </p>
            </div>
            <p className="text-xs text-muted-foreground/70 flex items-center gap-1.5 ms-13">
              <AlertTriangle className="size-3.5 text-amber-500 shrink-0" aria-hidden="true" />
              <span>{t("location_approximate_disclaimer")}</span>
            </p>
          </div>

          <Separator className="my-6" />

          {/* Stats Row */}
          <div
            className={cn(
              "grid grid-cols-3 gap-3 mb-6 transform transition-all duration-500 delay-250",
              isLoaded ? "translate-y-0" : "translate-y-4",
            )}
          >
            <PostStatsCard icon={Heart} value={post.post_like_counter || 0} label="likes" colorScheme="rose" />
            <PostStatsCard icon={Eye} value={post.post_views || 0} label="views" colorScheme="blue" />
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
                "flex items-center justify-center gap-2 mb-6 p-4 rounded-xl bg-muted/30 transform transition-all duration-500 delay-300",
                isLoaded ? "translate-y-0" : "translate-y-4",
              )}
            >
              <span className="text-sm font-medium text-muted-foreground me-2">Rate this listing:</span>
              <div className="flex items-center gap-1" role="group">
                {STAR_VALUES.map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => onStarClick(star - 1)}
                    className="p-1 rounded-sm transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-ring"
                    aria-label={`Rate ${star} stars`}
                  >
                    <Star
                      className={cn(
                        "size-5 transition-colors",
                        star <= rating
                          ? "fill-amber-400 text-amber-400"
                          : "text-muted-foreground/40 hover:text-amber-300",
                      )}
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          <Separator className="my-6" />

          {/* Details */}
          <div
            className={cn(
              "space-y-4 mb-6 transform transition-all duration-500 delay-350",
              isLoaded ? "translate-y-0" : "translate-y-4",
            )}
          >
            {/* Available Hours */}
            <PostDetailSection icon={Clock} title={t("available")} colorScheme="purple" variant="inline">
              {post.available_hours || "Anytime"}
            </PostDetailSection>

            {/* Description */}
            {post.post_description && (
              <PostDetailSection icon={FileText} title={t("description")} colorScheme="emerald">
                {post.post_description}
              </PostDetailSection>
            )}

            {/* Transportation */}
            {post.transportation && (
              <PostDetailSection icon={Truck} title={t("transport")} colorScheme="sky" variant="inline">
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
              isLoaded ? "translate-y-0" : "translate-y-4",
            )}
          >
            {canEdit ? (
              <>
                <Button
                  onClick={handleEditPost}
                  size="lg"
                  className="flex-1 h-12 rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 shadow-lg shadow-orange-500/25 transition-all duration-300 hover:shadow-xl hover:shadow-orange-500/30 hover:scale-[1.02] font-semibold"
                >
                  {isAdmin && !isOwner ? `${t("edit_listing")} (Admin)` : t("edit_listing")}
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
                <ShareButton
                  url={`https://foodshare.club/food/${post.id}`}
                  title={post.post_name}
                  description={post.post_description}
                />
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
                "mt-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 text-center transform transition-all duration-500 delay-450",
                isLoaded ? "translate-y-0" : "translate-y-4",
              )}
            >
              <p className="text-amber-800 dark:text-amber-300 text-sm font-medium flex items-center justify-center gap-2">
                <AlertTriangle className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <span>{t("this_listing_is_no_longer_active")}</span>
              </p>
            </div>
          )}

          {post.is_arranged && (
            <div
              className={cn(
                "mt-6 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40 text-center transform transition-all duration-500 delay-450",
                isLoaded ? "translate-y-0" : "translate-y-4",
              )}
            >
              <p className="text-emerald-800 dark:text-emerald-300 text-sm font-medium flex items-center justify-center gap-2">
                <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>{t("this_item_has_been_arranged")}</span>
              </p>
            </div>
          )}
        </div>

        {/* About This Post (Show below main card on mobile/modal) */}
        {(isModal || !isLoaded) && (
          <div className="p-6 pt-0">
            <AboutPostCard post={post} />
          </div>
        )}
      </div>
    </div>
  );

  return content;
}

function AboutPostCard({ post }: { post: InitialProductStateType }) {
  const t = useTranslations();

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-card/80 backdrop-blur-xl p-6 shadow-sm hover:shadow-lg transition-all duration-300">
      <div className="absolute -top-16 -end-16 h-32 w-32 rounded-full bg-gradient-to-br from-teal-500/20 to-emerald-500/10 blur-3xl animate-pulse pointer-events-none" />

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
                  : "border-muted-foreground/30 text-muted-foreground",
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
