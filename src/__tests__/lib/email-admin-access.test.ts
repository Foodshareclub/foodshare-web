import { beforeEach, describe, expect, mock, test } from "bun:test";

const requireAdmin = mock(async () => {
  throw new Error("Admin access required");
});
const database = mock(() => {
  throw new Error("Database must not be accessed before authorization");
});
mock.module("@/lib/data/admin-check", () => ({ requireAdmin }));
mock.module("@/lib/supabase/admin", () => ({ createAdminClient: database }));
mock.module("@/lib/supabase/server", () => ({ createCachedClient: database }));

const { getEmailMonitoringData, getEmailLogs } = await import("@/lib/data/email/monitoring");
const { getBounceStats } = await import("@/lib/data/email/health");

describe("admin email data access", () => {
  beforeEach(() => {
    requireAdmin.mockClear();
    database.mockClear();
  });

  for (const [name, fetchData] of [
    ["monitoring", () => getEmailMonitoringData()],
    ["logs", () => getEmailLogs({})],
    ["bounce statistics", () => getBounceStats()],
  ] as const) {
    test(`rejects unauthorized ${name} reads before opening the database`, async () => {
      await expect(fetchData()).rejects.toThrow("Admin access required");
      expect(requireAdmin).toHaveBeenCalledTimes(1);
      expect(database).not.toHaveBeenCalled();
    });
  }
});
