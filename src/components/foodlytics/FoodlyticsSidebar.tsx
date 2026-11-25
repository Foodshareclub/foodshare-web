"use client";

import { FOODLYTICS_COPY, type FoodlyticsTabId } from "@/lib/foodlytics/constants";
import { Award, BarChart2, BarChart3, Sparkles, Zap } from "lucide-react";

const SECTIONS: Array<{
  id: FoodlyticsTabId;
  label: string;
  icon: typeof BarChart3;
}> = [
  { id: "dashboard", label: "Impact Dashboard", icon: BarChart3 },
  { id: "campaign", label: "50% Campaign", icon: Award },
  { id: "interventions", label: "Priority Queue", icon: Zap },
  { id: "us-waste", label: "US Waste Tracker", icon: BarChart2 },
  { id: "advisor", label: "AI Advisor", icon: Sparkles },
];

interface FoodlyticsSidebarProps {
  activeTab: FoodlyticsTabId;
  onSelectTab: (tab: FoodlyticsTabId) => void;
}

/**
 * Responsive navigation rail (horizontal pill strip on mobile, sticky rail on desktop).
 */
export function FoodlyticsSidebar({ activeTab, onSelectTab }: FoodlyticsSidebarProps) {
  return (
    <aside className="md:w-52 shrink-0">
      <nav
        aria-label={FOODLYTICS_COPY.navAriaLabel}
        style={{ scrollbarWidth: "none" }}
        className="flex md:flex-col gap-1.5 overflow-x-auto md:overflow-x-visible md:sticky md:top-28 bg-black/25 md:bg-transparent p-1 md:p-0 rounded-2xl border md:border-0 border-white/5 font-bold text-xs [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        {SECTIONS.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              type="button"
              key={id}
              aria-pressed={isActive}
              onClick={() => onSelectTab(id)}
              className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl transition-all duration-200 cursor-pointer shrink-0 whitespace-nowrap ${
                isActive
                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 shadow-md shadow-emerald-950/25"
                  : "text-stone-400 hover:text-stone-200 hover:bg-white/5 border border-transparent"
              }`}
            >
              <Icon className={`h-4 w-4 transition-colors ${isActive ? "text-emerald-400" : "text-stone-500"}`} />
              {label}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
