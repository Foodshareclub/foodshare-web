import { expect, test, type Page } from "@playwright/test";

async function firstListing(page: Page) {
  await page.goto("/food");
  const card = page.locator('[data-slot="card"][data-variant="listing"]').first();
  await expect(card).toBeVisible();
  await expect(
    page.locator('[data-variant="listing"]').getByText("Reference photo — not the actual item", { exact: true }),
  ).toHaveCount(0);
  const titleLink = card.locator('[data-slot="card-title"] a');
  const href = await titleLink.getAttribute("href");
  const title = (await titleLink.innerText()).trim();
  expect(href).toMatch(/^\/product\/\d+$/);
  return { card, titleLink, href: href!, title };
}

async function expectDetails(page: Page, href: string, title: string) {
  const id = href.split("/").at(-1)!;
  await expect(page).toHaveURL(new RegExp("/product/" + id + "(?:-|$|[?#])"));
  await expect(page.getByRole("heading", { level: 1, name: title, exact: true })).toBeVisible();
}

for (const viewport of [
  { width: 1280, height: 900 },
  { width: 390, height: 844 },
]) {
  test.describe("listing card navigation at " + viewport.width + "px", () => {
    test.use({ viewport });

    test("photo opens its listing details without a blocking overlay", async ({ page }) => {
      const { card, href, title } = await firstListing(page);
      const photo = card.locator("a[aria-label]").first();
      await photo.click({ position: { x: 30, y: 60 } });
      await expectDetails(page, href, title);
    });

    test("unused card space opens the same listing", async ({ page }) => {
      const { card, href, title } = await firstListing(page);
      const bounds = await card.boundingBox();
      expect(bounds).not.toBeNull();
      await card.click({ position: { x: bounds!.width - 4, y: bounds!.height - 4 } });
      await expectDetails(page, href, title);
    });

    test("keyboard opens details and browser back restores the feed", async ({ page }) => {
      const { titleLink, href, title } = await firstListing(page);
      await titleLink.focus();
      await page.keyboard.press("Enter");
      await expectDetails(page, href, title);
      await page.goBack();
      await expect(page).toHaveURL(/\/food(?:[?#]|$)/);
      await expect(page.locator('[data-slot="card"][data-variant="listing"]').first()).toBeVisible();
    });

    test("save remains an independent action for guests", async ({ page }) => {
      const { card } = await firstListing(page);
      await card.getByRole("button", { name: "Save listing", exact: true }).click();
      await expect(page).toHaveURL(/\/auth\/login(?:[?#]|$)/);
    });
  });
}
