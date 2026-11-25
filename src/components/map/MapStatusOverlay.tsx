"use client";

import { Button } from "@/components/ui/button";
import { Loader2, MapPin, Maximize2, RefreshCw, ZoomOut } from "lucide-react";
import { useTranslations } from "next-intl";

interface MapStatusOverlayProps {
  type: string;
  locationsCount: number;
  hasLocations: boolean;
  hasLoadedOnce: boolean;
  isFetchingLocations: boolean;
  loadError: boolean;
  canReturnToArea: boolean;
  onRetry: () => void;
  onFitMarkers: () => void;
  onZoomOutWider: () => void;
  onReturnToArea: () => void;
}

const HUD_TEXT = {
  loadError: "Couldn't load listings in this area",
  searchingArea: "Searching this area...",
  listingSingular: "listing",
  listingPlural: "listings",
  inThisArea: "in this area",
  fit: "Fit",
  fitAria: "Fit all visible listings in view",
  noItemsTitle: "No items found",
  zoomOutWider: "Zoom out to search wider",
  myArea: "My area",
  emptyDescription: (type: string) =>
    `There are currently no ${type === "all" ? "" : `${type} `}items with location data in this area`,
} as const;

export function MapStatusOverlay({
  type,
  locationsCount,
  hasLocations,
  hasLoadedOnce,
  isFetchingLocations,
  loadError,
  canReturnToArea,
  onRetry,
  onFitMarkers,
  onZoomOutWider,
  onReturnToArea,
}: MapStatusOverlayProps) {
  const t = useTranslations();

  return (
    <>
      {/* Top-center HUD: live area count, loading status, fit-to-markers, or retry */}
      {(isFetchingLocations || loadError || (hasLoadedOnce && hasLocations)) && (
        <div className="pointer-events-none absolute top-4 left-1/2 z-[1000] -translate-x-1/2">
          {loadError && !isFetchingLocations ? (
            <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-border bg-background/95 px-4 py-1.5 text-xs font-medium text-foreground shadow-md backdrop-blur-sm">
              <span>{HUD_TEXT.loadError}</span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={onRetry}
                className="h-6 rounded-full px-2.5 text-xs"
              >
                <RefreshCw className="size-3" aria-hidden="true" />
                {t("retry")}
              </Button>
            </div>
          ) : isFetchingLocations && !hasLocations ? (
            <div className="flex items-center gap-2 rounded-full border border-border bg-background/95 px-4 py-1.5 text-xs font-medium text-foreground shadow-md backdrop-blur-sm">
              <Loader2 className="size-3.5 animate-spin text-primary" aria-hidden="true" />
              <span>{HUD_TEXT.searchingArea}</span>
            </div>
          ) : hasLoadedOnce && hasLocations ? (
            <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-border bg-background/95 px-3.5 py-1.5 text-xs font-medium text-foreground shadow-md backdrop-blur-sm">
              {isFetchingLocations && (
                <Loader2 className="size-3 animate-spin text-primary shrink-0" aria-hidden="true" />
              )}
              <span>
                {`${locationsCount} ${locationsCount === 1 ? HUD_TEXT.listingSingular : HUD_TEXT.listingPlural} ${HUD_TEXT.inThisArea}`}
              </span>
              <button
                type="button"
                onClick={onFitMarkers}
                className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
                aria-label={HUD_TEXT.fitAria}
              >
                <Maximize2 className="size-3" aria-hidden="true" />
                {HUD_TEXT.fit}
              </button>
            </div>
          ) : null}
        </div>
      )}

      {/* Empty state overlay — shown ONLY after authoritative 200 response returned 0 items */}
      {hasLoadedOnce && !isFetchingLocations && !loadError && !hasLocations && (
        <div className="pointer-events-none absolute left-1/2 top-1/2 z-[1000] -translate-x-1/2 -translate-y-1/2">
          <div className="pointer-events-auto flex flex-col items-center gap-3 rounded-2xl border border-border bg-background/95 p-6 shadow-lg backdrop-blur-sm">
            <span className="text-center text-4xl" aria-hidden="true">
              {"🗺"}
            </span>
            <p className="text-lg font-semibold text-foreground">{HUD_TEXT.noItemsTitle}</p>
            <p className="max-w-[280px] text-center text-sm text-muted-foreground">{HUD_TEXT.emptyDescription(type)}</p>
            <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onZoomOutWider}
                className="rounded-full gap-1.5"
              >
                <ZoomOut className="size-3.5" aria-hidden="true" />
                {HUD_TEXT.zoomOutWider}
              </Button>
              {canReturnToArea && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={onReturnToArea}
                  className="rounded-full gap-1.5"
                >
                  <MapPin className="size-3.5" aria-hidden="true" />
                  {HUD_TEXT.myArea}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
