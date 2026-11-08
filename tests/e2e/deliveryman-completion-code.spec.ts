import { expect, test } from "@playwright/test";
import { completionActors, pendingCollectionFixture } from "../fixtures/completion";

const assignmentId = "e2e-assignment-001";
const stopIds = ["e2e-stop-001", "e2e-stop-002"];

test("deliveryman keeps stops pending on 422 and 202, then reconciles progress on refresh", async ({ page }) => {
  let assignmentReads = 0;
  let completionCalls = 0;
  const submittedKeys: string[] = [];

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
        user: { id: completionActors.deliveryman.id },
        role: "DELIVERYMAN",
        token: "synthetic-deliveryman-token",
        expires: "2099-01-01T00:00:00.000Z",
      }),
    });
  });
  await page.route(`**/api/deliverymen/${completionActors.deliveryman.id}/assignments`, async (route) => {
    assignmentReads += 1;
    const completedIds = assignmentReads === 1 ? [] : [stopIds[0]];
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([{
        id: assignmentId,
        deliverymanId: completionActors.deliveryman.id,
        collectorId: completionActors.collector.id,
        savedRouteId: "e2e-route-001",
        vehicleIndex: 0,
        status: "IN_PROGRESS",
        assignedCollectionRequestIds: stopIds,
        completedCollectionRequestIds: completedIds,
        assignedAt: "2026-11-01T12:00:00Z",
        startedAt: "2026-11-01T12:05:00Z",
        updatedAt: "2026-11-01T12:30:00Z",
      }]),
    });
  });
  await page.route("**/api/deliverymen/*/assignments/*/stops/*/complete", async (route) => {
    completionCalls += 1;
    const request = route.request();
    expect(request.method()).toBe("POST");
    expect(request.headers().authorization).toBe("Bearer synthetic-deliveryman-token");
    expect(request.headers()["content-type"]).toContain("application/json");
    expect(request.headers()["idempotency-key"]).toMatch(/^[0-9a-f-]{36}$/i);
    submittedKeys.push(request.headers()["idempotency-key"]);
    const body = request.postDataJSON();
    expect(body.code).toBe(["001234", "001235", "001236"][completionCalls - 1]);

    if (completionCalls === 1) {
      await route.fulfill({
        status: 422,
        contentType: "application/json",
        body: JSON.stringify({ error: { code: "CODE_INVALID", message: "Código incorreto" } }),
      });
    } else if (completionCalls === 2) {
      await route.fulfill({
        status: 202,
        contentType: "application/json",
        body: JSON.stringify({
          requestId: stopIds[0],
          completionId: pendingCollectionFixture.completionId,
          reconciliationPending: true,
        }),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          requestId: stopIds[1],
          completionId: "e2e-completion-002",
          assignment: {
            id: assignmentId,
            deliverymanId: completionActors.deliveryman.id,
            collectorId: completionActors.collector.id,
            savedRouteId: "e2e-route-001",
            vehicleIndex: 0,
            status: "COMPLETED",
            assignedCollectionRequestIds: stopIds,
            completedCollectionRequestIds: stopIds,
            assignedAt: "2026-11-01T12:00:00Z",
            startedAt: "2026-11-01T12:05:00Z",
            updatedAt: "2026-11-01T12:45:00Z",
          },
        }),
      });
    }
  });

  await page.goto("/deliveryman");
  await expect(page.getByRole("heading", { name: "Painel do entregador" })).toBeVisible();
  await expect(page.getByText("0 de 2 coletas concluídas")).toBeVisible();
  const inputs = page.locator('input[name="completionCode"]');
  const submitButtons = page.getByRole("button", { name: "Confirmar coleta" });
  await expect(inputs).toHaveCount(2);
  await expect(submitButtons).toHaveCount(2);
  await expect(submitButtons.nth(0)).toBeDisabled();
  expect(completionCalls).toBe(0);

  await inputs.nth(0).fill("001234");
  await submitButtons.nth(0).click();
  await expect(page.getByText("O código informado não confere.", { exact: false })).toBeVisible();
  await expect(page.getByText("0 de 2 coletas concluídas")).toBeVisible();
  expect(assignmentReads).toBe(1);

  await inputs.nth(0).fill("001235");
  await submitButtons.nth(0).click();
  await expect(page.getByText("Confirmação recebida. A atualização da rota está pendente.")).toBeVisible();
  await expect(page.getByText("0 de 2 coletas concluídas")).toBeVisible();
  await expect(page.locator("article")).toContainText("Rota #e2e-rout");
  expect(assignmentReads).toBe(1);

  await page.getByRole("button", { name: "Atualizar" }).click();
  await expect(page.getByText("1 de 2 coletas concluídas")).toBeVisible();
  await expect(page.getByText("Coleta #e2e-stop").first()).toBeVisible();
  expect(assignmentReads).toBe(2);
  await expect(page.locator('input[name="completionCode"]')).toHaveCount(1);

  await page.locator('input[name="completionCode"]').fill("001236");
  await page.getByRole("button", { name: "Confirmar coleta" }).click();
  await expect(page.getByText("2 de 2 coletas concluídas")).toBeVisible();
  await expect(page.locator("article")).toContainText("Concluída");
  await expect(page.locator('input[name="completionCode"]')).toHaveCount(0);
  expect(assignmentReads).toBe(2);
  expect(completionCalls).toBe(3);
  expect(new Set(submittedKeys).size).toBe(3);
});
