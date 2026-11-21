"use client";
import { type CoverCredit } from "@/lib/cover-provenance";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";

/** Transient state for listings whose photo is still being found. */
export function FindingPhotoState({ label, className }: { label: string; className?: string }) {
  const message = `Finding a photo for this ${label} listing…`;
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={message}
      data-testid="finding-photo"
      className={cn(
        "absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-amber-500/10 via-emerald-500/5 to-teal-500/10 p-4 text-muted-foreground dark:from-amber-950/25 dark:via-neutral-900 dark:to-emerald-950/20",
        className,
      )}
    >
      <div className="relative flex flex-col items-center gap-2 rounded-2xl border border-white/60 bg-white/70 px-5 py-4 text-center shadow-xs backdrop-blur-md dark:border-white/10 dark:bg-neutral-900/70">
        <Loader2 className="size-6 animate-spin motion-reduce:animate-none text-primary" aria-hidden="true" />
        <span className="text-[11px] font-semibold text-foreground/80">{message}</span>
      </div>
    </div>
  );
}

/** Disclosure plus source/license credit for a stored reference cover. */
export function CoverCreditLine({ credit, className }: { credit: CoverCredit; className?: string }) {
  const t = useTranslations();
  const link = "underline underline-offset-2 hover:text-white focus-visible:outline-2 focus-visible:outline-ring";
  return (
    <div
      data-testid="cover-credit"
      className={cn(
        "rounded-lg bg-black/65 px-2 py-1 text-[10px] leading-tight text-white/90 backdrop-blur-sm",
        className,
      )}
    >
      <p>{credit.disclosure}</p>
      <p>
        <a href={credit.sourcePageUrl} target="_blank" rel="noopener noreferrer" className={link}>
          {t("cover_source_wikimedia")}
          {credit.artist ? ` · ${credit.artist}` : ""}
        </a>
        {" · "}
        {credit.licenseUrl ? (
          <a href={credit.licenseUrl} target="_blank" rel="noopener noreferrer" className={link}>
            {credit.license}
          </a>
        ) : (
          <span>{credit.license}</span>
        )}
      </p>
    </div>
  );
}
