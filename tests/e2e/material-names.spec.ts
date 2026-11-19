import { expect, test } from "@playwright/test";
import { pendingCollectionFixture, completionActors } from "../fixtures/completion";

const materialId = "a013c4ce-cc02-4bbc-98c0-9d247ae7c13c";
const collection = { ...pendingCollectionFixture, materialIds: [materialId, "Metal"] };

for (const available of [true, false]) {
  test(`material names in home and route details, catalog available=${available}`, async ({ page }) => {
    await page.route("**/api/**", route => route.fulfill({ status: 404, json: {} }));
    await page.route("**/api/auth/session", route => route.fulfill({ json: {
      user: { id: completionActors.collector.id }, role: "WASTE_COLLECTOR",
      token: "synthetic-token", expires: "2099-01-01T00:00:00.000Z",
    } }));
    await page.route("**/api/materials", route => route.fulfill(available
      ? { json: [{ id: materialId, name: "Papel e papelão" }] }
      : { status: 503, json: {} }));
    await page.route("**/api/collections/search?*", route => route.fulfill({ json: [collection] }));
    await page.route(`**/api/collections/${collection.id}`, route => route.fulfill({ json: collection }));
    await page.route("**/api/collectors/routes/saved?*", route => route.fulfill({ json: [{
      id: "test-route", collectorId: completionActors.collector.id, status: "OPEN",
      createdAt: collection.createdAt, updatedAt: collection.updatedAt,
      assignedCollectionRequestIds: [collection.id],
      suggestion: { status: "FEASIBLE", routes: [{
        vehicleIndex: 0, capacity: 100, totalLoad: 3, totalDistanceMeters: 1000,
        stops: [{ sequence: 1, collectionRequestId: collection.id, addressId: "address-test",
          latitude: -23.5, longitude: -46.6, demand: 3, accumulatedLoad: 3, distanceFromPreviousMeters: 1000 }],
      }] },
    }] }));
    for (const path of ["/", "/routes/saved"]) {
      await page.goto(path);
      if (path === "/routes/saved") {
        await page.locator("article details summary").click();
        await page.getByRole("button", { name: "Ver coleta", exact: true }).click();
      }
      await expect(page.getByText(available ? "Papel e papelão" : "Material não disponível", { exact: true })).toBeVisible();
      await expect(page.getByText("Metal", { exact: true })).toBeVisible();
      await expect(page.getByText(materialId, { exact: true })).toHaveCount(0);
    }
  });
}
