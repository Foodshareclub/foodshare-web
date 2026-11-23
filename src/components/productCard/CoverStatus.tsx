"use client";
import { type CoverCredit } from "@/lib/cover-provenance";
import { resolveRealisticCover } from "@/lib/realistic-covers";
import { cn } from "@/lib/utils";
import Image from "next/image";

/**
 * Photorealistic cover renderer for listings whose photos are missing,
 * dead, or awaiting enrichment. Eliminates artificial placeholder aesthetics.
 */
export function FindingPhotoState({
  label,
  postName,
  postType,
  className,
}: {
  label: string;
  postName?: string;
  postType?: string;
  className?: string;
}) {
  const message = `Finding a photo for this ${label} listing…`;
  const realisticCover = resolveRealisticCover({
    title: postName || label,
    postType,
  });

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={message}
      data-testid="finding-photo"
      className={cn(
        "absolute inset-0 select-none overflow-hidden bg-muted",
        className,
      )}
    >
      <Image
        className="object-cover transition-transform duration-500 ease-out motion-safe:group-hover/card:scale-[1.03] motion-reduce:transition-none"
        src={realisticCover}
        alt={postName || label}
        fill
        sizes="(min-width: 1880px) 290px, (min-width: 1640px) 330px, (min-width: 1200px) 25vw, (min-width: 950px) 33vw, (min-width: 550px) 50vw, 100vw"
      />
    </div>
  );
}

/** Reference disclosure overlay omitted to keep listing covers clean and authentic. */
export function CoverCreditLine(_props: {
  credit?: CoverCredit;
  className?: string;
}) {
  return null;
}
