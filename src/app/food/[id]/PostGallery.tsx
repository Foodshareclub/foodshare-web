"use client";

import { FindingPhotoState } from "@/components/productCard/CoverStatus";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { CoverCredit } from "@/lib/cover-provenance";
import { cn } from "@/lib/utils";
import { Grid2x2 } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import type { ReactNode } from "react";
import { useState } from "react";

interface PostGalleryProps {
  postId: number;
  title: string;
  /** Normalised, de-duplicated image URLs (first is the cover). */
  images: string[];
  coverCredit: CoverCredit | null;
  /** Label used by the finding-a-photo state, e.g. "Community Food". */
  emptyLabel: string;
  /** Status badge rendered top-end over the photos (e.g. inactive). */
  badge?: ReactNode;
  className?: string;
}

/** Layout of the right-hand tiles in the desktop mosaic, by tile count. */
const SIDE_GRID: Record<number, string> = {
  1: "grid-cols-1 grid-rows-1",
  2: "grid-cols-1 grid-rows-2",
  3: "grid-cols-2 grid-rows-2 [&>*:first-child]:col-span-2",
  4: "grid-cols-2 grid-rows-2",
};

/**
 * Photo mosaic (md+) and swipe carousel with counter pill (mobile).
 * The cover credit and the finding-a-photo state stay on the first tile or slide.
 */
export function PostGallery({ postId, title, images, coverCredit, emptyLabel, badge, className }: PostGalleryProps) {
  const t = useTranslations();
  const [failed, setFailed] = useState<Record<string, boolean>>({});
  const [current, setCurrent] = useState(0);
  const [showAll, setShowAll] = useState(false);

  const shown = images.filter((url) => !failed[url]);
  const cover = shown[0];
  const sideCount = Math.min(Math.max(shown.length - 1, 0), 4);
  const onError = (url: string) => setFailed((previous) => ({ ...previous, [url]: true }));

  const overlays = badge ? (
    <div className="pointer-events-none absolute inset-0 z-10">
      <div className="absolute end-3 top-3">{badge}</div>
    </div>
  ) : null;

  if (!cover) {
    return (
      <div className={cn("relative aspect-[4/3] overflow-hidden rounded-2xl bg-muted sm:aspect-[16/9]", className)}>
        <FindingPhotoState label={emptyLabel} postName={title} />
        {overlays}
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      {overlays}
      {/* Mobile: swipe carousel */}
      <section
        aria-label={t("photos")}
        className="relative overflow-hidden rounded-2xl bg-muted md:hidden"
        style={{ viewTransitionName: `product-hero-${postId}` }}
      >
        <ul
          className="flex aspect-[4/3] snap-x snap-mandatory overflow-x-auto scrollbar-hide"
          onScroll={(event) => {
            const el = event.currentTarget;
            setCurrent(Math.round(el.scrollLeft / Math.max(el.clientWidth, 1)));
          }}
        >
          {shown.map((url, index) => (
            <li key={url} className="relative h-full w-full shrink-0 snap-center">
              <Image
                src={url}
                alt={`${title} (${index + 1}/${shown.length})`}
                fill
                sizes="100vw"
                className="object-cover"
                priority={index === 0}
                onError={() => onError(url)}
              />
            </li>
          ))}
        </ul>
        {shown.length > 1 && (
          <output className="absolute end-3 bottom-3 rounded-full bg-foreground/75 px-2.5 py-1 text-xs font-medium text-background">
            {current + 1} / {shown.length}
          </output>
        )}
      </section>

      {/* Desktop: mosaic */}
      <section
        aria-label={t("photos")}
        className={cn(
          "relative hidden aspect-[2/1] gap-2 overflow-hidden rounded-2xl md:grid",
          sideCount > 0 ? "grid-cols-2" : "grid-cols-1 aspect-[16/9]",
        )}
        style={{ viewTransitionName: `product-hero-${postId}-wide` }}
      >
        <button
          type="button"
          onClick={() => setShowAll(true)}
          aria-label={`${t("photos")}: ${title}`}
          className="relative h-full w-full overflow-hidden bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
        >
          <Image
            src={cover}
            alt={title}
            fill
            sizes="(max-width: 1440px) 50vw, 720px"
            className="object-cover transition-opacity duration-200 hover:opacity-90"
            priority
            onError={() => onError(cover)}
          />
        </button>
        {sideCount > 0 && (
          <div className={cn("grid gap-2", SIDE_GRID[sideCount])}>
            {shown.slice(1, 1 + sideCount).map((url, index) => (
              <button
                key={url}
                type="button"
                onClick={() => setShowAll(true)}
                aria-label={`${t("photos")} ${index + 2}`}
                className="relative h-full w-full overflow-hidden bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
              >
                <Image
                  src={url}
                  alt={`${title} (${index + 2}/${shown.length})`}
                  fill
                  sizes="(max-width: 1440px) 25vw, 360px"
                  className="object-cover transition-opacity duration-200 hover:opacity-90"
                  onError={() => onError(url)}
                />
              </button>
            ))}
          </div>
        )}
        {shown.length > 1 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowAll(true)}
            className="absolute end-4 bottom-4 rounded-lg bg-background shadow-sm"
          >
            <Grid2x2 aria-hidden="true" />
            {`${t("photos")} (${shown.length})`}
          </Button>
        )}
      </section>

      <Dialog open={showAll} onOpenChange={setShowAll}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("photos")}</DialogTitle>
            <DialogDescription className="sr-only">{title}</DialogDescription>
          </DialogHeader>
          <ul className="space-y-3">
            {shown.map((url, index) => (
              <li key={url} className="relative aspect-[4/3] overflow-hidden rounded-xl bg-muted">
                <Image
                  src={url}
                  alt={`${title} (${index + 1}/${shown.length})`}
                  fill
                  sizes="(max-width: 768px) 100vw, 768px"
                  className="object-cover"
                  loading="lazy"
                />
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </div>
  );
}
