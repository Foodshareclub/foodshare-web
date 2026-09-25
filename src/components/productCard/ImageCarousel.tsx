"use client";

import { Button } from "@/components/ui/button";
import { isValidImageUrl, normalizeImageUrl } from "@/lib/image";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Leaf, Package } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import { LISTING_PHOTO } from "./listing-layout";

type ImageCarouselProps = {
  images: string[];
  productUrl: string;
  productId: number;
  postName: string;
  postType: string;
};

export function ImageCarousel({
  images,
  productUrl,
  productId,
  postName,
  postType,
}: ImageCarouselProps) {
  const t = useTranslations();
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const validImages = [
    ...new Set(images.filter(isValidImageUrl).map((url) => normalizeImageUrl(url) as string)),
  ];
  const PlaceholderIcon = postType === "food" || postType === "vegan" ? Leaf : Package;
  const placeholder = (
    <div className="absolute inset-0 flex items-center justify-center bg-linear-to-br from-muted via-muted to-primary/5 text-muted-foreground">
      <span className="flex size-20 items-center justify-center rounded-full border border-border/60 bg-background/60">
        <PlaceholderIcon className="size-8" strokeWidth={1.25} aria-hidden="true" />
      </span>
    </div>
  );

  const handleScroll = () => {
    const element = scrollRef.current;
    if (!element || !element.clientWidth) return;
    // RTL scrollLeft is negative. Keep the logical image index positive.
    const index = Math.round(Math.abs(element.scrollLeft) / element.clientWidth);
    setActiveIndex(Math.min(validImages.length - 1, Math.max(0, index)));
  };

  const scrollToIndex = (index: number, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const element = scrollRef.current;
    if (!element) return;
    const direction = getComputedStyle(element).direction === "rtl" ? -1 : 1;
    element.scrollTo({
      left: direction * index * element.clientWidth,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
    setActiveIndex(index);
  };

  if (validImages.length === 0) {
    return (
      <Link
        href={productUrl}
        aria-label={postName}
        className={cn(
          LISTING_PHOTO,
          "relative block focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-ring"
        )}
      >
        {placeholder}
      </Link>
    );
  }

  return (
    <div className={cn(LISTING_PHOTO, "relative overflow-hidden")}>
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex size-full snap-x snap-mandatory overflow-x-auto scrollbar-none"
      >
        {validImages.map((image, index) => (
          <Link
            key={image}
            href={productUrl}
            aria-label={postName}
            tabIndex={index === activeIndex ? 0 : -1}
            className="relative block size-full shrink-0 snap-center bg-muted focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-ring"
            onDragStart={(event) => event.preventDefault()}
          >
            {imageErrors[image] ? (
              placeholder
            ) : (
              <Image
                className="object-cover"
                style={
                  index === 0 ? { viewTransitionName: `product-hero-${productId}` } : undefined
                }
                src={image}
                alt={postName}
                fill
                onError={() => setImageErrors((previous) => ({ ...previous, [image]: true }))}
                sizes="(min-width: 1440px) 316px, (min-width: 1280px) 25vw, (min-width: 960px) 33vw, (min-width: 600px) 50vw, 100vw"
              />
            )}
          </Link>
        ))}
      </div>

      {validImages.length > 1 && (
        <div className="pointer-events-none absolute inset-x-3 bottom-3 flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="secondary"
            size="icon-lg"
            className="pointer-events-auto rounded-full"
            onClick={(event) => scrollToIndex(activeIndex - 1, event)}
            disabled={activeIndex === 0}
            aria-label={`${t("previous")} — ${postName}`}
          >
            <ChevronLeft className="rtl:rotate-180" />
          </Button>
          <span
            className="rounded-full bg-background/95 px-3 py-1 text-xs font-medium tabular-nums text-foreground"
            aria-hidden="true"
            dir="ltr"
          >
            {activeIndex + 1} / {validImages.length}
          </span>
          <Button
            type="button"
            variant="secondary"
            size="icon-lg"
            className="pointer-events-auto rounded-full"
            onClick={(event) => scrollToIndex(activeIndex + 1, event)}
            disabled={activeIndex === validImages.length - 1}
            aria-label={`${t("next")} — ${postName}`}
          >
            <ChevronRight className="rtl:rotate-180" />
          </Button>
        </div>
      )}
    </div>
  );
}
