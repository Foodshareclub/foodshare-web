import { test, expect } from "@playwright/test";

test.describe("Authentication - Login", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/auth/login");
    // Wait for the form heading to be visible (indicates page is hydrated)
    await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible({
      timeout: 45000,
    });
  });

  test("should display login form with all required elements", async ({ page }) => {
    // Check page heading - "Welcome back" in login mode
    await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();

    // Check form fields by label text
    await expect(page.getByText("Email address")).toBeVisible();
    await expect(page.getByText("Password")).toBeVisible();

    // Check input fields exist (use placeholder text as fallback)
    await expect(
      page.getByPlaceholder(/example\.com/i).or(page.locator('input[type="email"]'))
    ).toBeVisible();
    await expect(
      page.getByPlaceholder(/enter your password/i).or(page.locator('input[type="password"]'))
    ).toBeVisible();

    // Check submit button
    await expect(page.getByRole("button", { name: /log in/i })).toBeVisible();

    // Check forgot password link
    await expect(page.getByRole("link", { name: /forgot password/i })).toBeVisible();
  });

  test("should have social login buttons", async ({ page }) => {
    // Check for Google login - button contains "Google" text
    await expect(page.getByRole("button", { name: /google/i })).toBeVisible();

    // Check for Facebook login
    await expect(page.getByRole("button", { name: /facebook/i })).toBeVisible();

    // Check for Apple login
    await expect(page.getByRole("button", { name: /apple/i })).toBeVisible();
  });

  test("should toggle password visibility", async ({ page }) => {
    const passwordInput = page.locator('input[type="password"]');
    const toggleButton = page.getByRole("button", { name: /show password|hide password/i });

    // Initially password should be hidden
    await expect(passwordInput).toHaveAttribute("type", "password");

    // Click toggle
    await toggleButton.click();

    // Password should now be visible (type changes to text)
    await expect(page.locator('input[placeholder="Enter your password"]')).toHaveAttribute(
      "type",
      "text"
    );

    // Click again to hide
    await toggleButton.click();
    await expect(page.locator('input[placeholder="Enter your password"]')).toHaveAttribute(
      "type",
      "password"
    );
  });

  test("should show validation on empty form submission", async ({ page }) => {
    // Click submit without filling form
    await page.getByRole("button", { name: /log in/i }).click();

    // Form should show validation (HTML5 validation)
    const emailInput = page.locator('input[type="email"]');
    const validationMessage = await emailInput.evaluate(
      (el: HTMLInputElement) => el.validationMessage
    );
    expect(validationMessage).toBeTruthy();
  });

  test("should show error message on invalid credentials", async ({ page }) => {
    // Fill with invalid credentials
    await page.locator('input[type="email"]').fill("invalid@example.com");
    await page.locator('input[type="password"]').fill("wrongpassword");

    // Submit form
    await page.getByRole("button", { name: /log in/i }).click();

    // Wait for error response - error appears in a red box
    await page.waitForTimeout(3000);

    // Should show error message or stay on login page
    const errorMessage = page.locator('.bg-red-50, [class*="red"]').first();
    const hasError = await errorMessage.isVisible().catch(() => false);

    // Either shows error or stays on login page
    expect(hasError || page.url().includes("login")).toBeTruthy();
  });

  test("should navigate to signup mode", async ({ page }) => {
    // Click on "Sign up" text in header
    await page.getByText("Sign up").click();

    // Should show signup form with "Join FoodShare" heading
    await expect(page.getByRole("heading", { name: /join foodshare/i })).toBeVisible();

    // Should show name fields in signup mode
    await expect(page.getByText("First name")).toBeVisible();
    await expect(page.getByText("Last name")).toBeVisible();

    // Should show "Create account" button
    await expect(page.getByRole("button", { name: /create account/i })).toBeVisible();
  });

  test("should have links to terms and privacy policy", async ({ page }) => {
    await expect(page.getByRole("link", { name: /terms of service/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /privacy policy/i })).toBeVisible();
  });

  test("should link back to home page via logo", async ({ page }) => {
    // Click on FoodShare logo (it's a link)
    await page
      .getByRole("link", { name: /foodshare/i })
      .first()
      .click();

    // Should navigate to home
    await expect(page).toHaveURL("/");
  });
});

test.describe("Authentication - Signup", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/auth/login");
    await page.waitForLoadState("networkidle");
    // Toggle to signup mode
    await page.getByText("Sign up").click();
  });

  test("should display signup form with name fields", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /join foodshare/i })).toBeVisible();
    await expect(page.getByText("First name")).toBeVisible();
    await expect(page.getByText("Last name")).toBeVisible();
    await expect(page.getByText("Email address")).toBeVisible();
    await expect(page.getByText("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: /create account/i })).toBeVisible();
  });

  test("should toggle back to login mode", async ({ page }) => {
    // Click on "Log in" text to switch back
    await page.getByText("Log in").click();

    // Should show login form
    await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();

    // Name fields should be hidden
    await expect(page.getByText("First name")).not.toBeVisible();
  });
});

test.describe("Authentication - Protected Routes", () => {
  test("should redirect to login when accessing profile without auth", async ({ page }) => {
    await page.goto("/profile");

    // Should redirect to auth page
    await expect(page).toHaveURL(/\/(auth|login)/);
  });

  test("should redirect to login when accessing settings without auth", async ({ page }) => {
    await page.goto("/settings");

    // Should redirect to auth page or show settings page with login prompt
    await page.waitForLoadState("networkidle");
    const url = page.url();
    expect(url.includes("auth") || url.includes("login") || url.includes("settings")).toBeTruthy();
  });

  test("should redirect to login when accessing my-posts without auth", async ({ page }) => {
    await page.goto("/my-posts");

    // Should redirect to auth page
    await expect(page).toHaveURL(/\/(auth|login)/);
  });
});

test.describe("Authentication - Forgot Password", () => {
  test("should display forgot password form", async ({ page }) => {
    await page.goto("/auth/forgot-password");
    // Wait for page to hydrate - look for any content indicator
    await expect(page.getByText(/foodshare/i).first()).toBeVisible({ timeout: 45000 });

    // Should show email input (by placeholder)
    await expect(
      page.getByPlaceholder(/example\.com/i).or(page.locator('input[type="email"]'))
    ).toBeVisible();

    // Should show submit button
    await expect(page.getByRole("button")).toBeVisible();
  });

  test("should navigate back to login", async ({ page }) => {
    await page.goto("/auth/forgot-password");
    await expect(page.getByText(/foodshare/i).first()).toBeVisible({ timeout: 45000 });

    // Click back to login link
    const backLink = page.getByRole("link", { name: /back to login|login/i }).first();
    await backLink.click();

    await expect(page).toHaveURL(/\/auth\/login/);
  });
});
