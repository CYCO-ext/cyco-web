import { expect, test } from "@playwright/test";
import { completionActors, pendingCollectionFixture } from "../fixtures/completion";

const assignmentId = "e2e-assignment-saved-001";
const routeId = "e2e-saved-route-001";
const collectionId = pendingCollectionFixture.id;

test("saved-routes deliveryman cannot finish a route with an unevidenced stop; 202 waits for refresh", async ({ page }) => {
  let assignmentReads = 0;
  let finishCalls = 0;
  let completionCalls = 0;

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
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([{
        id: assignmentId,
        deliverymanId: completionActors.deliveryman.id,
        savedRouteId: routeId,
        vehicleIndex: 0,
        status: assignmentReads === 1 ? "IN_PROGRESS" : "COMPLETED",
        assignedCollectionRequestIds: [collectionId],
        completedCollectionRequestIds: assignmentReads === 1 ? [] : [collectionId],
        assignedAt: "2026-11-01T12:00:00Z",
        startedAt: "2026-11-01T12:05:00Z",
        updatedAt: "2026-11-01T12:30:00Z",
      }]),
    });
  });
  await page.route("**/api/deliverymen/*/assignments/*/finish", async (route) => {
    finishCalls += 1;
    expect(route.request().method()).toBe("POST");
    await route.fulfill({
      status: 409,
      contentType: "application/json",
      body: JSON.stringify({ error: { code: "ROUTE_STOPS_PENDING", message: "Há paradas sem evidência." } }),
    });
  });
  await page.route("**/api/deliverymen/*/assignments/*/stops/*/complete", async (route) => {
    completionCalls += 1;
    const request = route.request();
    expect(request.headers().authorization).toBe("Bearer synthetic-deliveryman-token");
    expect(request.headers()["idempotency-key"]).toMatch(/^[0-9a-f-]{36}$/i);
    expect(request.postDataJSON()).toEqual({ code: "001234" });
    await route.fulfill({
      status: 202,
      contentType: "application/json",
      body: JSON.stringify({
        requestId: collectionId,
        completionId: "e2e-saved-completion-001",
        reconciliationPending: true,
      }),
    });
  });

  await page.goto("/routes/saved");
  await expect(page.getByRole("heading", { name: "Minhas rotas" })).toBeVisible();
  await expect(page.getByText("Rota: e2e-saved-route-001")).toBeVisible();
  await expect(page.getByText("Pendente", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Finalizar" })).toBeEnabled();

  await page.getByRole("button", { name: "Finalizar" }).click();
  await expect(page.getByText("Rota: e2e-saved-route-001")).toBeVisible();
  await expect(page.getByText("Pendente", { exact: true })).toBeVisible();
  expect(finishCalls).toBe(1);
  expect(assignmentReads).toBe(1);

  const codeInput = page.getByRole("textbox", { name: "Código de confirmação" });
  await codeInput.fill("001234");
  await page.getByRole("button", { name: "Confirmar coleta" }).click();
  await expect(page.getByText("Confirmação recebida. A atualização da rota está pendente.")).toBeVisible();
  await expect(page.getByText("Pendente", { exact: true })).toBeVisible();
  expect(assignmentReads).toBe(1);
  expect(completionCalls).toBe(1);

  await page.getByRole("button", { name: "Atualizar" }).click();
  await expect(page.getByText("Concluída", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Rota: e2e-saved-route-001")).toBeVisible();
  expect(assignmentReads).toBe(2);
});

test("collector route view keeps a completed deliveryman assignment visible and unavailable for reassignment", async ({ page }) => {
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
        user: { id: completionActors.collector.id },
        role: "WASTE_COLLECTOR",
        token: "synthetic-collector-token",
        expires: "2099-01-01T00:00:00.000Z",
      }),
    });
  });

  await page.route("**/api/collectors/routes/saved", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([{
        id: routeId,
        collectorId: completionActors.collector.id,
        status: "OPEN",
        assignedCollectionRequestIds: [collectionId],
        assignments: [{
          id: assignmentId,
          collectorId: completionActors.collector.id,
          deliverymanId: completionActors.deliveryman.id,
          savedRouteId: routeId,
          vehicleIndex: 0,
          status: "COMPLETED",
          assignedCollectionRequestIds: [collectionId],
          completedCollectionRequestIds: [collectionId],
          assignedAt: "2026-11-01T12:00:00Z",
          startedAt: "2026-11-01T12:05:00Z",
          completedAt: "2026-11-01T12:20:00Z",
          updatedAt: "2026-11-01T12:20:00Z",
        }],
        createdAt: "2026-11-01T12:00:00Z",
        updatedAt: "2026-11-01T12:20:00Z",
        suggestion: {
          status: "FEASIBLE",
          solver: { engine: "SYNTHETIC", elapsedMs: 1, objectiveDistanceMeters: 100, droppedStops: 0 },
          routes: [{
            vehicleIndex: 0,
            vehicleName: "Veículo sintético",
            capacity: 10,
            totalLoad: 1,
            totalDistanceMeters: 100,
            stops: [{
              sequence: 1,
              collectionRequestId: collectionId,
              addressId: "e2e-address-001",
              street: "Rua Sintética",
              number: "1",
              latitude: -23.5,
              longitude: -46.6,
              demand: 1,
              accumulatedLoad: 1,
              distanceFromPreviousMeters: 100,
            }],
          }],
          unassigned: [],
        },
      }]),
    });
  });
  await page.route(`**/api/collectors/${completionActors.collector.id}/deliverymen`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([{ id: completionActors.deliveryman.id, name: "Entregador sintético" }]),
    });
  });

  await page.goto("/routes/saved");
  await expect(page.getByRole("heading", { name: "Rotas salvas" })).toBeVisible();
  await page.locator("details summary").first().click();
  await expect(page.getByText("Entregador sintético", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Concluída • 1 parada(s)")).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Atribuir entregador para Veículo sintético" })).toBeDisabled();

  await page.reload();
  await page.locator("details summary").first().click();
  await expect(page.getByText("Entregador sintético", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Concluída • 1 parada(s)")).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Atribuir entregador para Veículo sintético" })).toBeDisabled();
});
