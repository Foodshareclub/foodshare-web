/**
 * Telegram API service
 */

import { TELEGRAM_API } from "../config/index.ts";

export async function sendMessage(
  chatId: number,
  text: string,
  options: any = {}
): Promise<boolean> {
  try {
    const response = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: options.parse_mode || "HTML",
        ...options,
      }),
    });

    const result = await response.json();

    if (!result.ok) {
      console.error("Telegram API error:", result);
    }

    return result.ok;
  } catch (error) {
    console.error("Send message error:", error);
    return false;
  }
}

export async function sendPhoto(
  chatId: number,
  photo: string,
  caption?: string,
  options: any = {}
): Promise<boolean> {
  try {
    const response = await fetch(`${TELEGRAM_API}/sendPhoto`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        photo,
        caption,
        parse_mode: "HTML",
        ...options,
      }),
    });

    const result = await response.json();
    return result.ok;
  } catch (error) {
    console.error("Send photo error:", error);
    return false;
  }
}

export async function sendLocation(
  chatId: number,
  latitude: number,
  longitude: number
): Promise<boolean> {
  try {
    const response = await fetch(`${TELEGRAM_API}/sendLocation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        latitude,
        longitude,
      }),
    });

    const result = await response.json();
    return result.ok;
  } catch (error) {
    console.error("Send location error:", error);
    return false;
  }
}

export async function setWebhook(url: string): Promise<boolean> {
  try {
    const response = await fetch(`${TELEGRAM_API}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url,
        allowed_updates: ["message", "callback_query"],
      }),
    });

    const result = await response.json();
    return result.ok;
  } catch (error) {
    console.error("Set webhook error:", error);
    return false;
  }
}

export async function answerCallbackQuery(
  callbackQueryId: string,
  text?: string
): Promise<boolean> {
  try {
    const response = await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text,
      }),
    });

    const result = await response.json();
    return result.ok;
  } catch (error) {
    console.error("Answer callback query error:", error);
    return false;
  }
}
