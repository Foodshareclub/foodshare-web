"use client";

import { FloatingOrbs } from "@/components/gpu/FloatingOrbs";
import { FOODLYTICS_COPY, type FoodlyticsTabId } from "@/lib/foodlytics/constants";
import {
  type UsCategoryRow,
  createWasteLogEntry,
  deleteWasteLogEntry,
  fetchUsFoodCategories,
  fetchWasteLogs,
  invokeAiAdvisory,
} from "@/lib/foodlytics/queries";
import {
  CATEGORY_METRIC_MAP,
  type ChatMessage,
  type FoodCategory,
  type WasteEntry,
  type WasteReason,
} from "@/lib/foodlytics/types";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { FoodlyticsHeader } from "./FoodlyticsHeader";
import { FoodlyticsSidebar } from "./FoodlyticsSidebar";
import { ImpactDashboardTab } from "./ImpactDashboardTab";

const TabFallback = ({ text }: { text: string }) => (
  <div className="py-16 text-center text-xs font-semibold text-stone-400">{text}</div>
);

const DynamicCampaignTracker = dynamic(
  () => import("@/components/foodlytics/campaign-tracker").then((m) => m.CampaignTracker),
  { loading: () => <TabFallback text={FOODLYTICS_COPY.loadingCampaign} />, ssr: false },
);
const DynamicPriorityQueue = dynamic(
  () => import("@/components/foodlytics/priority-queue").then((m) => m.PriorityQueue),
  { loading: () => <TabFallback text={FOODLYTICS_COPY.loadingQueue} />, ssr: false },
);
const DynamicUsWasteTracker = dynamic(
  () => import("@/components/foodlytics/us-waste-tracker").then((m) => m.UsWasteTracker),
  { loading: () => <TabFallback text={FOODLYTICS_COPY.loadingUsWaste} />, ssr: false },
);
const DynamicAdvisorChat = dynamic(() => import("@/components/foodlytics/advisor-chat").then((m) => m.AdvisorChat), {
  loading: () => <TabFallback text={FOODLYTICS_COPY.loadingAdvisor} />,
  ssr: false,
});

function createWelcomeMessage(): ChatMessage {
  return {
    id: "welcome",
    role: "model",
    text: FOODLYTICS_COPY.welcomeMessage,
    timestamp: FOODLYTICS_COPY.welcomeTimePlaceholder,
  };
}

/**
 * Interactive Foodlytics workspace client shell with code-split secondary modules.
 */
export function FoodlyticsClient() {
  const [activeTab, setActiveTab] = useState<FoodlyticsTabId>("dashboard");
  const [logs, setLogs] = useState<WasteEntry[]>([]);
  const [logsError, setLogsError] = useState<string | null>(null);
  const [usCategories, setUsCategories] = useState<UsCategoryRow[]>([]);
  const [isLoadingUsCategories, setIsLoadingUsCategories] = useState(true);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => [createWelcomeMessage()]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [apiWarning, setApiWarning] = useState<string | null>(null);

  const fetchLogs = async () => {
    try {
      const nextLogs = await fetchWasteLogs();
      setLogs(nextLogs);
      setLogsError(null);
    } catch (err) {
      setLogsError(err instanceof Error ? err.message : FOODLYTICS_COPY.dbConnectionFallbackError);
    }
  };

  useEffect(() => {
    void (async () => {
      const [fetchedLogs, fetchedCategories] = await Promise.all([
        fetchWasteLogs().catch((err: unknown) => {
          setLogsError(err instanceof Error ? err.message : FOODLYTICS_COPY.dbConnectionFallbackError);
          return null;
        }),
        fetchUsFoodCategories().catch(() => [] as UsCategoryRow[]),
      ]);
      if (fetchedLogs) {
        setLogs(fetchedLogs);
        setLogsError(null);
      }
      setUsCategories(fetchedCategories);
      setIsLoadingUsCategories(false);
    })();
  }, []);

  const handleAddLog = async (logData: {
    foodName: string;
    category: FoodCategory;
    weight: number;
    cost: number;
    reason: WasteReason;
    date: string;
  }) => {
    try {
      const metrics = CATEGORY_METRIC_MAP[logData.category];
      const co2Val = Number((logData.weight * metrics.co2PerLb).toFixed(1));
      const waterVal = Math.round(logData.weight * metrics.waterPerLb);

      await createWasteLogEntry({
        ...logData,
        co2Impact: co2Val,
        waterImpact: waterVal,
      });
      await fetchLogs();
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : FOODLYTICS_COPY.saveLogError);
    }
  };

  const handleDeleteLog = async (id: string) => {
    try {
      await deleteWasteLogEntry(id);
      await fetchLogs();
    } catch (err) {
      setLogsError(
        `${FOODLYTICS_COPY.deleteLogErrorPrefix}${err instanceof Error ? err.message : FOODLYTICS_COPY.unknownError}`,
      );
    }
  };

  const handleSendChatMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isChatLoading) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput("");
    setIsChatLoading(true);
    setApiWarning(null);

    try {
      const { reply, error } = await invokeAiAdvisory(
        textToSend,
        "You are Foodlytics Household Preservation Advisor. Give practical food storage, shelf-life extension, and scrap-cooking advice.",
      );
      if (error) throw error;

      const replyText = reply || FOODLYTICS_COPY.emptyReplyFallback;
      const modelMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "model",
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setChatMessages((prev) => [...prev, modelMsg]);
    } catch (err) {
      setApiWarning(err instanceof Error ? err.message : FOODLYTICS_COPY.edgeFunctionError);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleAskCategoryAdvisor = (cat: FoodCategory) => {
    setActiveTab("advisor");
    const query = `Provide practical storage, life-extension hacks, and recipe ideas specifically for the ${CATEGORY_METRIC_MAP[cat].label} category.`;
    void handleSendChatMessage(query);
  };

  const totalCost = logs.reduce((sum, item) => sum + item.cost, 0);
  const totalWeight = logs.reduce((sum, item) => sum + item.weight, 0);
  const totalCO2 = logs.reduce((sum, item) => sum + item.co2Impact, 0);
  const totalWater = logs.reduce((sum, item) => sum + item.waterImpact, 0);

  const costByCategory = logs.reduce(
    (acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + item.cost;
      return acc;
    },
    {} as Record<FoodCategory, number>,
  );

  const weightByCategory = logs.reduce(
    (acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + item.weight;
      return acc;
    },
    {} as Record<FoodCategory, number>,
  );

  const maxCategoryWeight = Math.max(...(Object.values(weightByCategory) as number[]), 1);

  const reasonCounts = logs.reduce(
    (acc, item) => {
      acc[item.reason] = (acc[item.reason] || 0) + 1;
      return acc;
    },
    {} as Record<WasteReason, number>,
  );

  const totalReasons = (Object.values(reasonCounts) as number[]).reduce((s, c) => s + c, 0) || 1;

  return (
    <div className="min-h-screen bg-[#120e0c] text-stone-200 font-sans antialiased flex flex-col flex-1 pb-12">
      <FloatingOrbs opacity={0.15} />
      <FoodlyticsHeader />

      <section
        aria-label={FOODLYTICS_COPY.brandTitle}
        className="max-w-7xl mx-auto px-4 sm:px-6 py-8 w-full flex-1 flex flex-col md:flex-row gap-6 justify-start"
      >
        <FoodlyticsSidebar activeTab={activeTab} onSelectTab={setActiveTab} />

        <div className="flex-1 min-w-0 flex flex-col justify-start">
          {logsError && (
            <div
              role="alert"
              className="mb-6 p-4 bg-rose-500/15 border border-rose-500/30 text-rose-200 rounded-2xl text-xs font-bold flex items-center gap-2.5"
            >
              <span className="h-2 w-2 rounded-full bg-rose-400 shrink-0" aria-hidden="true" />
              <span>{logsError}</span>
            </div>
          )}

          {activeTab === "dashboard" && (
            <ImpactDashboardTab
              usCategories={usCategories}
              isLoadingUsCategories={isLoadingUsCategories}
              logs={logs}
              totalCost={totalCost}
              totalWeight={totalWeight}
              totalCO2={totalCO2}
              totalWater={totalWater}
              weightByCategory={weightByCategory}
              costByCategory={costByCategory}
              maxCategoryWeight={maxCategoryWeight}
              reasonCounts={reasonCounts}
              totalReasons={totalReasons}
              onAddLog={handleAddLog}
              onDeleteLog={handleDeleteLog}
              onAskCategoryAdvisor={handleAskCategoryAdvisor}
              onOpenUsWaste={() => setActiveTab("us-waste")}
              onOpenAdvisor={() => setActiveTab("advisor")}
            />
          )}

          {activeTab === "campaign" && (
            <DynamicCampaignTracker
              initialCategories={isLoadingUsCategories ? undefined : usCategories}
              initialLogs={logs}
              onReviewCandidates={() => setActiveTab("interventions")}
            />
          )}
          {activeTab === "interventions" && (
            <DynamicPriorityQueue initialCategories={isLoadingUsCategories ? undefined : usCategories} />
          )}
          {activeTab === "us-waste" && (
            <DynamicUsWasteTracker initialCategories={isLoadingUsCategories ? undefined : usCategories} />
          )}
          {activeTab === "advisor" && (
            <DynamicAdvisorChat
              chatMessages={chatMessages}
              chatInput={chatInput}
              isChatLoading={isChatLoading}
              apiWarning={apiWarning}
              hasConnectionIssue={Boolean(logsError)}
              onSetChatInput={setChatInput}
              onSendChatMessage={handleSendChatMessage}
              onClearChat={() => setChatMessages([createWelcomeMessage()])}
            />
          )}
        </div>
      </section>

      <footer className="max-w-7xl mx-auto px-6 py-6 border-t border-white/10 text-center text-xs text-stone-400 font-semibold space-y-1 mt-12 rounded-t-3xl w-full bg-black/15">
        <p>{FOODLYTICS_COPY.footerPrimary}</p>
        <p className="text-stone-500">{FOODLYTICS_COPY.footerSecondary}</p>
      </footer>
    </div>
  );
}
