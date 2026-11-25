"use client";

import { AdvisorChat } from "@/components/foodlytics/advisor-chat";
import {
  COMMODITY_MATRIX,
  FOODWASTELYTICS_SECTIONS,
  FOODWASTELYTICS_UI as UI,
  GLOBAL_MACRO_INDICATORS,
  POLICY_INTERVENTIONS,
  SUPPLY_CHAIN_STAGES,
} from "@/lib/foodwastelytics/data";
import type { ChatMessage } from "@/lib/foodlytics/types";
import type {
  FoodwastelyticsSectionId,
  RegionalMetric,
  SdgSimulationMetrics,
  SupplyChainStage,
} from "@/lib/foodwastelytics/types";
import { AnimatePresence, motion } from "framer-motion";

interface DashboardSuiteProps {
  activeTab: FoodwastelyticsSectionId;
  onSelectTab: (tab: FoodwastelyticsSectionId) => void;
  selectedStageId: string;
  onSelectStageId: (id: string) => void;
  activeStage: SupplyChainStage;
  filteredRegions: RegionalMetric[];
  simulatedReductionMetrics: SdgSimulationMetrics;
  chatMessages: ChatMessage[];
  chatInput: string;
  isChatLoading: boolean;
  onSetChatInput: (value: string) => void;
  onSendChatMessage: (text: string) => Promise<void>;
  onClearChat: () => void;
}

export function FoodwastelyticsDashboard({
  activeTab,
  onSelectTab,
  selectedStageId,
  onSelectStageId,
  activeStage,
  filteredRegions,
  simulatedReductionMetrics,
  chatMessages,
  chatInput,
  isChatLoading,
  onSetChatInput,
  onSendChatMessage,
  onClearChat,
}: DashboardSuiteProps) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 w-full flex-1 flex flex-col md:flex-row gap-8 justify-start">
      <aside className="md:w-56 shrink-0">
        <nav
          aria-labelledby="foodwastelytics-nav-heading"
          className="flex md:flex-col gap-1.5 overflow-x-auto md:overflow-x-visible md:sticky md:top-28 bg-card/60 backdrop-blur-md p-1.5 rounded-2xl border border-border/40 font-semibold text-xs scrollbar-hide"
        >
          <h2 id="foodwastelytics-nav-heading" className="sr-only">
            {UI.navHeading}
          </h2>
          {FOODWASTELYTICS_SECTIONS.map(({ id, label, icon: Icon }) => (
            <button
              type="button"
              key={id}
              onClick={() => onSelectTab(id)}
              className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl transition-all duration-200 cursor-pointer shrink-0 whitespace-nowrap text-start ${
                activeTab === id
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20 shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-transparent"
              }`}
            >
              <Icon
                aria-hidden="true"
                className={`size-4 transition-colors ${
                  activeTab === id ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
                }`}
              />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col justify-start">
        <AnimatePresence mode="wait">
          {activeTab === "overview" && (
            <motion.div
              key="tab-overview"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="space-y-8"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {GLOBAL_MACRO_INDICATORS.map((metric) => {
                  const IconComponent = metric.icon;
                  return (
                    <div
                      key={metric.id}
                      className="rounded-2xl p-5 bg-card/75 border border-border/50 backdrop-blur-md shadow-xs flex flex-col justify-between"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground truncate">
                          {metric.label}
                        </span>
                        <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                          <IconComponent className="size-4" aria-hidden="true" />
                        </div>
                      </div>
                      <div>
                        <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-mono">
                          {metric.value}
                        </div>
                        <span className="text-xs text-muted-foreground font-medium block mt-0.5">{metric.unit}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {activeTab === "supply-chain" && (
            <motion.div
              key="tab-supply-chain"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <h3 className="text-lg font-bold text-foreground">{UI.flowTitle}</h3>
              <div className="space-y-2">
                <div className="h-6 w-full rounded-xl bg-muted/60 overflow-hidden flex p-1 gap-1 border border-border/50">
                  {SUPPLY_CHAIN_STAGES.map((stg) => (
                    <button
                      type="button"
                      key={stg.id}
                      onClick={() => onSelectStageId(stg.id)}
                      style={{ width: `${stg.percentageOfLoss}%` }}
                      aria-label={stg.name}
                      className={`h-full rounded-lg transition-all cursor-pointer ${
                        selectedStageId === stg.id ? "bg-emerald-600 shadow-xs" : "bg-emerald-500/25"
                      }`}
                    />
                  ))}
                </div>
              </div>
              <div className="rounded-2xl p-6 bg-card/80 border border-emerald-500/30 space-y-4">
                <h4 className="font-extrabold text-foreground">{activeStage.name}</h4>
                <p className="text-xs text-muted-foreground">{activeStage.highIncomeRole}</p>
              </div>
            </motion.div>
          )}

          {activeTab === "regional" && (
            <motion.div
              key="tab-regional"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <h3 className="text-lg font-bold text-foreground">{UI.regionalTitle}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredRegions.map((r) => (
                  <div key={r.id} className="p-4 rounded-xl bg-card border border-border/40 space-y-1">
                    <span className="font-bold text-foreground block">{r.region}</span>
                    <span className="text-xs font-mono text-emerald-500">{`${r.perCapitaKg} ${UI.kgUnit}`}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === "commodities" && (
            <motion.div
              key="tab-commodities"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <h3 className="text-lg font-bold text-foreground">{UI.commoditiesTitle}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {COMMODITY_MATRIX.map((c) => (
                  <div key={c.id} className="p-4 rounded-xl bg-card border border-border/40 space-y-1">
                    <span className="font-bold text-foreground block">{c.name}</span>
                    <span className="text-xs text-rose-500 font-bold">{`${c.lossRatePct}${UI.pctWasted}`}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === "sdg123" && (
            <motion.div
              key="tab-sdg123"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <h3 className="text-lg font-bold text-foreground">{UI.sdgModelerTitle}</h3>
              <div className="p-6 rounded-2xl bg-card border border-emerald-500/25 space-y-3">
                <span className="text-2xl font-bold font-mono">
                  {`${simulatedReductionMetrics.divertedTonnesMillions}${UI.statFoodRescuedUnit} ${UI.savedLabel}`}
                </span>
                <span className="text-sm font-bold text-emerald-500 block">
                  {`+$${simulatedReductionMetrics.capitalSavedBillions}${UI.billionUnit} ${UI.retainedLabel}`}
                </span>
              </div>
            </motion.div>
          )}

          {activeTab === "interventions" && (
            <motion.div
              key="tab-interventions"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <h3 className="text-lg font-bold text-foreground">{UI.interventionsTitle}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {POLICY_INTERVENTIONS.map((item) => (
                  <div key={item.id} className="p-4 rounded-xl bg-card border border-border/40 space-y-1">
                    <span className="font-bold text-foreground block">{item.title}</span>
                    <span className="text-xs text-emerald-500 font-bold">{`${UI.roiPrefix}${item.roiRatio}`}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === "advisor" && (
            <motion.div
              key="tab-advisor"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <h3 className="text-lg font-bold text-foreground">{UI.advisorTitle}</h3>
              <AdvisorChat
                chatMessages={chatMessages}
                chatInput={chatInput}
                isChatLoading={isChatLoading}
                apiWarning={null}
                onSetChatInput={onSetChatInput}
                onSendChatMessage={onSendChatMessage}
                onClearChat={onClearChat}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
