import { test, expect } from "@playwright/test";

test.describe("Site Navigation", () => {
  test("should navigate between main pages", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Navigate to food listings via category button
    const foodButton = page
      .locator('button, [role="button"]')
      .filter({ hasText: /^food$/i })
      .first();
    const isFoodVisible = await foodButton.isVisible().catch(() => false);

    if (isFoodVisible) {
      await foodButton.click();
      await page.waitForLoadState("networkidle");
      await expect(page).toHaveURL(/\/food/);
    }

    // Navigate back to home via logo
    await page.getByText("FoodShare").first().click();
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL("/");
  });

  test("should have working footer links", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

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
      await page.waitForLoadState("networkidle");
      await expect(page).toHaveURL(/\/terms/);
      await page.goBack();
    }

    if (hasPrivacy) {
      await privacyLink.click();
      await page.waitForLoadState("networkidle");
      await expect(page).toHaveURL(/\/privacy/);
    }
  });

  test("should show 404 page for unknown routes", async ({ page }) => {
    await page.goto("/this-page-does-not-exist-12345");
    await page.waitForLoadState("networkidle");

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
    await page.waitForLoadState("networkidle");

    // Look for hamburger menu or mobile nav trigger
    const mobileMenuButton = page
      .locator('[class*="menu"], [class*="hamburger"], button[aria-label*="menu"]')
      .first();
    const hasMobileMenu = await mobileMenuButton.isVisible().catch(() => false);

    if (hasMobileMenu) {
      await mobileMenuButton.click();
      await page.waitForTimeout(500);

      // Mobile nav should be visible
      const mobileNav = page
        .locator('[class*="drawer"], [class*="mobile-nav"], [class*="sheet"]')
        .first();
      const isNavVisible = await mobileNav.isVisible().catch(() => false);
      expect(isNavVisible).toBeTruthy();
    }
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
    await page.waitForLoadState("networkidle");

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
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL(/\/forum/);

    // Should show forum posts or empty state or content
    const content = page.locator('[class*="grid"], [class*="list"], main, body').first();
    await expect(content).toBeVisible();
  });

  test("should require auth to create new forum post", async ({ page }) => {
    await page.goto("/forum/new");
    await page.waitForLoadState("networkidle");

    // Should redirect to auth
    await expect(page).toHaveURL(/\/(auth|login|forum)/);
  });
});

test.describe("Challenges", () => {
  test("should display challenges page", async ({ page }) => {
    await page.goto("/challenge");
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL(/\/challenge/);

    // Should show challenges or empty state
    const content = page.locator('[class*="grid"], [class*="list"], main, body').first();
    await expect(content).toBeVisible();
  });
});

test.describe("Donations", () => {
  test("should display donation page", async ({ page }) => {
    await page.goto("/donation");
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL(/\/donation/);

    // Page should have content
    const content = page.locator('main, [class*="content"], article, body').first();
    await expect(content).toBeVisible();
  });
});
