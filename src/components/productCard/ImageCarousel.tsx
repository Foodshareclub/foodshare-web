"use client";

import { type CoverCredit } from "@/lib/cover-provenance";
import { isReferenceImageUrl, isValidImageUrl, normalizeImageUrl } from "@/lib/image";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import { CoverCreditLine, FindingPhotoState } from "./CoverStatus";

type ImageCarouselProps = {
  images: string[];
  productUrl: string;
  productId: number;
  postName: string;
  postType: string;
  /** Provenance of a stored reference cover (`posts.metadata.cover`). */
  cover?: CoverCredit | null;
};

export function ImageCarousel({ images, productUrl, productId, postName, postType, cover }: ImageCarouselProps) {
  const t = useTranslations();
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const validImages = [...new Set(images.filter(isValidImageUrl).map((url) => normalizeImageUrl(url) as string))];
  const placeholderLabel =
    postType === "food" || postType === "vegan"
      ? "Community Food"
      : postType === "fridge"
        ? "Community Fridge"
        : postType === "foodbank"
          ? "Food Bank"
          : "Community Item";
  const placeholder = (
    <FindingPhotoState
      label={placeholderLabel}
      postName={postName}
      postType={postType}
    />
  );
  const allDead = validImages.length > 0 && validImages.every((image) => imageErrors[image]);
  const showCredit = !!cover && !allDead && activeIndex === 0 && isReferenceImageUrl(validImages[0]);
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
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
    });
    setActiveIndex(index);
  };

  if (validImages.length === 0 || allDead) {
    return (
      <Link
        href={productUrl}
        aria-label={postName}
        className="relative block size-full focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-ring"
      >
        {placeholder}
      </Link>
    );
  }

  return (
    <div className="group/carousel relative size-full overflow-hidden">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex size-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain scrollbar-none"
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
                className="object-cover transition-transform duration-500 ease-out motion-safe:group-hover/card:scale-[1.03] motion-reduce:transition-none"
                style={index === 0 ? { viewTransitionName: `product-hero-${productId}` } : undefined}
                src={image}
                alt={postName}
                fill
                onError={() => setImageErrors((previous) => ({ ...previous, [image]: true }))}
                sizes="(min-width: 1880px) 290px, (min-width: 1640px) 330px, (min-width: 1200px) 25vw, (min-width: 950px) 33vw, (min-width: 550px) 50vw, 100vw"
              />
            )}
          </Link>
        ))}
      </div>

      {showCredit && cover && <CoverCreditLine credit={cover} className="absolute inset-x-2 bottom-2 z-10" />}
      {validImages.length > 1 && (
        <>
          {/* Airbnb-style Navigation Arrows: centered vertically, circular, revealed on hover */}
          <div className="pointer-events-none absolute inset-x-2.5 top-1/2 z-10 flex -translate-y-1/2 justify-between">
            <button
              type="button"
              className={cn(
                "pointer-events-auto flex size-8 items-center justify-center rounded-full bg-background/90 text-foreground shadow-md backdrop-blur-xs transition-all duration-200 hover:scale-105 hover:bg-background active:scale-95 motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-ring",
                activeIndex === 0
                  ? "pointer-events-none opacity-0"
                  : "opacity-0 group-focus-within/carousel:opacity-100 group-hover/carousel:opacity-100 focus-visible:opacity-100",
              )}
              onClick={(event) => scrollToIndex(activeIndex - 1, event)}
              disabled={activeIndex === 0}
              aria-label={`${t("previous")} — ${postName}`}
            >
              <ChevronLeft className="size-4 rtl:rotate-180" />
            </button>
            <button
              type="button"
              className={cn(
                "pointer-events-auto flex size-8 items-center justify-center rounded-full bg-background/90 text-foreground shadow-md backdrop-blur-xs transition-all duration-200 hover:scale-105 hover:bg-background active:scale-95 motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-ring",
                activeIndex === validImages.length - 1
                  ? "pointer-events-none opacity-0"
                  : "opacity-0 group-focus-within/carousel:opacity-100 group-hover/carousel:opacity-100 focus-visible:opacity-100",
              )}
              onClick={(event) => scrollToIndex(activeIndex + 1, event)}
              disabled={activeIndex === validImages.length - 1}
              aria-label={`${t("next")} — ${postName}`}
            >
              <ChevronRight className="size-4 rtl:rotate-180" />
            </button>
          </div>

          {/* Airbnb-style Pagination Dots: centered at bottom with accessible touch targets */}
          <div
            className={cn(
              "pointer-events-none absolute inset-x-0 z-10 flex items-center justify-center gap-1.5",
              showCredit ? "bottom-14" : "bottom-2.5",
            )}
          >
            <div className="pointer-events-auto flex items-center gap-1 rounded-full px-2 py-0.5">
              {validImages.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={(event) => scrollToIndex(i, event)}
                  aria-label={`${t("go_to_slide", { defaultMessage: "Slide" })} ${i + 1}`}
                  aria-current={i === activeIndex ? "true" : undefined}
                  className="flex size-6 items-center justify-center rounded-full p-0 focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <span
                    className={cn(
                      "block rounded-full transition-all duration-200 motion-reduce:transition-none",
                      i === activeIndex
                        ? "size-2 bg-white shadow-xs"
                        : "size-1.5 bg-white/60 shadow-2xs hover:bg-white/90",
                    )}
                  />
                </button>
              ))}
            </div>
            <span className="sr-only" role="status" aria-live="polite">
              {activeIndex + 1} / {validImages.length}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
