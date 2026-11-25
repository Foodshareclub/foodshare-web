/**
 * Supabase Database Type Definitions
 *
 * Re-exported from the canonical backend-synced schema definition
 * (`supabase/functions/_shared/database.types.ts`, verified byte-exact by
 * `scripts/check-vendored.ts`).
 */

import type { Database, Json } from "../../supabase/functions/_shared/database.types";
import type { NotificationCategory, NotificationChannel, NotificationFrequency } from "./notifications.types";

export type { Database, Json, NotificationCategory, NotificationChannel, NotificationFrequency };

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"];
export type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];
export type Post = Database["public"]["Tables"]["posts"]["Row"];
export type PostInsert = Database["public"]["Tables"]["posts"]["Insert"];
export type PostUpdate = Database["public"]["Tables"]["posts"]["Update"];
export type PostWithLocation = Database["public"]["Views"]["posts_with_location"]["Row"];
export type Household = Database["public"]["Tables"]["households"]["Row"];
export type HouseholdInsert = Database["public"]["Tables"]["households"]["Insert"];
export type WasteLog = Database["public"]["Tables"]["waste_logs"]["Row"];
export type WasteLogInsert = Database["public"]["Tables"]["waste_logs"]["Insert"];
export type WasteLogUpdate = Database["public"]["Tables"]["waste_logs"]["Update"];
export type UsFoodwasteCategory = Database["public"]["Tables"]["us_foodwaste_categories"]["Row"];
export type TelegramLinkToken = Database["public"]["Tables"]["telegram_link_tokens"]["Row"];
export type NotificationSettings = Database["public"]["Tables"]["notification_settings"]["Row"];
export type NotificationPreference = Database["public"]["Tables"]["notification_preferences"]["Row"];
