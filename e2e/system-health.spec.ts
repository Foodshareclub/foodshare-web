import { test, expect } from "@playwright/test";

test.describe("System Health Checks", () => {
  test("Web application health endpoint returns 200 OK", async ({ request }) => {
    // Attempt to hit the healthcheck route
    const response = await request.get("/api/health");

    // Verify HTTP status is 200
    expect(response.ok()).toBeTruthy();

    // Verify it is responding with JSON
    expect(response.headers()["content-type"]).toContain("application/json");

    // Verify the response body indicates health
    const data = await response.json();
    expect(data).toHaveProperty("status");
    expect(data.status).toBe("ok");
  });
});
