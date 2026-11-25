"use client";

import { BentoStats } from "@/components/foodlytics/bento-stats";
import { CategoryInsights } from "@/components/foodlytics/category-insights";
import { LogsTable } from "@/components/foodlytics/logs-table";
import { WasteForm } from "@/components/foodlytics/waste-form";
import { FOODLYTICS_COPY } from "@/lib/foodlytics/constants";
import type { UsCategoryRow } from "@/lib/foodlytics/queries";
import type { FoodCategory, WasteEntry, WasteReason } from "@/lib/foodlytics/types";
import {
  BarChart2,
  ChevronRight,
  CookingPot,
  DollarSign,
  Droplet,
  Flame,
  Globe,
  Info,
  Leaf,
  RotateCw,
  Scale,
  Sparkles,
} from "lucide-react";

interface ImpactDashboardTabProps {
  usCategories: UsCategoryRow[];
  isLoadingUsCategories: boolean;
  logs: WasteEntry[];
  totalCost: number;
  totalWeight: number;
  totalCO2: number;
  totalWater: number;
  weightByCategory: Record<FoodCategory, number>;
  costByCategory: Record<FoodCategory, number>;
  maxCategoryWeight: number;
  reasonCounts: Record<WasteReason, number>;
  totalReasons: number;
  onAddLog: (logData: {
    foodName: string;
    category: FoodCategory;
    weight: number;
    cost: number;
    reason: WasteReason;
    date: string;
  }) => Promise<void>;
  onDeleteLog: (id: string) => Promise<void>;
  onAskCategoryAdvisor: (cat: FoodCategory) => void;
  onOpenUsWaste: () => void;
  onOpenAdvisor: () => void;
}

function getCategoryBarGradient(categoryName: string): string {
  if (categoryName.includes("Produce")) return "from-emerald-600/60 to-emerald-400/90";
  if (categoryName.includes("Prepared")) return "from-purple-600/60 to-purple-400/90";
  if (categoryName.includes("Dairy")) return "from-amber-600/60 to-amber-400/90";
  if (categoryName.includes("Beverages")) return "from-sky-600/60 to-sky-400/90";
  return "from-stone-600/60 to-stone-400/90";
}

/**
 * Primary Foodlytics impact dashboard view combining macro benchmarks and household logging.
 */
export function ImpactDashboardTab({
  usCategories,
  isLoadingUsCategories,
  logs,
  totalCost,
  totalWeight,
  totalCO2,
  totalWater,
  weightByCategory,
  costByCategory,
  maxCategoryWeight,
  reasonCounts,
  totalReasons,
  onAddLog,
  onDeleteLog,
  onAskCategoryAdvisor,
  onOpenUsWaste,
  onOpenAdvisor,
}: ImpactDashboardTabProps) {
  const { hero } = FOODLYTICS_COPY;

  return (
    <div className="space-y-10">
      <div className="space-y-6">
        <div className="space-y-1">
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <Globe className="h-5 w-5 text-emerald-400" aria-hidden="true" />
            {hero.heading}
          </h2>
          <p className="text-xs text-stone-400">{hero.subheading}</p>
        </div>

        {/* Hero Macro Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass-panel hover:glass-panel-glow-rose hover:-translate-y-1 transition-all duration-300 rounded-3xl p-7 sm:p-8 bg-gradient-to-br from-rose-500/10 via-stone-900/40 to-stone-900/10 border border-rose-500/20 flex flex-col justify-between relative overflow-hidden min-h-[210px]">
            <div className="flex items-center gap-3.5">
              <div className="p-3 bg-rose-500/20 text-rose-400 rounded-2xl border border-rose-500/30 shrink-0 h-13 w-13 flex items-center justify-center">
                <DollarSign className="h-6 w-6" aria-hidden="true" />
              </div>
              <div>
                <span className="text-xs font-black uppercase tracking-widest text-rose-300 block leading-tight">
                  {hero.economicTitle}
                </span>
                <span className="text-[11px] text-stone-400 font-bold uppercase tracking-wider block">
                  {hero.economicSubtitle}
                </span>
              </div>
            </div>

            <div className="mt-6 mb-4">
              <h3 className="text-4xl sm:text-5xl xl:text-6xl font-black text-rose-400 tracking-tight leading-none flex flex-wrap items-baseline gap-x-2.5 gap-y-1 tabular-nums">
                <span className="bg-gradient-to-r from-rose-400 via-pink-400 to-rose-300 bg-clip-text text-transparent">
                  {hero.economicValue}
                </span>
                <span className="text-sm sm:text-base font-black text-stone-400 uppercase tracking-widest whitespace-nowrap">
                  {hero.economicUnit}
                </span>
              </h3>
            </div>

            <div className="text-[11px] text-stone-400 font-semibold flex items-center gap-1.5 mt-1">
              <Info className="h-3.5 w-3.5 text-rose-400/80 shrink-0" aria-hidden="true" />
              <span>{hero.economicNote}</span>
            </div>
          </div>

          <div className="glass-panel hover:glass-panel-glow-amber hover:-translate-y-1 transition-all duration-300 rounded-3xl p-7 sm:p-8 bg-gradient-to-br from-amber-500/10 via-stone-900/40 to-stone-900/10 border border-amber-500/20 flex flex-col justify-between relative overflow-hidden min-h-[210px]">
            <div className="flex items-center gap-3.5">
              <div className="p-3 bg-amber-500/20 text-amber-400 rounded-2xl border border-amber-500/30 shrink-0 h-13 w-13 flex items-center justify-center">
                <Scale className="h-6 w-6" aria-hidden="true" />
              </div>
              <div>
                <span className="text-xs font-black uppercase tracking-widest text-amber-300 block leading-tight">
                  {hero.weightTitle}
                </span>
                <span className="text-[11px] text-stone-400 font-bold uppercase tracking-wider block">
                  {hero.weightSubtitle}
                </span>
              </div>
            </div>

            <div className="mt-6 mb-4">
              <h3 className="text-4xl sm:text-5xl xl:text-6xl font-black text-amber-400 tracking-tight leading-none flex flex-wrap items-baseline gap-x-2.5 gap-y-1 tabular-nums">
                <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-amber-300 bg-clip-text text-transparent">
                  {hero.weightValue}
                </span>
                <span className="text-sm sm:text-base font-black text-stone-400 uppercase tracking-widest whitespace-nowrap">
                  {hero.weightUnit}
                </span>
              </h3>
            </div>

            <div className="text-[11px] text-stone-400 font-semibold flex items-center gap-1.5 mt-1">
              <Info className="h-3.5 w-3.5 text-amber-400/80 shrink-0" aria-hidden="true" />
              <span>{hero.weightNote}</span>
            </div>
          </div>
        </div>

        {/* Secondary Global Metrics + US Market Segments */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="glass-panel hover:glass-panel-glow-emerald hover:-translate-y-1 transition-all duration-300 rounded-2xl p-6 bg-stone-900/25 border border-white/10 flex items-center gap-4">
              <div className="p-3.5 bg-emerald-500/15 text-emerald-400 rounded-2xl border border-emerald-500/25 shrink-0 h-13 w-13 flex items-center justify-center">
                <Flame className="h-6 w-6" aria-hidden="true" />
              </div>
              <div className="min-w-0 space-y-1.5">
                <span className="text-[11px] font-black uppercase tracking-wider text-emerald-300 block">
                  {hero.carbonTitle}
                </span>
                <h3 className="text-xl xl:text-2xl font-black text-emerald-400 tracking-tight leading-tight flex flex-wrap items-baseline gap-x-2 tabular-nums">
                  <span>{hero.carbonValue}</span>
                  <span className="text-xs font-bold text-stone-400 uppercase tracking-wider whitespace-nowrap">
                    {hero.carbonUnit}
                  </span>
                </h3>
                <p className="text-[11px] text-stone-400 font-semibold">{hero.carbonNote}</p>
              </div>
            </div>

            <div className="glass-panel hover:glass-panel-glow-sky hover:-translate-y-1 transition-all duration-300 rounded-2xl p-6 bg-stone-900/25 border border-white/10 flex items-center gap-4">
              <div className="p-3.5 bg-sky-500/15 text-sky-400 rounded-2xl border border-sky-500/25 shrink-0 h-13 w-13 flex items-center justify-center">
                <Droplet className="h-6 w-6" aria-hidden="true" />
              </div>
              <div className="min-w-0 space-y-1.5">
                <span className="text-[11px] font-black uppercase tracking-wider text-sky-300 block">
                  {hero.waterTitle}
                </span>
                <h3 className="text-xl xl:text-2xl font-black text-sky-400 tracking-tight leading-tight flex flex-wrap items-baseline gap-x-2 tabular-nums">
                  <span>{hero.waterValue}</span>
                  <span className="text-xs font-bold text-stone-400 uppercase tracking-wider whitespace-nowrap">
                    {hero.waterUnit}
                  </span>
                </h3>
                <p className="text-[11px] text-stone-400 font-semibold">{hero.waterNote}</p>
              </div>
            </div>
          </div>

          <div className="glass-panel rounded-2xl p-5 bg-stone-900/30 border border-white/10 flex flex-col justify-between space-y-4">
            <div className="space-y-3.5">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <h4 className="text-[11px] font-black text-white uppercase tracking-wider">
                  {hero.usSegmentationTitle}
                </h4>
                <span className="text-[10px] text-emerald-400 font-bold">{hero.usSegmentationBadge}</span>
              </div>

              <div className="space-y-2.5">
                {isLoadingUsCategories ? (
                  <div className="flex items-center justify-center py-6 gap-2 text-stone-400 text-xs font-semibold">
                    <RotateCw className="h-3.5 w-3.5 animate-spin text-emerald-400" aria-hidden="true" />
                    {hero.usLoadingText}
                  </div>
                ) : usCategories.length === 0 ? (
                  <p className="text-xs text-stone-400 py-4 text-center">{hero.usUnavailableText}</p>
                ) : (
                  usCategories.slice(0, 4).map((c) => (
                    <div key={c.id} className="space-y-1 text-[11px] font-bold">
                      <div className="flex justify-between gap-2 text-stone-300">
                        <span className="truncate">{c.category.split(" (")[0]}</span>
                        <span className="text-white font-mono whitespace-nowrap">
                          {`${(Number(c.waste_tonnes) / 1000000).toFixed(1)}${hero.millionTonsSuffix} (${c.waste_pct}%)`}
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${Math.min(100, c.waste_pct * 2.5)}%` }}
                          className={`h-full rounded-full bg-gradient-to-r ${getCategoryBarGradient(c.category)}`}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={onOpenUsWaste}
              className="w-full py-2.5 border border-white/10 hover:border-emerald-500/40 bg-white/[0.02] hover:bg-emerald-600/15 text-[11px] font-extrabold uppercase tracking-wider text-stone-200 hover:text-white rounded-xl transition duration-200 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <BarChart2 className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
              {hero.exploreSegmentsCta}
              <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="relative py-1 flex items-center">
        <div className="flex-grow border-t border-white/10" />
        <span className="flex-shrink mx-4 text-[11px] font-black uppercase tracking-widest text-emerald-400 flex items-center gap-1.5 bg-black/20 px-4 py-1.5 rounded-full border border-white/10">
          <Leaf className="h-3.5 w-3.5" aria-hidden="true" />
          {FOODLYTICS_COPY.dividerLabel}
        </span>
        <div className="flex-grow border-t border-white/10" />
      </div>

      <BentoStats totalCost={totalCost} totalWeight={totalWeight} totalCO2={totalCO2} totalWater={totalWater} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          <CategoryInsights
            logs={logs}
            weightByCategory={weightByCategory}
            costByCategory={costByCategory}
            maxCategoryWeight={maxCategoryWeight}
            reasonCounts={reasonCounts}
            totalReasons={totalReasons}
            onAskCategoryAdvisor={onAskCategoryAdvisor}
          />

          <div className="glass-panel rounded-2xl p-6 bg-gradient-to-br from-emerald-950/30 to-emerald-900/15 border border-emerald-500/15 flex flex-col md:flex-row items-start md:items-center gap-6 justify-between shadow-xl">
            <div className="space-y-2">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <CookingPot className="h-5 w-5 text-emerald-400" aria-hidden="true" />
                {FOODLYTICS_COPY.didYouKnowTitle}
              </h3>
              <p className="text-xs text-stone-300 leading-relaxed max-w-xl font-medium">
                {FOODLYTICS_COPY.didYouKnowLead}
                <strong>{FOODLYTICS_COPY.didYouKnowBold1}</strong>
                {FOODLYTICS_COPY.didYouKnowMid}
                <strong>{FOODLYTICS_COPY.didYouKnowBold2}</strong>
                {FOODLYTICS_COPY.didYouKnowTail}
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenAdvisor}
              className="shrink-0 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs uppercase tracking-wider px-5 py-3 rounded-xl flex items-center gap-2 shadow-lg border border-emerald-500/20 hover:border-emerald-400 transition-all duration-200 cursor-pointer h-11"
            >
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              {FOODLYTICS_COPY.askAdvisorCta}
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="w-full">
          <WasteForm onAddLog={onAddLog} />
        </div>
      </div>

      <LogsTable logs={logs} onDeleteLog={onDeleteLog} />
    </div>
  );
}
