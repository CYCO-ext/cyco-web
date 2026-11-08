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
  let collectionSearches = 0;
  let currentStatus = collectionStatus;

  await page.route("**/api/**", async (route) => {
    await route.fulfill({
      status: 404,
      contentType: "application/json",
      body: JSON.stringify({ error: "Synthetic test backend: no matching fixture" }),
    });
  });

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
    collectionSearches += 1;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([{
        id: pendingCollectionFixture.id,
        generatorId: completionActors.generator.id,
        selectedCollectorId: completionActors.collector.id,
        materialIds: pendingCollectionFixture.materialIds,
        weight: pendingCollectionFixture.weight,
        status: currentStatus,
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

  return {
    profileId,
    getCodeReadCount: () => codeReads,
    getCollectionSearchCount: () => collectionSearches,
    setCollectionStatus: (status: string) => { currentStatus = status; },
  };
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

test("the code action appears only after the collector accepts the collection", async ({ page }) => {
  const mock = await mockCollectionsPage(page, "GENERATOR", "PENDING");
  await page.goto("/collections");

  await expect(page.getByRole("heading", { name: "Minhas coletas" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Ver código" })).toHaveCount(0);
  expect(mock.getCodeReadCount()).toBe(0);

  mock.setCollectionStatus("IN_PROGRESS");
  await page.reload();
  await expect(page.getByRole("button", { name: "Ver código" })).toBeVisible();
});

test("collector completion requires code and only refreshes after HTTP 200", async ({ page }) => {
  const mock = await mockCollectionsPage(page, "WASTE_COLLECTOR", "IN_PROGRESS");
  let confirmations = 0;
  const idempotencyKeys: string[] = [];

  await page.route("**/api/collections/requests/*/confirm-collector", async (route) => {
    confirmations += 1;
    const request = route.request();
    expect(request.method()).toBe("POST");
    expect(request.headers().authorization).toBe("Bearer synthetic-waste_collector-token");
    expect(request.headers()["content-type"]).toContain("application/json");
    const key = request.headers()["idempotency-key"];
    expect(key).toBeTruthy();
    idempotencyKeys.push(key);
    const payload = request.postDataJSON();
    expect(payload.code).toBe(["001234", "001235", "001236", "001237"][confirmations - 1]);

    if (confirmations === 4) mock.setCollectionStatus("COMPLETED");
    const status = [422, 429, 202, 200][confirmations - 1];
    const body = status === 422
      ? { error: { code: "CODE_INVALID", message: "Código incorreto" } }
      : status === 429
        ? { error: { code: "CODE_ATTEMPTS_EXCEEDED", message: "Muitas tentativas" }, retryAfterSeconds: 60 }
        : status === 202
          ? { requestId: pendingCollectionFixture.id, completionId: "e2e-completion-001", reconciliationPending: true }
          : { requestId: pendingCollectionFixture.id, status: "COMPLETED", completionId: "e2e-completion-001" };
    await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
  });

  await page.goto("/collections");
  const collectionCard = page.locator("article").first();
  await expect(collectionCard.getByText("Em andamento", { exact: true })).toBeVisible();
  const input = page.getByRole("textbox", { name: "Código para confirmar a coleta" });
  const submit = page.getByRole("button", { name: "Confirmar coleta" });
  await expect(submit).toBeDisabled();
  expect(confirmations).toBe(0);
  await input.fill("001234");
  await submit.click();
  await expect(page.getByText("O código informado não confere.", { exact: false })).toBeVisible();
  expect(mock.getCollectionSearchCount()).toBe(1);
  expect(idempotencyKeys).toHaveLength(1);

  await input.fill("001235");
  await submit.click();
  await expect(page.getByText("Aguarde 60 segundos", { exact: false })).toBeVisible();
  expect(mock.getCollectionSearchCount()).toBe(1);

  await input.fill("001236");
  await submit.click();
  await expect(page.getByText("A coleta não foi confirmada.", { exact: false })).toBeVisible();
  expect(mock.getCollectionSearchCount()).toBe(1);
  await expect(collectionCard.getByText("Em andamento", { exact: true })).toBeVisible();

  await input.fill("001237");
  await submit.click();
  await expect(page.locator("article").first().getByText("Concluída", { exact: true })).toBeVisible();
  expect(mock.getCollectionSearchCount()).toBe(2);
  expect(idempotencyKeys).toHaveLength(4);
  expect(new Set(idempotencyKeys).size).toBe(4);
});
