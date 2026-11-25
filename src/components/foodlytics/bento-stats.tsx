"use client";

import { Card, CardContent } from "@/components/foodlytics/ui/card";
import { DollarSign, Droplet, Flame, Scale } from "lucide-react";

interface BentoStatsProps {
  totalCost: number;
  totalWeight: number;
  totalCO2: number;
  totalWater: number;
}

/**
 * Household waste summary bento row (renders immediately at full opacity for scannability).
 */
export function BentoStats({ totalCost, totalWeight, totalCO2, totalWater }: BentoStatsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      <Card
        id="stat-financial-loss"
        className="glass-panel hover:glass-panel-glow-rose hover:-translate-y-1 transition-all duration-300 rounded-2xl overflow-hidden border border-white/10 cursor-default"
      >
        <CardContent className="p-6 flex items-start gap-4">
          <div className="p-3 bg-rose-500/15 text-rose-400 rounded-xl border border-rose-500/25 shrink-0">
            <DollarSign className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="space-y-1 min-w-0">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-300 block">Financial Loss</span>
            <h3 className="text-3xl font-extrabold text-white tracking-tight tabular-nums">${totalCost.toFixed(2)}</h3>
            <p className="text-xs text-stone-400 font-medium">Value of food discarded</p>
          </div>
        </CardContent>
      </Card>

      <Card
        id="stat-wasted-weight"
        className="glass-panel hover:glass-panel-glow-amber hover:-translate-y-1 transition-all duration-300 rounded-2xl overflow-hidden border border-white/10 cursor-default"
      >
        <CardContent className="p-6 flex items-start gap-4">
          <div className="p-3 bg-amber-500/15 text-amber-400 rounded-xl border border-amber-500/25 shrink-0">
            <Scale className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="space-y-1 min-w-0">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-300 block">Wasted Weight</span>
            <h3 className="text-3xl font-extrabold text-white tracking-tight tabular-nums">
              {totalWeight.toFixed(1)} <span className="text-sm font-medium text-stone-400">lbs</span>
            </h3>
            <p className="text-xs text-stone-400 font-medium">Physical mass thrown out</p>
          </div>
        </CardContent>
      </Card>

      <Card
        id="stat-co2-footprint"
        className="glass-panel hover:glass-panel-glow-emerald hover:-translate-y-1 transition-all duration-300 rounded-2xl overflow-hidden border border-white/10 cursor-default"
      >
        <CardContent className="p-6 flex items-start gap-4">
          <div className="p-3 bg-emerald-500/15 text-emerald-400 rounded-xl border border-emerald-500/25 shrink-0">
            <Flame className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="space-y-1.5 min-w-0 w-full">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-300 block">Carbon Footprint</span>
            <h3 className="text-3xl font-extrabold text-white tracking-tight tabular-nums">
              {totalCO2.toFixed(1)} <span className="text-sm font-medium text-stone-400">lbs</span>
            </h3>
            <div className="space-y-1">
              <p className="text-[11px] text-emerald-400 font-bold tracking-tight">CO2e emissions created</p>
              <p className="text-[11px] text-stone-400 font-medium leading-snug">
                ≈ {Math.round(totalCO2 * 1.1)} miles driven in gas car
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card
        id="stat-water-footprint"
        className="glass-panel hover:glass-panel-glow-blue hover:-translate-y-1 transition-all duration-300 rounded-2xl overflow-hidden border border-white/10 cursor-default"
      >
        <CardContent className="p-6 flex items-start gap-4">
          <div className="p-3 bg-blue-500/15 text-blue-400 rounded-xl border border-blue-500/25 shrink-0">
            <Droplet className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="space-y-1.5 min-w-0 w-full">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-300 block">Water Footprint</span>
            <h3 className="text-3xl font-extrabold text-white tracking-tight tabular-nums">
              {totalWater.toLocaleString()} <span className="text-sm font-medium text-stone-400">gal</span>
            </h3>
            <div className="space-y-1">
              <p className="text-[11px] text-blue-400 font-bold tracking-tight">Ecological freshwater lost</p>
              <p className="text-[11px] text-stone-400 font-medium leading-snug">
                ≈ {Math.round(totalWater / 17.2)} hot showers
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
