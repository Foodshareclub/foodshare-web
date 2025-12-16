# Playwright E2E Testing for Next.js

## Overview

FoodShare uses Playwright for end-to-end testing. Tests are located in `e2e/` and run against the Next.js development server.

## Running Tests

```bash
# Run all E2E tests
npm run e2e

# Run with UI mode (interactive)
npm run e2e:ui

# Run with visible browser
npm run e2e:headed

# Debug mode (step through tests)
npm run e2e:debug

# View test report
npm run e2e:report
```

## Test Structure

```
e2e/
├── home.spec.ts          # Home page tests
├── auth.spec.ts          # Authentication tests
├── food-listings.spec.ts # Food listings tests
├── map.spec.ts           # Map view tests
└── fixtures/             # Test fixtures (optional)
```

## Writing Tests

### Basic Test Structure

```typescript
import { test, expect } from "@playwright/test";

test.describe("Feature Name", () => {
  test("should do something specific", async ({ page }) => {
    await page.goto("/path");

    // Interact with elements
    await page.getByRole("button", { name: "Submit" }).click();

    // Assert results
    await expect(page).toHaveURL(/\/success/);
    await expect(page.getByText("Success!")).toBeVisible();
  });
});
```

### Locator Strategies (Best to Worst)

1. **Role-based (preferred)**

   ```typescript
   page.getByRole("button", { name: "Submit" });
   page.getByRole("link", { name: "Home" });
   page.getByRole("textbox", { name: "Email" });
   ```

2. **Label/Placeholder**

   ```typescript
   page.getByLabel("Email address");
   page.getByPlaceholder("Enter your email");
   ```

3. **Text content**

   ```typescript
   page.getByText("Welcome back");
   page.getByText(/sign in/i); // regex for case-insensitive
   ```

4. **Test ID (for complex cases)**

   ```typescript
   page.getByTestId("food-item-card");
   // Add data-testid="food-item-card" to component
   ```

5. **CSS selectors (last resort)**
   ```typescript
   page.locator(".leaflet-container");
   page.locator('[data-state="open"]');
   ```

### Waiting and Assertions

```typescript
// Auto-waiting (built-in)
await page.getByRole("button").click(); // Waits for element

// Explicit waits
await page.waitForLoadState("networkidle");
await page.waitForURL(/\/dashboard/);
await page.waitForTimeout(1000); // Avoid when possible

// Assertions with timeout
await expect(element).toBeVisible({ timeout: 10000 });
await expect(page).toHaveTitle(/FoodShare/);
await expect(page).toHaveURL(/\/food/);
```

### Testing Forms

```typescript
test("should submit contact form", async ({ page }) => {
  await page.goto("/contact");

  // Fill form fields
  await page.getByLabel("Name").fill("John Doe");
  await page.getByLabel("Email").fill("john@example.com");
  await page.getByLabel("Message").fill("Hello!");

  // Submit
  await page.getByRole("button", { name: "Send" }).click();

  // Verify success
  await expect(page.getByText("Message sent")).toBeVisible();
});
```

### Testing Authentication

```typescript
test.describe("Protected routes", () => {
  test("should redirect to login", async ({ page }) => {
    await page.goto("/profile");
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});

// With authenticated user (using storage state)
test.describe("Authenticated user", () => {
  test.use({ storageState: "e2e/.auth/user.json" });

  test("should access profile", async ({ page }) => {
    await page.goto("/profile");
    await expect(page.getByRole("heading", { name: "Profile" })).toBeVisible();
  });
});
```

### Testing the Map (Leaflet)

```typescript
test("should display map", async ({ page }) => {
  await page.goto("/map");

  // Wait for Leaflet to initialize
  const mapContainer = page.locator(".leaflet-container");
  await expect(mapContainer).toBeVisible({ timeout: 10000 });

  // Verify map controls
  await expect(page.locator(".leaflet-control-zoom")).toBeVisible();
});

test("should interact with map", async ({ page }) => {
  await page.goto("/map");

  // Click on zoom
  await page.locator(".leaflet-control-zoom-in").click();

  // Click on a marker (if visible)
  const marker = page.locator(".leaflet-marker-icon").first();
  if (await marker.isVisible()) {
    await marker.click();
    await expect(page.locator(".leaflet-popup")).toBeVisible();
  }
});
```

### Handling Dynamic Content

```typescript
test("should load food items", async ({ page }) => {
  await page.goto("/food");

  // Wait for network to settle
  await page.waitForLoadState("networkidle");

  // Check for items OR empty state
  const items = page.getByTestId("food-item");
  const emptyState = page.getByText("No items found");

  const hasItems = (await items.count()) > 0;
  const isEmpty = await emptyState.isVisible().catch(() => false);

  expect(hasItems || isEmpty).toBeTruthy();
});
```

## Page Object Model (Optional)

For complex tests, use Page Objects:

```typescript
// e2e/pages/LoginPage.ts
import { Page, Locator } from "@playwright/test";

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByLabel("Email");
    this.passwordInput = page.getByLabel("Password");
    this.submitButton = page.getByRole("button", { name: "Sign in" });
  }

  async goto() {
    await this.page.goto("/auth/login");
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }
}

// Usage in test
import { LoginPage } from "./pages/LoginPage";

test("should login", async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login("user@example.com", "password");
  await expect(page).toHaveURL("/dashboard");
});
```

## Visual Testing

```typescript
test("should match screenshot", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveScreenshot("homepage.png");
});

test("should match element screenshot", async ({ page }) => {
  await page.goto("/food");
  const card = page.getByTestId("food-item").first();
  await expect(card).toHaveScreenshot("food-card.png");
});
```

## API Mocking

```typescript
test("should handle API errors", async ({ page }) => {
  // Mock API response
  await page.route("**/api/products", (route) => {
    route.fulfill({
      status: 500,
      body: JSON.stringify({ error: "Server error" }),
    });
  });

  await page.goto("/food");
  await expect(page.getByText("Something went wrong")).toBeVisible();
});

test("should display mocked data", async ({ page }) => {
  await page.route("**/api/products", (route) => {
    route.fulfill({
      status: 200,
      body: JSON.stringify([{ id: 1, title: "Test Food", description: "Test" }]),
    });
  });

  await page.goto("/food");
  await expect(page.getByText("Test Food")).toBeVisible();
});
```

## CI/CD Integration

Tests run automatically in CI. The configuration in `playwright.config.ts`:

- Retries failed tests twice
- Uses single worker for stability
- Generates HTML report

## Debugging Tips

1. **Use debug mode**: `npm run e2e:debug`
2. **Add pause**: `await page.pause()` - opens inspector
3. **Take screenshots**: `await page.screenshot({ path: 'debug.png' })`
4. **Check trace**: Enable in config, view with `npx playwright show-trace trace.zip`
5. **Console logs**: `page.on('console', msg => console.log(msg.text()))`

## Common Issues

**Test timeout**: Increase timeout in test or config

```typescript
test("slow test", async ({ page }) => {
  test.setTimeout(60000);
  // ...
});
```

**Flaky tests**: Add explicit waits or use `toPass()` for retries

```typescript
await expect(async () => {
  const count = await page.getByTestId("item").count();
  expect(count).toBeGreaterThan(0);
}).toPass({ timeout: 10000 });
```

**Map not loading**: Increase timeout, wait for `.leaflet-container`
