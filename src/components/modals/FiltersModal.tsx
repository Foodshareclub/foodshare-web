'use client';

import { useState, useEffect } from "react";
import { useUIStore } from "@/store/zustand/useUIStore";
import { GlassDialogContent } from "@/components/Glass";
import { Button } from "@/components/ui/button";
import { Dialog, DialogHeader, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

/**
 * FiltersModal Component
 * Modal for filtering products by geographic distance
 * Uses Zustand instead of Redux for geo distance state
 */
export default function FiltersModal() {
  // Zustand store (replaces Redux)
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
    setGeoDistance(sliderValue);
    onClose();
  };

  const cancel = () => {
    setGeoDistance(null);
    onClose();
  };

  const onSliderChange = (value: number[]) => {
    setSliderValue(value[0]);
  };

  return (
    <>
      <Button
        className={cn("hidden md:block absolute right-7 xl:right-20 self-center")}
        variant="outline"
        onClick={onOpen}
      >
        Filter
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <GlassDialogContent>
          <DialogHeader>
            <DialogTitle className="text-center">Filter</DialogTitle>
          </DialogHeader>

          <div className="mx-5 space-y-12">
            <p className="text-center font-bold">How far from you to show the products?</p>

            <div className="relative mb-12">
              <div className="absolute -top-10 left-0 right-0 text-center text-xs text-gray-800">
                {sliderValue}km
              </div>
              <Slider
                value={[sliderValue]}
                onValueChange={onSliderChange}
                max={10000}
                step={200}
                className="w-full"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="default" className="mr-3" onClick={cancel}>
              Cancel
            </Button>
            <Button onClick={applyFilterMode} variant="ghost">
              Apply
            </Button>
          </DialogFooter>
        </GlassDialogContent>
      </Dialog>
    </>
  );
}
