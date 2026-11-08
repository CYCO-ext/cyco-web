import { expect, test } from "@playwright/test";
import { completionActors, pendingCollectionFixture } from "../fixtures/completion";

test("browser runner opens the login page with synthetic data only", async ({ page }) => {
  await page.route("**/api/**", async (route) => {
    await route.fulfill({
      status: 404,
      contentType: "application/json",
      body: JSON.stringify({ error: "Synthetic test backend: no matching fixture" }),
    });
  });

  await page.goto("/auth/login");

  await expect(page.getByRole("heading", { name: /bem-vindo à cyco/i })).toBeVisible();
  await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();
  expect(completionActors.generator.id).toMatch(/^e2e-/);
  expect(completionActors.collector.id).toMatch(/^e2e-/);
  expect(completionActors.deliveryman.id).toMatch(/^e2e-/);
  expect(pendingCollectionFixture.id).toMatch(/^e2e-/);
});
