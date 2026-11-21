import { standardizeDisplayAddress } from "@/lib/address-standardizer";
import { formatFirstAuthorName } from "@/lib/data/author-display";
import type { InitialProductStateType } from "@/types/product.types";
import { getProductDetailUrl } from "@/utils/categoryMapping";
import { Building2, Bus, Clock, MapPin, Star, User } from "lucide-react";
import Link from "next/link";
import { ImageCarousel } from "./ImageCarousel";
import { ProductCardActions } from "./ProductCardActions";
import { ProductCardWrapper } from "./ProductCardWrapper";

type ProductCardProps = {
  product: InitialProductStateType;
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
export function ProductCard({ product, onMouseEnter, onMouseLeave, onClick }: ProductCardProps) {
  // Product detail URL - use category-specific path based on post_type
  const productUrl = getProductDetailUrl(product.post_type, product.id);
  // Legacy imports use punctuation for missing metadata; keep it out of the layout.
  const hasContent = (value: string | null | undefined) => Boolean(value?.trim().replace(/[\s,.-]/g, ""));
  const hasPickup = hasContent(product.available_hours);
  const hasTransport = hasContent(product.transportation);

  const isOrgOrFridge = product.post_type === "fridge" || product.post_type === "foodbank";
  const hostEntity =
    product.host_entity ||
    ((product.metadata as Record<string, unknown> | undefined)?.host_company as string | undefined);
  const authorName = product.author_name
    ? formatFirstAuthorName(product.author_name)
    : !isOrgOrFridge
      ? "Community Member"
      : null;
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

  const cardContent = (
    <article
      className="group/card relative flex h-full min-w-0 flex-col @container/card focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 rounded-2xl"
      aria-label={product.post_name}
    >
      {/* 1. Media: Airbnb Image Carousel */}
      <div className="relative z-10 isolate overflow-hidden rounded-2xl bg-muted aspect-[20/19] w-full transition-shadow duration-300 group-hover/card:shadow-md">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover/card:opacity-100 z-[1]" />

        <ProductCardActions product={product} />

        <ImageCarousel
          images={product.images || []}
          productUrl={productUrl}
          productId={product.id}
          postName={product.post_name}
          postType={product.post_type}
        />
      </div>

      {/* 2. Content Stack: Airbnb Typography Hierarchy */}
      <div className="flex flex-1 flex-col pt-3 gap-0.5">
        {/* Line 1: Title & Star Rating / Status Badge */}
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-[15px] font-semibold leading-snug text-foreground truncate">
            <Link
              href={productUrl}
              className="rounded-xs after:absolute after:inset-0 after:z-0 after:rounded-2xl hover:underline focus-visible:outline-none"
            >
              {product.post_name}
            </Link>
          </h3>
          {hasRating && ratingScore ? (
            <span className="shrink-0 flex items-center gap-1 text-[13px] font-semibold text-foreground">
              <Star className="size-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />
              <span>{ratingScore}</span>
              {totalReviews > 1 && (
                <span className="text-muted-foreground text-xs font-normal">{`(${totalReviews})`}</span>
              )}
            </span>
          ) : (
            <span className="shrink-0 flex items-center gap-1 text-[13px] font-medium text-foreground">
              <Star className="size-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />
              <span>{"New"}</span>
            </span>
          )}
        </div>

        {/* Line 2: Author Attribution or Organization / Entity Ownership */}
        {isOrgOrFridge && (hostEntity || product.post_name) ? (
          <p className="flex items-center gap-1.5 text-[13px] leading-snug font-medium text-emerald-600 dark:text-emerald-400 truncate">
            <Building2 className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">
              {product.post_type === "foodbank"
                ? hostEntity || product.post_name
                : hostEntity
                  ? `Hosted by ${hostEntity}`
                  : "Community Fridge"}
            </span>
          </p>
        ) : authorName ? (
          <p className="flex items-center gap-1.5 text-[13px] leading-snug text-muted-foreground truncate">
            <User className="size-3.5 shrink-0 text-muted-foreground/70" aria-hidden="true" />
            <span className="truncate">{`By ${authorName}`}</span>
          </p>
        ) : null}

        {/* Line 3: Standardized, Privacy-Safe Address / Distance */}
        {hasContent(displayAddress) && (
          <p className="flex items-center gap-1.5 text-[14px] leading-snug text-muted-foreground truncate">
            <MapPin className="size-3.5 shrink-0 text-primary/70" aria-hidden="true" />
            <span className="truncate">{displayAddress}</span>
          </p>
        )}

        {/* Line 3: Available pickup hours */}
        {hasPickup && (
          <p className="flex items-center gap-1.5 text-[14px] leading-snug text-muted-foreground truncate">
            <Clock className="size-3.5 shrink-0 text-primary/70" aria-hidden="true" />
            <span className="truncate">{product.available_hours}</span>
          </p>
        )}

        {/* Line 4: Price / Status Highlight (Airbnb "Price" line) */}
        <div className="mt-1.5 flex items-center justify-between pt-0.5 text-[15px]">
          <div className="flex items-center gap-2">
            <span className="font-semibold tracking-tight text-foreground">
              {product.post_type === "food" || product.post_type === "vegan" ? "Free" : "Available"}
            </span>
            {product.is_arranged ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
                <span className="size-1.5 rounded-full bg-amber-500" />
                {"Reserved"}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {"Available"}
              </span>
            )}
          </div>
          {hasTransport && (
            <span className="flex max-w-[45%] items-center gap-1 truncate text-xs text-muted-foreground">
              <Bus className="size-3 shrink-0" aria-hidden="true" />
              <span className="truncate">{product.transportation}</span>
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
