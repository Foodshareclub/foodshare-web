import { Page } from "@playwright/test";

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

  // Small delay for hydration to complete
  await page.waitForTimeout(500);
}

/**
 * Wait for a specific content element to appear (not just loading state)
 */
export async function waitForContent(
  page: Page,
  selector: string,
  options: { timeout?: number } = {}
) {
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
  options: { timeout?: number } = {}
) {
  const { timeout = 30000 } = options;

  await page.goto(url);
  await waitForContent(page, contentSelector, { timeout });
  await waitForHydration(page, { timeout: 5000 });
}
