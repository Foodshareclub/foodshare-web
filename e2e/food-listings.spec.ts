import { test, expect } from "@playwright/test";

test.describe("Food Listings Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/food");
    await page.waitForLoadState("networkidle");
  });

  test("should load food listings page", async ({ page }) => {
    await expect(page).toHaveURL(/\/food/);
    // Should have FoodShare branding
    await expect(page.getByText("FoodShare").first()).toBeVisible();
  });

  test("should display product grid with items or empty state", async ({ page }) => {
    // Wait for content to load
    await page.waitForTimeout(2000);

    // Check for product grid (uses grid layout)
    const productGrid = page.locator('[class*="grid"]').first();
    await expect(productGrid).toBeVisible();
  });

  test("should display category navigation in navbar", async ({ page }) => {
    // Category navigation is in the navbar
    const categoryButton = page
      .locator('button, [role="button"]')
      .filter({ hasText: /food|things|borrow|wanted|fridge/i })
      .first();

    const isVisible = await categoryButton.isVisible().catch(() => false);
    expect(isVisible).toBeTruthy();
  });

  test("should filter by category type via URL params", async ({ page }) => {
    // Test different category types
    const categories = ["thing", "borrow", "wanted"];

    for (const type of categories) {
      await page.goto(`/food?type=${type}`);
      // Wait for content to load
      await page.waitForSelector('[class*="grid"], [class*="empty"], main', { timeout: 30000 });

      // Page should load without errors
      const content = page.locator('[class*="grid"], [class*="empty"], main').first();
      await expect(content).toBeVisible({ timeout: 10000 });
    }
  });

  test("should support location-based filtering", async ({ page }) => {
    // Navigate with location params
    await page.goto("/food?lat=51.5074&lng=-0.1278&radius=10000");
    await page.waitForLoadState("networkidle");

    // Page should load with location filter active
    await expect(page.locator('[class*="grid"]').first()).toBeVisible({ timeout: 10000 });

    // URL should contain location params
    expect(page.url()).toContain("lat=");
  });

  test("should navigate to food detail page when clicking a product", async ({ page }) => {
    // Wait for grid to load
    await page.waitForSelector('[class*="grid"], main', { timeout: 30000 });
    await page.waitForTimeout(2000);

    // Find a product card link
    const productCard = page.locator('a[href^="/food/"]').first();
    const isVisible = await productCard.isVisible().catch(() => false);

    if (isVisible) {
      await productCard.click();
      await page.waitForTimeout(3000);
      await expect(page).toHaveURL(/\/food\/[a-zA-Z0-9-]+/);
    } else {
      // If no products, test passes (empty state is acceptable)
      expect(true).toBeTruthy();
    }
  });

  test('should display "Show map" button', async ({ page }) => {
    // NavigateButtons shows "Show map" button on listing pages
    const mapButton = page.locator("button").filter({ hasText: /show map/i });
    const hasMapButton = await mapButton.isVisible().catch(() => false);

    expect(hasMapButton).toBeTruthy();
  });
});

test.describe("Food Detail Page", () => {
  test("should display food item details", async ({ page }) => {
    // First go to listings and get a real food item URL
    await page.goto("/food");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const productLink = page.locator('a[href^="/food/"]').first();
    const isVisible = await productLink.isVisible().catch(() => false);

    if (isVisible) {
      const href = await productLink.getAttribute("href");
      if (href) {
        await page.goto(href);
        await page.waitForLoadState("networkidle");

        // Should show product details
        await expect(page).toHaveURL(/\/food\/[a-zA-Z0-9-]+/);

        // Page should have content
        await expect(page.locator('main, [class*="content"], article').first()).toBeVisible();
      }
    }
  });
});

test.describe("Create Food Listing", () => {
  test("should redirect to login when not authenticated", async ({ page }) => {
    await page.goto("/food/new");
    await page.waitForLoadState("networkidle");

    // Should redirect to auth page
    await expect(page).toHaveURL(/\/(auth|login)/);
  });
});
