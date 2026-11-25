"use client";

import { AdvisorChat } from "@/components/foodlytics/advisor-chat";
import {
  COMMODITY_MATRIX,
  FOODWASTELYTICS_UI as UI,
  GLOBAL_MACRO_INDICATORS,
  POLICY_INTERVENTIONS,
  SUPPLY_CHAIN_STAGES,
} from "@/lib/foodwastelytics/data";
import type { ChatMessage } from "@/lib/foodlytics/types";
import type { RegionalMetric, SdgSimulationMetrics, SupplyChainStage } from "@/lib/foodwastelytics/types";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Compass,
  Flame,
  Globe,
  Layers,
  Package,
  ShieldCheck,
  Sparkles,
  Target,
  Zap,
} from "lucide-react";

interface LandingSectionsProps {
  selectedStageId: string;
  onSelectStageId: (id: string) => void;
  activeStage: SupplyChainStage;
  regionalViewMode: "perCapita" | "totalMass";
  onChangeRegionalViewMode: (mode: "perCapita" | "totalMass") => void;
  filteredRegions: RegionalMetric[];
  targetReductionPct: number;
  onChangeTargetReductionPct: (pct: number) => void;
  simulatedReductionMetrics: SdgSimulationMetrics;
  chatMessages: ChatMessage[];
  chatInput: string;
  isChatLoading: boolean;
  onSetChatInput: (value: string) => void;
  onSendChatMessage: (text: string) => Promise<void>;
  onClearChat: () => void;
}

export function FoodwastelyticsLanding({
  selectedStageId,
  onSelectStageId,
  activeStage,
  regionalViewMode,
  onChangeRegionalViewMode,
  filteredRegions,
  targetReductionPct,
  onChangeTargetReductionPct,
  simulatedReductionMetrics,
  chatMessages,
  chatInput,
  isChatLoading,
  onSetChatInput,
  onSendChatMessage,
  onClearChat,
}: LandingSectionsProps) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 w-full flex-1 space-y-16">
      {/* SECTION 1: MACRO INDICATORS BENTO GRID */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-border/40 pb-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-foreground flex items-center gap-2.5">
              <Globe className="size-6 text-emerald-500" aria-hidden="true" />
              <span>{UI.macroSectionTitle}</span>
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">{UI.macroSectionSubtitle}</p>
          </div>
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
            {UI.championsBadge}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {GLOBAL_MACRO_INDICATORS.map((metric) => {
            const IconComponent = metric.icon;
            return (
              <div
                key={metric.id}
                className="rounded-3xl p-6 sm:p-8 bg-card/80 border border-border/50 backdrop-blur-xl shadow-lg hover:border-emerald-500/40 hover:shadow-emerald-500/5 transition-all duration-300 flex flex-col justify-between space-y-6 relative overflow-hidden"
              >
                <div
                  className={`absolute -end-16 -bottom-16 w-52 h-52 bg-gradient-to-br ${metric.gradient} rounded-full blur-3xl pointer-events-none`}
                />
                <div>
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <span className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground">
                      {metric.label}
                    </span>
                    <div className="size-10 rounded-xl bg-muted/60 text-emerald-600 dark:text-emerald-400 border border-border/40 flex items-center justify-center shrink-0">
                      <IconComponent className="size-5" aria-hidden="true" />
                    </div>
                  </div>

                  <div className="flex items-baseline gap-3 my-2">
                    <span className="text-4xl sm:text-5xl font-black tracking-tight text-foreground font-mono">
                      {metric.value}
                    </span>
                    <span className="text-sm sm:text-base font-bold text-muted-foreground uppercase tracking-wider">
                      {metric.unit}
                    </span>
                  </div>
                </div>

                <div className="space-y-2.5 pt-4 border-t border-border/40">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-md bg-emerald-500/10 self-start inline-block">
                    {metric.badge}
                  </span>
                  <ul className="space-y-2 mt-2">
                    {metric.bullets.map((bullet) => (
                      <li
                        key={bullet}
                        className="text-xs text-muted-foreground flex items-start gap-2.5 leading-relaxed"
                      >
                        <span className="size-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* SECTION 2: PLANETARY BOUNDARIES & HUMANITARIAN IMPACT */}
      <section className="rounded-3xl p-6 sm:p-10 bg-gradient-to-br from-card/90 via-card/60 to-card/40 border border-border/50 backdrop-blur-xl shadow-md space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-4">
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
              <Compass className="size-5 text-emerald-500" aria-hidden="true" />
              <span>{UI.boundariesTitle}</span>
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">{UI.boundariesSubtitle}</p>
          </div>
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-muted text-foreground border border-border/40">
            {UI.championsLabel}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="p-5 rounded-2xl bg-card/60 border border-border/40 space-y-2">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
              {UI.arableLandTitle}
            </span>
            <span className="text-2xl sm:text-3xl font-black text-foreground font-mono block">
              {UI.arableLandValue}
            </span>
            <p className="text-xs text-muted-foreground leading-relaxed">{UI.arableLandDesc}</p>
          </div>

          <div className="p-5 rounded-2xl bg-card/60 border border-emerald-500/30 space-y-2">
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
              {UI.hungerCapacityTitle}
            </span>
            <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono block">
              {UI.hungerCapacityValue}
            </span>
            <p className="text-xs text-muted-foreground leading-relaxed">{UI.hungerCapacityDesc}</p>
          </div>

          <div className="p-5 rounded-2xl bg-card/60 border border-border/40 space-y-2">
            <span className="text-xs font-bold text-amber-500 uppercase tracking-wider block">{UI.methaneTitle}</span>
            <span className="text-2xl sm:text-3xl font-black text-amber-500 font-mono block">{UI.methaneValue}</span>
            <p className="text-xs text-muted-foreground leading-relaxed">{UI.methaneDesc}</p>
          </div>

          <div className="p-5 rounded-2xl bg-card/60 border border-border/40 space-y-2">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
              {UI.fertilizerTitle}
            </span>
            <span className="text-2xl sm:text-3xl font-black text-foreground font-mono block">
              {UI.fertilizerValue}
            </span>
            <p className="text-xs text-muted-foreground leading-relaxed">{UI.fertilizerDesc}</p>
          </div>
        </div>
      </section>

      {/* SECTION 3: FARM-TO-FORK SUPPLY CHAIN LOSS FLOW */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-border/40 pb-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-foreground flex items-center gap-2.5">
              <Layers className="size-6 text-emerald-500" aria-hidden="true" />
              <span>{UI.flowTitle}</span>
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">{UI.flowSubtitle}</p>
          </div>
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
            {UI.mappedBadge}
          </span>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold px-1">
            <span>{UI.streamOutput}</span>
            <span>{UI.streamDiverted}</span>
          </div>
          <div className="h-7 w-full rounded-2xl bg-muted/60 overflow-hidden flex p-1 gap-1 border border-border/50">
            {SUPPLY_CHAIN_STAGES.map((stg) => (
              <button
                type="button"
                key={stg.id}
                onClick={() => onSelectStageId(stg.id)}
                style={{ width: `${stg.percentageOfLoss}%` }}
                className={`h-full rounded-xl transition-all cursor-pointer relative group ${
                  selectedStageId === stg.id
                    ? "bg-emerald-600 shadow-md ring-2 ring-emerald-500/40"
                    : "bg-emerald-500/25 hover:bg-emerald-500/40"
                }`}
                aria-label={`${stg.name}: ${stg.percentageOfLoss}%`}
              />
            ))}
          </div>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
            <span>{UI.ribbonField}</span>
            <span>{UI.ribbonColdChain}</span>
            <span>{UI.ribbonProcessing}</span>
            <span>{UI.ribbonRetail}</span>
            <span>{UI.ribbonConsumer}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {SUPPLY_CHAIN_STAGES.map((stage) => {
            const isSelected = selectedStageId === stage.id;
            return (
              <button
                type="button"
                key={stage.id}
                onClick={() => onSelectStageId(stage.id)}
                className={`p-4 rounded-2xl border text-start transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? "bg-card border-emerald-500 ring-1 ring-emerald-500/40 shadow-md"
                    : "bg-card/60 hover:bg-card border-border/50"
                }`}
              >
                <div className="space-y-1 mb-2">
                  <span className="text-xs font-bold text-foreground block">{stage.name}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold inline-block">
                    {stage.percentageOfLoss}
                    {UI.lossSuffix}
                  </span>
                </div>
                <div className="flex items-baseline justify-between mt-2 pt-2 border-t border-border/40 text-xs">
                  <span className="text-muted-foreground">{UI.volumeLabel}</span>
                  <span className="font-mono font-bold text-foreground">{`${stage.lossTonnes} ${UI.tonnesUnit}`}</span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="rounded-3xl p-6 sm:p-8 bg-card/85 border border-emerald-500/30 backdrop-blur-xl shadow-lg space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-4">
            <div>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
                {UI.stageDeepDiveTelemetry}
              </span>
              <h3 className="text-xl font-extrabold text-foreground mt-0.5">{activeStage.name}</h3>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="px-3.5 py-1.5 rounded-xl bg-muted/60 border border-border/40 text-xs">
                <span className="text-muted-foreground">{UI.annualLossLabel}</span>
                <span className="font-bold font-mono text-foreground">{activeStage.economicLoss}</span>
              </div>
              <div className="px-3.5 py-1.5 rounded-xl bg-muted/60 border border-border/40 text-xs">
                <span className="text-muted-foreground">{UI.ghgShareLabel}</span>
                <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  {activeStage.ghgSharePct}
                  {UI.footprintSuffix}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                <AlertTriangle className="size-4 text-amber-500" aria-hidden="true" />
                <span>{UI.systemicDriversTitle}</span>
              </h4>
              <ul className="space-y-2.5">
                {activeStage.primaryDrivers.map((driver) => (
                  <li
                    key={driver}
                    className="text-xs text-muted-foreground flex items-start gap-2.5 bg-muted/30 p-3 rounded-xl border border-border/30 leading-relaxed"
                  >
                    <span className="size-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                    <span>{driver}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                <Zap className="size-4 text-emerald-500" aria-hidden="true" />
                <span>{UI.mitigationSolutionsTitle}</span>
              </h4>
              <ul className="space-y-2.5">
                {activeStage.mitigationTech.map((tech) => (
                  <li
                    key={tech}
                    className="text-xs text-foreground flex items-start gap-2.5 bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20 leading-relaxed"
                  >
                    <CheckCircle2 className="size-4 text-emerald-500 mt-0.5 shrink-0" aria-hidden="true" />
                    <span>{tech}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4: UNEP REGIONAL BENCHMARKS */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3 border-b border-border/40 pb-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-foreground flex items-center gap-2.5">
              <BarChart3 className="size-6 text-emerald-500" aria-hidden="true" />
              <span>{UI.regionalTitle}</span>
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">{UI.regionalSubtitle}</p>
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-muted/60 border border-border/50 rounded-xl text-xs font-semibold self-start sm:self-auto">
            <button
              type="button"
              onClick={() => onChangeRegionalViewMode("perCapita")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                regionalViewMode === "perCapita"
                  ? "bg-card text-foreground font-bold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {UI.perCapitaToggle}
            </button>
            <button
              type="button"
              onClick={() => onChangeRegionalViewMode("totalMass")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                regionalViewMode === "totalMass"
                  ? "bg-card text-foreground font-bold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {UI.totalMassToggle}
            </button>
          </div>
        </div>

        <div
          tabIndex={0}
          role="region"
          aria-labelledby="regional-table-caption"
          className="table-wrapper rounded-3xl border border-border/50 bg-card/80 backdrop-blur-xl overflow-x-auto focus:outline-none focus:ring-2 focus:ring-emerald-500/40 shadow-lg"
        >
          <table className="w-full text-start text-xs border-collapse">
            <caption id="regional-table-caption" className="sr-only">
              {UI.tableCaption}
            </caption>
            <thead className="sticky top-0 bg-muted/80 backdrop-blur-md border-b border-border/50 z-10 text-muted-foreground font-semibold">
              <tr>
                <th scope="col" className="py-3.5 px-5 text-start font-bold">
                  {UI.colRegion}
                </th>
                <th scope="col" className="py-3.5 px-5 text-start font-bold">
                  {UI.colEconomicTier}
                </th>
                <th scope="col" className="py-3.5 px-5 text-end font-bold">
                  {UI.colPerCapita}
                </th>
                <th scope="col" className="py-3.5 px-5 text-end font-bold">
                  {UI.colTotalLoss}
                </th>
                <th scope="col" className="py-3.5 px-5 text-start font-bold">
                  {UI.colPrimaryVulnerability}
                </th>
                <th scope="col" className="py-3.5 px-5 text-end font-bold">
                  {UI.colHouseholdShare}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filteredRegions.map((region) => (
                <tr key={region.id} className="hover:bg-muted/40 transition-colors">
                  <th scope="row" className="py-3.5 px-5 text-start font-bold text-foreground">
                    {region.region}
                  </th>
                  <td className="py-3.5 px-5 text-start text-muted-foreground">
                    <span className="px-2.5 py-0.5 rounded-md bg-muted text-[11px] font-medium">
                      {region.economicTier}
                    </span>
                  </td>
                  <td className="py-3.5 px-5 text-end font-mono font-bold text-foreground">
                    {`${region.perCapitaKg} ${UI.kgUnit}`}
                  </td>
                  <td className="py-3.5 px-5 text-end font-mono font-bold text-foreground">
                    {`${region.totalLossMt} ${UI.mtUnit}`}
                  </td>
                  <td className="py-3.5 px-5 text-start text-muted-foreground font-medium">{region.primaryStage}</td>
                  <td className="py-3.5 px-5 text-end">
                    <div className="inline-flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          style={{ width: `${region.householdSharePct}%` }}
                          className="h-full bg-emerald-500 rounded-full"
                        />
                      </div>
                      <span className="font-mono text-muted-foreground">{`${region.householdSharePct}%`}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* SECTION 5: COMMODITY VULNERABILITY MATRIX & PARADOX */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-border/40 pb-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-foreground flex items-center gap-2.5">
              <Package className="size-6 text-emerald-500" aria-hidden="true" />
              <span>{UI.commoditiesTitle}</span>
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">{UI.commoditiesSubtitle}</p>
          </div>
        </div>

        <div className="p-6 rounded-3xl bg-gradient-to-br from-card/90 via-card/60 to-card/40 border border-border/50 backdrop-blur-xl shadow-md space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest flex items-center gap-2">
              <Flame className="size-4" aria-hidden="true" />
              <span>{UI.paradoxTitle}</span>
            </span>
            <span className="px-3.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold self-start sm:self-auto">
              {UI.beefStatBadge}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-4xl">{UI.paradoxBody}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {COMMODITY_MATRIX.map((c) => {
            const IconComp = c.icon;
            return (
              <div
                key={c.id}
                className="rounded-3xl p-6 bg-card/80 border border-border/50 backdrop-blur-xl shadow-md flex flex-col justify-between hover:border-emerald-500/40 hover:-translate-y-1 transition-all duration-300 space-y-5"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <IconComp className="size-5" aria-hidden="true" />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-foreground text-sm sm:text-base">{c.name}</h3>
                        <span className="text-xs text-muted-foreground">{c.category}</span>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400">
                      {`${c.lossRatePct}${UI.wastedSuffix}`}
                    </span>
                  </div>

                  <div className="space-y-1.5 border-t border-border/40 pt-3 mt-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">{UI.volumeLostLabel}</span>
                      <span className="font-mono font-bold text-foreground">
                        {`${c.annualLossMt} ${UI.millionTonnesUnit}`}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">{UI.carbonPenaltyLabel}</span>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {`${c.carbonIntensity} ${UI.co2PerKgUnit}`}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">{UI.waterFootprintLabel}</span>
                      <span className="font-mono font-bold text-sky-600 dark:text-sky-400">
                        {`${c.waterFootprintLiters.toLocaleString()} ${UI.litersPerKgUnit}`}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 border-t border-border/40 pt-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    {UI.lossDriversHeading}
                  </span>
                  <ul className="space-y-1.5">
                    {c.bullets.map((b) => (
                      <li key={b} className="text-[11px] text-muted-foreground flex items-start gap-2 leading-relaxed">
                        <span className="size-1 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* SECTION 6: UN SDG 12.3 2030 HALVING SCENARIO MODELER */}
      <section className="rounded-3xl p-6 sm:p-10 bg-gradient-to-br from-emerald-500/10 via-card/85 to-card/50 border border-emerald-500/25 shadow-xl space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest flex items-center gap-2">
              <Target className="size-4" aria-hidden="true" />
              <span>{UI.scenarioSimulationTitle}</span>
            </span>
            <h3 className="text-xl sm:text-2xl font-black text-foreground">{UI.scenarioMilestonePrompt}</h3>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl">{UI.scenarioDescription}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2 p-1.5 bg-muted/60 border border-border/50 rounded-xl text-xs font-bold">
            {[10, 25, 50, 60].map((pct) => (
              <button
                key={pct}
                type="button"
                onClick={() => onChangeTargetReductionPct(pct)}
                className={`px-3.5 py-2 rounded-lg transition-all cursor-pointer ${
                  targetReductionPct === pct
                    ? "bg-emerald-600 text-white shadow-md font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {`${pct}% ${pct === 50 ? UI.unSdgGoalTag : ""}`.trim()}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="p-4 rounded-2xl bg-card/80 border border-border/40 shadow-xs space-y-1">
            <span className="text-xs font-semibold text-muted-foreground block">{UI.statFoodRescued}</span>
            <span className="text-2xl sm:text-3xl font-black text-foreground font-mono block">
              {`${simulatedReductionMetrics.divertedTonnesMillions}${UI.statFoodRescuedUnit}`}
            </span>
            <span className="text-[11px] text-muted-foreground block">{UI.statFoodRescuedSub}</span>
          </div>

          <div className="p-4 rounded-2xl bg-card/80 border border-border/40 shadow-xs space-y-1">
            <span className="text-xs font-semibold text-muted-foreground block">{UI.statCapitalRetained}</span>
            <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono block">
              {`+$${simulatedReductionMetrics.capitalSavedBillions}B`}
            </span>
            <span className="text-[11px] text-muted-foreground block">{UI.statCapitalRetainedSub}</span>
          </div>

          <div className="p-4 rounded-2xl bg-card/80 border border-border/40 shadow-xs space-y-1">
            <span className="text-xs font-semibold text-muted-foreground block">{UI.statEmissionsAvoided}</span>
            <span className="text-2xl sm:text-3xl font-black text-foreground font-mono block">
              {`${simulatedReductionMetrics.co2AvoidedGigatonnes} ${UI.statEmissionsAvoidedUnit}`}
            </span>
            <span className="text-[11px] text-muted-foreground block">{UI.statEmissionsAvoidedSub}</span>
          </div>

          <div className="p-4 rounded-2xl bg-card/80 border border-border/40 shadow-xs space-y-1">
            <span className="text-xs font-semibold text-muted-foreground block">{UI.statWaterSaved}</span>
            <span className="text-2xl sm:text-3xl font-black text-sky-600 dark:text-sky-400 font-mono block">
              {`${simulatedReductionMetrics.waterSavedKm3} ${UI.statWaterSavedUnit}`}
            </span>
            <span className="text-[11px] text-muted-foreground block">{UI.statWaterSavedSub}</span>
          </div>

          <div className="p-4 rounded-2xl bg-card/80 border border-border/40 shadow-xs space-y-1 col-span-2 sm:col-span-1">
            <span className="text-xs font-semibold text-muted-foreground block">{UI.statPeopleNourished}</span>
            <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono block">
              {`${simulatedReductionMetrics.peopleFedMillions}M`}
            </span>
            <span className="text-[11px] text-muted-foreground block">{UI.statPeopleNourishedSub}</span>
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t border-border/40">
          <h4 className="text-sm font-bold text-foreground">{UI.milestonesTitle}</h4>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-card/60 border border-border/40 space-y-1.5">
              <span className="text-xs font-mono font-bold text-muted-foreground">{UI.m1Tag}</span>
              <h5 className="font-bold text-foreground text-xs">{UI.m1Title}</h5>
              <p className="text-[11px] text-muted-foreground leading-relaxed">{UI.m1Desc}</p>
            </div>

            <div className="p-4 rounded-2xl bg-card/60 border border-border/40 space-y-1.5">
              <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">{UI.m2Tag}</span>
              <h5 className="font-bold text-foreground text-xs">{UI.m2Title}</h5>
              <p className="text-[11px] text-muted-foreground leading-relaxed">{UI.m2Desc}</p>
            </div>

            <div className="p-4 rounded-2xl bg-card/60 border border-border/40 space-y-1.5">
              <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">{UI.m3Tag}</span>
              <h5 className="font-bold text-foreground text-xs">{UI.m3Title}</h5>
              <p className="text-[11px] text-muted-foreground leading-relaxed">{UI.m3Desc}</p>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 space-y-1.5">
              <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">{UI.m4Tag}</span>
              <h5 className="font-bold text-foreground text-xs">{UI.m4Title}</h5>
              <p className="text-[11px] text-muted-foreground leading-relaxed">{UI.m4Desc}</p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 7: HIGH-IMPACT POLICY INTERVENTIONS */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-border/40 pb-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-foreground flex items-center gap-2.5">
              <ShieldCheck className="size-6 text-emerald-500" aria-hidden="true" />
              <span>{UI.interventionsTitle}</span>
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">{UI.interventionsSubtitle}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {POLICY_INTERVENTIONS.map((item) => (
            <div
              key={item.id}
              className="p-6 rounded-3xl bg-card/80 border border-border/50 backdrop-blur-xl shadow-md flex flex-col justify-between space-y-5 hover:border-emerald-500/40 hover:-translate-y-1 transition-all duration-300"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    {item.category}
                  </span>
                  <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    {`${UI.roiPrefix}${item.roiRatio}`}
                  </span>
                </div>
                <h3 className="text-base font-bold text-foreground">{item.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
              </div>

              <div className="space-y-2 border-t border-border/40 pt-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  {UI.leversHeading}
                </span>
                <ul className="space-y-1.5">
                  {item.bullets.map((b) => (
                    <li key={b} className="text-xs text-muted-foreground flex items-start gap-2 leading-relaxed">
                      <CheckCircle2 className="size-3.5 text-emerald-500 mt-0.5 shrink-0" aria-hidden="true" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-2 border-t border-border/40 pt-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{UI.lossPotentialLabel}</span>
                  <span className="font-mono font-bold text-foreground">
                    {`${UI.upToPrefix}${item.potentialLossReductionPct}%`}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{UI.globalValueLabel}</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {`${item.globalSavingsUsd}${UI.perYearSuffix}`}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 8: GLOBAL AI INTELLIGENCE ADVISOR */}
      <section className="space-y-6">
        <div className="border-b border-border/40 pb-4">
          <h2 className="text-xl sm:text-2xl font-black text-foreground flex items-center gap-2.5">
            <Sparkles className="size-6 text-emerald-500" aria-hidden="true" />
            <span>{UI.advisorTitle}</span>
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">{UI.advisorSubtitle}</p>
        </div>

        <AdvisorChat
          chatMessages={chatMessages}
          chatInput={chatInput}
          isChatLoading={isChatLoading}
          apiWarning={null}
          onSetChatInput={onSetChatInput}
          onSendChatMessage={onSendChatMessage}
          onClearChat={onClearChat}
        />
      </section>
    </div>
  );
}
