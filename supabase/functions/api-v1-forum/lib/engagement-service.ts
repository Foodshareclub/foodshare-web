/**
 * Engagement Service
 *
 * Business logic for likes, bookmarks, reactions, and subscriptions.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "../../_shared/logger.ts";

export class EngagementService {
  constructor(
    private supabase: SupabaseClient<any, any, any>,
    private userId: string,
  ) {}

  async toggleLike(forumId: number) {
    const { data: existing } = await this.supabase
      .from("likes")
      .select("id")
      .eq("forum_id", forumId)
      .eq("profile_id", this.userId)
      .maybeSingle();

    if (existing) {
      const { error } = await this.supabase
        .from("likes")
        .delete()
        .eq("id", existing.id);

      // A write that reports success while failing is how the toggles in
      // this file have broken before; every other method here throws.
      if (error) throw error;

      logger.info("Like removed", { forumId });
      return { liked: false };
    } else {
      const { error } = await this.supabase
        .from("likes")
        .insert({ forum_id: forumId, profile_id: this.userId });

      if (error) throw error;

      logger.info("Like added", { forumId });
      return { liked: true };
    }
  }

  async toggleBookmark(forumId: number) {
    const { data: existing } = await this.supabase
      .from("bookmarks")
      .select("id")
      .eq("forum_id", forumId)
      .eq("profile_id", this.userId)
      .maybeSingle();

    if (existing) {
      const { error } = await this.supabase
        .from("bookmarks")
        .delete()
        .eq("id", existing.id);

      if (error) throw error;

      logger.info("Bookmark removed", { forumId });
      return { bookmarked: false };
    } else {
      const { error } = await this.supabase
        .from("bookmarks")
        .insert({ forum_id: forumId, profile_id: this.userId });

      if (error) throw error;

      logger.info("Bookmark added", { forumId });
      return { bookmarked: true };
    }
  }

  async toggleReaction(forumId: number, reactionType: string) {
    // `forum_reactions` stores `reaction_type_id`, not a `reaction_type`
    // text column. The old statements named the text column throughout, so
    // the select returned nothing, every call fell through to the insert
    // branch, and the insert itself failed — the toggle never added,
    // removed or changed a reaction, and returned success while doing so.
    // `reaction_types(id, name)` is the lookup the schema intends.
    const { data: typeRow } = await this.supabase
      .from("reaction_types")
      .select("id")
      .eq("name", reactionType)
      .maybeSingle();

    if (!typeRow) {
      logger.warn("Unknown reaction type", { forumId, reactionType });
      return { reacted: false, reactionType: null };
    }
    const reactionTypeId = typeRow.id as number;

    const { data: existing } = await this.supabase
      .from("forum_reactions")
      .select("id,reaction_type_id")
      .eq("forum_id", forumId)
      .eq("profile_id", this.userId)
      .maybeSingle();

    if (existing) {
      if (existing.reaction_type_id === reactionTypeId) {
        const { error } = await this.supabase
          .from("forum_reactions")
          .delete()
          .eq("id", existing.id);

        if (error) throw error;

        logger.info("Reaction removed", { forumId, reactionType });
        return { reacted: false, reactionType: null };
      } else {
        const { error } = await this.supabase
          .from("forum_reactions")
          .update({ reaction_type_id: reactionTypeId })
          .eq("id", existing.id);

        if (error) throw error;

        logger.info("Reaction updated", { forumId, reactionType });
        return { reacted: true, reactionType };
      }
    } else {
      const { error } = await this.supabase
        .from("forum_reactions")
        .insert({
          forum_id: forumId,
          profile_id: this.userId,
          reaction_type_id: reactionTypeId,
        });

      if (error) throw error;

      logger.info("Reaction added", { forumId, reactionType });
      return { reacted: true, reactionType };
    }
  }

  async toggleSubscription(forumId: number) {
    const { data: existing } = await this.supabase
      .from("forum_subscriptions")
      .select("id")
      .eq("forum_id", forumId)
      .eq("profile_id", this.userId)
      .maybeSingle();

    if (existing) {
      const { error } = await this.supabase
        .from("forum_subscriptions")
        .delete()
        .eq("id", existing.id);

      if (error) throw error;

      logger.info("Subscription removed", { forumId });
      return { subscribed: false };
    } else {
      const { error } = await this.supabase
        .from("forum_subscriptions")
        .insert({ forum_id: forumId, profile_id: this.userId });

      if (error) throw error;

      logger.info("Subscription added", { forumId });
      return { subscribed: true };
    }
  }

  async getBookmarks(limit: number, offset: number) {
    const { data, error } = await this.supabase
      .from("bookmarks")
      .select(`
        forum_id,
        created_at,
        forum:forum(*)
      `)
      .eq("profile_id", this.userId)
      // The unified bookmarks table also holds listing bookmarks (post_id);
      // forum bookmarks are the rows with a forum_id, same convention as the
      // get_forum_feed_data / get_forum_post_detail RPCs.
      .gte("forum_id", 1)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return data;
  }

  async getDrafts(limit: number) {
    const { data, error } = await this.supabase
      .from("forum_drafts")
      .select("*")
      .eq("profile_id", this.userId)
      // `last_saved_at`, not `updated_at`: forum_drafts has no updated_at,
      // so the ordering column was rejected and drafts were never listed.
      .order("last_saved_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  }

  async saveDraft(
    input: { title: string; content: string; categoryId?: number },
  ) {
    const { data, error } = await this.supabase
      .from("forum_drafts")
      .upsert({
        profile_id: this.userId,
        title: input.title,
        // `forum_drafts` stores `rich_content` and `last_saved_at`; `content`
        // and `updated_at` are neither of them, and PostgREST rejects the whole
        // upsert when one key is wrong — so saving a draft failed outright.
        rich_content: input.content,
        category_id: input.categoryId || null,
        last_saved_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (error) throw error;

    logger.info("Draft saved", { draftId: data.id });
    return data;
  }

  async deleteDraft(draftId: number) {
    const { error } = await this.supabase
      .from("forum_drafts")
      .delete()
      .eq("id", draftId)
      .eq("profile_id", this.userId);

    if (error) throw error;

    logger.info("Draft deleted", { draftId });
  }

  async submitReport(
    input: {
      forumId?: number;
      commentId?: number;
      reason: string;
      details?: string;
    },
  ) {
    const { data, error } = await this.supabase
      .from("forum_reports")
      .insert({
        forum_id: input.forumId || null,
        comment_id: input.commentId || null,
        reporter_id: this.userId,
        reason: input.reason,
        // The column is `description`. `details` is not a column of
        // `forum_reports`, so every report was rejected by PostgREST.
        description: input.details || null,
      })
      .select("*")
      .single();

    if (error) throw error;

    logger.info("Report submitted", { reportId: data.id });
    return data;
  }
}
