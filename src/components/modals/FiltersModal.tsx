"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/zustand/useUIStore";
import { MapPin, SlidersHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

const DISTANCE_PRESETS = [
  { label: "5 km", value: 5 },
  { label: "10 km", value: 10 },
  { label: "25 km", value: 25 },
  { label: "50 km", value: 50 },
  { label: "Any distance", value: 0 },
] as const;

/**
 * FiltersModal Component
 *
 * Airbnb-styled filter pill trigger and modal dialog for adjusting
 * geographic discovery radius and search boundaries.
 */
export default function FiltersModal() {
  const t = useTranslations();
  const { geoDistance, setGeoDistance } = useUIStore();
  const [isOpen, setIsOpen] = useState(false);
  const [sliderValue, setSliderValue] = useState(geoDistance || 0);

  const onOpen = () => setIsOpen(true);
  const onClose = () => setIsOpen(false);

  // Sync slider value with store state when geoDistance changes externally
  useEffect(() => {
    setSliderValue(geoDistance || 0);
  }, [geoDistance]);

  const applyFilterMode = () => {
    setGeoDistance(sliderValue > 0 ? sliderValue : null);
    onClose();
  };

  const clearFilters = () => {
    setSliderValue(0);
    setGeoDistance(null);
  };

  const hasActiveFilters = geoDistance !== null && geoDistance > 0;

  return (
    <>
      <Button
        variant="outline"
        onClick={onOpen}
        aria-label={t("distance_filter")}
        className={cn(
          "h-10 px-3.5 sm:px-4 rounded-xl border border-border/80 bg-background/80",
          "hover:border-foreground/30 hover:bg-muted/40 shadow-2xs hover:shadow-xs",
          "flex items-center gap-2 text-xs font-semibold text-foreground/80 hover:text-foreground",
          "transition-all shrink-0 active:scale-95",
          hasActiveFilters && "border-foreground/40 bg-muted/30 text-foreground",
        )}
      >
        <SlidersHorizontal className="size-3.5 text-foreground/70" />
        <span className="hidden sm:inline">{"Filters"}</span>
        {hasActiveFilters && (
          <span className="flex size-4 items-center justify-center rounded-full bg-foreground text-[10px] font-bold text-background">
            1
          </span>
        )}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent
          variant="glass"
          className="max-w-md p-0 overflow-hidden rounded-3xl border border-border/80 shadow-2xl"
        >
          <DialogHeader className="px-6 pt-5 pb-4 border-b border-border/60">
            <DialogTitle className="text-center text-base font-semibold text-foreground">
              {t("distance_filter")}
            </DialogTitle>
          </DialogHeader>

          <div className="px-6 py-5 space-y-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <MapPin className="size-4 text-primary" />
                <h3 className="text-base font-semibold text-foreground">{"Distance radius"}</h3>
              </div>
              <p className="text-xs text-muted-foreground">
                {"How far from you to show available food and community items"}
              </p>
            </div>

            <div className="rounded-2xl border border-border/60 bg-muted/20 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{"Range"}</span>
                <span className="text-sm font-bold text-foreground">
                  {sliderValue === 0 ? "Any distance" : `Within ${sliderValue} km`}
                </span>
              </div>

              <Slider
                value={[sliderValue]}
                onValueChange={(val) => setSliderValue(val[0])}
                max={100}
                step={5}
                className="w-full"
                aria-label={t("distance_filter")}
              />

              <div className="flex flex-wrap gap-2 pt-2">
                {DISTANCE_PRESETS.map((preset) => {
                  const isSelected = sliderValue === preset.value;
                  return (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => setSliderValue(preset.value)}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border",
                        isSelected
                          ? "bg-foreground text-background border-foreground font-semibold shadow-xs"
                          : "bg-background/80 text-muted-foreground border-border/80 hover:border-foreground/30 hover:text-foreground",
                      )}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t border-border/60 bg-muted/10 flex items-center justify-between sm:justify-between gap-3">
            <Button
              variant="ghost"
              onClick={clearFilters}
              disabled={sliderValue === 0 && !hasActiveFilters}
              className="text-xs font-semibold text-muted-foreground hover:text-foreground underline-offset-4 hover:underline px-2 h-9"
            >
              {t("clear_all")}
            </Button>
            <Button
              onClick={applyFilterMode}
              className="h-10 px-5 rounded-xl font-semibold text-xs bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 hover:opacity-90 shadow-xs active:scale-95 transition-all"
            >
              {"Show listings"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
