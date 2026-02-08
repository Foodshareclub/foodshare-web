import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration for FoodShare E2E tests
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  // Test directory
  testDir: "./e2e",

  // Run tests in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry failed tests (helps with flaky tests in SSR apps)
  retries: process.env.CI ? 2 : 1,

  // Limit parallel workers on CI
  workers: process.env.CI ? 1 : undefined,

  // Global timeout for each test (SSR apps may need more time)
  timeout: 60000,

  // Expect timeout (for assertions)
  expect: {
    timeout: 15000,
  },

  // Reporter configuration
  reporter: [["html", { open: "never" }], ["list"]],

  // Shared settings for all projects
  use: {
    // Base URL for navigation
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000",

    // Timeouts for navigation and actions (SSR/streaming needs more time)
    navigationTimeout: 30000,
    actionTimeout: 15000,

    // Collect trace when retrying failed tests
    trace: "on-first-retry",

    // Screenshot on failure
    screenshot: "only-on-failure",

    // Video on failure
    video: "on-first-retry",
  },

  // Configure projects for major browsers
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },

    // Uncomment to add more browsers
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },

    // Mobile viewports
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },
  ],

  // Run local dev server before starting tests (skip if SKIP_WEBSERVER is set)
  ...(process.env.SKIP_WEBSERVER
    ? {}
    : {
        webServer: {
          command: "bun run dev",
          url: "http://localhost:3000",
          reuseExistingServer: true,
          timeout: 120 * 1000,
        },
      }),
});
