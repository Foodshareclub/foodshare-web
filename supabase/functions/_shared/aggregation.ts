/**
 * Aggregation utilities for BFF-style responses
 * Consolidates multiple queries into single responses
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "./logger.ts";

export async function aggregateCounts(
  supabase: SupabaseClient,
  userId: string,
) {
  // Single RPC call replaces 3 sequential COUNT queries
  const { data, error } = await supabase.rpc("get_user_unread_counts", {
    p_user_id: userId,
  });

  if (error || !data || data.length === 0) {
    // Fallback to individual queries if RPC fails.
    //
    // `notifications` is the bulk-campaign table — it holds notification copy
    // and batch counters, keyed by `profile_id` — and has neither `user_id` nor
    // `read`. Per-user notifications are `in_app_notifications`, where "unread"
    // is `read_at IS NULL` rather than a boolean. The wrong relation made the
    // query fail; the count came back `null`; and the error was never read, so
    // every user was reported as having zero unread notifications. Zero is a
    // plausible answer to "how many unread?", which is what made it survive.
    //
    // The other two are left as they are and pinned in the column audit: no
    // migration creates a `chat_messages` or a `listing_requests`, so the
    // right table is a decision, not a rename.
    const [notifications, messages, requests] = await Promise.all([
      supabase.from("in_app_notifications").select("id", {
        count: "exact",
        head: true,
      }).eq("user_id", userId).is("read_at", null),
      supabase.from("chat_messages").select("id", {
        count: "exact",
        head: true,
      }).eq(
        "recipient_id",
        userId,
      ).eq("read", false),
      supabase.from("listing_requests").select("id", {
        count: "exact",
        head: true,
      }).eq(
        "owner_id",
        userId,
      ).eq("status", "pending"),
    ]);

    // The fallback's own errors are read here for the first time. `count` is
    // null both when a user has nothing unread and when the query failed, and
    // the two were previously indistinguishable — a broken fallback returned
    // confident zeros. It still does, because the response shape is three
    // numbers and changing that is a wider decision; what changes is that it is
    // now visible in the logs when it happens.
    for (
      const [name, result] of [
        ["in_app_notifications", notifications],
        ["chat_messages", messages],
        ["listing_requests", requests],
      ] as const
    ) {
      if (result.error) {
        logger.warn("Unread-count fallback query failed", {
          relation: name,
          userId,
          error: result.error.message,
        });
      }
    }

    return {
      notifications: notifications.count ?? 0,
      messages: messages.count ?? 0,
      requests: requests.count ?? 0,
    };
  }

  const row = data[0];
  return {
    notifications: row.unread_notifications || 0,
    messages: row.unread_messages || 0,
    requests: row.pending_requests || 0,
  };
}

export async function aggregateStats(supabase: SupabaseClient, userId: string) {
  // The column names here did not match the schema: `posts` has `profile_id`
  // and `is_active`, not `user_id` and `status`, and `reviews` has
  // `profile_id` and `reviewed_rating`, not `reviewee_id` and `rating`.
  // PostgREST rejects each statement outright, so every count came back zero
  // and the average rating was always null — a profile page reporting that
  // the user had shared nothing and been reviewed by nobody, however much
  // they had actually done.
  const [shared, received, active, ratings] = await Promise.all([
    supabase.from("posts").select("id", { count: "exact", head: true }).eq(
      "profile_id",
      userId,
    ).eq(
      "is_arranged",
      false,
    ),
    supabase.from("listing_requests").select("id", {
      count: "exact",
      head: true,
    }).eq(
      "requester_id",
      userId,
    ).eq("status", "completed"),
    supabase.from("posts").select("id", { count: "exact", head: true }).eq(
      "profile_id",
      userId,
    ).eq(
      "is_active",
      true,
    ),
    supabase.from("reviews").select("reviewed_rating").eq("profile_id", userId),
  ]);

  const avgRating = ratings.data?.length
    ? ratings.data.reduce((sum, r) => sum + r.reviewed_rating, 0) /
      ratings.data.length
    : null;

  return {
    itemsShared: shared.count || 0,
    itemsReceived: received.count || 0,
    activeListings: active.count || 0,
    rating: avgRating,
    ratingCount: ratings.data?.length || 0,
  };
}

export async function aggregateImpact(
  supabase: SupabaseClient,
  userId: string,
) {
  const { data } = await supabase
    .from("user_impact")
    .select("food_saved_kg,co2_saved_kg,meals_provided")
    .eq("user_id", userId)
    .single();

  return data || { food_saved_kg: 0, co2_saved_kg: 0, meals_provided: 0 };
}
