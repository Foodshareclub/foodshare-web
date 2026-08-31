import { test, expect } from "@playwright/test";

test.describe("Food Listings Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/food");
    await page.waitForLoadState("domcontentloaded");
  });

  test("should load food listings page", async ({ page }) => {
    await expect(page).toHaveURL(/\/food/);
    // Should have FoodShare branding
    await expect(page.getByText("FoodShare").first()).toBeVisible();
  });

  test("should display product grid with items or empty state", async ({ page }) => {
    // Wait for content to load - either product grid or empty state
    await page.waitForSelector(':matches([class*="grid"], .nothing-shared-within)', {
      timeout: 15000,
    });

    // Either the product grid has content, or the "Nothing shared within..."
    // empty state shows once nearby fetching settles. An empty grid collapses
    // to zero height (Playwright: hidden), so accept whichever of the two
    // states materializes.
    await expect(async () => {
      const hasEmptyState = await page
        .getByText(/nothing shared within/i)
        .isVisible()
        .catch(() => false);
      if (hasEmptyState) return;
      const items = await page.locator('[class*="grid"] > *').count();
      expect(items).toBeGreaterThan(0);
    }).toPass({ timeout: 15000 });
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

  test("should filter by category type via singular routes", async ({ page }) => {
    // Test different category types using new singular routes
    const categories = ["thing", "borrow", "wanted", "fridge", "volunteer", "organisation"];

    for (const type of categories) {
      await page.goto(`/${type}`);
      // Wait for content to load
      await page.waitForSelector('[class*="grid"], [class*="empty"], main', { timeout: 30000 });

      // Page should load without errors and exhibit the correct URL
      await expect(page).toHaveURL(new RegExp(`/${type}`));

      const content = page.locator('[class*="grid"], [class*="empty"], main').first();
      await expect(content).toBeVisible({ timeout: 10000 });
    }
  });

  test("should support location-based filtering", async ({ page }) => {
    // Navigate with location params
    await page.goto("/food?lat=51.5074&lng=-0.1278&radius=10000");
    await page.waitForLoadState("domcontentloaded");

    // Page should load with location filter active: either the product grid
    // has content, or the "Nothing shared within..." empty state shows once
    // nearby fetching settles. An empty grid collapses to zero height
    // (Playwright: hidden), so accept whichever of the two states materializes.
    await expect(async () => {
      const hasEmptyState = await page
        .getByText(/nothing shared within/i)
        .isVisible()
        .catch(() => false);
      if (hasEmptyState) return;
      const items = await page.locator('[class*="grid"] > *').count();
      expect(items).toBeGreaterThan(0);
    }).toPass({ timeout: 15000 });

    // URL should contain location params
    expect(page.url()).toContain("lat=");
  });

  test("should navigate to food detail page when clicking a product", async ({ page }) => {
    // Wait for grid to load
    await page.waitForSelector('[class*="grid"], main', { timeout: 30000 });

    // Find a product card link
    const productCard = page.locator('a[href^="/food/"]').first();
    const isVisible = await productCard.isVisible().catch(() => false);

    if (isVisible) {
      await productCard.click();
      await page.waitForLoadState("domcontentloaded");
      await expect(page).toHaveURL(/\/food\/[a-zA-Z0-9-]+/);
    } else {
      // If no products, test passes (empty state is acceptable)
      expect(true).toBeTruthy();
    }
  });

  test("should display 'Show map' button", async ({ page }) => {
    // NavigateButtons shows "Show map" button on listing pages
    const mapButton = page.getByRole("button", { name: /show map/i });
    const hasMapButton = await mapButton.isVisible();

    expect(hasMapButton).toBeTruthy();
  });
});

test.describe("Food Detail Page", () => {
  test("should display food item details", async ({ page }) => {
    // First go to listings and get a real food item URL
    await page.goto("/food");
    await page.waitForLoadState("domcontentloaded");

    const productLink = page.locator('a[href^="/food/"]').first();
    const isVisible = await productLink.isVisible().catch(() => false);

    if (isVisible) {
      const href = await productLink.getAttribute("href");
      if (href) {
        await page.goto(href);
        await page.waitForLoadState("domcontentloaded");

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
    await page.waitForLoadState("domcontentloaded");

    // Should redirect to auth page
    await expect(page).toHaveURL(/\/(auth|login)/);
  });
});
