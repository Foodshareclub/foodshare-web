import { assertEquals, assertRejects } from "./test-utils.ts";
import type { HandlerContext } from "../_shared/api-handler.ts";
import { type ListQuery, listRooms } from "../api-v1-chat/lib/generic.ts";

const userId = "11111111-1111-4111-8111-111111111111";
function context(data: unknown, error: unknown = null) {
  return {
    userId,
    query: { limit: "1" },
    corsHeaders: {},
    supabase: {
      rpc(name: string, args: Record<string, unknown>) {
        assertEquals(name, "get_user_rooms");
        assertEquals(args.p_user_id, userId);
        return Promise.resolve({ data, error });
      },
    },
  } as unknown as HandlerContext<unknown, ListQuery>;
}

Deno.test("room listing consumes the RPC envelope and preserves last message and total", async () => {
  const response = await listRooms(context({
    success: true,
    rooms: [
      {
        id: "room-one",
        lastMessage: "Hello",
        lastMessageSentBy: "other",
        lastMessageTime: "2026-10-28",
        hasUnread: true,
      },
      { id: "room-two" },
    ],
    totalCount: 2,
  }));
  const body = await response.json();
  assertEquals(response.status, 200);
  assertEquals(body.data.length, 1);
  assertEquals(body.data[0].id, "room-one");
  assertEquals(body.data[0].lastMessage.content, "Hello");
  assertEquals(body.data[0].lastMessage.senderId, "other");
  assertEquals(body.data[0].unreadCount, 1);
  assertEquals(body.pagination.total, 2);
  assertEquals(body.pagination.hasMore, true);
});

Deno.test("room listing accepts an empty successful envelope", async () => {
  const response = await listRooms(context({ success: true, rooms: [], totalCount: 0 }));
  const body = await response.json();
  assertEquals(body.data, []);
  assertEquals(body.pagination.hasMore, false);
});

Deno.test("room listing rejects failed or malformed RPC responses instead of returning an empty inbox", async () => {
  for (
    const data of [null, [], { success: false, rooms: [], totalCount: 0 }, {
      success: true,
      rooms: null,
      totalCount: 0,
    }]
  ) {
    await assertRejects(() => listRooms(context(data)), Error, "Invalid room-list response");
  }
  await assertRejects(
    () => listRooms(context(null, new Error("database unavailable"))),
    Error,
    "database unavailable",
  );
});
