/**
 * Metrics Event Tracking Handlers (POST /event + /events)
 *
 * Best-effort activity fan-out: RPC first, `user_events` insert second,
 * failures degrade to `{ tracked: false }` rather than 5xx.
 * Extracted from `api-v1-metrics/index.ts` — no logic changes.
 */

import { type HandlerContext, ok } from "../../../_shared/api-handler.ts";
import { logger } from "../../../_shared/logger.ts";
import type { BatchEventsRequest, EventRequest } from "../schemas.ts";

export const VALID_EVENT_TYPES = [
  "listing_view",
  "search",
  "share_complete",
  "message_sent",
  "feed_scroll",
  "save",
  "profile_view",
  "category_browse",
  "notification_opened",
  "app_open",
  "app_background",
] as const;

export function mapEventToActivityType(eventType: string): string {
  const mapping: Record<string, string> = {
    listing_view: "view",
    search: "search",
    share_complete: "share_complete",
    message_sent: "message",
    feed_scroll: "view",
    save: "save",
    profile_view: "view",
    category_browse: "view",
    notification_opened: "view",
    app_open: "view",
    app_background: "view",
  };
  return mapping[eventType] || "view";
}

export async function handleTrackEvent(
  ctx: HandlerContext<EventRequest>,
): Promise<Response> {
  const { supabase, userId, body } = ctx;

  if (!userId) {
    return ok({ tracked: false, reason: "auth_required" }, ctx);
  }

  const activityType = mapEventToActivityType(body.eventType);

  const { error } = await supabase.rpc("track_user_activity", {
    p_user_id: userId,
    p_activity_type: activityType,
    p_data: body.data || {},
  });

  if (error) {
    logger.error("Failed to track event", {
      error: error.message,
      eventType: body.eventType,
    });
    return ok({ tracked: false, reason: "database_error" }, ctx);
  }

  try {
    await supabase.from("user_events").insert({
      user_id: userId,
      event_type: body.eventType,
      event_data: body.data || {},
      created_at: new Date().toISOString(),
    });
  } catch {
    // Ignore - non-critical
  }

  return ok({ tracked: true, eventType: body.eventType }, ctx);
}

export async function handleTrackBatchEvents(
  ctx: HandlerContext<BatchEventsRequest>,
): Promise<Response> {
  const { supabase, userId, body } = ctx;

  if (!userId) {
    return ok({ tracked: 0, total: 0, reason: "auth_required" }, ctx);
  }

  const validEvents = body.events.filter((event) =>
    VALID_EVENT_TYPES.includes(
      event.eventType as typeof VALID_EVENT_TYPES[number],
    )
  );

  const results = await Promise.all(
    validEvents.map(async (event) => {
      try {
        const activityType = mapEventToActivityType(event.eventType);

        const { error } = await supabase.rpc("track_user_activity", {
          p_user_id: userId,
          p_activity_type: activityType,
          p_data: event.data || {},
        });

        if (error) {
          return false;
        }

        try {
          await supabase.from("user_events").insert({
            user_id: userId,
            event_type: event.eventType,
            event_data: event.data || {},
            created_at: new Date().toISOString(),
          });
        } catch {
          // Ignore - non-critical
        }

        return true;
      } catch {
        return false;
      }
    }),
  );

  const trackedCount = results.filter((success) => success).length;

  return ok({
    tracked: trackedCount,
    total: body.events.length,
    skipped: body.events.length - trackedCount,
  }, ctx);
}
