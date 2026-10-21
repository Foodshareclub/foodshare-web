/**
 * Authorization-before-transport invariant.
 *
 * Both admin action modules support a dual-mode transport: when
 * `USE_EDGE_FUNCTIONS_FOR_ADMIN=true` they call a remote edge function and
 * `return` — and they did that BEFORE calling `verifyAdminAccess()` /
 * `requireAdmin()`. So with the flag on, none of these actions authorized
 * anyone, and the guards that sat in the direct path (including
 * "cannot change your own role" and "cannot remove your own admin role") were
 * skipped entirely.
 *
 * The flag is read at module load, so these tests set the env var before the
 * dynamic import. The assertion is behavioural: an edge API function must never
 * even be reached by a non-admin.
 */

import { beforeEach, describe, expect, it, mock } from "bun:test";

process.env.USE_EDGE_FUNCTIONS_FOR_ADMIN = "true";

const mockState = {
  user: null as { id: string } | null,
  userRoles: [] as Array<{ roles: { name: string } }>,
  edgeCalls: [] as string[],
};

mock.module("next/cache", () => ({
  revalidatePath: mock(),
  revalidateTag: mock(),
  cacheLife: () => {},
  cacheTag: () => {},
}));

type AdminActionResult = { success: boolean; error?: string };
type AdminAction = (...args: unknown[]) => Promise<AdminActionResult>;

/** Resolves an exported admin action, failing loudly if the export is missing. */
function getAdminAction(mod: unknown, name: string): AdminAction {
  const action = (mod as never as Record<string, AdminAction | undefined>)[name];
  if (typeof action !== "function") {
    throw new Error(`admin-listings does not export "${name}"`);
  }
  return action;
}

mock.module("@/lib/supabase/server", () => ({
  createClient: mock(() =>
    Promise.resolve({
      auth: { getUser: mock(() => Promise.resolve({ data: { user: mockState.user }, error: null })) },
      from: mock(() => {
        throw new Error("direct Supabase path must not be reached for a non-admin");
      }),
    }),
  ),
  createCachedClient: mock(() => Promise.resolve({})),
}));

mock.module("@/lib/supabase/admin", () => ({
  createAdminClient: mock(() => ({
    from: mock((table: string) => {
      if (table === "user_roles") {
        return {
          select: mock(() => ({
            eq: mock(() => Promise.resolve({ data: mockState.userRoles, error: null })),
          })),
        };
      }
      throw new Error(`admin client must not reach table "${table}" for a non-admin`);
    }),
  })),
}));

const edgeSpy = (name: string) =>
  mock(() => {
    mockState.edgeCalls.push(name);
    return Promise.resolve({ success: true, data: {} });
  });

mock.module("@/lib/api", () => ({
  updateListingAPI: edgeSpy("updateListingAPI"),
  activateListingAPI: edgeSpy("activateListingAPI"),
  deactivateListingAPI: edgeSpy("deactivateListingAPI"),
  deleteListingAPI: edgeSpy("deleteListingAPI"),
  updateAdminNotesAPI: edgeSpy("updateAdminNotesAPI"),
  bulkActivateListingsAPI: edgeSpy("bulkActivateListingsAPI"),
  bulkDeactivateListingsAPI: edgeSpy("bulkDeactivateListingsAPI"),
  bulkDeleteListingsAPI: edgeSpy("bulkDeleteListingsAPI"),
  updateUserRolesAPI: edgeSpy("updateUserRolesAPI"),
  toUpdateListingRequest: (d: unknown) => d,
  banUserAPI: edgeSpy("banUserAPI"),
  unbanUserAPI: edgeSpy("unbanUserAPI"),
  updateUserRoleAPI: edgeSpy("updateUserRoleAPI"),
}));

const ADMIN_LISTINGS = [
  ["updateListing", [42, { post_name: "x" }]],
  ["activateListing", [42]],
  ["deactivateListing", [42, "spam"]],
  ["deleteListing", [42]],
  ["bulkActivateListings", [[1, 2]]],
  ["bulkDeactivateListings", [[1, 2], "spam"]],
  ["bulkDeleteListings", [[1, 2]]],
  ["updateAdminNotes", [42, "note"]],
  ["updateUserRoles", ["some-user-uuid", { admin: true }]],
] as const;

const ADMIN_ACTIONS = [
  ["updateUserRole", ["some-user-uuid", "admin"]],
  ["banUser", ["some-user-uuid", "spam"]],
  ["unbanUser", ["some-user-uuid"]],
] as const;

/**
 * Every exported action in these modules used to check only that a session
 * existed — or, in nine cases, nothing at all — and left the role to an RLS
 * policy on the far side of a service-role client. `requireAdmin()` in
 * `lib/data/admin-check` reads `user_roles` through the service role, and
 * `guardAdmin()` is its non-throwing form.
 *
 * The property asserted here is the *ordering*: the role check runs before any
 * client is built and before any query is issued. An action that authorised
 * after its first write would pass a "does it reject a non-admin" test and
 * still have leaked, which is the failure this file was written for.
 */
const ADMIN_ACTION_MODULES = [
  "src/app/actions/admin-email.ts",
  "src/app/actions/crm.ts",
  "src/app/actions/newsletter.ts",
] as const;

describe("admin actions authorize before choosing a transport", () => {
  beforeEach(() => {
    mockState.edgeCalls = [];
    mockState.user = null;
    mockState.userRoles = [];
  });

  describe("edge-function path enabled (USE_EDGE_FUNCTIONS_FOR_ADMIN=true)", () => {
    it("rejects an unauthenticated caller on every admin-listings action", async () => {
      const mod = await import("@/app/actions/admin-listings");
      for (const [name, args] of ADMIN_LISTINGS) {
        const result = await getAdminAction(mod, name)(...args);
        expect({ name, result }).toEqual({
          name,
          result: { success: false, error: "Not authenticated" },
        });
      }
      expect(mockState.edgeCalls).toEqual([]);
    });

    it("rejects an authenticated non-admin on every admin-listings action", async () => {
      mockState.user = { id: "attacker" };
      mockState.userRoles = [{ roles: { name: "user" } }];

      const mod = await import("@/app/actions/admin-listings");
      for (const [name, args] of ADMIN_LISTINGS) {
        const result = await getAdminAction(mod, name)(...args);
        expect(result.success).toBe(false);
      }
      expect(mockState.edgeCalls).toEqual([]);
    });

    it("rejects a non-admin on every admin.ts action", async () => {
      mockState.user = { id: "attacker" };
      mockState.userRoles = [{ roles: { name: "user" } }];

      const mod = await import("@/app/actions/admin");
      for (const [name, args] of ADMIN_ACTIONS) {
        const result = await getAdminAction(mod, name)(...args);
        expect(result.success).toBe(false);
      }
      expect(mockState.edgeCalls).toEqual([]);
    });

    it("blocks self-demotion on the edge path too", async () => {
      mockState.user = { id: "admin-1" };
      mockState.userRoles = [{ roles: { name: "admin" } }];

      const mod = await import("@/app/actions/admin-listings");
      const result = await mod.updateUserRoles("admin-1", { admin: false });

      expect(result).toEqual({
        success: false,
        error: "Cannot remove your own admin role",
      });
      expect(mockState.edgeCalls).toEqual([]);
    });
  });

  describe("admin action modules guard before they touch data", () => {
    it("declares a role check in every module", async () => {
      for (const file of ADMIN_ACTION_MODULES) {
        const src = await Bun.file(file).text();
        expect(src).toMatch(/requireAdmin\(|guardAdmin\(|requireAdminSession\(/);
      }
    });

    it("calls the guard before constructing a client in crm and newsletter", async () => {
      // These two build their own session client. A guard that ran after
      // `createClient()` would still be correct, but a guard that ran after the
      // first `.from(...)` would not be, so the assertion is on position.
      for (const file of ["src/app/actions/crm.ts", "src/app/actions/newsletter.ts"]) {
        const src = await Bun.file(file).text();
        const guardIdx = src.indexOf("requireAdminSession()");
        expect(guardIdx).toBeGreaterThan(-1);

        // `requireAdminSession` itself constructs the client — that is the
        // helper's business. What must not happen is an action building its
        // own client before calling the helper.
        const firstClientInAction = src.indexOf("await createClient()", src.indexOf("export async function"));
        expect(firstClientInAction).toBeGreaterThan(guardIdx);
      }
    });

    it("guards every exported action in admin-email", async () => {
      // Source-level rather than behavioural: this module forwards to edge
      // functions through a service-role client, so an unguarded action is not
      // observable in a unit test without mocking eight API functions. The
      // check is that no exported function body starts without the guard.
      const src = await Bun.file("src/app/actions/admin-email.ts").text();

      // "The guard is the first thing awaited" is the property. Asserted
      // per-function, with each function's slice bounded by the next
      // `export async function` — an unbounded `indexOf` would happily find the
      // *following* action's guard and pass an action that has none, which is
      // exactly the regression being guarded.
      //
      // Scoped to lines rather than to brace matching, because a return type
      // like `Promise<ActionResult<{ messageId: string }>>` contains a brace.
      const lines = src.split("\n");
      const exportLines = lines
        .map((line, index) => ({ line: line.trim(), index }))
        .filter(({ line }) => line.startsWith("export async function "));

      expect(exportLines.length).toBeGreaterThanOrEqual(8);

      for (let i = 0; i < exportLines.length; i++) {
        const body = lines
          .slice(exportLines[i].index)
          // Up to the next export, or the end of the file.
          .slice(0, (exportLines[i + 1]?.index ?? lines.length) - exportLines[i].index);

        const firstAwait = body.findIndex((line) => line.includes("await "));

        expect({ fn: exportLines[i].line, firstAwait }).toEqual({
          fn: exportLines[i].line,
          firstAwait: body.findIndex((line) => line.trim() === "const auth = await guardAdmin();"),
        });
      }
    });
  });

  describe("source-level ordering", () => {
    // Belt-and-braces: the behavioural tests above depend on the env var being
    // read before import. These assert the property directly in the source.
    it("places the admin check ahead of the USE_EDGE_FUNCTIONS branch", async () => {
      for (const file of ["src/app/actions/admin.ts", "src/app/actions/admin-listings.ts"]) {
        const src = await Bun.file(file).text();
        const guardIdx = Math.max(src.indexOf("verifyAdminAccess()"), src.indexOf("guardAdmin()"));
        expect(guardIdx).toBeGreaterThan(-1);

        // Every `if (USE_EDGE_FUNCTIONS)` must be preceded by a guard.
        let searchFrom = 0;
        for (;;) {
          const branchIdx = src.indexOf("if (USE_EDGE_FUNCTIONS)", searchFrom);
          if (branchIdx === -1) break;
          expect(branchIdx).toBeGreaterThan(guardIdx);
          searchFrom = branchIdx + 1;
        }
      }
    });
  });
});
