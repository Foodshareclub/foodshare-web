"use client";

const STAR_VALUES = [1, 2, 3, 4, 5] as const;

import { togglePostLike } from "@/app/actions/post-engagement";
import { PostTypeBadge } from "@/components/post/PostTypeBadge";
import { ReportPostDialog } from "@/components/reports";
import { ShareButton } from "@/components/share/ShareButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { standardizeDisplayAddress } from "@/lib/address-standardizer";
import type { AuthUser } from "@/lib/data/auth";
import { formatListingAuthorLabel } from "@/lib/data/author-display";
import { getCoverCredit } from "@/lib/cover-provenance";
import { normalizeImageUrl } from "@/lib/image";
import { cn } from "@/lib/utils";
import type { InitialProductStateType } from "@/types/product.types";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Clock,
  Flag,
  Heart,
  MapPin,
  PauseCircle,
  Star,
  Truck,
  User,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useState, useTransition } from "react";
import { PostGallery } from "./PostGallery";

interface PostDetailContentProps {
  post: InitialProductStateType;
  user: AuthUser | null;
  isAdmin?: boolean;
  isModal?: boolean;
  /** Optional map rendered inside the location section. */
  locationSlot?: ReactNode;
}

export function PostDetailContent({
  post,
  user,
  isAdmin = false,
  isModal = false,
  locationSlot,
}: PostDetailContentProps) {
  const t = useTranslations();
  const router = useRouter();

  const isAuth = !!user;
  const userId = user?.id || "";
  const isOwner = userId === post.profile_id;
  const canEdit = isOwner || isAdmin;

  const [rating, setRating] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const [likeCount, setLikeCount] = useState(post.post_like_counter || 0);
  const [isPendingSave, startSaveTransition] = useTransition();
  const validImages = [...new Set(post.images?.map(normalizeImageUrl).filter((url): url is string => !!url))];
  const coverCredit = getCoverCredit(post.metadata);

  // Airbnb rating and review count computation
  const hasRating = (post.five_star != null && post.five_star > 0) || (post.four_star != null && post.four_star > 0);
  const totalReviews = (post.five_star ?? 0) + (post.four_star ?? 0);
  const ratingScore = hasRating
    ? (
        ((post.five_star ?? 0) * 5 + (post.four_star ?? 0) * 4) /
        ((post.five_star ?? 0) + (post.four_star ?? 0))
      ).toFixed(1)
    : null;

  const onStarClick = (index: number) => {
    setRating(index + 1);
  };

  const handleToggleSave = () => {
    if (!isAuth) {
      router.push("/auth/login");
      return;
    }
    const previousSaved = isSaved;
    setIsSaved(!previousSaved);
    setLikeCount((prev) => (previousSaved ? Math.max(0, prev - 1) : prev + 1));

    startSaveTransition(async () => {
      try {
        const result = await togglePostLike(post.id);
        if (result.success && result.data) {
          setIsSaved(result.data.isLiked);
          setLikeCount(result.data.likeCount);
        }
      } catch {
        setIsSaved(previousSaved);
        setLikeCount(post.post_like_counter || 0);
      }
    });
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

  const isOrg = post.post_type === "fridge" || post.post_type === "foodbank";
  const metadata = post.metadata as Record<string, unknown> | undefined;
  const pointPerson = post.point_person_name || metadata?.point_person_name;
  const address = standardizeDisplayAddress(post.post_stripped_address || post.post_address);
  const shareUrl = `https://foodshare.club/food/${post.id}`;
  const section = "border-t border-border py-6 sm:py-8";

  const primaryAction = canEdit ? (
    <>
      <Button onClick={handleEditPost} variant="brand" size="xl" className="min-w-0 flex-1 font-semibold">
        {isAdmin && !isOwner ? `${t("edit_listing")} (Admin)` : t("edit_listing")}
      </Button>
      {isOwner && (
        <Button asChild variant="outline" size="xl" className="shrink-0">
          <Link href="/user-listings">{t("my_listings")}</Link>
        </Button>
      )}
    </>
  ) : (
    <>
      <Button onClick={handleContactSharer} variant="brand" size="xl" className="min-w-0 flex-1 font-semibold">
        {isAuth ? t("contact_sharer") : t("login_to_contact")}
      </Button>
      {isAuth && (
        <ReportPostDialog
          postId={post.id}
          postName={post.post_name}
          trigger={
            <Button
              variant="outline"
              size="icon-lg"
              className="shrink-0 text-muted-foreground hover:text-destructive"
              aria-label={t("report_post")}
            >
              <Flag />
            </Button>
          }
        />
      )}
    </>
  );

  return (
    <div className={cn(!isModal && "pb-24 lg:pb-0")}>
      {/* Title block */}
      <header
        className={cn("flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between", isModal && "px-6 pt-6")}
      >
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <PostTypeBadge postType={post.post_type} variant="subtle" size="sm" />
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
                post.is_arranged
                  ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                  : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
              )}
            >
              <span className={cn("size-1.5 rounded-full", post.is_arranged ? "bg-amber-500" : "bg-emerald-500")} />
              {post.is_arranged ? "Reserved" : "Available"}
            </span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{post.post_name}</h1>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1 font-medium text-foreground">
              <Star className="size-3.5 fill-foreground text-foreground" aria-hidden="true" />
              <span>{ratingScore ? `${ratingScore} (${totalReviews})` : "New"}</span>
            </span>
            <span aria-hidden="true">·</span>
            <span className="flex min-w-0 items-center gap-1">
              <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{address}</span>
            </span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <ShareButton url={shareUrl} title={post.post_name} description={post.post_description} variant="default" />
          <Button
            type="button"
            variant="outline"
            onClick={handleToggleSave}
            disabled={isPendingSave}
            aria-pressed={isSaved}
            className="h-10 gap-2 rounded-full px-4 font-medium"
            aria-label={isSaved ? "Saved to wishlist" : "Save to wishlist"}
          >
            <Heart className={cn(isSaved && "fill-brand text-brand")} aria-hidden="true" />
            <span>{isSaved ? "Saved" : "Save"}</span>
          </Button>
        </div>
      </header>

      <PostGallery
        className={cn("mt-6", isModal && "mx-6")}
        postId={post.id}
        title={post.post_name}
        images={validImages}
        coverCredit={coverCredit}
        emptyLabel={post.post_type === "food" || post.post_type === "vegan" ? "Community Food" : "Community Listing"}
        badge={
          post.is_active === false ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-background/90 px-2.5 py-1 text-xs font-medium text-foreground shadow-sm">
              <PauseCircle className="size-3.5" aria-hidden="true" />
              Inactive
            </span>
          ) : undefined
        }
      />

      <div className={cn("mt-6 grid items-start gap-x-12 lg:grid-cols-[minmax(0,1fr)_380px]", isModal && "px-6 pb-6")}>
        <div className="min-w-0">
          {/* Host / attribution */}
          <div className="flex items-center justify-between gap-4 pb-6 sm:pb-8">
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-muted text-foreground">
                {isOrg ? (
                  <Building2 className="size-6" aria-hidden="true" />
                ) : (
                  <User className="size-6" aria-hidden="true" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground">
                  {post.post_type === "foodbank" ? "Food Bank Entity" : "Hosted by"}
                </p>
                <p className="truncate text-base font-semibold text-foreground">
                  {isOrg
                    ? post.host_entity ||
                      (metadata?.host_company as string | undefined) ||
                      (post.post_type === "foodbank" ? post.post_name : "Community Host")
                    : formatListingAuthorLabel(post.post_type, post.author_name)}
                </p>
                {Boolean(pointPerson) && (
                  <p className="truncate text-sm text-muted-foreground">{`Contact: ${String(pointPerson)}`}</p>
                )}
              </div>
            </div>
            <Badge variant="outline" className="hidden shrink-0 rounded-full text-xs font-medium sm:inline-flex">
              {isOrg ? "Community Organization" : "Community Sharer"}
            </Badge>
          </div>

          {/* Status notices */}
          {!post.is_active && (
            <p className="mb-6 flex items-center gap-2 rounded-xl bg-amber-500/10 p-4 text-sm font-medium text-amber-800 dark:text-amber-300">
              <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
              <span>{t("this_listing_is_no_longer_active")}</span>
            </p>
          )}
          {post.is_arranged && (
            <p className="mb-6 flex items-center gap-2 rounded-xl bg-emerald-500/10 p-4 text-sm font-medium text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
              <span>{t("this_item_has_been_arranged")}</span>
            </p>
          )}

          {/* Pickup */}
          <section className={section} aria-labelledby="pd-pickup">
            <h2 id="pd-pickup" className="mb-3 text-xl font-semibold">
              {t("available")}
            </h2>
            <dl className="space-y-3 text-base">
              <div className="flex items-center gap-3">
                <Clock className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                <dd>{post.available_hours || "Anytime"}</dd>
              </div>
              {post.transportation && (
                <div className="flex items-center gap-3">
                  <Truck className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <dt className="sr-only">{t("transport")}</dt>
                  <dd>
                    <Badge variant="outline" className="uppercase">
                      {post.transportation}
                    </Badge>
                  </dd>
                </div>
              )}
            </dl>
          </section>

          {/* Description */}
          {post.post_description && (
            <section className={section} aria-labelledby="pd-about">
              <h2 id="pd-about" className="mb-3 text-xl font-semibold">
                {t("description")}
              </h2>
              <p className="whitespace-pre-line text-base leading-relaxed text-foreground/90">
                {post.post_description}
              </p>
            </section>
          )}

          {/* Location */}
          <section className={section} aria-labelledby="pd-where">
            <h2 id="pd-where" className="mb-3 text-xl font-semibold">
              {t("address")}
            </h2>
            <p className="flex items-center gap-2 text-base">
              <MapPin className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span>{address}</span>
            </p>
            <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <AlertTriangle className="size-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
              <span>{t("location_approximate_disclaimer")}</span>
            </p>
            {locationSlot && (
              <div className="mt-4 h-[320px] overflow-hidden rounded-2xl border border-border lg:h-[400px]">
                {locationSlot}
              </div>
            )}
          </section>

          {/* Activity and rating */}
          <section className={cn(section, "space-y-6")}>
            <ul className="flex flex-wrap gap-x-8 gap-y-2 text-sm text-muted-foreground">
              <li>
                <span className="font-semibold text-foreground">{likeCount}</span> likes
              </li>
              <li>
                <span className="font-semibold text-foreground">{post.post_views || 0}</span> views
              </li>
              <li>
                {t("posted")}{" "}
                <span className="font-semibold text-foreground">
                  {new Date(post.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              </li>
            </ul>
            {!isOwner && (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span id="pd-rate" className="text-sm font-medium text-foreground">
                  Rate this listing:
                </span>
                <div className="flex items-center" role="group" aria-labelledby="pd-rate">
                  {STAR_VALUES.map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => onStarClick(star - 1)}
                      aria-pressed={star <= rating}
                      className="flex size-11 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label={`Rate ${star} stars`}
                    >
                      <Star
                        className={cn(
                          "size-5 transition-colors",
                          star <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40",
                        )}
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>

          {isModal && <AboutPostCard post={post} className={section} />}
        </div>

        {/* Action card (desktop, sticky) / bottom bar (mobile) */}
        <aside
          aria-label={t("contact_sharer")}
          className={cn(
            "z-40 border-t border-border bg-background p-4 shadow-lg pb-[max(1rem,env(safe-area-inset-bottom))]",
            isModal ? "sticky bottom-0 -mx-6 lg:static lg:mx-0" : "fixed inset-x-0 bottom-0 lg:static lg:inset-auto",
            "lg:sticky lg:top-24 lg:rounded-xl lg:border lg:p-6 lg:pb-6",
          )}
        >
          <div className="hidden space-y-3 pb-5 lg:block">
            <p className="text-xl font-semibold">{t("available")}</p>
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="size-4 shrink-0" aria-hidden="true" />
              <span>{post.available_hours || "Anytime"}</span>
            </p>
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="size-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{address}</span>
            </p>
          </div>
          <div className="flex items-center gap-3">{primaryAction}</div>
          <p className="mt-3 hidden text-center text-xs text-muted-foreground lg:block">
            {t("location_approximate_disclaimer")}
          </p>
        </aside>
      </div>
    </div>
  );
}

function AboutPostCard({ post, className }: { post: InitialProductStateType; className?: string }) {
  const t = useTranslations();

  return (
    <section className={className} aria-labelledby="pd-meta">
      <h2 id="pd-meta" className="mb-3 text-xl font-semibold">
        {t("about_this_listing")}
      </h2>
      <dl className="divide-y divide-border text-sm">
        <div className="flex items-center justify-between py-3">
          <dt className="text-muted-foreground">{t("category")}</dt>
          <dd>
            <PostTypeBadge postType={post.post_type} variant="subtle" size="sm" />
          </dd>
        </div>
        <div className="flex items-center justify-between py-3">
          <dt className="text-muted-foreground">{t("posted")}</dt>
          <dd className="font-medium text-foreground">
            {new Date(post.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
          </dd>
        </div>
        <div className="flex items-center justify-between py-3">
          <dt className="text-muted-foreground">{t("status")}</dt>
          <dd>
            <Badge variant="outline" className="font-medium">
              {post.is_active ? "Active" : "Inactive"}
            </Badge>
          </dd>
        </div>
      </dl>
    </section>
  );
}
