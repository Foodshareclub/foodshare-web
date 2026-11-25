"use client";

import { FloatingOrbs } from "@/components/gpu/FloatingOrbs";
import {
  FOODWASTELYTICS_UI as UI,
  INITIAL_ADVISOR_MESSAGE_TEXT,
  REGIONAL_BENCHMARKS,
  SUPPLY_CHAIN_STAGES,
  getSmartGlobalAdvisoryResponse,
  simulateSdgReduction,
} from "@/lib/foodwastelytics/data";
import type { ChatMessage } from "@/lib/foodlytics/types";
import type { EconomicScope, FoodwastelyticsSectionId, LayoutVariant } from "@/lib/foodwastelytics/types";
import { supabase } from "@/lib/supabase/client";
import { BarChart2, Compass, DollarSign, Globe, Layout, Leaf, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { FoodwastelyticsDashboard } from "./DashboardSuite";
import { FoodwastelyticsLanding } from "./LandingSections";
import { FoodwastelyticsStoryboard } from "./StoryboardView";

function formatChatTime(): string {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function FoodwastelyticsClient() {
  const [layoutVariant, setLayoutVariant] = useState<LayoutVariant>("landing");
  const [activeTab, setActiveTab] = useState<FoodwastelyticsSectionId>("overview");
  const [economicScope, setEconomicScope] = useState<EconomicScope>("all");
  const [targetReductionPct, setTargetReductionPct] = useState<number>(50);
  const [selectedStageId, setSelectedStageId] = useState<string>("production");
  const [regionalViewMode, setRegionalViewMode] = useState<"perCapita" | "totalMass">("perCapita");

  const filteredRegions = useMemo(() => {
    if (economicScope === "high-income") {
      return REGIONAL_BENCHMARKS.filter((r) => r.economicTier === "High-Income");
    }
    if (economicScope === "developing") {
      return REGIONAL_BENCHMARKS.filter((r) => r.economicTier === "Developing & Emerging");
    }
    return REGIONAL_BENCHMARKS;
  }, [economicScope]);

  const activeStage = useMemo(
    () => SUPPLY_CHAIN_STAGES.find((s) => s.id === selectedStageId) || SUPPLY_CHAIN_STAGES[0],
    [selectedStageId],
  );

  const simulatedReductionMetrics = useMemo(() => simulateSdgReduction(targetReductionPct), [targetReductionPct]);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => [
    {
      id: "welcome-global",
      role: "model",
      text: INITIAL_ADVISOR_MESSAGE_TEXT,
      timestamp: formatChatTime(),
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);

  const handleSendChatMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isChatLoading) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      text: textToSend,
      timestamp: formatChatTime(),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput("");
    setIsChatLoading(true);

    try {
      const invokePromise = supabase.functions.invoke("api-v1-advisory", {
        body: { query: textToSend },
      });
      const timeoutPromise = new Promise<{ data: null; error: Error }>((resolve) =>
        setTimeout(() => resolve({ data: null, error: new Error("Advisory timeout") }), 2500),
      );

      const { data, error } = await Promise.race([invokePromise, timeoutPromise]);

      const replyText =
        error || !data
          ? getSmartGlobalAdvisoryResponse(textToSend)
          : typeof data === "string"
            ? data
            : data?.reply || data || "No response received.";

      setChatMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "model",
          text: replyText,
          timestamp: formatChatTime(),
        },
      ]);
    } catch {
      setChatMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "model",
          text: getSmartGlobalAdvisoryResponse(textToSend),
          timestamp: formatChatTime(),
        },
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleClearChat = () => {
    setChatMessages([
      {
        id: "welcome-global",
        role: "model",
        text: INITIAL_ADVISOR_MESSAGE_TEXT,
        timestamp: formatChatTime(),
      },
    ]);
  };

  return (
    <div className="min-h-screen text-foreground font-sans antialiased flex flex-col flex-1 pb-16">
      <FloatingOrbs opacity={0.12} />

      <section className="relative z-10 border-b border-border/40 bg-card/75 backdrop-blur-xl px-4 sm:px-6 pt-8 sm:pt-10 pb-8 sm:pb-10">
        <div className="max-w-4xl mx-auto flex flex-col items-center text-center space-y-4">
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-foreground">
            <span>{UI.heroTitle}</span>
          </h1>
          <p className="text-xs sm:text-base text-muted-foreground max-w-2xl leading-relaxed">{UI.heroSubtitle}</p>

          <div className="pt-2 flex justify-center w-full">
            <div
              aria-labelledby="economic-scope-heading"
              className="inline-flex flex-wrap items-center justify-center p-1.5 rounded-2xl bg-muted/60 border border-border/60 shadow-xs backdrop-blur-md gap-1 text-xs sm:text-sm font-semibold"
            >
              <h2 id="economic-scope-heading" className="sr-only">
                {UI.economicScopeTabsHeading}
              </h2>
              <button
                type="button"
                onClick={() => setEconomicScope("all")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 cursor-pointer ${
                  economicScope === "all"
                    ? "bg-emerald-600 text-white shadow-xs font-bold"
                    : "text-muted-foreground hover:text-foreground hover:bg-card/50"
                }`}
              >
                <Globe aria-hidden="true" className="size-3.5 shrink-0" />
                <span>{UI.scopeAll}</span>
              </button>
              <button
                type="button"
                onClick={() => setEconomicScope("high-income")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 cursor-pointer ${
                  economicScope === "high-income"
                    ? "bg-emerald-600 text-white shadow-xs font-bold"
                    : "text-muted-foreground hover:text-foreground hover:bg-card/50"
                }`}
              >
                <DollarSign aria-hidden="true" className="size-3.5 shrink-0" />
                <span>{UI.scopeHighIncome}</span>
              </button>
              <button
                type="button"
                onClick={() => setEconomicScope("developing")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 cursor-pointer ${
                  economicScope === "developing"
                    ? "bg-emerald-600 text-white shadow-xs font-bold"
                    : "text-muted-foreground hover:text-foreground hover:bg-card/50"
                }`}
              >
                <Leaf aria-hidden="true" className="size-3.5 shrink-0" />
                <span>{UI.scopeDeveloping}</span>
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto mt-8 pt-4 border-t border-border/30 flex flex-col sm:flex-row items-center justify-center gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
            <Layout className="size-4 text-emerald-500" aria-hidden="true" />
            <span>{UI.layoutVariantLabel}</span>
          </div>
          <div className="inline-flex rounded-xl bg-muted/60 p-1 border border-border/60 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setLayoutVariant("landing")}
              className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                layoutVariant === "landing"
                  ? "bg-emerald-600 text-white shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Sparkles className="size-3.5" aria-hidden="true" />
              <span>{UI.variantLanding}</span>
            </button>
            <button
              type="button"
              onClick={() => setLayoutVariant("dashboard")}
              className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                layoutVariant === "dashboard"
                  ? "bg-emerald-600 text-white shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <BarChart2 className="size-3.5" aria-hidden="true" />
              <span>{UI.variantDashboard}</span>
            </button>
            <button
              type="button"
              onClick={() => setLayoutVariant("storyboard")}
              className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                layoutVariant === "storyboard"
                  ? "bg-emerald-600 text-white shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Compass className="size-3.5" aria-hidden="true" />
              <span>{UI.variantStoryboard}</span>
            </button>
          </div>
        </div>
      </section>

      {layoutVariant === "landing" && (
        <FoodwastelyticsLanding
          selectedStageId={selectedStageId}
          onSelectStageId={setSelectedStageId}
          activeStage={activeStage}
          regionalViewMode={regionalViewMode}
          onChangeRegionalViewMode={setRegionalViewMode}
          filteredRegions={filteredRegions}
          targetReductionPct={targetReductionPct}
          onChangeTargetReductionPct={setTargetReductionPct}
          simulatedReductionMetrics={simulatedReductionMetrics}
          chatMessages={chatMessages}
          chatInput={chatInput}
          isChatLoading={isChatLoading}
          onSetChatInput={setChatInput}
          onSendChatMessage={handleSendChatMessage}
          onClearChat={handleClearChat}
        />
      )}

      {layoutVariant === "dashboard" && (
        <FoodwastelyticsDashboard
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          selectedStageId={selectedStageId}
          onSelectStageId={setSelectedStageId}
          activeStage={activeStage}
          filteredRegions={filteredRegions}
          simulatedReductionMetrics={simulatedReductionMetrics}
          chatMessages={chatMessages}
          chatInput={chatInput}
          isChatLoading={isChatLoading}
          onSetChatInput={setChatInput}
          onSendChatMessage={handleSendChatMessage}
          onClearChat={handleClearChat}
        />
      )}

      {layoutVariant === "storyboard" && <FoodwastelyticsStoryboard />}

      <footer className="max-w-7xl mx-auto px-6 py-6 border-t border-border/40 text-center text-xs text-muted-foreground space-y-1 mt-12 w-full">
        <p className="font-semibold text-foreground/80">{UI.footerTitle}</p>
        <p className="text-[11px] text-muted-foreground">{UI.footerSubtitle}</p>
      </footer>
    </div>
  );
}
