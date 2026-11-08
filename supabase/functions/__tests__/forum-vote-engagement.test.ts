/**
 * Forum vote + engagement toggle tests
 *
 * Two production defects this file pins:
 *
 * 1. `votePoll` hand-rolled a `forum_poll_votes` insert and then called
 *    `increment_poll_option_votes` — a function that was never created (see
 *    the "called, never defined" ratchet in rpc-signatures.test.ts). The
 *    call was swallowed in a try/catch whose comment claimed "triggers may
 *    handle this", but no trigger touches `forum_poll_options.votes_count`.
 *    Net effect: vote counts never moved, polls stayed votable after
 *    `ends_at`, and single-choice polls accepted a second vote. The schema's
 *    intended RPC is `cast_poll_vote` — SECURITY DEFINER, handles the
 *    deadline, single-choice switching, counts and the total — and it is the
 *    same RPC the mobile client already calls.
 *
 * 2. The four `EngagementService` toggles never inspected the `error` on
 *    their write, so a failed insert/delete reported success to the user.
 *    Every other method in the file throws on error; these four were the
 *    exception.
 */

import { assertEquals, assertRejects } from "@std/assert";
import type { SupabaseClient } from "@supabase/supabase-js";

import { ValidationError } from "../_shared/errors.ts";
import type { HandlerContext } from "../_shared/api-handler.ts";
import { EngagementService } from "../api-v1-forum/lib/engagement-service.ts";
import { votePoll } from "../api-v1-forum/lib/reactions.ts";
import { createMockRequest, createMockSupabaseClient, setupTestEnv } from "./test-utils.ts";

const POLL_ID = "11111111-1111-4111-8111-111111111111";
const OPTION_ID = "22222222-2222-4222-8222-222222222222";
const USER_ID = "33333333-3333-4333-8333-333333333333";

// ============================================================================
// votePoll
// ============================================================================

interface RpcCall {
  name: string;
  params?: unknown;
}

function recordingClient(
  rpcData: unknown,
  rpcError: unknown = null,
): { client: SupabaseClient<any, any, any>; calls: RpcCall[] } {
  const calls: RpcCall[] = [];
  const client = {
    rpc: async (name: string, params?: unknown) => {
      calls.push({ name, params });
      return { data: rpcData, error: rpcError };
    },
  };
  return {
    client: client as unknown as SupabaseClient<any, any, any>,
    calls,
  };
}

function voteCtx(supabase: SupabaseClient<any, any, any>): HandlerContext {
  const request = createMockRequest({
    method: "POST",
    path: "/functions/v1/api-v1-forum",
    searchParams: { action: "vote" },
  });
  return {
    request,
    userId: USER_ID,
    supabase,
    body: { pollId: POLL_ID, optionId: OPTION_ID },
    query: { action: "vote" },
    corsHeaders: {},
  } as unknown as HandlerContext;
}

Deno.test({
  name: "Forum vote + engagement toggles",
  fn: async (t) => {
    setupTestEnv();

    const pollResult = {
      poll_id: POLL_ID,
      total_votes: 1,
      user_votes: [OPTION_ID],
      options: [
        {
          id: OPTION_ID,
          option_text: "Yes",
          votes_count: 1,
          percentage: 100,
        },
      ],
    };

    await t.step("votePoll routes through cast_poll_vote with the poll and option", async () => {
      const { client, calls } = recordingClient(pollResult);
      const response = await votePoll(voteCtx(client));

      assertEquals(response.status, 201);
      const payload = await response.json();
      assertEquals(payload.success, true);
      assertEquals(payload.data, pollResult);
      assertEquals(calls.length, 1);
      assertEquals(calls[0].name, "cast_poll_vote");
      assertEquals(calls[0].params, {
        p_poll_id: POLL_ID,
        p_option_ids: [OPTION_ID],
      });
    });

    await t.step("votePoll rejects voting on a poll that has ended", async () => {
      const { client } = recordingClient(null, {
        message: "Poll has ended",
        code: "P0001",
      });
      await assertRejects(
        () => votePoll(voteCtx(client)),
        ValidationError,
        "This poll has ended",
      );
    });

    await t.step("votePoll rejects an option that belongs to another poll", async () => {
      const { client } = recordingClient(null, {
        message: "Invalid option for this poll",
        code: "P0001",
      });
      await assertRejects(
        () => votePoll(voteCtx(client)),
        ValidationError,
        "does not belong to this poll",
      );
    });

    await t.step("votePoll surfaces unexpected RPC failures", async () => {
      const { client } = recordingClient(null, {
        message: "boom",
        code: "XX000",
      });
      await assertRejects(
        () => votePoll(voteCtx(client)),
        ValidationError,
        "Failed to vote: boom",
      );
    });

    // ========================================================================
    // EngagementService toggles: a failed write must not report success
    // ========================================================================

    const toggleErrors = (table: string) => {
      const client = createMockSupabaseClient({
        queryErrors: new Map([[table, new Error("write failed")]]),
      }) as unknown as SupabaseClient<any, any, any>;
      return new EngagementService(client, USER_ID);
    };

    await t.step("toggleLike throws when the insert fails", async () => {
      const service = toggleErrors("likes");
      await assertRejects(() => service.toggleLike(42), Error, "write failed");
    });

    await t.step("toggleBookmark throws when the delete fails", async () => {
      const client = createMockSupabaseClient({
        queryResults: new Map([["bookmarks", [{ id: 7 }]]]),
        queryErrors: new Map([["bookmarks", new Error("delete failed")]]),
      }) as unknown as SupabaseClient<any, any, any>;
      const service = new EngagementService(client, USER_ID);
      await assertRejects(() => service.toggleBookmark(42), Error, "delete failed");
    });

    await t.step("toggleReaction throws when the insert fails", async () => {
      const client = createMockSupabaseClient({
        queryResults: new Map([["reaction_types", [{ id: 9 }]]]),
        queryErrors: new Map([["forum_reactions", new Error("reaction write failed")]]),
      }) as unknown as SupabaseClient<any, any, any>;
      const service = new EngagementService(client, USER_ID);
      await assertRejects(
        () => service.toggleReaction(42, "thanks"),
        Error,
        "reaction write failed",
      );
    });

    await t.step("toggleSubscription throws when the insert fails", async () => {
      const service = toggleErrors("forum_subscriptions");
      await assertRejects(
        () => service.toggleSubscription(42),
        Error,
        "write failed",
      );
    });

    // Contract pins: the success paths keep their shapes.

    await t.step("toggleLike adds a like when none exists", async () => {
      const client = createMockSupabaseClient() as unknown as SupabaseClient<any, any, any>;
      const service = new EngagementService(client, USER_ID);
      assertEquals(await service.toggleLike(42), { liked: true });
    });

    await t.step("toggleLike removes a like when one exists", async () => {
      const client = createMockSupabaseClient({
        queryResults: new Map([["likes", [{ id: 7 }]]]),
      }) as unknown as SupabaseClient<any, any, any>;
      const service = new EngagementService(client, USER_ID);
      assertEquals(await service.toggleLike(42), { liked: false });
    });

    await t.step("toggleBookmark reports the bookmarked state", async () => {
      const client = createMockSupabaseClient() as unknown as SupabaseClient<any, any, any>;
      const service = new EngagementService(client, USER_ID);
      assertEquals(await service.toggleBookmark(42), { bookmarked: true });
    });

    await t.step("toggleReaction adds a reaction for a known type", async () => {
      const client = createMockSupabaseClient({
        queryResults: new Map([["reaction_types", [{ id: 9 }]]]),
      }) as unknown as SupabaseClient<any, any, any>;
      const service = new EngagementService(client, USER_ID);
      assertEquals(await service.toggleReaction(42, "thanks"), {
        reacted: true,
        reactionType: "thanks",
      });
    });
  },
});
