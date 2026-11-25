"use client";

import { FOODLYTICS_COPY } from "@/lib/foodlytics/constants";
import { type UsCategoryRow, fetchUsFoodCategories, invokeAiAdvisory } from "@/lib/foodlytics/queries";
import { ChevronRight, FileText, Sparkles, X, Zap } from "lucide-react";
import React, { useEffect, useState } from "react";

interface RankedSector extends UsCategoryRow {
  priorityScore: number;
  urgency: "High" | "Medium" | "Low";
}

function buildFallbackBrief(sector: RankedSector): string {
  const halfTarget = Math.round(Number(sector.waste_tonnes) * 0.5).toLocaleString();
  return [
    `# Action Brief: ${sector.category}`,
    "## Canonical Baseline Telemetry",
    `- Annual food waste volume: ${Number(sector.waste_tonnes).toLocaleString()} tonnes (${sector.waste_pct}% share)`,
    `- Economic cost: $${sector.cost_usd_billions}B USD per year`,
    `- Carbon impact: ${sector.co2_impact_million_tonnes}M tonnes CO2e`,
    "## Recommended Interventions",
    `- Prioritize surplus rescue and redistribution workflows to divert ${halfTarget} tonnes toward a 50% reduction target.`,
    "- Track recurring discard causes in household and community logs to validate weekly diversion progress.",
  ].join("\n");
}

function rankSectors(rows: UsCategoryRow[]): RankedSector[] {
  return rows
    .map((row) => {
      const tonnesMillions = Number(row.waste_tonnes) / 1_000_000;
      const co2 = Number(row.co2_impact_million_tonnes || 0);
      const score = Number((tonnesMillions * 10 + co2).toFixed(1));
      const urgency: "High" | "Medium" | "Low" = row.waste_pct >= 25 ? "High" : row.waste_pct >= 12 ? "Medium" : "Low";
      return { ...row, priorityScore: score, urgency };
    })
    .toSorted((a, b) => b.priorityScore - a.priorityScore);
}

interface PriorityQueueProps {
  initialCategories?: UsCategoryRow[];
}

export function PriorityQueue({ initialCategories }: PriorityQueueProps) {
  const [sectors, setSectors] = useState<RankedSector[]>(() =>
    initialCategories ? rankSectors(initialCategories) : [],
  );
  const [isLoading, setIsLoading] = useState(initialCategories === undefined);
  const [selectedBrief, setSelectedBrief] = useState<{
    name: string;
    content: string;
    triggeredAt: string;
    id: string;
  } | null>(null);
  const [isGeneratingBriefId, setIsGeneratingBriefId] = useState<string | null>(null);
  const [acknowledgedNotice, setAcknowledgedNotice] = useState<string | null>(null);

  useEffect(() => {
    if (initialCategories !== undefined) {
      setSectors(rankSectors(initialCategories));
      setIsLoading(false);
      return;
    }
    void (async () => {
      try {
        const rows = await fetchUsFoodCategories();
        setSectors(rankSectors(rows));
      } catch (err) {
        console.warn("Unable to load priority sectors:", err);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [initialCategories]);

  const handleGenerateBrief = async (sector: RankedSector) => {
    if (isGeneratingBriefId) return;
    setIsGeneratingBriefId(sector.id);
    setAcknowledgedNotice(null);
    try {
      const prompt = `Generate a concise Markdown corrective action brief for reducing food waste in the "${sector.category}" sector (baseline: ${Number(sector.waste_tonnes).toLocaleString()} tonnes, ${sector.waste_pct}% share, $${sector.cost_usd_billions}B cost, ${sector.co2_impact_million_tonnes}M tons CO2e). Include measurable 50% reduction actions.`;
      const { reply, error } = await invokeAiAdvisory(
        prompt,
        "You are Foodlytics Priority Intervention Planner. Output clear Markdown headings (# and ##) with bulleted operational actions.",
      );

      const content = !error && reply ? reply : buildFallbackBrief(sector);
      setSelectedBrief({
        id: sector.id,
        name: sector.category,
        content,
        triggeredAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      });
    } finally {
      setIsGeneratingBriefId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-bold text-stone-400 tracking-wider uppercase">Sorting Candidate Queue...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300 relative">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-400" />
            Priority Intervention Queue
          </h2>
          <p className="text-xs text-stone-400">
            Ranked by annual tonnage and carbon impact from PostgreSQL table{" "}
            <code className="text-emerald-400">us_foodwaste_categories</code>
          </p>
        </div>
      </div>

      {acknowledgedNotice && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs font-bold text-emerald-300">
          {acknowledgedNotice}
        </div>
      )}

      <div className="glass-panel border-none shadow-xl rounded-2xl overflow-hidden bg-black/10">
        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02] text-stone-400 font-extrabold uppercase tracking-wider text-[10px]">
                <th className="py-4 px-6">Rank & Sector</th>
                <th className="py-4 px-4">Share</th>
                <th className="py-4 px-4 text-end">50% Target Tonnes</th>
                <th className="py-4 px-4 text-center">Urgency</th>
                <th className="py-4 px-4 text-center">Impact Index</th>
                <th className="py-4 px-6 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {sectors.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-stone-400 font-bold">
                    No food waste sector rows found in the database.
                  </td>
                </tr>
              ) : (
                sectors.map((sector, idx) => (
                  <tr key={sector.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group">
                    <td className="py-4 px-6 font-bold">
                      <div className="flex items-center gap-3">
                        <span className="h-6 w-6 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[10px] text-stone-400 font-mono font-extrabold group-hover:border-emerald-500/30 group-hover:text-emerald-400 transition-colors">
                          {idx + 1}
                        </span>
                        <div>
                          <p className="text-white text-xs font-black">{sector.category}</p>
                          <p className="text-[10px] text-stone-400 font-bold mt-0.5">{sector.source}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <span className="px-2 py-0.5 bg-white/5 border border-white/10 text-[9px] font-bold text-stone-300 rounded uppercase tracking-wider">
                        {sector.waste_pct}%
                      </span>
                    </td>

                    <td className="py-4 px-4 text-end">
                      <div className="space-y-1">
                        <span className="text-emerald-400 font-mono font-extrabold">-50%</span>
                        <span className="text-stone-400 text-[10px] block">
                          ~{Math.round(Number(sector.waste_tonnes) * 0.5).toLocaleString()} tonnes
                        </span>
                      </div>
                    </td>

                    <td className="py-4 px-4 text-center">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${
                          sector.urgency === "High"
                            ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                            : "bg-stone-500/10 text-stone-300 border border-white/5"
                        }`}
                      >
                        Urgency: {sector.urgency}
                      </span>
                    </td>

                    <td className="py-4 px-4 text-center">
                      <span className="text-sm font-mono font-black text-amber-400 bg-amber-500/5 border border-amber-500/10 rounded-lg px-2.5 py-1">
                        {sector.priorityScore}
                      </span>
                    </td>

                    <td className="py-4 px-6 text-center">
                      <button
                        type="button"
                        onClick={() => handleGenerateBrief(sector)}
                        disabled={isGeneratingBriefId !== null}
                        className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-extrabold text-[10px] uppercase tracking-wider px-3.5 py-2 rounded-xl flex items-center justify-center gap-1.5 border border-emerald-500/20 hover:border-emerald-400 shadow-md transition-all cursor-pointer mx-auto"
                      >
                        {isGeneratingBriefId === sector.id ? (
                          <>
                            <span className="h-3.5 w-3.5 border border-white border-t-transparent rounded-full animate-spin shrink-0" />
                            Thinking...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-3.5 w-3.5 shrink-0" />
                            Generate Brief
                            <ChevronRight className="h-3.5 w-3.5" />
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedBrief && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
          <div className="w-full max-w-xl bg-stone-950 border-s border-white/10 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
            <div className="px-6 py-5 border-b border-white/15 bg-white/[0.02] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <FileText className="h-5 w-5 text-emerald-400" />
                <div>
                  <h3 className="font-extrabold text-sm text-white">AI Corrective Action Brief</h3>
                  <p className="text-[10px] text-stone-400">
                    {selectedBrief.name} • Generated {selectedBrief.triggeredAt}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBrief(null)}
                aria-label={FOODLYTICS_COPY.closeBriefPanel}
                className="p-1 text-stone-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 rounded-lg cursor-pointer transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 p-6 overflow-y-auto font-mono text-xs leading-relaxed space-y-4 scrollbar-thin text-stone-300 select-text">
              <div className="prose prose-invert prose-sm max-w-none text-stone-300 font-sans space-y-4">
                {selectedBrief.content.split("\n").map((line, lIdx) => {
                  if (line.startsWith("# ")) {
                    return (
                      <h1
                        // biome-ignore lint/suspicious/noArrayIndexKey: fixed snapshot lines
                        key={lIdx}
                        className="text-lg font-black text-white border-b border-white/5 pb-2 mt-4"
                      >
                        {line.replace("# ", "")}
                      </h1>
                    );
                  }
                  if (line.startsWith("## ")) {
                    return (
                      <h2
                        // biome-ignore lint/suspicious/noArrayIndexKey: fixed snapshot lines
                        key={lIdx}
                        className="text-sm font-extrabold text-emerald-400 pt-2 mt-3"
                      >
                        {line.replace("## ", "")}
                      </h2>
                    );
                  }
                  if (line.startsWith("- ") || line.startsWith("* ")) {
                    return (
                      <li
                        // biome-ignore lint/suspicious/noArrayIndexKey: fixed snapshot lines
                        key={lIdx}
                        className="ms-4 list-disc ps-1 font-bold text-stone-300"
                      >
                        {line.replace(/^[-*]\s+/, "")}
                      </li>
                    );
                  }
                  if (line.trim().length === 0) return null;
                  return (
                    <p
                      // biome-ignore lint/suspicious/noArrayIndexKey: fixed snapshot lines
                      key={lIdx}
                      className="leading-relaxed font-bold text-stone-400"
                    >
                      {line}
                    </p>
                  );
                })}
              </div>
            </div>

            <div className="p-4 bg-black/40 border-t border-white/10 flex items-center justify-between select-none">
              <span className="text-[9px] font-bold text-stone-500 uppercase tracking-widest">
                ID: {selectedBrief.id.slice(0, 8)}...
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedBrief(null)}
                  className="px-4 py-2 border border-white/10 hover:bg-white/5 text-stone-400 hover:text-white font-extrabold text-[10px] uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                >
                  Close Console
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const briefName = selectedBrief.name;
                    setSelectedBrief(null);
                    setAcknowledgedNotice(`Reviewed corrective action brief for ${briefName}.`);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-xl transition-all shadow-md shadow-emerald-950/20 border border-emerald-500/20 hover:border-emerald-400 cursor-pointer"
                >
                  Mark Reviewed
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
