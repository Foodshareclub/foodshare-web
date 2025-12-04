/**
 * Profile management service
 */

import { getSupabaseClient } from "./supabase.ts";
import type { Profile } from "../types/index.ts";

export async function getProfileByTelegramId(telegramId: number): Promise<Profile | null> {
  const supabase = getSupabaseClient();

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("telegram_id", telegramId)
    .single();

  return data as Profile | null;
}

export async function getProfileByEmail(email: string): Promise<Profile | null> {
  const supabase = getSupabaseClient();

  const { data } = await supabase.from("profiles").select("*").eq("email", email).single();

  return data as Profile | null;
}

export function requiresEmailVerification(profile: Profile): boolean {
  return !profile.email_verified;
}

export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function createProfile(data: {
  id: string;
  telegram_id: number;
  first_name: string;
  nickname: string | null;
  email: string;
  verification_code: string;
  verification_code_expires_at: string;
}): Promise<Profile | null> {
  const supabase = getSupabaseClient();

  const { data: profile, error } = await supabase
    .from("profiles")
    .insert({
      ...data,
      email_verified: false,
    })
    .select()
    .single();

  if (error) {
    console.error("Failed to create profile:", error);
    return null;
  }

  return profile as Profile;
}

export async function updateProfile(
  profileId: string,
  updates: Partial<Profile>
): Promise<boolean> {
  const supabase = getSupabaseClient();

  const { error } = await supabase.from("profiles").update(updates).eq("id", profileId);

  return !error;
}

export async function deleteProfile(profileId: string): Promise<boolean> {
  const supabase = getSupabaseClient();

  const { error } = await supabase.from("profiles").delete().eq("id", profileId);

  return !error;
}
