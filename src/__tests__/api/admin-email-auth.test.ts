/**
 * Admin Email API Auth Tests
 * Verify all 10 email admin routes require authentication
 */

import { describe, it, expect, beforeEach, mock } from "bun:test";

// Mock state
let mockUser: { id: string } | null = null;
let mockIsAdmin = false;

// Mock Supabase server
mock.module("@/lib/supabase/server", () => ({
  createClient: () =>
    Promise.resolve({
      auth: {
        getUser: () => Promise.resolve({ data: { user: mockUser }, error: null }),
      },
    }),
}));

// Mock admin check
mock.module("@/lib/data/admin-check", () => ({
  checkUserIsAdmin: () => Promise.resolve({ isAdmin: mockIsAdmin, roles: mockIsAdmin ? ["admin"] : [] }),
}));

// Mock data functions to prevent actual DB calls
mock.module("@/lib/data/admin-email", () => ({
  getEmailLogs: () => Promise.resolve([]),
  getEmailDashboardStats: () => Promise.resolve({}),
  getQueuedEmails: () => Promise.resolve([]),
  getRecentCampaigns: () => Promise.resolve([]),
  getBounceStats: () => Promise.resolve({}),
  getActiveAutomations: () => Promise.resolve([]),
  getProviderHealth: () => Promise.resolve([]),
  getComprehensiveQuotaStatus: () => Promise.resolve([]),
  getAudienceSegments: () => Promise.resolve([]),
}));

mock.module("@/lib/data/automations", () => ({
  getEmailTemplates: () => Promise.resolve([]),
}));

// Import routes after mocks
const routes = [
  { name: "logs", path: "@/app/api/admin/email/logs/route" },
  { name: "stats", path: "@/app/api/admin/email/stats/route" },
  { name: "queue", path: "@/app/api/admin/email/queue/route" },
  { name: "campaigns", path: "@/app/api/admin/email/campaigns/route" },
  { name: "bounces", path: "@/app/api/admin/email/bounces/route" },
  { name: "automations", path: "@/app/api/admin/email/automations/route" },
  { name: "health", path: "@/app/api/admin/email/health/route" },
  { name: "quotas", path: "@/app/api/admin/email/quotas/route" },
  { name: "segments", path: "@/app/api/admin/email/segments/route" },
  { name: "templates", path: "@/app/api/admin/email/templates/route" },
];

function createRequest(url: string) {
  return new Request(url);
}

describe("Admin Email API Auth", () => {
  beforeEach(() => {
    mockUser = null;
    mockIsAdmin = false;
  });

  for (const route of routes) {
    describe(`/api/admin/email/${route.name}`, () => {
      it("returns 401 when not authenticated", async () => {
        mockUser = null;
        mockIsAdmin = false;

        const mod = await import(`../../app/api/admin/email/${route.name}/route`);
        const request = createRequest(`http://localhost:3000/api/admin/email/${route.name}`);
        const response = await mod.GET(request);

        expect(response.status).toBe(401);
        const body = await response.json();
        expect(body.error).toBe("Unauthorized");
      });

      it("returns 403 when authenticated but not admin", async () => {
        mockUser = { id: "user-123" };
        mockIsAdmin = false;

        const mod = await import(`../../app/api/admin/email/${route.name}/route`);
        const request = createRequest(`http://localhost:3000/api/admin/email/${route.name}`);
        const response = await mod.GET(request);

        expect(response.status).toBe(403);
        const body = await response.json();
        expect(body.error).toBe("Admin access required");
      });

      it("returns 200 when authenticated as admin", async () => {
        mockUser = { id: "admin-456" };
        mockIsAdmin = true;

        const mod = await import(`../../app/api/admin/email/${route.name}/route`);
        const request = createRequest(`http://localhost:3000/api/admin/email/${route.name}`);
        const response = await mod.GET(request);

        expect(response.status).toBe(200);
      });
    });
  }
});
