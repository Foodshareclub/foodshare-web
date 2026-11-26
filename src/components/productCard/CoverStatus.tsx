"use client";
import { isGeneratedImageUrl } from "@/lib/image";
import { useTranslations } from "next-intl";
import { type CoverCredit } from "@/lib/cover-provenance";
import { resolveRealisticCover } from "@/lib/realistic-covers";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import Image from "next/image";

/**
 * Transient "finding a photo" state for listings with NO usable stored image
 * (empty, or every URL known dead). Shows a generated cover with a spinner so it
 * is never mistaken for a working stored cover. A stored image replaces it on
 * the next fetch.
 */
export function FindingPhotoState({
  label,
  postName,
  postType,
  postId,
  className,
  resolvedCoverUrl,
}: {
  label: string;
  postName?: string;
  postType?: string;
  postId?: number;
  className?: string;
  resolvedCoverUrl?: string;
}) {
  const message = `Finding a photo for this ${label} listing…`;
  const realisticCover =
    resolvedCoverUrl ||
    resolveRealisticCover({
      title: postName || label,
      postType,
      postId,
    });

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={message}
      data-testid="finding-photo"
      className={cn("absolute inset-0 select-none overflow-hidden bg-muted", className)}
    >
      <Image
        className="object-cover transition-transform duration-500 ease-out motion-safe:group-hover/card:scale-[1.03] motion-reduce:transition-none"
        src={realisticCover}
        alt={postName || label}
        fill
        sizes="(min-width: 1880px) 290px, (min-width: 1640px) 330px, (min-width: 1200px) 25vw, (min-width: 950px) 33vw, (min-width: 550px) 50vw, 100vw"
      />
      {/* Transient marker: visually distinct from a finished stored cover. */}
      <span
        aria-hidden="true"
        data-testid="finding-photo-indicator"
        className="pointer-events-none absolute start-2.5 top-2.5 flex size-7 items-center justify-center rounded-full bg-background/90 text-foreground shadow-md backdrop-blur-xs"
      >
        <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
      </span>
    </div>
  );
}

/** A generated illustration must not be mistaken for a photograph of the item. */
export function CoverCreditLine({
  imageUrl,
  className,
}: {
  credit?: CoverCredit | null;
  imageUrl?: string;
  className?: string;
}) {
  const t = useTranslations();
  if (!isGeneratedImageUrl(imageUrl)) return null;
  return (
    <span
      data-testid="generated-cover-disclosure"
      className={cn(
        "pointer-events-none absolute start-2.5 top-2.5 rounded-lg bg-background/95 px-2 py-1 text-xs text-foreground",
        className,
      )}
    >
      {t("generated_cover_disclaimer")}
    </span>
  );
}
