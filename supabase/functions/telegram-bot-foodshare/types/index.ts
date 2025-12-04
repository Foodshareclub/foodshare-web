/**
 * Type definitions for Telegram Bot
 */

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}

export interface TelegramCallbackQuery {
  id: string;
  from: TelegramUser;
  message: TelegramMessage;
  data: string;
}

export interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  date: number;
  text?: string;
  photo?: any[];
  video?: any;
  location?: { latitude: number; longitude: number };
  caption?: string;
  reply_to_message?: TelegramMessage;
}

export interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export interface TelegramChat {
  id: number;
  type: string;
}

export interface UserStats {
  user_id: number;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  message_count: number;
  first_message_date: string;
  last_message_date: string;
  total_characters: number;
  media_count: number;
  reply_count: number;
  active_days: string[];
  emoji_usage: Record<string, number>;
  most_used_words: Record<string, number>;
}

export interface Profile {
  id: string;
  telegram_id: number | null;
  email: string | null;
  email_verified: boolean;
  first_name: string | null;
  nickname: string | null;
  location: string | null; // PostGIS geography point
  verification_code: string | null;
  verification_code_expires_at: string | null;
  search_radius_km?: number;
  created_time?: string;
}

export interface UserState {
  action: string;
  data: any;
  step?: string;
}

export interface ImpactStats {
  foodsShared: number;
  foodsClaimed: number;
  kgSaved: number;
  co2Saved: number;
  moneySaved: number;
  memberSince: string;
  activeDays: number;
}
