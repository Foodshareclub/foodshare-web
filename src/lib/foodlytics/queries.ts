/**
 * Foodlytics client-side queries and Edge Function adapters.
 * Reads canonical PostgreSQL tables (`waste_logs`, `us_foodwaste_categories`)
 * and calls canonical backend Edge Functions (`api-v1-ai/chat`).
 */

import { supabase } from "@/lib/supabase/client";
import type { UsFoodwasteCategory, WasteLog } from "@/types/database.types";
import type { FoodCategory, WasteEntry, WasteReason } from "./types";

export type UsCategoryRow = Pick<
  UsFoodwasteCategory,
  | "id"
  | "category"
  | "waste_tonnes"
  | "waste_pct"
  | "cost_usd_billions"
  | "co2_impact_million_tonnes"
  | "source"
  | "last_updated_at"
>;

export async function fetchWasteLogs(): Promise<WasteEntry[]> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    return [];
  }
  const householdId = session.user?.user_metadata?.household_id;

  const query = supabase.from("waste_logs").select("*").order("discard_date", { ascending: false });
  const filteredQuery = householdId ? query.eq("household_id", householdId) : query;

  const { data, error } = await filteredQuery;
  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as WasteLog[]).map((item) => ({
    id: item.id,
    foodName: item.food_name,
    category: item.category as FoodCategory,
    weight: Number(item.weight_lbs),
    cost: Number(item.cost_usd),
    date: item.discard_date,
    reason: item.reason as WasteReason,
    co2Impact: Number(item.co2_impact_lbs ?? 0),
    waterImpact: Math.round(Number(item.water_impact_gal ?? 0)),
  }));
}

export async function createWasteLogEntry(entry: {
  foodName: string;
  category: FoodCategory;
  weight: number;
  cost: number;
  reason: WasteReason;
  date: string;
  co2Impact: number;
  waterImpact: number;
}): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const householdId = session?.user?.user_metadata?.household_id;

  const { error } = await supabase.from("waste_logs").insert({
    food_name: entry.foodName,
    category: entry.category,
    weight_lbs: entry.weight,
    cost_usd: entry.cost,
    discard_date: entry.date,
    reason: entry.reason,
    co2_impact_lbs: entry.co2Impact,
    water_impact_gal: entry.waterImpact,
    ...(householdId ? { household_id: householdId } : {}),
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteWasteLogEntry(id: string): Promise<void> {
  const { error } = await supabase.from("waste_logs").delete().eq("id", id);
  if (error) {
    throw new Error(error.message);
  }
}

export async function fetchUsFoodCategories(): Promise<UsCategoryRow[]> {
  const { data, error } = await supabase
    .from("us_foodwaste_categories")
    .select(
      "id, category, waste_tonnes, waste_pct, cost_usd_billions, co2_impact_million_tonnes, source, last_updated_at",
    )
    .order("waste_tonnes", { ascending: false });

  if (error) {
    console.warn("Unable to load US categories macro stats:", error.message);
    return [];
  }

  return (data ?? []) as UsCategoryRow[];
}

export function extractAiReply(data: unknown): string | null {
  if (typeof data === "string" && data.trim()) return data;
  if (!data || typeof data !== "object") return null;

  const record = data as Record<string, unknown>;
  const payload = (record.data && typeof record.data === "object" ? record.data : record) as Record<string, unknown>;
  const choices = payload.choices;
  if (Array.isArray(choices) && choices.length > 0) {
    const first = choices[0] as { message?: { content?: unknown } } | undefined;
    if (typeof first?.message?.content === "string" && first.message.content.trim()) {
      return first.message.content;
    }
  }
  if (typeof payload.reply === "string" && payload.reply.trim()) {
    return payload.reply;
  }
  return null;
}

export async function invokeAiAdvisory(
  query: string,
  systemPrompt: string,
): Promise<{ reply: string | null; error: Error | null }> {
  const { data, error } = await supabase.functions.invoke("api-v1-ai/chat", {
    body: {
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: query },
      ],
      temperature: 0.4,
      maxTokens: 700,
    },
  });

  if (error) {
    return { reply: null, error: new Error(error.message) };
  }

  return { reply: extractAiReply(data), error: null };
}
