/**
 * User state management service
 */

import { getSupabaseClient } from "./supabase.ts";
import type { UserState } from "../types/index.ts";

export async function getUserState(userId: number): Promise<UserState | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("telegram_user_states")
    .select("state")
    .eq("user_id", userId)
    .single();

  if (error || !data) return null;
  return data.state;
}

export async function setUserState(userId: number, state: UserState | null): Promise<void> {
  const supabase = getSupabaseClient();

  if (state === null) {
    await supabase.from("telegram_user_states").delete().eq("user_id", userId);
  } else {
    await supabase.from("telegram_user_states").upsert({
      user_id: userId,
      state: state,
      updated_at: new Date().toISOString(),
    });
  }
}
