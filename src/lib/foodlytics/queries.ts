/**
 * Foodlytics client-side queries
 * Browser Supabase client fetches for the foodlytics dashboard.
 */

import { supabase } from "@/lib/supabase/client";
import type { FoodCategory, WasteEntry, WasteReason } from "./types";

export interface UsCategoryRow {
  id: string;
  category: string;
  waste_tonnes: number;
  waste_pct: number;
}

interface WasteLogRow {
  id: string;
  food_name: string;
  category: string;
  weight_lbs: number;
  cost_usd: number;
  discard_date: string;
  reason: string;
  co2_impact_lbs: number;
  water_impact_gal: number;
}

export async function fetchWasteLogs(): Promise<WasteEntry[]> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const householdId = session?.user?.user_metadata?.household_id;

  const query = supabase.from("waste_logs").select("*").order("discard_date", { ascending: false });

  const filteredQuery = householdId ? query.eq("household_id", householdId) : query;

  const { data, error } = await filteredQuery;

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as WasteLogRow[]).map((item) => ({
    id: item.id,
    foodName: item.food_name,
    category: item.category as FoodCategory,
    weight: Number(item.weight_lbs),
    cost: Number(item.cost_usd),
    date: item.discard_date,
    reason: item.reason as WasteReason,
    co2Impact: Number(item.co2_impact_lbs),
    waterImpact: Math.round(item.water_impact_gal),
  }));
}

export async function fetchUsFoodCategories(): Promise<UsCategoryRow[]> {
  const { data, error } = await supabase
    .from("us_foodwaste_categories")
    .select("*")
    .order("waste_tonnes", { ascending: false });

  if (error) {
    console.error("Failed to load US categories macro stats:", error);
    return [];
  }

  return data ?? [];
}
