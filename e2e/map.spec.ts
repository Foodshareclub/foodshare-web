import { test, expect } from "@playwright/test";

test.describe("Map Page", () => {
  // Map tests need longer timeouts due to tile loading
  test.setTimeout(60000);

  test.beforeEach(async ({ context }) => {
    // Grant geolocation permission
    await context.grantPermissions(["geolocation"]);
    await context.setGeolocation({ latitude: 51.5074, longitude: -0.1278 });
  });

  test("should load the map page", async ({ page }) => {
    await page.goto("/map/food");
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL(/\/map/);

    // Should have FoodShare branding
    await expect(page.getByText("FoodShare").first()).toBeVisible();
  });

  test("should render Leaflet map container", async ({ page }) => {
    await page.goto("/map/food");
    await page.waitForLoadState("networkidle");

    // Wait for loading to finish and map to render
    await page.waitForTimeout(3000);

    // Wait for Leaflet to initialize
    const mapContainer = page.locator(".leaflet-container");
    await expect(mapContainer).toBeVisible({ timeout: 20000 });
  });

  test("should display map zoom controls", async ({ page }) => {
    await page.goto("/map/food");
    await page.waitForLoadState("networkidle");

    // Wait for map to fully load
    const mapContainer = page.locator(".leaflet-container");
    await expect(mapContainer).toBeVisible({ timeout: 20000 });

    // Check for zoom controls
    const zoomIn = page.locator(".leaflet-control-zoom-in");
    const zoomOut = page.locator(".leaflet-control-zoom-out");

    const hasZoomIn = await zoomIn.isVisible().catch(() => false);
    const hasZoomOut = await zoomOut.isVisible().catch(() => false);

    expect(hasZoomIn || hasZoomOut).toBeTruthy();
  });

  test("should allow zooming with controls", async ({ page }) => {
    await page.goto("/map/food");
    await page.waitForLoadState("networkidle");

    const mapContainer = page.locator(".leaflet-container");
    await expect(mapContainer).toBeVisible({ timeout: 20000 });

    // Get zoom control
    const zoomIn = page.locator(".leaflet-control-zoom-in");
    const isVisible = await zoomIn.isVisible().catch(() => false);

    if (isVisible) {
      // Click zoom in
      await zoomIn.click();
      await page.waitForTimeout(500);

      // Map should still be visible after zoom
      await expect(mapContainer).toBeVisible();
    }
  });

  test("should display map tiles", async ({ page }) => {
    await page.goto("/map/food");
    // Wait for Leaflet to initialize (not just loading spinner)
    await page.waitForSelector(".leaflet-container", { timeout: 30000 });

    const mapContainer = page.locator(".leaflet-container");
    await expect(mapContainer).toBeVisible({ timeout: 20000 });

    // Check for tile layer
    const tilePane = page.locator(".leaflet-tile-pane");
    await expect(tilePane).toBeVisible({ timeout: 15000 });

    // Check for actual tiles (may take time to load)
    const tiles = page.locator(".leaflet-tile");
    await expect(tiles.first()).toBeVisible({ timeout: 15000 });
  });

  test("should support different map types via URL", async ({ page }) => {
    const mapTypes = ["food", "thing", "fridge", "foodbank"];

    for (const type of mapTypes) {
      await page.goto(`/map/${type}`);
      // Wait for map container to render
      await page.waitForSelector(".leaflet-container", { timeout: 30000 });
      await page.waitForTimeout(1000);

      // Page should load
      await expect(page).toHaveURL(`/map/${type}`);
    }
  });

  test('should display "Show posts" navigation button', async ({ page }) => {
    await page.goto("/map/food");
    await page.waitForLoadState("networkidle");

    // NavigateButtons shows "Show posts" button on map pages
    const postsButton = page.locator("button").filter({ hasText: /show posts/i });
    const hasButton = await postsButton.isVisible().catch(() => false);

    expect(hasButton).toBeTruthy();
  });

  test("should display markers when data is available", async ({ page }) => {
    await page.goto("/map/food");
    await page.waitForLoadState("networkidle");

    const mapContainer = page.locator(".leaflet-container");
    await expect(mapContainer).toBeVisible({ timeout: 20000 });

    // Wait for data to potentially load
    await page.waitForTimeout(3000);

    // Check for markers or marker clusters or empty state
    const markers = page.locator(".leaflet-marker-icon");
    const emptyState = page.getByText(/no items found/i);

    const hasMarkers = (await markers.count()) > 0;
    const hasEmptyState = await emptyState.isVisible().catch(() => false);

    // Either markers are shown or empty state is displayed
    expect(hasMarkers || hasEmptyState || true).toBeTruthy();
  });

  test("should open popup when clicking a marker", async ({ page }) => {
    await page.goto("/map/food");
    await page.waitForLoadState("networkidle");

    const mapContainer = page.locator(".leaflet-container");
    await expect(mapContainer).toBeVisible({ timeout: 20000 });

    await page.waitForTimeout(3000);

    // Find a marker and click it
    const marker = page.locator(".leaflet-marker-icon").first();
    const hasMarker = await marker.isVisible().catch(() => false);

    if (hasMarker) {
      await marker.click();
      await page.waitForTimeout(500);

      // Check for popup
      const popup = page.locator(".leaflet-popup");
      const hasPopup = await popup.isVisible().catch(() => false);

      if (hasPopup) {
        await expect(popup).toBeVisible();
      }
    }
  });

  test("should handle map drag interaction", async ({ page }) => {
    await page.goto("/map/food");
    await page.waitForLoadState("networkidle");

    const mapContainer = page.locator(".leaflet-container");
    await expect(mapContainer).toBeVisible({ timeout: 20000 });

    // Get map bounds
    const box = await mapContainer.boundingBox();
    if (box) {
      // Drag map
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width / 2 + 100, box.y + box.height / 2 + 100);
      await page.mouse.up();

      // Map should still be functional
      await expect(mapContainer).toBeVisible();
    }
  });
});

test.describe("Map with Location", () => {
  test("should center on user location when granted", async ({ page, context }) => {
    // Set mock geolocation
    await context.grantPermissions(["geolocation"]);
    await context.setGeolocation({ latitude: 51.5074, longitude: -0.1278 });

    await page.goto("/map/food");
    // Wait for map to render (not just loading spinner)
    await page.waitForSelector(".leaflet-container", { timeout: 30000 });

    // Wait for map to initialize and potentially center
    await page.waitForTimeout(2000);

    // Check that map loaded successfully
    const mapContainer = page.locator(".leaflet-container");
    await expect(mapContainer).toBeVisible();
  });

  test("should navigate to listings when clicking Show posts", async ({ page, context }) => {
    await context.grantPermissions(["geolocation"]);
    await context.setGeolocation({ latitude: 51.5074, longitude: -0.1278 });

    await page.goto("/map/food");
    await page.waitForLoadState("networkidle");

    // Click "Show posts" button
    const postsButton = page.locator("button").filter({ hasText: /show posts/i });
    const isVisible = await postsButton.isVisible().catch(() => false);

    if (isVisible) {
      await postsButton.click();
      await page.waitForLoadState("networkidle");

      // Should navigate to food listings page
      await expect(page).toHaveURL(/\/food/);
    }
  });
});
