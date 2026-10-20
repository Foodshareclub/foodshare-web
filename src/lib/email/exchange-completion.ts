import "server-only";

/**
 * Exchange-completion emails.
 *
 * Deliberately NOT a `'use server'` module. The previous implementation lived in
 * `src/app/actions/email.ts`, which made it a publicly reachable server-action
 * endpoint: Next ships a client-reference proxy for every export of a
 * `'use server'` file, so anyone could POST the action ID with an arbitrary
 * `to` address and attacker-chosen `itemName` / `otherPartyName` and have the
 * app send a branded "exchange complete, leave a review" email from our sending
 * domain. It also had no auth check, and its only caller passed a different
 * argument shape than it accepted, so every call silently threw into a `catch`.
 *
 * This module has no action boundary: it can only be reached from server code.
 * Callers are responsible for having authenticated the user and derived the
 * recipient server-side — `completeExchange` in `src/app/actions/chat.ts` does
 * exactly that (session check, then participation check on the room, then
 * profiles read from the room row rather than from arguments).
 */

import { sendEmailNotification } from "@/lib/notifications";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const ExchangeCompletionSchema = z.object({
  to: z.string().email("Invalid recipient email address"),
  recipientName: z.string().min(1),
  otherPartyName: z.string().min(1),
  itemName: z.string().min(1),
  role: z.enum(["sharer", "requester"]),
  roomId: z.string().uuid(),
});

export type ExchangeCompletionEmailData = z.infer<typeof ExchangeCompletionSchema>;

export type ExchangeCompletionResult =
  | { success: true }
  | { success: false; reason: "VALIDATION_ERROR" | "NOT_FOUND" | "INTERNAL_ERROR"; error: string };

/**
 * Send the "exchange complete" email for one party.
 *
 * Best-effort by design: a delivery failure must never fail the caller's
 * mutation, so this returns a result rather than throwing.
 */
export async function sendExchangeCompletionEmail(
  input: ExchangeCompletionEmailData,
): Promise<ExchangeCompletionResult> {
  const parsed = ExchangeCompletionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      reason: "VALIDATION_ERROR",
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }
  const data = parsed.data;

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://foodshare.club";
  const reviewUrl = `${baseUrl}/chat?room=${data.roomId}&action=review`;

  const roleText =
    data.role === "sharer"
      ? `You shared "${data.itemName}" with ${data.otherPartyName}`
      : `You received "${data.itemName}" from ${data.otherPartyName}`;

  const subject = `🎉 Exchange Complete - ${data.itemName}`;

  try {
    const supabase = await createClient();
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", data.to)
      .single();

    if (profileError || !profile) {
      return { success: false, reason: "NOT_FOUND", error: "Recipient not found" };
    }

    const result = await sendEmailNotification({
      userId: profile.id,
      type: "arrangement_completed",
      title: subject,
      body: roleText,
      data: {
        recipientName: data.recipientName,
        otherPartyName: data.otherPartyName,
        itemName: data.itemName,
        role: data.role,
        roomId: data.roomId,
        reviewUrl,
      },
    });

    if (!result.success) {
      return {
        success: false,
        reason: "INTERNAL_ERROR",
        error: result.error || "Failed to send notification",
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      reason: "INTERNAL_ERROR",
      error: error instanceof Error ? error.message : "Failed to send email",
    };
  }
}
