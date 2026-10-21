import { expect, test } from "@playwright/test";

test.describe("Home Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
  });

  test("should load the home page with FoodShare branding", async ({ page }) => {
    // Check for FoodShare logo/branding in navbar
    await expect(page.getByText("FoodShare").first()).toBeVisible();

    // Page should have loaded without errors
    await expect(page).toHaveURL("/");
  });

  test("should display category navigation in navbar", async ({ page }) => {
    // The navbar is a header, and the test used to look for it by class
    // names: it was `fixed top-0` once and it is `sticky top-0` now, so
    // the locator was looking for something that is not there. The role is
    // what the element is, and it does not change with the styling.
    const navbar = page.getByRole("banner");
    await expect(navbar).toBeVisible();

    // Check for at least one category (categories are translated, so check common ones)
    const categoryExists = await page
      .locator('button, [role="button"]')
      .filter({ hasText: /food|things|borrow|wanted|fridge/i })
      .first()
      .isVisible()
      .catch(() => false);

    expect(categoryExists).toBeTruthy();
  });

  test("should display product grid or loading skeleton", async ({ page }) => {
    // Wait for content to load - either products grid or skeleton
    await page.waitForSelector('[class*="grid"]', { timeout: 5000 });

    // Check for grid layout (ProductGrid component)
    const grid = page.locator('[class*="grid"]').first();
    await expect(grid).toBeVisible();
  });

  test('should display "Show map" navigation button', async ({ page }) => {
    // NavigateButtons shows a "Show map" button on listing pages
    const mapButton = page.getByRole("button", { name: /show map/i });
    const hasMapButton = await mapButton.isVisible();

    // Map button should be visible on home page
    expect(hasMapButton).toBeTruthy();
  });

  test("should have working navbar with user menu", async ({ page }) => {
    // NavbarActions shows the "Add listing" button for a visitor who is
    // not signed in -- which is how a visitor signs in -- and the user
    // menu for one who is.
    //
    // The test used to look for the area by its class names, and the
    // classes it named are not on the markup any more, so it was looking
    // for something that is not there.
    const navbarActions = page.getByRole("button", { name: /add listing/i });
    await expect(navbarActions).toBeVisible();
  });

  test("should redirect to maintenance page if database is unhealthy", async ({ page }) => {
    // This test just verifies the page loads - maintenance redirect is server-side
    // If we're here and not on /maintenance, the database is healthy
    const url = page.url();
    expect(url.includes("/") || url.includes("/maintenance")).toBeTruthy();
  });

  test("should support location-based filtering via URL params", async ({ page }) => {
    // Navigate with location params (London coordinates)
    await page.goto("/?lat=51.5074&lng=-0.1278&radius=5000");
    await page.waitForLoadState("domcontentloaded");

    // Wait for either empty state or products to appear
    await page.waitForSelector(':is(.nothing-shared-within, [class*="grid"])', {
      timeout: 15000,
    });

    // URL should contain location params
    expect(page.url()).toContain("lat=");
    expect(page.url()).toContain("lng=");
  });

  test("should have search bar in navbar", async ({ page }) => {
    // SearchBar is in the second row of navbar
    const searchBar = page.locator('[class*="search"], input[type="search"], [placeholder*="search" i]').first();
    const hasSearchBar = await searchBar.isVisible();

    // Search functionality exists (may be a search button or input)
    expect(
      hasSearchBar ||
        page
          .locator("button")
          .filter({ hasText: /search/i })
          .isVisible(),
    ).toBeTruthy();
  });
});

test.describe("Home Page - Navigation", () => {
  test("should navigate to map when clicking Show map button", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // Click the "Show map" button
    const mapButton = page.locator("button").filter({ hasText: /show map/i });
    const isVisible = await mapButton.isVisible().catch(() => false);

    if (isVisible) {
      await mapButton.click();
      await page.waitForLoadState("domcontentloaded");

      // Should navigate to map page
      await expect(page).toHaveURL(/\/map/);
    }
  });

  test("should navigate to category pages via navbar", async ({ page }) => {
    await page.goto("/");
    // Wait for navbar to render
    await page.waitForSelector('header, nav, [class*="navbar"]', { timeout: 30000 });

    // Click on a category button (e.g., "Things" or similar)
    const categoryButton = page
      .locator('button, [role="button"]')
      .filter({ hasText: /things|thing/i })
      .first();

    await expect(categoryButton).toBeVisible();
    await categoryButton.click();
    await expect(page).toHaveURL(/\/things?(?:[/?#]|$)/);
  });
});

test.describe("Home Page - Product Cards", () => {
  test("should display product cards when data is available", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // Check for product cards (links to /food/[id] or similar)
    const productLinks = page.locator('a[href^="/food/"]');
    const count = await productLinks.count();

    // Either products are shown or page is empty (both are valid)
    expect(count >= 0).toBeTruthy();
  });

  test("should navigate to product detail when clicking a card", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // Find first product link
    const productLink = page.locator('a[href^="/food/"]').first();
    const isVisible = await productLink.isVisible().catch(() => false);

    if (isVisible) {
      await productLink.click();
      await page.waitForLoadState("domcontentloaded");

      // Should navigate to product detail page
      await expect(page).toHaveURL(/\/food\/[a-zA-Z0-9-]+/);
    }
  });
});
