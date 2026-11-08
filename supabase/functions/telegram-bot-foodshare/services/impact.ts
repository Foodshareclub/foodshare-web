/**
 * Impact statistics service with optimized parallel queries
 */

import type { ImpactStats } from "../types/index.ts";
import { getSupabaseClient } from "../../_shared/supabase.ts";

export async function getUserImpactStats(userId: number): Promise<ImpactStats> {
  const supabase = getSupabaseClient();

  // First, get the profile (required for subsequent queries)
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id,created_time")
    .eq("telegram_id", userId)
    .single();

  if (profileError || !profile) {
    return {
      foodsShared: 0,
      foodsClaimed: 0,
      kgSaved: 0,
      co2Saved: 0,
      moneySaved: 0,
      memberSince: "Unknown",
      activeDays: 0,
    };
  }

  // Run all remaining queries in parallel for better performance
  const [sharedResult, activityResult] = await Promise.all([
    // Get shared food count
    supabase
      .from("posts")
      .select("*", { count: "exact", head: true })
      .eq("profile_id", profile.id)
      .eq("post_type", "food"),

    // Get activity stats
    supabase.from("telegram_user_activity").select("active_days").eq(
      "user_id",
      userId,
    ).single(),
  ]);

  const sharedCount = sharedResult.count || 0;
  // There is no claims table in the schema (verified in production: the
  // legacy `messages` read was PGRST205 on every run, so this count was
  // silently 0 and the claim badges could never be earned). It stays 0
  // until claim tracking exists; the badge tiers are wired for it.
  const claimedCount = 0;

  // Estimate impact (average food item = 0.5kg, CO2 = 2.5kg per kg food)
  const kgSaved = sharedCount * 0.5;
  const co2Saved = kgSaved * 2.5;
  const moneySaved = kgSaved * 5; // $5 per kg average

  return {
    foodsShared: sharedCount,
    foodsClaimed: claimedCount,
    kgSaved: Math.round(kgSaved * 10) / 10,
    co2Saved: Math.round(co2Saved * 10) / 10,
    moneySaved: Math.round(moneySaved),
    memberSince: new Date(profile.created_time).toLocaleDateString(),
    activeDays: activityResult.data?.active_days?.length || 0,
  };
}

export function getBadges(stats: ImpactStats): string {
  const badges: string[] = [];

  if (stats.foodsShared >= 50) badges.push("🏆 Super Sharer");
  else if (stats.foodsShared >= 20) badges.push("⭐ Active Sharer");
  else if (stats.foodsShared >= 5) badges.push("🌟 Sharer");

  if (stats.foodsClaimed >= 30) badges.push("🎯 Food Rescuer");
  else if (stats.foodsClaimed >= 10) badges.push("🎪 Active Claimer");

  if (stats.kgSaved >= 25) badges.push("♻️ Eco Warrior");
  else if (stats.kgSaved >= 10) badges.push("🌱 Green Hero");

  if (stats.activeDays >= 30) badges.push("🔥 30-Day Streak");
  else if (stats.activeDays >= 7) badges.push("📅 Weekly Active");

  return badges.length > 0 ? `\n🏅 <b>Badges:</b> ${badges.join(" • ")}\n` : "";
}
