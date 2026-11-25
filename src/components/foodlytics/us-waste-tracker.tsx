"use client";

import { Card, CardContent } from "@/components/foodlytics/ui/card";
import { FOODLYTICS_COPY } from "@/lib/foodlytics/constants";
import { type UsCategoryRow, fetchUsFoodCategories } from "@/lib/foodlytics/queries";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, BarChart2, DollarSign, Droplet, Flame, RefreshCw, Scale, Terminal } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";

interface UsWasteTrackerProps {
  initialCategories?: UsCategoryRow[];
}

export function UsWasteTracker({ initialCategories }: UsWasteTrackerProps) {
  const [categories, setCategories] = useState<UsCategoryRow[]>(initialCategories ?? []);
  const [isLoading, setIsLoading] = useState(initialCategories === undefined);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [consoleLogs, setConsoleLogs] = useState<string[]>(() =>
    initialCategories ? [`Loaded ${initialCategories.length} US waste sector records from PostgreSQL.`] : [],
  );
  const [activeHoverCategory, setActiveHoverCategory] = useState<string | null>(null);

  const terminalEndRef = useRef<HTMLDivElement | null>(null);

  const fetchUSWasteData = useCallback(async (refresh = false) => {
    if (refresh) {
      setIsRefreshing(true);
      setConsoleLogs([`[${new Date().toLocaleTimeString()}] Syncing US sector baselines from PostgreSQL...`]);
    }

    try {
      const rows = await fetchUsFoodCategories();
      setCategories(rows);
      const latestSource = rows[0]?.source || "us_foodwaste_categories";
      setConsoleLogs([
        `[${new Date().toLocaleTimeString()}] Loaded ${rows.length} US waste sector records from PostgreSQL.`,
        `Source: ${latestSource} (RLS public read).`,
      ]);
    } catch (err) {
      console.warn("Unable to load US waste stats:", err);
      setConsoleLogs((prev) => [
        ...prev,
        `[ERROR] ${err instanceof Error ? err.message : "Unknown error while loading US sector telemetry."}`,
      ]);
    } finally {
      setIsRefreshing(false);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialCategories !== undefined) return;
    fetchUSWasteData();
  }, [fetchUSWasteData, initialCategories]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: `consoleLogs` is the trigger — the body only touches the ref, and each appended terminal line must keep the log pinned to the bottom
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [consoleLogs]);

  const totalWasteTons = categories.reduce((sum, c) => sum + Number(c.waste_tonnes), 0);
  const totalCostBillions = categories.reduce((sum, c) => sum + Number(c.cost_usd_billions || 0), 0);
  const totalCO2Millions = categories.reduce((sum, c) => sum + Number(c.co2_impact_million_tonnes || 0), 0);
  const maxTonnage = Math.max(...categories.map((c) => Number(c.waste_tonnes)), 1);

  if (isLoading && !isRefreshing) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-bold text-stone-400 tracking-wider uppercase">Loading US Waste Telemetry...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <BarChart2 className="h-5 w-5 text-emerald-400" />
            US Nationwide Food Waste Analytics
          </h2>
          <p className="text-xs text-stone-400">
            Sector breakdown ordered by annual waste tonnage from canonical database records
          </p>
        </div>

        <button
          type="button"
          onClick={() => fetchUSWasteData(true)}
          disabled={isRefreshing}
          className="shrink-0 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-extrabold text-[11px] uppercase tracking-wider px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 border border-emerald-500/20 hover:border-emerald-400 shadow-md shadow-emerald-950/20 transition-all cursor-pointer h-10"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
          {isRefreshing ? "Refreshing Data..." : "Refresh Telemetry"}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card className="h-full glass-panel hover:glass-panel-glow-amber hover:-translate-y-1 transition-all duration-300 rounded-2xl overflow-hidden border border-white/10 cursor-default">
          <CardContent className="p-6 flex items-start gap-4">
            <div className="p-3 bg-amber-500/15 text-amber-400 rounded-xl border border-amber-500/25 shrink-0">
              <Scale className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-300 block">US Annual Waste</span>
              <h3 className="text-2xl font-extrabold text-white tracking-tight tabular-nums">
                {(totalWasteTons / 1000000).toFixed(1)}M{" "}
                <span className="text-xs font-medium text-stone-400">tons</span>
              </h3>
              <p className="text-[11px] text-stone-400 font-bold uppercase tracking-wider">
                {categories.length} tracked sectors
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="h-full glass-panel hover:glass-panel-glow-rose hover:-translate-y-1 transition-all duration-300 rounded-2xl overflow-hidden border border-white/10 cursor-default">
          <CardContent className="p-6 flex items-start gap-4">
            <div className="p-3 bg-rose-500/15 text-rose-400 rounded-xl border border-rose-500/25 shrink-0">
              <DollarSign className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-300 block">Economic Burden</span>
              <h3 className="text-2xl font-extrabold text-white tracking-tight tabular-nums">
                ${totalCostBillions.toFixed(1)}B <span className="text-xs font-medium text-stone-400">USD</span>
              </h3>
              <p className="text-[11px] text-stone-400 font-bold uppercase tracking-wider">Aggregate annual loss</p>
            </div>
          </CardContent>
        </Card>

        <Card className="h-full glass-panel hover:glass-panel-glow-emerald hover:-translate-y-1 transition-all duration-300 rounded-2xl overflow-hidden border border-white/10 cursor-default">
          <CardContent className="p-6 flex items-start gap-4">
            <div className="p-3 bg-emerald-500/15 text-emerald-400 rounded-xl border border-emerald-500/25 shrink-0">
              <Flame className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-300 block">CO2 Footprint</span>
              <h3 className="text-2xl font-extrabold text-white tracking-tight tabular-nums">
                {totalCO2Millions.toFixed(1)}M <span className="text-xs font-medium text-stone-400">tons CO2e</span>
              </h3>
              <p className="text-[11px] text-stone-400 font-bold uppercase tracking-wider">Supply chain emissions</p>
            </div>
          </CardContent>
        </Card>

        <Card className="h-full glass-panel hover:glass-panel-glow-blue hover:-translate-y-1 transition-all duration-300 rounded-2xl overflow-hidden border border-white/10 cursor-default">
          <CardContent className="p-6 flex items-start gap-4">
            <div className="p-3 bg-sky-500/15 text-sky-400 rounded-xl border border-sky-500/25 shrink-0">
              <Droplet className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-sky-300 block">
                Primary Sector Share
              </span>
              <h3 className="text-2xl font-extrabold text-white tracking-tight tabular-nums">
                {categories[0] ? `${categories[0].waste_pct}%` : "0%"}
              </h3>
              <p className="text-[11px] text-stone-400 font-bold uppercase tracking-wider truncate max-w-[150px]">
                {categories[0]?.category || "No data"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card className="glass-panel border-none rounded-2xl shadow-xl bg-black/10 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-sm font-black text-white">Sector Breakdown (By Tonnage)</h3>
                <p className="text-[11px] text-stone-400">
                  Select any sector bar to inspect financial and emissions metrics
                </p>
              </div>
              <span className="text-[10px] font-mono text-stone-500">us_foodwaste_categories</span>
            </div>

            {categories.length === 0 ? (
              <div className="py-12 text-center text-xs font-semibold text-stone-400">
                {FOODLYTICS_COPY.usTrackerEmpty}
              </div>
            ) : (
              <div className="space-y-4">
                {categories.map((c) => {
                  const pctOfMax = Math.max(4, Math.round((Number(c.waste_tonnes) / maxTonnage) * 100));
                  const isActive = activeHoverCategory === c.id;
                  return (
                    <div
                      key={c.id}
                      onMouseEnter={() => setActiveHoverCategory(c.id)}
                      onMouseLeave={() => setActiveHoverCategory(null)}
                      className="p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 transition-colors"
                    >
                      <div className="flex items-center justify-between text-xs font-bold mb-2">
                        <span className="text-white">{c.category}</span>
                        <span className="font-mono text-emerald-400 tabular-nums">
                          {(Number(c.waste_tonnes) / 1000000).toFixed(2)}M tons ({c.waste_pct}%)
                        </span>
                      </div>
                      <div className="h-2.5 w-full bg-stone-900 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${pctOfMax}%` }}
                          className="h-full bg-gradient-to-r from-emerald-600 to-teal-400 rounded-full transition-all duration-300"
                        />
                      </div>
                      <AnimatePresence>
                        {isActive && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.15 }}
                            className="grid grid-cols-3 gap-4 pt-2 mt-2 border-t border-white/5 text-[10px] font-bold text-stone-400 overflow-hidden"
                          >
                            <div>
                              <span className="block text-[8px] uppercase tracking-wider text-stone-500">
                                Economic Value
                              </span>
                              <span className="text-rose-400 font-mono">${c.cost_usd_billions} Billion USD</span>
                            </div>
                            <div>
                              <span className="block text-[8px] uppercase tracking-wider text-stone-500">
                                Carbon Burden
                              </span>
                              <span className="text-emerald-400 font-mono">
                                {c.co2_impact_million_tonnes}M tons CO2eq
                              </span>
                            </div>
                            <div className="text-end">
                              <span className="block text-[8px] uppercase tracking-wider text-stone-500">
                                Source Database
                              </span>
                              <span className="text-stone-300 italic">{c.source}</span>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="glass-panel border-none rounded-2xl shadow-xl overflow-hidden bg-black/10 flex flex-col">
            <div className="p-4 border-b border-white/5 bg-white/[0.01] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-emerald-400" />
                <span className="text-xs font-black uppercase text-white tracking-wider">Telemetry Sync Log</span>
              </div>
            </div>

            <div className="p-4 bg-stone-950 font-mono text-[10px] text-emerald-400 h-64 overflow-y-auto space-y-2 select-text scrollbar-thin flex flex-col">
              {consoleLogs.map((log, index) => (
                <div
                  // biome-ignore lint/suspicious/noArrayIndexKey: append-only log lines
                  key={index}
                  className={`leading-relaxed border-b border-white/[0.02] pb-1 break-words ${
                    log.includes("[ERROR]") ? "text-rose-400 font-extrabold" : "text-emerald-400"
                  }`}
                >
                  {log}
                </div>
              ))}
              <div ref={terminalEndRef} />
            </div>
          </Card>

          <Card className="glass-panel border-none rounded-2xl p-5 bg-gradient-to-br from-emerald-950/20 to-emerald-900/10 space-y-3">
            <h4 className="text-xs font-black text-white flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              US Waste Allocation Insights
            </h4>
            <p className="text-[11px] text-stone-400 leading-relaxed font-bold">{FOODLYTICS_COPY.usTrackerTableNote}</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
