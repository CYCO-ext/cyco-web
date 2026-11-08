import { expect, test, type Page } from "@playwright/test";
import { completionActors, pendingCollectionFixture } from "../fixtures/completion";

type Viewer = "GENERATOR" | "WASTE_COLLECTOR";

async function mockCollectionsPage(
  page: Page,
  viewer: Viewer,
  collectionStatus: string,
  profileIdOverride?: string,
) {
  const profileId = profileIdOverride ?? (viewer === "GENERATOR"
    ? completionActors.generator.id
    : completionActors.collector.id);
  let codeReads = 0;

  await page.route("**/api/auth/session", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        user: { id: profileId },
        role: viewer,
        token: `synthetic-${viewer.toLowerCase()}-token`,
        expires: "2099-01-01T00:00:00.000Z",
      }),
    });
  });

  await page.route("**/api/collections/search?**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([{
        id: pendingCollectionFixture.id,
        generatorId: completionActors.generator.id,
        selectedCollectorId: completionActors.collector.id,
        materialIds: pendingCollectionFixture.materialIds,
        weight: pendingCollectionFixture.weight,
        status: collectionStatus,
        generatorConfirmed: false,
        collectorConfirmed: false,
        createdAt: pendingCollectionFixture.createdAt,
        updatedAt: pendingCollectionFixture.updatedAt,
      }]),
    });
  });

  await page.route("**/api/collections/requests/*/completion-code", async (route) => {
    codeReads += 1;
    expect(route.request().method()).toBe("POST");
    expect(route.request().headers().authorization).toBe(`Bearer synthetic-${viewer.toLowerCase()}-token`);
    expect(route.request().url()).not.toContain("001234");
    if (codeReads === 1) {
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
    await route.fulfill({
      status: codeReads === 2 ? 403 : 200,
      contentType: "application/json",
      headers: { "cache-control": "no-store" },
      body: JSON.stringify(codeReads === 2
        ? { error: { code: "FORBIDDEN", message: "Acesso não permitido" } }
        : { requestId: pendingCollectionFixture.id, code: "001234" }),
    });
  });

  return { profileId, getCodeReadCount: () => codeReads };
}

test("only the owning generator can consult a code; errors and requery are visible without persisting it", async ({ page }) => {
  const mock = await mockCollectionsPage(page, "GENERATOR", "IN_PROGRESS");
  await page.goto("/collections");

  await expect(page.getByRole("heading", { name: "Minhas coletas" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Finalizar coleta" })).toHaveCount(0);
  const showCodeButton = page.getByRole("button", { name: "Ver código" });
  await expect(showCodeButton).toBeVisible();
  await showCodeButton.click();
  await expect(page.getByRole("button", { name: "Consultando código..." })).toBeVisible();
  await expect(page.getByLabel("Código da coleta")).toHaveText("001234");
  await expect(page).not.toHaveURL(/001234/);
  const persistedValues = await page.evaluate(() => [localStorage, sessionStorage].flatMap((storage) => {
    const entries: string[] = [];
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (key) entries.push(key, storage.getItem(key) ?? "");
    }
    return entries;
  }));
  expect(persistedValues.join(" ")).not.toContain("001234");

  await page.getByRole("button", { name: "Consultar novamente" }).click();
  await expect(page.getByText("Acesso não permitido", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Consultar novamente" }).click();
  await expect(page.getByLabel("Código da coleta")).toHaveText("001234");
  expect(mock.getCodeReadCount()).toBe(3);

  await page.reload();
  await expect(page.getByRole("button", { name: "Ver código" })).toBeVisible();
  await expect(page.getByLabel("Código da coleta")).toHaveCount(0);
});

test("a collector does not see the generator's code action", async ({ page }) => {
  await mockCollectionsPage(page, "WASTE_COLLECTOR", "IN_PROGRESS");
  await page.goto("/collections");

  await expect(page.getByRole("heading", { name: "Minhas coletas" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Ver código" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Código de confirmação" })).toHaveCount(0);
});

test("another generator cannot see the owner's code action", async ({ page }) => {
  await mockCollectionsPage(page, "GENERATOR", "IN_PROGRESS", "e2e-other-generator-001");
  await page.goto("/collections");

  await expect(page.getByRole("heading", { name: "Minhas coletas" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Ver código" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Código de confirmação" })).toHaveCount(0);
});

test("the code action disappears after the collection is completed", async ({ page }) => {
  await mockCollectionsPage(page, "GENERATOR", "COMPLETED");
  await page.goto("/collections");

  await expect(page.getByRole("heading", { name: "Minhas coletas" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Ver código" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Código de confirmação" })).toHaveCount(0);
});
