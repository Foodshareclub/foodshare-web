"use client";

import { PostTypeBadge } from "@/components/post/PostTypeBadge";
import { FindingPhotoState } from "@/components/productCard/CoverStatus";
import { Button } from "@/components/ui/button";
import { normalizeImageUrl } from "@/lib/image";
import { resolveRealisticCover } from "@/lib/realistic-covers";
import { cn } from "@/lib/utils";
import type { LocationType } from "@/types/product.types";
import { getProductDetailUrl } from "@/utils/categoryMapping";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

interface MapListingCardProps {
  item: LocationType;
  /** Category slug of the current map, used to resolve the detail route. */
  productType: string;
  selected?: boolean;
  highlighted?: boolean;
  onHover?: (id: number | null) => void;
}

function useCover(item: LocationType) {
  const [failed, setFailed] = useState(false);
  const image = item.images
    ?.map(normalizeImageUrl)
    .find((url): url is string => !!url);
  const fallback = resolveRealisticCover({
    title: item.post_name,
    postType: item.post_type,
    postId: item.id,
  });
  return {
    image: failed || !image ? fallback : image,
    onError: () => setFailed(true),
  };
}

function findingLabel(item: LocationType) {
  return item.post_type === "food" || item.post_type === "vegan"
    ? "Community Food"
    : "Community Listing";
}

/** Frameless list card for the map browse view: photo first, two lines. */
export function MapListingCard({
  item,
  productType,
  selected,
  highlighted,
  onHover,
}: MapListingCardProps) {
  const { image, onError } = useCover(item);
  return (
    <Link
      id={`map-card-${item.id}`}
      href={getProductDetailUrl(productType, item.id)}
      aria-current={selected ? "true" : undefined}
      onMouseEnter={() => onHover?.(item.id)}
      onMouseLeave={() => onHover?.(null)}
      onFocus={() => onHover?.(item.id)}
      onBlur={() => onHover?.(null)}
      className="group/card block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <div
        className={cn(
          "relative aspect-[20/19] w-full overflow-hidden rounded-2xl bg-muted transition-shadow duration-300 group-hover/card:shadow-md sm:aspect-[4/3]",
          (selected || highlighted) &&
            "ring-2 ring-foreground ring-offset-2 ring-offset-background",
        )}
      >
        {image ? (
          <Image
            src={image}
            alt={item.post_name}
            fill
            sizes="(max-width: 1024px) 50vw, 25vw"
            className="object-cover"
            loading="lazy"
            onError={onError}
          />
        ) : (
          <FindingPhotoState
            label={findingLabel(item)}
            postName={item.post_name}
            postType={item.post_type}
          />
        )}
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <p className="truncate text-[15px] font-semibold leading-snug text-foreground">
          {item.post_name}
        </p>
        {item.post_type && (
          <PostTypeBadge postType={item.post_type} variant="subtle" size="sm" />
        )}
      </div>
    </Link>
  );
}

/** Selected-marker preview shown over the map on small screens. */
export function MapPreviewCard({
  item,
  productType,
  onClose,
}: {
  item: LocationType;
  productType: string;
  onClose: () => void;
}) {
  const t = useTranslations();
  const { image, onError } = useCover(item);
  return (
    <div
      role="dialog"
      aria-label={item.post_name}
      className="relative flex items-center gap-3 rounded-xl border border-border bg-background p-3 shadow-lg"
    >
      <Link
        href={getProductDetailUrl(productType, item.id)}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="relative size-20 shrink-0 overflow-hidden rounded-lg bg-muted">
          {image ? (
            <Image
              src={image}
              alt=""
              fill
              sizes="80px"
              className="object-cover"
              onError={onError}
            />
          ) : (
            <FindingPhotoState
              label={findingLabel(item)}
              postName={item.post_name}
              postType={item.post_type}
              className="p-1 [&>div]:p-1 [&_span]:hidden"
            />
          )}
        </div>
        <div className="min-w-0 space-y-1 pe-8">
          <p className="truncate text-[15px] font-semibold text-foreground">
            {item.post_name}
          </p>
          {item.post_type && (
            <PostTypeBadge
              postType={item.post_type}
              variant="subtle"
              size="sm"
            />
          )}
        </div>
      </Link>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={onClose}
        aria-label={t("close")}
        className="absolute end-2 top-2 rounded-full"
      >
        <X />
      </Button>
    </div>
  );
}
