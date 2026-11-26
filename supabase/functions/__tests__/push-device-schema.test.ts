import { assertEquals, assertExists } from "@std/assert";
import { PushChannelAdapter } from "../api-v1-notifications/lib/channels/push.ts";
import type { NotificationContext } from "../api-v1-notifications/lib/types.ts";

Deno.test("push device lookup uses the migrated schema and isolates the recipient", async () => {
  const migration = await Deno.readTextFile(
    new URL("../../migrations/20260128195318_baseline.sql", import.meta.url),
  );
  const table = migration.match(/CREATE TABLE public\.device_tokens \(([\s\S]*?)\n\);/);
  assertExists(table);
  const columns = new Set(
    [...table[1].matchAll(/^ {4}([a-z_][a-z_0-9]*) /gm)].map((match) => match[1]),
  );
  const recipient = "00000000-0000-4000-8000-000000000001";
  const devices = [
    { profile_id: recipient, token: "recipient-token", platform: "ios" },
    { profile_id: "another-owner", token: "other-token", platform: "android" },
  ];
  let rows = devices;
  const query = {
    select(value: string) {
      for (const column of value.split(",")) assertEquals(columns.has(column), true);
      return this;
    },
    eq(column: string, value: unknown) {
      assertEquals(columns.has(column), true, `Unknown device_tokens column: ${column}`);
      rows = rows.filter((row) => row[column as keyof typeof row] === value);
      return this;
    },
    then(resolve: (value: unknown) => unknown) {
      return Promise.resolve(resolve({ data: rows, error: null }));
    },
  };
  const context = {
    userId: recipient,
    requestId: "schema-contract",
    supabase: {
      from(tableName: string) {
        assertEquals(tableName, "device_tokens");
        return query;
      },
    },
  } as unknown as NotificationContext;
  const adapter = new PushChannelAdapter() as unknown as {
    getUserDevices(context: NotificationContext): Promise<unknown[]>;
  };
  assertEquals(await adapter.getUserDevices(context), [devices[0]]);
});
