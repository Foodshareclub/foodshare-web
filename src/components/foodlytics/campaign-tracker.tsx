"use client";

import { type UsCategoryRow, fetchUsFoodCategories, fetchWasteLogs } from "@/lib/foodlytics/queries";
import type { WasteEntry } from "@/lib/foodlytics/types";
import { Award, Scale, ShieldAlert, TrendingDown } from "lucide-react";
import React, { useEffect, useState } from "react";

interface CampaignTrackerProps {
  initialCategories?: UsCategoryRow[];
  initialLogs?: WasteEntry[];
  onReviewCandidates?: () => void;
}

export function CampaignTracker({ initialCategories, initialLogs, onReviewCandidates }: CampaignTrackerProps) {
  const [categories, setCategories] = useState<UsCategoryRow[]>(initialCategories ?? []);
  const [householdLogs, setHouseholdLogs] = useState<WasteEntry[]>(initialLogs ?? []);
  const [isLoading, setIsLoading] = useState(initialCategories === undefined);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (initialCategories !== undefined && initialLogs !== undefined) {
      setCategories(initialCategories);
      setHouseholdLogs(initialLogs);
      setIsLoading(false);
      return;
    }
    void (async () => {
      try {
        const [cats, logs] = await Promise.all([
          fetchUsFoodCategories(),
          fetchWasteLogs().catch(() => [] as WasteEntry[]),
        ]);
        setCategories(cats);
        setHouseholdLogs(logs);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : "Unable to load campaign metrics.");
      } finally {
        setIsLoading(false);
      }
    })();
  }, [initialCategories, initialLogs]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-bold text-stone-400 tracking-wider uppercase">
          Loading Database Campaign Metrics...
        </span>
      </div>
    );
  }

  const totalBaselineTonnes = categories.reduce((sum, c) => sum + Number(c.waste_tonnes), 0);
  const campaignTargetTonnes = totalBaselineTonnes * 0.5;
  const householdLoggedWeightLbs = householdLogs.reduce((sum, entry) => sum + entry.weight, 0);
  const householdLoggedCo2Lbs = householdLogs.reduce((sum, entry) => sum + entry.co2Impact, 0);
  const totalCostBillions = categories.reduce((sum, c) => sum + Number(c.cost_usd_billions || 0), 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="glass-panel p-6 rounded-2xl border-none shadow-xl bg-gradient-to-br from-stone-900/40 via-stone-950/20 to-black/10">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-6">
          <div className="space-y-1.5">
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <Award className="h-5 w-5 text-emerald-400" />
              50% Food Waste Reduction Campaign
            </h2>
            <p className="text-xs text-stone-400">
              Target halving benchmarks computed directly from{" "}
              <code className="text-emerald-400">us_foodwaste_categories</code> and household logs
            </p>
          </div>

          <div className="flex items-center gap-4 bg-black/30 border border-white/5 px-4 py-2.5 rounded-xl">
            <div className="text-center">
              <span className="text-[10px] font-bold text-stone-500 uppercase block tracking-wider">Campaign Goal</span>
              <span className="text-sm font-extrabold text-white">50.0% Reduction</span>
            </div>
            <div className="h-8 w-px bg-white/10" />
            <div className="text-center">
              <span className="text-[10px] font-bold text-stone-500 uppercase block tracking-wider">
                Tracked Sectors
              </span>
              <span className="text-sm font-extrabold text-emerald-400">{categories.length}</span>
            </div>
          </div>
        </div>

        {loadError && (
          <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-xs text-rose-300">
            {loadError}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="rounded-xl bg-black/25 border border-white/5 p-4">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider flex items-center gap-1.5">
              <Scale className="h-3.5 w-3.5 text-amber-400" />
              National Baseline
            </span>
            <p className="text-xl font-black text-white mt-1 tabular-nums">
              {totalBaselineTonnes > 0 ? `${(totalBaselineTonnes / 1_000_000).toFixed(2)}M tonnes` : "0 tonnes"}
            </p>
            <p className="text-[11px] text-stone-400 mt-0.5">Economic value: ${totalCostBillions.toFixed(1)}B USD/yr</p>
          </div>

          <div className="rounded-xl bg-black/25 border border-white/5 p-4">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingDown className="h-3.5 w-3.5 text-emerald-400" />
              2030 Halving Target
            </span>
            <p className="text-xl font-black text-emerald-400 mt-1 tabular-nums">
              {campaignTargetTonnes > 0 ? `${(campaignTargetTonnes / 1_000_000).toFixed(2)}M tonnes` : "0 tonnes"}
            </p>
            <p className="text-[11px] text-stone-400 mt-0.5">50% diversion threshold across active sectors</p>
          </div>

          <div className="rounded-xl bg-black/25 border border-white/5 p-4">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldAlert className="h-3.5 w-3.5 text-sky-400" />
              Your Logged Footprint
            </span>
            <p className="text-xl font-black text-white mt-1 tabular-nums">{householdLoggedWeightLbs.toFixed(1)} lbs</p>
            <p className="text-[11px] text-stone-400 mt-0.5">
              {householdLogs.length} entries ({householdLoggedCo2Lbs.toFixed(1)} lbs CO2e)
            </p>
          </div>
        </div>
      </div>

      {totalBaselineTonnes > 0 && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-2xl text-xs font-bold flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400">
              <ShieldAlert className="h-4 w-4" />
            </div>
            <div>
              <p className="text-white font-extrabold uppercase tracking-wide">Priority Reduction Opportunity</p>
              <p className="text-stone-400 mt-0.5">
                Inspect highest-tonnage food waste sectors and generate tailored corrective action briefs.
              </p>
            </div>
          </div>
          {onReviewCandidates && (
            <button
              type="button"
              onClick={onReviewCandidates}
              className="self-start md:self-auto px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-extrabold uppercase tracking-wider rounded-xl transition-all border border-amber-500/20 cursor-pointer text-[10px]"
            >
              Review Candidates
            </button>
          )}
        </div>
      )}

      <div className="space-y-4">
        <h3 className="text-sm font-black text-white uppercase tracking-wider">Sector Reduction Benchmarks</h3>

        {categories.length === 0 ? (
          <div className="glass-panel p-8 rounded-2xl text-center text-xs font-bold text-stone-400">
            No sector benchmark rows found in PostgreSQL (
            <code className="text-emerald-400">us_foodwaste_categories</code>).
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {categories.map((cat) => {
              const targetReduction = Number(cat.waste_tonnes) * 0.5;
              return (
                <div
                  key={cat.id}
                  className="glass-panel p-5 rounded-2xl border-none shadow-md bg-stone-950/20 flex flex-col justify-between space-y-3 border-s-2 border-s-emerald-500/60"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider bg-emerald-600/10 text-emerald-400 border border-emerald-500/25">
                      {cat.waste_pct}% Share
                    </span>
                    <span className="text-[10px] font-mono text-stone-400">{cat.source}</span>
                  </div>
                  <h4 className="text-sm font-bold text-white leading-snug">{cat.category}</h4>
                  <div className="space-y-1.5 pt-2 border-t border-white/5 text-[11px] font-bold">
                    <div className="flex justify-between">
                      <span className="text-stone-500">Current Tonnage:</span>
                      <span className="text-white tabular-nums">{Number(cat.waste_tonnes).toLocaleString()} t</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-500">50% Reduction Target:</span>
                      <span className="text-emerald-400 tabular-nums">-{targetReduction.toLocaleString()} t</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-500">Annual Financial Penalty:</span>
                      <span className="text-rose-400 tabular-nums">${cat.cost_usd_billions}B USD</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
