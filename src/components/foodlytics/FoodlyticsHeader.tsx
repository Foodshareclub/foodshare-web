"use client";

import { FOODLYTICS_COPY } from "@/lib/foodlytics/constants";
import { Leaf } from "lucide-react";

/**
 * In-flow header banner for Foodlytics (avoids stacking sticky bars below the site navbar).
 */
export function FoodlyticsHeader() {
  return (
    <div id="foodlytics-header" className="bg-black/30 border-b border-white/5 px-6 py-4">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-emerald-600/20 border border-emerald-500/30 rounded-xl flex items-center justify-center text-emerald-400 shadow-inner shrink-0">
            <Leaf className="h-5 w-5 fill-emerald-400/20" aria-hidden="true" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-black text-white tracking-tight flex items-center gap-2">
              {FOODLYTICS_COPY.brandTitle}
            </h1>
            <p className="text-[11px] text-stone-400 uppercase tracking-widest font-extrabold">
              {FOODLYTICS_COPY.brandSubtitle}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
