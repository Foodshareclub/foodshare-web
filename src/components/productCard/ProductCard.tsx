import { getCoverCredit } from "@/lib/cover-provenance";
import { standardizeDisplayAddress } from "@/lib/address-standardizer";
import { formatListingAuthorLabel } from "@/lib/data/author-display";
import type { InitialProductStateType } from "@/types/product.types";
import { getProductDetailUrl } from "@/utils/categoryMapping";
import { cn } from "@/lib/utils";
import { Star } from "lucide-react";
import Link from "next/link";
import { OpenStatus } from "@/components/OpenStatus";
import { ImageCarousel } from "./ImageCarousel";
import { ProductCardActions } from "./ProductCardActions";
import { ProductCardWrapper } from "./ProductCardWrapper";
import { LISTING_PHOTO } from "./listing-layout";

type ProductCardProps = {
  product: InitialProductStateType;
  coverUrl?: string;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onClick?: () => void;
};

/**
 * ProductCard - Server Component for product display
 * Following Airbnb's signature frameless layout and typography hierarchy.
 * Interactive actions are handled by the thin ProductCardActions client wrapper.
 * Optional hover/click handlers are handled by ProductCardWrapper for map integration.
 */
export function ProductCard({ product, coverUrl, onMouseEnter, onMouseLeave, onClick }: ProductCardProps) {
  // Product detail URL - use category-specific path based on post_type
  const productUrl = getProductDetailUrl(product.post_type, product.id);
  // Legacy imports use punctuation for missing metadata; keep it out of the layout.
  const hasContent = (value: string | null | undefined) => Boolean(value?.trim().replace(/[\s,.-]/g, ""));
  const hasPickup = hasContent(product.available_hours);
  // Network-managed listings show the partner's own status instead of ours.
  const partnerStatus = product.partner_status?.trim() || null;

  const displayAddress = standardizeDisplayAddress(product.post_stripped_address || product.post_address);

  // Airbnb rating and recency computation
  const hasRating =
    (product.five_star != null && product.five_star > 0) || (product.four_star != null && product.four_star > 0);
  const totalReviews = (product.five_star ?? 0) + (product.four_star ?? 0);
  const ratingScore = hasRating
    ? (
        ((product.five_star ?? 0) * 5 + (product.four_star ?? 0) * 4) /
        ((product.five_star ?? 0) + (product.four_star ?? 0))
      ).toFixed(1)
    : null;

  const isOrgOrFridge = product.post_type === "fridge" || product.post_type === "foodbank";
  const hostEntity =
    product.host_entity ||
    ((product.metadata as Record<string, unknown> | undefined)?.host_company as string | undefined);
  const authorName = product.author_name
    ? formatListingAuthorLabel(product.post_type, product.author_name)
    : !isOrgOrFridge
      ? "Community Member"
      : null;

  let authorityText: string | null = null;
  if (isOrgOrFridge) {
    if (product.post_type === "foodbank") {
      authorityText = hostEntity && hostEntity !== product.post_name ? hostEntity : null;
    } else {
      authorityText = hostEntity
        ? hostEntity.startsWith("Host:")
          ? hostEntity
          : `Hosted by ${hostEntity}`
        : "Community Fridge";
    }
  } else if (authorName) {
    authorityText = `by ${authorName}`;
  }

  const isFreeType = product.post_type === "food" || product.post_type === "vegan";
  // One muted line: where and when. Host, transit and other facts live on the detail page.
  const detailLine = [hasContent(displayAddress) ? displayAddress : null, hasPickup ? product.available_hours : null]
    .filter(Boolean)
    .join(" · ");
  const cardContent = (
    <article
      className="group/card relative flex h-full min-w-0 flex-col @container/card rounded-2xl focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
      aria-label={product.post_name}
    >
      {/* 1. Media: photo first, shared ratio with the skeleton */}
      <div
        className={cn(
          LISTING_PHOTO,
          "relative z-10 isolate overflow-hidden rounded-2xl bg-muted transition-shadow duration-300 group-hover/card:shadow-md motion-reduce:transition-none",
        )}
      >
        <ProductCardActions product={product} />
        <ImageCarousel
          images={product.images || []}
          productUrl={productUrl}
          productId={product.id}
          postName={product.post_name}
          postType={product.post_type}
          cover={getCoverCredit(product.metadata)}
          coverUrl={coverUrl}
        />
      </div>
      {/* 2. Two lines of metadata */}
      <div className="flex flex-1 flex-col gap-0.5 pt-3">
        {/* Line 1: title, rating or "New" */}
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="truncate text-[15px] font-semibold leading-snug text-foreground">
            <Link
              href={productUrl}
              className="rounded-xs after:absolute after:inset-0 after:z-0 after:rounded-2xl hover:underline focus-visible:outline-none"
            >
              {product.post_name}
            </Link>
          </h3>
          <span className="flex shrink-0 items-center gap-1 text-[13px] font-medium text-foreground">
            <Star className="size-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />
            {hasRating && ratingScore ? (
              <>
                <span className="font-semibold">{ratingScore}</span>
                {totalReviews > 1 && (
                  <span className="text-xs font-normal text-muted-foreground">{`(${totalReviews})`}</span>
                )}
              </>
            ) : (
              <span>{"New"}</span>
            )}
          </span>
        </div>
        {/* Line 2: listing authority */}
        {authorityText && <p className="truncate text-[13px] leading-snug text-muted-foreground">{authorityText}</p>}
        {/* Line 3: area and pickup window, status on the end */}
        <div className="flex items-center justify-between gap-2 text-[13px] leading-snug">
          <p className="min-w-0 flex-1 truncate text-muted-foreground">{detailLine}</p>
          {partnerStatus || product.opening_hours ? (
            <OpenStatus hours={product.opening_hours} timezone={product.timezone} />
          ) : product.is_arranged ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
              <span className="size-1.5 rounded-full bg-amber-500" aria-hidden="true" />
              {"Reserved"}
            </span>
          ) : isFreeType ? (
            <span className="shrink-0 font-semibold text-foreground">{"Free"}</span>
          ) : (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
              <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
              {"Available"}
            </span>
          )}
        </div>
      </div>
    </article>
  );
  // If event handlers are provided, wrap in client component for interactivity
  if (onMouseEnter || onMouseLeave || onClick) {
    return (
      <ProductCardWrapper onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} onClick={onClick}>
        {cardContent}
      </ProductCardWrapper>
    );
  }

  // Otherwise, render as pure server component
  return cardContent;
}
