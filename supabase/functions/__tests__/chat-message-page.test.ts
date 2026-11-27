import { assertEquals, assertRejects } from "./test-utils.ts";
import type { HandlerContext } from "../_shared/api-handler.ts";
import { foodGetRoom, type ListQuery } from "../api-v1-chat/lib/food-chat.ts";

const userId = "11111111-1111-4111-8111-111111111111";
const otherId = "22222222-2222-4222-8222-222222222222";
const roomId = "33333333-3333-4333-8333-333333333333";
const id = (n: number) => `44444444-4444-4444-8444-${String(n).padStart(12, "0")}`;
const timestamp = "2026-11-26T10:00:00.123456+00:00";
function context(query: ListQuery, numbers = [1, 2, 3, 4], participant = true) {
  let messageReads = 0;
  const rows = numbers.map((n) => ({
    id: id(n),
    timestamp,
    room_id: roomId,
    text: "",
    profile_id: userId,
  }));
  const supabase = {
    from(table: string) {
      let filtered = rows.slice();
      const orders: { column: string; ascending: boolean }[] = [];
      const builder = {
        select() {
          if (table === "room_participants") messageReads++;
          return builder;
        },
        update() {
          return builder;
        },
        eq(column: string, value: string) {
          if (table === "room_participants") {
            filtered = filtered.filter((row) => row[column as "id"] === value);
          }
          return builder;
        },
        single() {
          return Promise.resolve({
            data: table === "rooms"
              ? {
                id: roomId,
                sharer: participant ? userId : otherId,
                requester: otherId,
              }
              : filtered[0] ?? null,
            error: null,
          });
        },
        lt(_column: string, value: string) {
          filtered = filtered.filter((row) => row.timestamp < value);
          return builder;
        },
        or(expression: string) {
          // All fixture messages share a microsecond-precision timestamp.
          // The actual handler must use the ID tie-breaker without rounding it.
          const match = expression.match(
            /^timestamp\.(lt|gt)\.(.+),and\(timestamp\.eq\.(.+),id\.(lt|gt)\.(.+)\)$/,
          );
          assertEquals(match?.[2], timestamp);
          assertEquals(match?.[3], timestamp);
          assertEquals(match?.[1], match?.[4]);
          filtered = filtered.filter((row) =>
            match![1] === "lt" ? row.id < match![5] : row.id > match![5]
          );
          return builder;
        },
        order(column: string, options: { ascending: boolean }) {
          orders.push({ column, ...options });
          return builder;
        },
        range(start: number, end: number) {
          filtered.sort((a, b) => {
            for (const order of orders) {
              const result = a[order.column as "id"].localeCompare(b[order.column as "id"]);
              if (result) return order.ascending ? result : -result;
            }
            return 0;
          });
          return Promise.resolve({ data: filtered.slice(start, end + 1), error: null });
        },
      };
      return builder;
    },
  };
  return {
    ctx: {
      userId,
      query: { roomId, limit: "2", ...query },
      corsHeaders: {},
      supabase,
    } as unknown as HandlerContext<unknown, ListQuery>,
    reads: () => messageReads,
  };
}
async function page(query: ListQuery, numbers?: number[]) {
  const response = await foodGetRoom(context(query, numbers).ctx);
  const body = await response.json();
  return body.data.messages.map((message: { id: string }) => message.id);
}
Deno.test("food chat opens the latest bounded page in chronological order", async () => {
  assertEquals(await page({}), [id(3), id(4)]);
});
Deno.test("history cursor retains equal-timestamp messages and ignores newer arrivals", async () => {
  assertEquals(await page({ messageCursor: id(3) }), [id(1), id(2)]);
  assertEquals(await page({ messageCursor: id(3) }, [1, 2, 3, 4, 5]), [id(1), id(2)]);
  assertEquals(await page({ messageCursor: id(2), messageDirection: "after" }), [id(3), id(4)]);
});
Deno.test("food chat honors the legacy offset and timestamp cutoff", async () => {
  assertEquals(await page({ offset: "2" }), [id(1), id(2)]);
  assertEquals(await page({ messagesBefore: timestamp }), []);
});
Deno.test("food chat rejects unavailable cursors and invalid paging before reading a page", async () => {
  await assertRejects(() => page({ messageCursor: id(99) }));
  for (const query of [{ limit: "NaN" }, { limit: "0" }, { offset: "-1" }, { offset: "1.5" }]) {
    const test = context(query);
    await assertRejects(() => foodGetRoom(test.ctx));
    assertEquals(test.reads(), 0);
  }
  const unauthorized = context({}, undefined, false);
  await assertRejects(() => foodGetRoom(unauthorized.ctx));
  assertEquals(unauthorized.reads(), 0);
});
