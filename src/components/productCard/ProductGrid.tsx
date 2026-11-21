"use client";

import { cn } from "@/lib/utils";
import type { InitialProductStateType } from "@/types/product.types";
import { Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { ProductCard } from "./ProductCard";
import SkeletonCard from "./SkeletonCard";
import { LISTING_CONTAINER, LISTING_GRID } from "./listing-layout";

interface ProductGridProps {
  products: InitialProductStateType[];
  isLoading?: boolean;
  /** Callback to load more items (for infinite scroll) */
  onLoadMore?: () => void;
  /** Whether more items are being fetched */
  isFetchingMore?: boolean;
  /** Whether there are more items to load */
  hasMore?: boolean;
}

// Pre-computed skeleton array (module-level constant)
const SKELETON_ITEMS = Array.from({ length: 10 }, (_, i) => i);
const LOADING_MORE_SKELETONS = Array.from({ length: 4 }, (_, i) => i);

const EXPLORE_CATEGORIES = [
  { href: "/food", key: "food" },
  { href: "/zerowaste", key: "zerowaste" },
  { href: "/thing", key: "things" },
  { href: "/borrow", key: "borrow" },
  { href: "/wanted", key: "wanted" },
  { href: "/fridge", key: "fridges" },
  { href: "/foodbank", key: "foodbanks" },
  { href: "/volunteer", key: "volunteers" },
] as const;

/**
 * ProductGrid - Displays products in a responsive grid with infinite scroll
 * Keeps readable card widths, from one column on phones to four on desktop.
 */
export function ProductGrid({
  products,
  isLoading = false,
  onLoadMore,
  isFetchingMore = false,
  hasMore = false,
}: ProductGridProps) {
  const t = useTranslations();
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    if (!onLoadMore || !hasMore || isFetchingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onLoadMore();
        }
      },
      { rootMargin: "200px" }, // Trigger 200px before reaching the end
    );

    const currentRef = loadMoreRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [onLoadMore, hasMore, isFetchingMore]);

  return (
    <div aria-busy={isLoading || isFetchingMore}>
      <h2 className="sr-only">{t("active_listings")}</h2>
      <p className="sr-only" role="status" aria-live="polite">
        {isLoading || isFetchingMore ? t("loading") : ""}
      </p>
      <div className={cn(LISTING_CONTAINER, "py-6 pb-28 sm:py-8 sm:pb-32")}>
        <div className={LISTING_GRID}>
          {isLoading
            ? SKELETON_ITEMS.map((i) => <SkeletonCard key={i} isLoaded={false} />)
            : products.map((product) => <ProductCard product={product} key={product.id} />)}

          {/* Loading more skeletons */}
          {isFetchingMore &&
            LOADING_MORE_SKELETONS.map((i) => <SkeletonCard key={`loading-more-${i}`} isLoaded={false} />)}
        </div>

        {/* End-of-Feed Continue Exploring Section */}
        {!hasMore && !isLoading && products.length > 0 && (
          <div className="mt-14 pt-12 border-t border-border/60 text-center">
            <div className="inline-flex items-center justify-center size-10 rounded-full bg-muted/60 mb-3 text-muted-foreground">
              <Sparkles className="size-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            </div>
            <h3 className="text-lg font-semibold tracking-tight text-foreground mb-1">{t("Home.categories_title")}</h3>
            <p className="text-xs text-muted-foreground mb-6 max-w-sm mx-auto">{t("Home.categories_subtitle")}</p>
            <div className="flex flex-wrap items-center justify-center gap-2 max-w-xl mx-auto">
              {EXPLORE_CATEGORIES.map((cat) => (
                <Link
                  key={cat.key}
                  href={cat.href}
                  className="text-xs font-semibold px-4 py-2 rounded-full border border-border/80 bg-background/80 hover:bg-muted/60 hover:border-foreground/30 shadow-2xs transition-shadow hover:shadow-xs motion-reduce:transition-none text-foreground"
                >
                  {t(`categories.${cat.key}`)}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Infinite scroll trigger */}
      {hasMore && !isLoading && <div ref={loadMoreRef} className="h-10" aria-hidden="true" />}
    </div>
  );
}

export default ProductGrid;
