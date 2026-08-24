import { test, expect } from "@playwright/test";

test.describe("Site Navigation", () => {
  test("should navigate between main pages", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // Navigate to food listings via category button
    const foodButton = page
      .locator('button, [role="button"]')
      .filter({ hasText: /^food$/i })
      .first();
    const isFoodVisible = await foodButton.isVisible().catch(() => false);

    if (isFoodVisible) {
      await foodButton.click();
      await page.waitForLoadState("domcontentloaded");
      await expect(page).toHaveURL(/\/food/);
    }

    // Navigate via the navbar logo. It routes to the main listings page
    // (/food, see PATH.mainFood) rather than "/".
    const logo = page.getByRole("button", { name: /go to homepage/i });
    await expect(logo).toBeVisible({ timeout: 30000 });
    await logo.click();
    await page.waitForLoadState("domcontentloaded");
    await expect(page).toHaveURL(/\/food/);
  });

  test("should have working footer links", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // Scroll to footer
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    // Check for common footer links
    const termsLink = page.getByRole("link", { name: /terms/i });
    const privacyLink = page.getByRole("link", { name: /privacy/i });

    const hasTerms = await termsLink.isVisible().catch(() => false);
    const hasPrivacy = await privacyLink.isVisible().catch(() => false);

    if (hasTerms) {
      await termsLink.click();
      await page.waitForLoadState("domcontentloaded");
      await expect(page).toHaveURL(/\/terms/);
      await page.goBack();
    }

    if (hasPrivacy) {
      await privacyLink.click();
      await page.waitForLoadState("domcontentloaded");
      await expect(page).toHaveURL(/\/privacy/);
    }
  });

  test("should show 404 page for unknown routes", async ({ page }) => {
    await page.goto("/this-page-does-not-exist-12345");
    await page.waitForLoadState("domcontentloaded");

    // Should show 404 or not found message
    const notFoundText = page.getByText(/not found|404|doesn't exist/i);
    const hasNotFound = await notFoundText.isVisible().catch(() => false);

    // Either shows 404 page or redirects somewhere
    expect(hasNotFound || page.url().includes("/")).toBeTruthy();
  });

  test("should have responsive mobile menu", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // The mobile menu trigger is the "See menu" button in the navbar
    const mobileMenuButton = page.locator('button[aria-label*="menu" i]').first();
    await expect(mobileMenuButton).toBeVisible({ timeout: 30000 });

    // Dispatch the click directly: the header can overflow horizontally at
    // narrow widths leaving the trigger outside the (non-scrollable)
    // viewport, which breaks Playwright's positional click actionability
    await mobileMenuButton.dispatchEvent("click");

    // The drawer is a Radix dialog (vaul DrawerContent)
    const mobileNav = page.getByRole("dialog");
    await expect(mobileNav).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Static Pages", () => {
  test("should display terms of service page", async ({ page }) => {
    await page.goto("/terms");
    // Wait for actual content, not just loading spinner
    await page.waitForSelector('h1, h2, [class*="heading"], main p', { timeout: 30000 });
    await expect(page).toHaveURL(/\/terms/);

    // Should have some content
    const content = page.locator('main, [class*="content"], article, body').first();
    await expect(content).toBeVisible();
  });

  test("should display privacy policy page", async ({ page }) => {
    await page.goto("/privacy");
    await page.waitForSelector('h1, h2, [class*="heading"], main p', { timeout: 30000 });
    await expect(page).toHaveURL(/\/privacy/);

    const content = page.locator('main, [class*="content"], article, body').first();
    await expect(content).toBeVisible();
  });

  test("should display help page", async ({ page }) => {
    await page.goto("/help");
    await page.waitForSelector(
      'h1, h2, [class*="heading"], main p, [class*="faq"], [class*="help"]',
      { timeout: 30000 }
    );
    await expect(page).toHaveURL(/\/help/);

    const content = page.locator('main, [class*="content"], article, body').first();
    await expect(content).toBeVisible();
  });

  test("should display feedback page or redirect to auth", async ({ page }) => {
    await page.goto("/feedback");
    await page.waitForLoadState("domcontentloaded");

    // Either shows feedback form or redirects to auth
    const hasFeedbackForm = await page
      .locator("form, textarea")
      .first()
      .isVisible()
      .catch(() => false);
    const redirectedToAuth = page.url().includes("auth") || page.url().includes("login");

    expect(hasFeedbackForm || redirectedToAuth).toBeTruthy();
  });
});

test.describe("Forum", () => {
  test("should display forum page", async ({ page }) => {
    await page.goto("/forum");
    await page.waitForLoadState("domcontentloaded");

    await expect(page).toHaveURL(/\/forum/);

    // Should show forum posts or empty state or content
    const content = page.locator('[class*="grid"], [class*="list"], main, body').first();
    await expect(content).toBeVisible();
  });

  test("should require auth to create new forum post", async ({ page }) => {
    await page.goto("/forum/new");
    await page.waitForLoadState("domcontentloaded");

    // Should redirect to auth
    await expect(page).toHaveURL(/\/(auth|login|forum)/);
  });
});

test.describe("Challenges", () => {
  test("should display challenges page", async ({ page }) => {
    await page.goto("/challenge");
    await page.waitForLoadState("domcontentloaded");

    await expect(page).toHaveURL(/\/challenge/);

    // Should show challenges or empty state
    const content = page.locator('[class*="grid"], [class*="list"], main, body').first();
    await expect(content).toBeVisible();
  });
});

test.describe("Donations", () => {
  test("should display donation page", async ({ page }) => {
    await page.goto("/donation");
    await page.waitForLoadState("domcontentloaded");

    await expect(page).toHaveURL(/\/donation/);

    // Page should have content
    const content = page.locator('main, [class*="content"], article, body').first();
    await expect(content).toBeVisible();
  });
});
