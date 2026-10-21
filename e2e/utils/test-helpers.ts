import type { Page } from "@playwright/test";

/**
 * Whether the live API is reachable.
 *
 * The end-to-end suite runs against the estate's own API, not a stub, so
 * it can only answer questions about the app when the API is up. When the
 * API is down, a page that needs it fails with a pile of "element not
 * found" errors, which reads like a broken app and is not one: the app is
 * serving, and the thing it is talking to is not.
 *
 * So the reason is checked once and said out loud. The answer is cached:
 * the API does not come back mid-suite, and the check is a request.
 */
let apiReachable: boolean | undefined;

/**
 * Why the live API cannot be reached, or null when it can.
 *
 * The end-to-end suite runs against the estate's own API, not a stub, so
 * it can only answer questions about the app when the API is up. When the
 * API is down, a page that needs it fails with a pile of "element not
 * found" errors, which reads like a broken app and is not one: the app is
 * serving, and the thing it is talking to is not.
 *
 * So the reason is checked once and said out loud. The answer is cached:
 * the API does not come back mid-suite, and the check is a request.
 */
export async function liveApiUnavailableReason(): Promise<string | null> {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) {
    return "NEXT_PUBLIC_SUPABASE_URL is not set, so the live API cannot be reached";
  }
  if (apiReachable === undefined) {
    try {
      const response = await fetch(`${base}/auth/v1/settings`, {
        signal: AbortSignal.timeout(15000),
      });
      apiReachable = response.ok;
    } catch {
      apiReachable = false;
    }
  }
  return apiReachable ? null : "the live API is unreachable, so this cannot be answered";
}

/**
 * Wait for page to finish hydrating (SSR apps show loading spinners initially)
 * This waits for the loading spinner to disappear and actual content to appear.
 */
export async function waitForHydration(page: Page, options: { timeout?: number } = {}) {
  const { timeout = 30000 } = options;

  // Wait for the loading spinner to disappear (if present)
  const spinner = page.locator('.animate-spin, [class*="loading"], [class*="spinner"]');
  try {
    await spinner.waitFor({ state: "hidden", timeout: timeout });
  } catch {
    // Spinner may not exist on some pages
  }

  // Wait for domcontentloaded
  await page.waitForLoadState("domcontentloaded");

  // Small delay for hydration to complete - wait for any visible content
  try {
    await page.waitForSelector(":visible", { timeout: 2000, state: "visible" });
  } catch {
    // Content may not be immediately visible; continue anyway
  }
}

/**
 * Wait for a specific content element to appear (not just loading state)
 */
export async function waitForContent(page: Page, selector: string, options: { timeout?: number } = {}) {
  const { timeout = 30000 } = options;

  try {
    await page.waitForSelector(selector, { timeout, state: "visible" });
    return true;
  } catch {
    return false;
  }
}

/**
 * Safe navigation that waits for actual content, not just networkidle
 */
export async function navigateAndWait(
  page: Page,
  url: string,
  contentSelector: string,
  options: { timeout?: number } = {},
) {
  const { timeout = 30000 } = options;

  await page.goto(url);
  await waitForContent(page, contentSelector, { timeout });
  await waitForHydration(page, { timeout: 5000 });
}
